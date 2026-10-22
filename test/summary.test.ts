import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../wikipedia/config.js";
import { createSummaryLookup } from "../wikipedia/summary.js";

const config = loadConfig({});
const page = {
  type: "standard",
  titles: { normalized: "Inception" },
  description: "2010 film by Christopher Nolan",
  extract: "Inception is a 2010 science fiction heist film.",
  thumbnail: { source: "https://upload.example/thumb.jpg" },
  originalimage: { source: "https://upload.example/full.jpg" },
  content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Inception" } },
  wikibase_item: "Q25188",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("summary lookup", () => {
  it("maps a summary and sends the User-Agent", async () => {
    const fetchImpl = vi.fn(async () => json(page));
    const lookup = createSummaryLookup(config, fetchImpl as unknown as typeof fetch);
    expect(await lookup("Inception")).toEqual({
      title: "Inception", description: "2010 film by Christopher Nolan", extract: "Inception is a 2010 science fiction heist film.",
      thumbnailUrl: "https://upload.example/thumb.jpg", imageUrl: "https://upload.example/full.jpg",
      pageUrl: "https://en.wikipedia.org/wiki/Inception", wikidataId: "Q25188",
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://en.wikipedia.org/api/rest_v1/page/summary/Inception");
    expect((init.headers as Record<string, string>)["user-agent"]).toMatch(/grandstack-federation/);
  });
  it("encodes spaces and punctuation in the title", async () => {
    const fetchImpl = vi.fn(async () => json(page));
    await createSummaryLookup(config, fetchImpl as unknown as typeof fetch)("Heat (1995 film)");
    expect((fetchImpl.mock.calls[0] as unknown as [string])[0]).toBe("https://en.wikipedia.org/api/rest_v1/page/summary/Heat_(1995_film)");
  });
  it("returns null for a missing page, and for a disambiguation page", async () => {
    const missing = createSummaryLookup(config, (async () => json({ type: "x" }, 404)) as unknown as typeof fetch);
    expect(await missing("Nope")).toBeNull();
    const disambiguation = createSummaryLookup(config, (async () => json({ type: "disambiguation", titles: { normalized: "Alien" } })) as unknown as typeof fetch);
    expect(await disambiguation("Alien")).toBeNull();
  });
  it("turns a rate limit or a network failure into a GraphQL error, not null", async () => {
    const limited = createSummaryLookup(config, (async () => json({}, 429)) as unknown as typeof fetch);
    await expect(limited("Inception")).rejects.toThrow(/HTTP 429/);
    const down = createSummaryLookup(config, (async () => { throw new Error("getaddrinfo ENOTFOUND"); }) as unknown as typeof fetch);
    await expect(down("Inception")).rejects.toThrow(/Wikipedia is unavailable/);
  });
  it("caches results until they expire, and shares concurrent lookups", async () => {
    let t = 0;
    const fetchImpl = vi.fn(async () => json(page));
    const lookup = createSummaryLookup({ ...config, cacheTtlSeconds: 10 }, fetchImpl as unknown as typeof fetch, () => t);
    await Promise.all([lookup("Inception"), lookup("Inception"), lookup("Inception")]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await lookup("Inception");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t = 11_000;
    await lookup("Inception");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("does not call Wikipedia for an empty title", async () => {
    const fetchImpl = vi.fn();
    expect(await createSummaryLookup(config, fetchImpl as unknown as typeof fetch)("  ")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
