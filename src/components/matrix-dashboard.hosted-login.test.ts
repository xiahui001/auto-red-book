import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("matrix dashboard hosted manual login actions", () => {
  it("opens Xiaohongshu directly in hosted mode instead of stopping at local CDP startup", async () => {
    const source = await readFile(path.join(process.cwd(), "src/components/matrix-dashboard.tsx"), "utf8");
    const handlerStart = source.indexOf("async function handleXhsCdpCardClick");
    const handlerEnd = source.indexOf("async function startEventwangManualLogin", handlerStart);
    const handlerSource = source.slice(handlerStart, handlerEnd);

    expect(handlerSource).toContain('openHostedLoginPage("https://www.xiaohongshu.com/", "小红书")');
    expect(handlerSource).not.toContain("公网版不能拉起本机真实浏览器");
  });

  it("turns failed workflow steps into recovery buttons", async () => {
    const source = await readFile(path.join(process.cwd(), "src/components/matrix-dashboard.tsx"), "utf8");
    const workflowListStart = source.indexOf('<div className="workflow-list">');
    const workflowListEnd = source.indexOf("</div>", workflowListStart);
    const workflowListSource = source.slice(workflowListStart, workflowListEnd);

    expect(source).toContain("function handleWorkflowStepRecovery");
    expect(workflowListSource).toContain('step.status === "failed"');
    expect(workflowListSource).toContain("onClick={() => handleWorkflowStepRecovery(step)}");
  });
});
