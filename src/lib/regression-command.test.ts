import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("regression command", () => {
  it("runs tests, typecheck, and build in one command", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.regression).toBe("npm run test && npm run typecheck && npm run build");
  });

  it("keeps the ActivityWang draft baseline command wired to the guarded test set", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const baselineCommand = packageJson.scripts?.["test:baseline"] ?? "";

    expect(baselineCommand).toContain("vitest run");
    [
      "src/lib/collectors/eventwang-quota.test.ts",
      "src/lib/collectors/eventwang-gallery-candidates.test.ts",
      "src/app/api/materials/collect-eventwang-free/route.test.ts",
      "src/lib/generation/draft-image-assignment-service.test.ts",
      "src/app/api/drafts/route.test.ts",
      "src/components/matrix-dashboard.draft-list.test.ts",
      "src/components/matrix-dashboard.mobile-package.test.ts",
      "src/components/matrix-dashboard.hosted-login.test.ts",
      "src/components/login-page.test.ts",
      "src/lib/publish/mobile-package.test.ts",
      "src/lib/publish/public-origin.test.ts",
      "src/lib/scraping/recovery-action.test.ts",
      "src/lib/scraping/handshake.test.ts",
      "src/lib/regression-command.test.ts",
      "src/app/api/mobile-publish-packages/route.test.ts",
      "src/app/api/mobile-publish-packages/[packageId]/route.test.ts",
      "src/app/api/mobile-publish-packages/[packageId]/images/[imageIndex]/route.test.ts",
      "src/app/api/mobile-publish-packages/[packageId]/images.zip/route.test.ts",
      "src/app/mobile-publish/[packageId]/page.test.ts"
    ].forEach((testFile) => {
      expect(baselineCommand).toContain(testFile);
    });
  });

  it("documents the baseline gate for future changes", async () => {
    const rules = await readFile(path.join(process.cwd(), "AGENTS.md"), "utf8");

    expect(rules).toContain("npm run test:baseline");
    expect(rules).toContain("before and after changes");
  });

  it("exposes an all-backend baseline gate for API and lib changes", async () => {
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["test:backend-baseline"]).toBe("vitest run src/lib src/app/api");
  });
});
