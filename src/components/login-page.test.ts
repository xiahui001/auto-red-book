import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("login page auth requests", () => {
  it("uses the account-auth API path and reports non-JSON responses cleanly", async () => {
    const source = await readFile(path.join(process.cwd(), "src/components/login-page.tsx"), "utf8");

    expect(source).toContain('"/api/account-auth/email"');
    expect(source).not.toContain('"/api/auth/email"');
    expect(source).toContain("response.text()");
    expect(source).toContain("NON_JSON_RESPONSE");
  });
});
