// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
/** Settings for the Wikipedia subgraph, from environment variables. */
export interface Config {
  port: number;
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  cacheTtlSeconds: number;
}

type Env = Record<string, string | undefined>;

function positiveInt(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive whole number, got "${raw}"`);
  return n;
}

export function loadConfig(env: Env = process.env): Config {
  const baseUrl = (env.WIKIPEDIA_BASE_URL ?? "https://en.wikipedia.org/api/rest_v1").replace(/\/$/, "");
  if (!/^https?:\/\//.test(baseUrl)) throw new Error(`WIKIPEDIA_BASE_URL must be an http(s) URL, got "${baseUrl}"`);
  return {
    port: positiveInt(env, "PORT", 4010),
    baseUrl,
    userAgent: env.WIKIPEDIA_USER_AGENT ?? "grandstack-federation/0.1 (GraphQL federation demo)",
    timeoutMs: positiveInt(env, "TIMEOUT_MS", 8000),
    cacheTtlSeconds: positiveInt(env, "CACHE_TTL_SECONDS", 3600),
  };
}
