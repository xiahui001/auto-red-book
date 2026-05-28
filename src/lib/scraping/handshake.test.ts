import { afterEach, describe, expect, it } from "vitest";
import { getScrapingHandshake } from "./handshake";

const originalVercel = process.env.VERCEL;
const originalVercelUrl = process.env.VERCEL_URL;

describe("scraping handshake runtime boundary", () => {
  afterEach(() => {
    restoreEnv("VERCEL", originalVercel);
    restoreEnv("VERCEL_URL", originalVercelUrl);
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
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
