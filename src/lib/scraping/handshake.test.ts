import { afterEach, describe, expect, it, vi } from "vitest";
import { getScrapingHandshake } from "./handshake";

const originalVercel = process.env.VERCEL;
const originalVercelUrl = process.env.VERCEL_URL;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalFetch = globalThis.fetch;

describe("scraping handshake runtime boundary", () => {
  afterEach(() => {
    restoreEnv("VERCEL", originalVercel);
    restoreEnv("VERCEL_URL", originalVercelUrl);
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalSupabaseUrl);
    restoreEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalSupabaseKey);
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("blocks local-browser connectors in hosted runtime and points back to localhost", async () => {
    process.env.VERCEL = "1";
    delete process.env.VERCEL_URL;

    const handshake = await getScrapingHandshake({ fresh: true });
    const eventwang = handshake.connectors.find((connector) => connector.key === "eventwang");
    const xhs = handshake.connectors.find((connector) => connector.key === "xhs-hotspot");

    expect(eventwang).toMatchObject({ status: "blocked" });
    expect(eventwang?.message).toContain("localhost");
    expect(xhs).toMatchObject({ status: "blocked" });
    expect(xhs?.message).toContain("localhost");
    expect(handshake.safeguards[0]).toContain("Vercel");
  });

  it("marks Supabase unhealthy when Auth is still quota restricted", async () => {
    process.env.VERCEL = "1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          message:
            "Service for this project is restricted due to the following violations: exceed_storage_size_quota."
        }),
        { status: 402, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    const handshake = await getScrapingHandshake({ fresh: true });
    const supabase = handshake.connectors.find((connector) => connector.key === "supabase");

    expect(supabase).toMatchObject({ status: "warning" });
    expect(supabase?.checks.find((check) => check.label === "Supabase Auth 在线状态")).toMatchObject({
      ok: false
    });
    expect(supabase?.message).toContain("1 项需要补齐");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
