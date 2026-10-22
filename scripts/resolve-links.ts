// Finds the English Wikipedia page for every film and person in the GraphQL API and writes seed/wikipedia-links.cypher.
// A developer runs this when the dataset changes; the output is committed. Needs the stack running (the open server on :4000)
// and internet access. Unmatched entries are listed and left without a link.
//   npm run links            (GRAPHQL_URL to change the server, WIKIPEDIA_USER_AGENT to identify yourself)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { filmCandidates, matchFilm, matchPerson, personCandidates, type Link, type Summary } from "./matching.js";

const graphqlUrl = process.env.GRAPHQL_URL ?? "http://localhost:4000/graphql";
const userAgent = process.env.WIKIPEDIA_USER_AGENT ?? "grandstack-federation/0.1 (GraphQL federation demo; link builder)";
const cachePath = "scripts/.cache/pages.json";
const outPath = "seed/wikipedia-links.cypher";

async function gql<T>(query: string): Promise<T> {
  const res = await fetch(graphqlUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!body.data) throw new Error(`GraphQL request to ${graphqlUrl} failed: ${body.errors?.map((e) => e.message).join("; ") ?? res.status}`);
  return body.data;
}

let cache: Record<string, Summary | null> = {};
try { cache = JSON.parse(await readFile(cachePath, "utf8")); } catch { /* first run */ }

interface ApiPage { title: string; missing?: boolean; description?: string; extract?: string; pageprops?: { wikibase_item?: string; disambiguation?: string } }

/**
 * Looks up many titles at once with the MediaWiki Action API (20 per request). The one-page-at-a-time REST summary endpoint is
 * rate limited hard for pages that are not cached, which makes a few hundred lookups take an hour; this takes a minute.
 * Redirects are followed, and the result is keyed by the title that was asked for.
 */
async function lookup(titles: string[]): Promise<void> {
  const todo = [...new Set(titles)].filter((t) => !(t in cache));
  for (let i = 0; i < todo.length; i += 20) {
    const batch = todo.slice(i, i + 20);
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", redirects: "1", titles: batch.join("|"),
      prop: "pageprops|description|extracts", ppprop: "wikibase_item|disambiguation", exintro: "1", explaintext: "1", exlimit: "max",
    });
    let body: { query?: { pages?: ApiPage[]; normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[] } } | undefined;
    for (let attempt = 0; attempt < 6 && !body; attempt++) {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { "user-agent": userAgent, accept: "application/json" } });
      if (res.ok) body = (await res.json()) as typeof body;
      else {
        const wait = Number(res.headers.get("retry-after")) * 1000 || 3000 * (attempt + 1);
        console.error(`  HTTP ${res.status}, waiting ${Math.round(wait / 1000)} s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (!body) { await flush(); throw new Error("Wikipedia kept failing; run again, the cache keeps what was fetched"); }
    const step = (from: string) => {
      let t = from;
      for (const list of [body!.query?.normalized, body!.query?.redirects]) t = list?.find((x) => x.from === t)?.to ?? t;
      return t;
    };
    const pages = new Map((body.query?.pages ?? []).map((p) => [p.title, p]));
    for (const asked of batch) {
      const page = pages.get(step(asked));
      cache[asked] = !page || page.missing ? null : {
        type: page.pageprops && "disambiguation" in page.pageprops ? "disambiguation" : "standard",
        titles: { normalized: page.title }, description: page.description, extract: page.extract, wikibase_item: page.pageprops?.wikibase_item,
      };
    }
    console.error(`  looked up ${Math.min(i + 20, todo.length)} of ${todo.length} titles`);
    await flush();
    await new Promise((r) => setTimeout(r, 500)); // be polite
  }
}

async function flush() {
  await mkdir("scripts/.cache", { recursive: true });
  await writeFile(cachePath, JSON.stringify(cache));
}

/** Tries each entity's candidate titles in rounds, so every round is one batch of lookups. */
async function resolveAll<T>(items: T[], candidates: (item: T) => string[], match: (item: T, s: Summary) => Link | undefined): Promise<(Link | undefined)[]> {
  const results: (Link | undefined)[] = items.map(() => undefined);
  for (let round = 0; ; round++) {
    const pending = items.map((item, i) => ({ i, title: results[i] ? undefined : candidates(item)[round] })).filter((x): x is { i: number; title: string } => !!x.title);
    if (pending.length === 0) return results;
    await lookup(pending.map((p) => p.title));
    for (const { i, title } of pending) {
      const s = cache[title];
      if (s) results[i] = match(items[i], s);
    }
  }
}

const { movies, people } = await gql<{ movies: { title: string; released: number }[]; people: { name: string }[] }>(
  "{ movies(limit: 100000) { title released } people(limit: 100000) { name } }",
);
console.error(`${movies.length} films, ${people.length} people`);

const filmResults = await resolveAll(movies, (m) => filmCandidates(m.title, m.released), (m, s) => matchFilm(s, m.released));
const filmLinks: (Link & { title: string; released: number })[] = [];
const filmMisses: string[] = [];
movies.forEach((m, i) => { const l = filmResults[i]; if (l) filmLinks.push({ ...l, title: m.title, released: m.released }); else filmMisses.push(`${m.title} (${m.released})`); });
const personResults = await resolveAll(people, (p) => personCandidates(p.name), (_, s) => matchPerson(s));
const personLinks: (Link & { name: string })[] = [];
const personMisses: string[] = [];
people.forEach((p, i) => { const l = personResults[i]; if (l) personLinks.push({ ...l, name: p.name }); else personMisses.push(p.name); });
await flush();

const q = (s: string) => JSON.stringify(s);
const row = (fields: Record<string, string | number | undefined>) =>
  `{${Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${typeof v === "number" ? v : q(v as string)}`).join(", ")}}`;

const lines = [
  "// Generated by scripts/resolve-links.ts. Do not edit by hand; run `npm run links` again.",
  `// ${filmLinks.length} of ${movies.length} films and ${personLinks.length} of ${people.length} people linked to English Wikipedia pages.`,
  "// Run at every server start (SETUP_CYPHER_PATHS). Only fills in a link that is not set yet.",
  "UNWIND [",
  filmLinks.map((l) => "  " + row({ title: l.title, released: l.released, page: l.page, wikidata: l.wikidataId })).join(",\n"),
  "] AS row",
  "MATCH (m:Movie {title: row.title, released: row.released}) WHERE m.wikipediaTitle IS NULL",
  "SET m.wikipediaTitle = row.page, m.wikidataId = row.wikidata;",
  "",
  "UNWIND [",
  personLinks.map((l) => "  " + row({ name: l.name, page: l.page, wikidata: l.wikidataId })).join(",\n"),
  "] AS row",
  "MATCH (p:Person {name: row.name}) WHERE p.wikipediaTitle IS NULL",
  "SET p.wikipediaTitle = row.page, p.wikidataId = row.wikidata;",
  "",
];
await writeFile(outPath, lines.join("\n"));
console.error(`Wrote ${outPath}: films ${filmLinks.length}/${movies.length}, people ${personLinks.length}/${people.length}`);
console.error(`Unmatched films (${filmMisses.length}): ${filmMisses.join("; ")}`);
console.error(`Unmatched people (${personMisses.length}): ${personMisses.join("; ")}`);
