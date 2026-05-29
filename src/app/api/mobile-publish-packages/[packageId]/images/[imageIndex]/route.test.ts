import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient
}));

import { GET } from "./route";

const LOCAL_PACKAGE_DIR = path.join(process.cwd(), "data", "mobile-publish-packages");
const TEST_PACKAGE_ID = "image-download-route-test";
const TEST_PACKAGE_DIR = path.join(LOCAL_PACKAGE_DIR, TEST_PACKAGE_ID);

describe("/api/mobile-publish-packages/[packageId]/images/[imageIndex]", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
    createSupabaseServerClient.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("image-bytes", { headers: { "content-type": "image/jpeg", "content-length": "11" } }))
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(TEST_PACKAGE_DIR, { recursive: true, force: true });
  });

  it("proxies package images as attachment downloads", async () => {
    await mkdir(TEST_PACKAGE_DIR, { recursive: true });
    await writeFile(
      path.join(TEST_PACKAGE_DIR, "package.json"),
      JSON.stringify({
        packageId: TEST_PACKAGE_ID,
        imageUrls: ["https://storage.local/image.jpg"],
        imageFiles: [{ url: "https://storage.local/image.jpg", filename: "xhs-test.jpg" }]
      }),
      "utf8"
    );

    const response = await GET(new Request(`http://localhost/api/mobile-publish-packages/${TEST_PACKAGE_ID}/images/1`), {
      params: { packageId: TEST_PACKAGE_ID, imageIndex: "1" }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain("xhs-test.jpg");
    expect(await response.text()).toBe("image-bytes");
    expect(fetch).toHaveBeenCalledWith(new URL("https://storage.local/image.jpg"), { cache: "no-store" });
  });
});
