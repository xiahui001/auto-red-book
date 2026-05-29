import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MOBILE_PUBLISH_BUCKET = "xhs-mobile-publish-packages";
export const LOCAL_MOBILE_PACKAGE_ROOT = path.join(process.cwd(), "data", "mobile-publish-packages");

export async function readMobilePublishPackageData(packageId: string) {
  const supabasePackage = await readSupabasePackageData(packageId);
  if (supabasePackage) return supabasePackage;

  return readFile(path.join(LOCAL_MOBILE_PACKAGE_ROOT, packageId, "package.json"), "utf8");
}

export function safeMobilePackageId(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "-").slice(0, 120) || "package";
}

async function readSupabasePackageData(packageId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const downloaded = await supabase.storage.from(MOBILE_PUBLISH_BUCKET).download(`packages/${packageId}/package.json`);
  if (downloaded.error || !downloaded.data) return null;

  return downloaded.data.text();
}
