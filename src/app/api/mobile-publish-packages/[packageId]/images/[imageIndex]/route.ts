import { fail } from "@/lib/http";
import { readMobilePublishPackageData, safeMobilePackageId } from "@/lib/publish/mobile-package-store";

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
  params:
    | { packageId: string; imageIndex: string }
    | Promise<{ packageId: string; imageIndex: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const packageId = params.packageId?.trim() ?? "";
  const safePackageId = safeMobilePackageId(packageId);
  if (!packageId || packageId !== safePackageId) {
    return fail("INVALID_PACKAGE_ID", "Invalid package id", 400);
  }

  const imageIndex = Number.parseInt(params.imageIndex, 10) - 1;
  if (!Number.isInteger(imageIndex) || imageIndex < 0) {
    return fail("INVALID_IMAGE_INDEX", "Invalid image index", 400);
  }

  try {
    const rawPackage = await readMobilePublishPackageData(safePackageId);
    const packageData = JSON.parse(rawPackage) as MobilePackageForDownload;
    const imageFile = packageData.imageFiles?.[imageIndex];
    const imageUrl = imageFile?.url || packageData.imageUrls?.[imageIndex];
    if (!imageUrl) return fail("IMAGE_NOT_FOUND", "Image not found", 404);

    const upstreamUrl = new URL(imageUrl, request.url);
    const upstream = await fetch(upstreamUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return fail("IMAGE_DOWNLOAD_FAILED", `Image download failed: HTTP ${upstream.status}`, 502);
    }

    const contentType = upstream.headers.get("content-type") || contentTypeForUrl(upstreamUrl.pathname);
    const filename = safeDownloadFilename(imageFile?.filename || `xhs-${imageIndex + 1}.${extensionForContentType(contentType)}`);
    const headers = new Headers({
      "cache-control": "no-store",
      "content-disposition": contentDispositionForAttachment(filename),
      "content-type": contentType
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);

    return new Response(upstream.body, { headers });
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("PACKAGE_NOT_FOUND", "Package not found", 404);
    }
    return fail("IMAGE_DOWNLOAD_FAILED", error instanceof Error ? error.message : "Image download failed", 500);
  }
}

function contentTypeForUrl(pathname: string) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function safeDownloadFilename(value: string) {
  const sanitized = value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 120);
  return sanitized || "xhs-image.jpg";
}

function contentDispositionForAttachment(filename: string) {
  return `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
