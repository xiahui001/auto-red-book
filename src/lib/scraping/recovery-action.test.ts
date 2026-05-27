import { describe, expect, it } from "vitest";
import { getScrapingConnectorRecoveryAction } from "./recovery-action";

describe("getScrapingConnectorRecoveryAction", () => {
  it("offers a direct Eventwang login action when the Eventwang connector is not ready", () => {
    expect(
      getScrapingConnectorRecoveryAction({
        key: "eventwang",
        label: "活动汪图库采集",
        status: "warning",
        message: "1 项需要补齐",
        checks: [{ label: "活动汪真实在线", ok: false, detail: "登录已过期，请重新登录" }]
      })
    ).toEqual({
      kind: "eventwang-login",
      label: "打开活动汪登录",
      detail: "活动汪真实在线：登录已过期，请重新登录"
    });
  });

  it("offers a direct Xiaohongshu login action when the XHS connector is not ready", () => {
    expect(
      getScrapingConnectorRecoveryAction({
        key: "xhs-hotspot",
        label: "小红书热点参考",
        status: "blocked",
        message: "2 项需要补齐",
        checks: [{ label: "小红书真实在线", ok: false, detail: "需要先刷新小红书人工登录态" }]
      })
    ).toMatchObject({
      kind: "xhs-login",
      label: "打开小红书登录"
    });
  });

  it("does not offer an action for ready connectors", () => {
    expect(
      getScrapingConnectorRecoveryAction({
        key: "eventwang",
        label: "活动汪图库采集",
        status: "ready",
        message: "可用",
        checks: []
      })
    ).toBeNull();
  });
});
