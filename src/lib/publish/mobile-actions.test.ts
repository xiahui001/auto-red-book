import { describe, expect, it } from "vitest";
import { buildMobilePublishActionSteps } from "./mobile-actions";

describe("mobile publish action steps", () => {
  it("keeps the phone workflow in the required save-copy-open order", () => {
    expect(buildMobilePublishActionSteps(9)).toEqual([
      { key: "save-images", stepLabel: "Step 1", label: "保存图片至手机", detail: "点一次保存 9 张图到手机" },
      { key: "copy-text", stepLabel: "Step 2", label: "复制文案", detail: "复制标题、正文和标签" },
      { key: "open-xhs", stepLabel: "Step 3", label: "打开小红书发布", detail: "进入小红书发帖子选择照片的页面" }
    ]);
  });
});
