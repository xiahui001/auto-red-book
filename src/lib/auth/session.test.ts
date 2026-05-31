import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { authSessionNeedsRefresh, type AuthSessionSnapshot } from "./session";

describe("auth session refresh policy", () => {
  it("refreshes sessions before the Supabase access token expires", () => {
    const snapshot = makeSnapshot({ expiresAt: 1_000 });

    expect(authSessionNeedsRefresh(snapshot, 950)).toBe(true);
  });

  it("keeps sessions with enough time remaining", () => {
    const snapshot = makeSnapshot({ expiresAt: 1_000 });

    expect(authSessionNeedsRefresh(snapshot, 800)).toBe(false);
  });

  it("refreshes when token metadata is missing", () => {
    expect(authSessionNeedsRefresh(makeSnapshot({ expiresAt: undefined }), 800)).toBe(true);
    expect(authSessionNeedsRefresh({ user: { id: "user-1" }, session: null }, 800)).toBe(true);
  });

  it("uses the account-auth refresh endpoint", async () => {
    const source = await readFile(path.join(process.cwd(), "src/lib/auth/session.ts"), "utf8");

    expect(source).toContain('"/api/account-auth/refresh"');
    expect(source).not.toContain('"/api/auth/refresh"');
  });
});

function makeSnapshot(input: { expiresAt: number | undefined }): AuthSessionSnapshot {
  return {
    user: { id: "user-1", email: "user@example.com" },
    session: {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: input.expiresAt
    }
  };
}
