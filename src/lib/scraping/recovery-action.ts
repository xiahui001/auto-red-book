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
  kind: "eventwang-login" | "xhs-login" | "vercel-env";
  label: string;
  detail: string;
};

export function getScrapingConnectorRecoveryAction(
  connector: ScrapingRecoveryConnector
): ScrapingConnectorRecoveryAction | null {
  if (connector.status === "ready") return null;

  const detail = formatFailedConnectorChecks(connector) || connector.message || "请查看失败检查项";

  if (connector.key === "eventwang") {
    return { kind: "eventwang-login", label: "打开活动汪登录", detail };
  }

  if (connector.key === "xhs-hotspot") {
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
