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

  it("routes hosted local-browser failures to the localhost recovery action", () => {
    expect(
      getScrapingConnectorRecoveryAction({
        key: "eventwang",
        label: "\u6d3b\u52a8\u6c6a\u56fe\u5e93\u91c7\u96c6",
        status: "blocked",
        message: "\u6d3b\u52a8\u6c6a\u767b\u5f55\u548c\u56fe\u5e93\u91c7\u96c6\u9700\u5728 localhost \u672c\u673a\u7248\u6267\u884c",
        checks: [
          {
            label: "\u6d3b\u52a8\u6c6a\u771f\u5b9e\u5728\u7ebf",
            ok: false,
            detail: "Vercel \u516c\u7f51\u7248\u65e0\u6cd5\u5224\u5b9a\u672c\u673a\u6d3b\u52a8\u6c6a\u767b\u5f55\u6001"
          }
        ]
      })
    ).toMatchObject({
      kind: "local-runtime",
      label: "\u56de\u5230\u672c\u673a\u7248\u68c0\u6d4b"
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
