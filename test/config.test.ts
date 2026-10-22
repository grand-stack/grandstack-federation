import { describe, expect, it } from "vitest";
import { loadConfig } from "../wikipedia/config.js";

describe("wikipedia subgraph config", () => {
  it("has working defaults", () => {
    expect(loadConfig({})).toMatchObject({ port: 4010, baseUrl: "https://en.wikipedia.org/api/rest_v1", timeoutMs: 8000, cacheTtlSeconds: 3600 });
  });
  it("trims a trailing slash and validates numbers and the URL", () => {
    expect(loadConfig({ WIKIPEDIA_BASE_URL: "http://stub:9/api/" }).baseUrl).toBe("http://stub:9/api");
    expect(() => loadConfig({ PORT: "0" })).toThrow(/PORT/);
    expect(() => loadConfig({ WIKIPEDIA_BASE_URL: "ftp://x" })).toThrow(/WIKIPEDIA_BASE_URL/);
  });
});
