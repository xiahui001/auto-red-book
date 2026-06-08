import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const signInWithPassword = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword
    }
  }))
}));

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe("/api/auth/email", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    signInWithPassword.mockReset();
  });

  afterEach(() => {
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalUrl);
    restoreEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalKey);
  });

  it("returns an actionable message when Supabase Auth is quota restricted", async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: null,
        session: null
      },
      error: {
        status: 402,
        message:
          "Service for this project is restricted due to the following violations: exceed_storage_size_quota."
      }
    });

    const response = await POST(
      new Request("http://localhost/api/auth/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "sign-in",
          email: "user@example.com",
          password: "secret123"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.error.message).toContain("存储配额限制");
    expect(payload.error.message).toContain("Supabase Storage");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
