import { fail } from "@/lib/http";
import { readMobilePublishPackageData, safeMobilePackageId } from "@/lib/publish/mobile-package-store";

export const runtime = "nodejs";

type RouteContext = {
  params: { packageId: string } | Promise<{ packageId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const packageId = params.packageId?.trim() ?? "";
  const safePackageId = safeMobilePackageId(packageId);
  if (!packageId || packageId !== safePackageId) {
    return fail("INVALID_PACKAGE_ID", "Invalid package id", 400);
  }

  try {
    const packageData = await readMobilePublishPackageData(safePackageId);
    return new Response(packageData, {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail("PACKAGE_NOT_FOUND", "Package not found", 404);
    }
    throw error;
  }
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
