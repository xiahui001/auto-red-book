import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile publish page package loading", () => {
  it("loads package data from the short package id URL without requiring a data query", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/app/mobile-publish/[packageId]/page.tsx"),
      "utf8"
    );

    expect(source).toContain("resolvePackageDataUrl");
    expect(source).toContain("currentUrl.pathname");
    expect(source).toContain("/api/mobile-publish-packages/");
    expect(source).not.toContain("缺少发布包数据链接");
  });

  it("prepares image files before the Step 1 tap so system share keeps user activation", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/app/mobile-publish/[packageId]/page.tsx"),
      "utf8"
    );

    expect(source).toContain("const [shareFiles, setShareFiles]");
    expect(source).toContain("void buildShareFiles(packageData.imageUrls)");
    expect(source).toContain("const files = shareFiles");
    expect(source).not.toContain("const files = await buildShareFiles(packageData.imageUrls)");
    expect(source).toContain("请用手机相机重新扫码");
  });
});
