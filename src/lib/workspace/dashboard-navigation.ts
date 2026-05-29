export const DASHBOARD_NAV_ITEMS = [
  { label: "今日工作台", id: "section-0" },
  { label: "准备检查", id: "section-global-check" },
  { label: "草稿库", id: "section-3" },
  { label: "关键词库", id: "section-6" },
  { label: "创作规则", id: "section-7" }
] as const;

export type SectionId = (typeof DASHBOARD_NAV_ITEMS)[number]["id"];
