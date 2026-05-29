import { fail } from "@/lib/http";
import { readMobilePublishPackageData, safeMobilePackageId } from "@/lib/publish/mobile-package-store";
import { createStoreZip, type StoreZipEntry } from "@/lib/publish/store-zip";

export const runtime = "nodejs";

type MobilePackageForDownload = {
  packageId?: string;
  imageUrls?: string[];
  imageFiles?: Array<{
    url?: string;
    filename?: string;
  }>;
};

type RouteContext = {
  params: { packageId: string } | Promise<{ packageId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const packageId = params.packageId?.trim() ?? "";
  const safePackageId = safeMobilePackageId(packageId);
  if (!packageId || packageId !== safePackageId) {
    return fail("INVALID_PACKAGE_ID", "Invalid package id", 400);
  }

  try {
    const rawPackage = await readMobilePublishPackageData(safePackageId);
    const packageData = JSON.parse(rawPackage) as MobilePackageForDownload;
    const imageRefs = resolvePackageImageRefs(packageData);
    if (!imageRefs.length) return fail("IMAGES_NOT_FOUND", "Images not found", 404);

    const entries = await mapWithConcurrency(imageRefs, 4, async (imageRef, index): Promise<StoreZipEntry> => {
      const upstreamUrl = new URL(imageRef.url, request.url);
      const upstream = await fetch(upstreamUrl, { cache: "no-store" });
      if (!upstream.ok) {
        throw new ImageDownloadError(upstream.status);
      }

      const contentType = upstream.headers.get("content-type") || contentTypeForUrl(upstreamUrl.pathname);
      return {
        filename: buildOrderedImageFilename(index, contentType, imageRef.filename || upstreamUrl.pathname),
        data: new Uint8Array(await upstream.arrayBuffer())
      };
    });

    const body = createStoreZip(entries);
    return new Response(body, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": contentDispositionForAttachment(`xhs-${safePackageId}-images.zip`),
        "content-length": String(body.byteLength),
        "content-type": "application/zip"
      }
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("PACKAGE_NOT_FOUND", "Package not found", 404);
    }
    if (error instanceof ImageDownloadError) {
      return fail("IMAGE_DOWNLOAD_FAILED", `Image download failed: HTTP ${error.status}`, 502);
    }
    return fail("IMAGE_ZIP_DOWNLOAD_FAILED", error instanceof Error ? error.message : "Image package download failed", 500);
  }
}

function resolvePackageImageRefs(packageData: MobilePackageForDownload) {
  const imageFiles = packageData.imageFiles ?? [];
  const imageUrls = packageData.imageUrls ?? [];
  const count = Math.max(imageFiles.length, imageUrls.length);

  return Array.from({ length: count }, (_, index) => ({
    url: imageFiles[index]?.url || imageUrls[index] || "",
    filename: imageFiles[index]?.filename
  })).filter((imageRef) => Boolean(imageRef.url));
}

function buildOrderedImageFilename(index: number, contentType: string, sourceName: string) {
  return `${String(index + 1).padStart(2, "0")}.${extensionForImage(contentType, sourceName)}`;
}

function extensionForImage(contentType: string, sourceName: string) {
  const lowerType = contentType.toLowerCase();
  if (lowerType.includes("png")) return "png";
  if (lowerType.includes("webp")) return "webp";
  if (lowerType.includes("gif")) return "gif";

  const sourceExtension = pathExtension(sourceName);
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(sourceExtension)) {
    return sourceExtension === "jpeg" ? "jpg" : sourceExtension;
  }

  return "jpg";
}

function pathExtension(value: string) {
  const match = value.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() || "";
}

function contentTypeForUrl(pathname: string) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function contentDispositionForAttachment(filename: string) {
  return `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      }
    })
  );

  return results;
}

class ImageDownloadError extends Error {
  constructor(readonly status: number) {
    super(`Image download failed: HTTP ${status}`);
  }
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
