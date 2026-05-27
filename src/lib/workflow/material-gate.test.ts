import { describe, expect, it } from "vitest";
import { getMaterialHardBlocker } from "./material-gate";

describe("getMaterialHardBlocker", () => {
  it("allows material collection when Eventwang is ready even if XHS is warning", () => {
    expect(
      getMaterialHardBlocker([
        { key: "eventwang", label: "活动汪图库采集", status: "ready", message: "可用" },
        { key: "xhs-hotspot", label: "小红书热点参考", status: "warning", message: "真实在线检测未通过" }
      ])
    ).toBeNull();
  });

  it("blocks material collection when Eventwang is not ready", () => {
    expect(
      getMaterialHardBlocker([
        { key: "eventwang", label: "活动汪图库采集", status: "warning", message: "需要登录" },
        { key: "xhs-hotspot", label: "小红书热点参考", status: "ready", message: "可用" }
      ])
    ).toBe("活动汪图库采集：需要登录");
  });

  it("surfaces the concrete failed Eventwang checks before the generic connector message", () => {
    expect(
      getMaterialHardBlocker([
        {
          key: "eventwang",
          label: "活动汪图库采集",
          status: "warning",
          message: "2 项需要补齐",
          checks: [
            { label: "活动汪登录态文件", ok: true, detail: "已保存人工登录后的 storageState" },
            { label: "活动汪真实在线", ok: false, detail: "登录已过期，请重新登录" },
            { label: "Playwright 运行时", ok: false, detail: "Vercel 公网版不提供本机浏览器驱动" }
          ]
        },
        { key: "xhs-hotspot", label: "小红书热点参考", status: "ready", message: "可用" }
      ])
    ).toBe("活动汪图库采集：活动汪真实在线：登录已过期，请重新登录；Playwright 运行时：Vercel 公网版不提供本机浏览器驱动");
  });
});
