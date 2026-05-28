export type ScrapingRecoveryCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

export type ScrapingRecoveryConnector = {
  key: string;
  label: string;
  status: string;
  message?: string;
  checks?: ScrapingRecoveryCheck[];
};

export type ScrapingConnectorRecoveryAction = {
  kind: "eventwang-login" | "xhs-login" | "local-runtime" | "vercel-env";
  label: string;
  detail: string;
};

export function getScrapingConnectorRecoveryAction(
  connector: ScrapingRecoveryConnector
): ScrapingConnectorRecoveryAction | null {
  if (connector.status === "ready") return null;

  const detail = formatFailedConnectorChecks(connector) || connector.message || "请查看失败检查项";
  const requiresLocalRuntime = connector.checks?.some(
    (check) => !check.ok && (check.detail.includes("公网版无法判定") || check.detail.includes("公网版不提供本机浏览器驱动"))
  );

  if (connector.key === "eventwang") {
    if (requiresLocalRuntime) {
      return { kind: "local-runtime", label: "回到本机版检测", detail };
    }
    return { kind: "eventwang-login", label: "打开活动汪登录", detail };
  }

  if (connector.key === "xhs-hotspot") {
    if (requiresLocalRuntime) {
      return { kind: "local-runtime", label: "回到本机版检测", detail };
    }
    return { kind: "xhs-login", label: "打开小红书登录", detail };
  }

  if (connector.key === "supabase") {
    return { kind: "vercel-env", label: "检查环境变量", detail };
  }

  return null;
}

export function formatFailedConnectorChecks(connector: ScrapingRecoveryConnector) {
  return (
    connector.checks
      ?.filter((check) => !check.ok)
      .map((check) => `${check.label}：${check.detail}`)
      .join("；") ?? ""
  );
}
