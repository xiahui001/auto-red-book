export type MaterialConnectorGate = {
  key: string;
  label: string;
  status: string;
  message?: string;
  checks?: Array<{
    label: string;
    ok: boolean;
    detail: string;
  }>;
};

export function getMaterialHardBlocker(connectors: MaterialConnectorGate[]) {
  const eventwangConnector = connectors.find((connector) => connector.key === "eventwang");
  if (eventwangConnector?.status === "ready") return null;

  const failedDetails = eventwangConnector?.checks
    ?.filter((check) => !check.ok)
    .map((check) => `${check.label}：${check.detail}`)
    .join("；");

  return `${eventwangConnector?.label || "活动汪图库采集"}：${
    failedDetails || eventwangConnector?.message || "真实在线检测未通过"
  }`;
}
