import { GraphQLError } from "graphql";
import type { Config } from "./config.js";

export interface WikipediaSummary {
  title: string;
  description: string | null;
  extract: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
  wikidataId: string | null;
}

interface RawSummary {
  type?: string;
  titles?: { normalized?: string };
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  wikibase_item?: string;
}

export type SummaryLookup = (title: string) => Promise<WikipediaSummary | null>;

/**
 * Looks up the page summary for an English Wikipedia page title. A missing page gives null; any other failure
 * (timeout, rate limit, server error) is a GraphQL error so the client can tell "no page" from "Wikipedia is unavailable".
 * Results, including "no page", are cached in memory for cacheTtlSeconds, and concurrent lookups of one title share a request.
 */
export function createSummaryLookup(config: Config, fetchImpl: typeof fetch = fetch, now: () => number = Date.now): SummaryLookup {
  const cache = new Map<string, { value: WikipediaSummary | null; expires: number }>();
  const inFlight = new Map<string, Promise<WikipediaSummary | null>>();

  async function fetchOne(title: string): Promise<WikipediaSummary | null> {
    const url = `${config.baseUrl}/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    let response: Response;
    try {
      response = await fetchImpl(url, { headers: { "user-agent": config.userAgent, accept: "application/json" }, signal: AbortSignal.timeout(config.timeoutMs) });
    } catch (error) {
      throw new GraphQLError(`Wikipedia is unavailable: ${(error as Error).message}`, { extensions: { code: "WIKIPEDIA_UNAVAILABLE" } });
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new GraphQLError(`Wikipedia answered HTTP ${response.status} for "${title}"`, { extensions: { code: "WIKIPEDIA_UNAVAILABLE" } });
    const raw = (await response.json()) as RawSummary;
    if (raw.type === "disambiguation") return null; // a list of meanings, not an article about this entity
    return {
      title: raw.titles?.normalized ?? raw.title ?? title,
      description: raw.description ?? null,
      extract: raw.extract ?? null,
      thumbnailUrl: raw.thumbnail?.source ?? null,
      imageUrl: raw.originalimage?.source ?? null,
      pageUrl: raw.content_urls?.desktop?.page ?? null,
      wikidataId: raw.wikibase_item ?? null,
    };
  }

  return async (title) => {
    const key = title.trim();
    if (!key) return null;
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    const pending = inFlight.get(key);
    if (pending) return pending;
    const promise = fetchOne(key)
      .then((value) => { cache.set(key, { value, expires: now() + config.cacheTtlSeconds * 1000 }); return value; })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}
