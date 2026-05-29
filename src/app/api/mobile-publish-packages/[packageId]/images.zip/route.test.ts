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
const TEST_PACKAGE_ID = "image-zip-route-test";
const TEST_PACKAGE_DIR = path.join(LOCAL_PACKAGE_DIR, TEST_PACKAGE_ID);

describe("/api/mobile-publish-packages/[packageId]/images.zip", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
    createSupabaseServerClient.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL) => {
        const pathname = url.pathname;
        if (pathname.endsWith(".png")) {
          return new Response(new Uint8Array([2, 3, 4]), { headers: { "content-type": "image/png" } });
        }

        return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
      })
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(TEST_PACKAGE_DIR, { recursive: true, force: true });
  });

  it("downloads all package images as one ordered zip archive", async () => {
    await mkdir(TEST_PACKAGE_DIR, { recursive: true });
    await writeFile(
      path.join(TEST_PACKAGE_DIR, "package.json"),
      JSON.stringify({
        packageId: TEST_PACKAGE_ID,
        imageUrls: ["https://storage.local/cover.jpg", "https://storage.local/detail.png"],
        imageFiles: [
          { url: "https://storage.local/cover.jpg", filename: "draft-cover.jpg" },
          { url: "https://storage.local/detail.png", filename: "draft-detail.png" }
        ]
      }),
      "utf8"
    );

    const response = await GET(new Request(`http://localhost/api/mobile-publish-packages/${TEST_PACKAGE_ID}/images.zip`), {
      params: { packageId: TEST_PACKAGE_ID }
    });
    const body = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain(`xhs-${TEST_PACKAGE_ID}-images.zip`);
    expect(body.readUInt32LE(0)).toBe(0x04034b50);
    expect(readLocalZipEntryNames(body)).toEqual(["01.jpg", "02.png"]);
    expect(fetch).toHaveBeenCalledWith(new URL("https://storage.local/cover.jpg"), { cache: "no-store" });
    expect(fetch).toHaveBeenCalledWith(new URL("https://storage.local/detail.png"), { cache: "no-store" });
  });

  it("redirects to a prebuilt image zip when the package already has one", async () => {
    await mkdir(TEST_PACKAGE_DIR, { recursive: true });
    await writeFile(
      path.join(TEST_PACKAGE_DIR, "package.json"),
      JSON.stringify({
        packageId: TEST_PACKAGE_ID,
        imageZipUrl: "https://storage.local/packages/image-zip-route-test/images.zip",
        imageUrls: ["https://storage.local/cover.jpg"],
        imageFiles: [{ url: "https://storage.local/cover.jpg", filename: "draft-cover.jpg" }]
      }),
      "utf8"
    );

    const response = await GET(new Request(`http://localhost/api/mobile-publish-packages/${TEST_PACKAGE_ID}/images.zip`), {
      params: { packageId: TEST_PACKAGE_ID }
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://storage.local/packages/image-zip-route-test/images.zip");
    expect(fetch).not.toHaveBeenCalled();
  });
});

function readLocalZipEntryNames(buffer: Buffer) {
  const names: string[] = [];
  let offset = 0;

  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const filenameStart = offset + 30;
    names.push(buffer.subarray(filenameStart, filenameStart + filenameLength).toString("utf8"));
    offset = filenameStart + filenameLength + extraLength + compressedSize;
  }

  return names;
}
