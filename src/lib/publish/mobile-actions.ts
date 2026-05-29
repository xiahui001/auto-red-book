export type MobilePublishActionStep = {
  key: "save-images" | "copy-text" | "open-xhs";
  stepLabel: string;
  label: string;
  detail: string;
};

export function buildMobilePublishActionSteps(imageCount: number): MobilePublishActionStep[] {
  return [
    {
      key: "save-images",
      stepLabel: "Step 1",
      label: "保存图片至手机",
      detail: imageCount ? `点一次保存 ${imageCount} 张图到手机` : "当前无配图，可跳过此步"
    },
    {
      key: "copy-text",
      stepLabel: "Step 2",
      label: "复制文案",
      detail: "复制标题、正文和标签"
    },
    {
      key: "open-xhs",
      stepLabel: "Step 3",
      label: "打开小红书发布",
      detail: "进入小红书发帖子选择照片的页面"
    }
  ];
}
