import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV_ITEMS } from "./dashboard-navigation";

describe("dashboard navigation", () => {
  it("keeps only the required workspace modules in the left rail", () => {
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      "今日工作台",
      "准备检查",
      "草稿库",
      "关键词库",
      "创作规则"
    ]);
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).not.toContain("文案参考");
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).not.toContain("图库");
    expect(DASHBOARD_NAV_ITEMS.map((item) => item.label)).not.toContain("私信助手");
  });
});
