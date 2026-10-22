# Testing

| Command | Needs | What it proves |
| --- | --- | --- |
| `npm test` | nothing (no network, no Docker) | 22 unit tests, below |
| `npm run typecheck` | nothing | TypeScript compiles |
| `npm run smoke` | the federation stack running, and internet | 11 checks through the gateway and the subgraphs |
| `npm run docs:check` | nothing | links, anchors, image alt text, SVG safety, diagram legends |
| `npm run links` | the stack running, and internet | rebuilds `seed/wikipedia-links.cypher` (not a test; see [linking](linking.md)) |

> **Where to run this.** Commands on this page that start with `npm`, `node` or `docker build` run inside a clone of this repository: `git clone https://github.com/grand-stack/grandstack-federation`, then `cd grandstack-federation` (Node 22 or later; run `npm ci` once). Commands that need the running stack use the `grandstack` repository's compose files: see the [quickstart](https://grandstack.ai/quickstart/).

## Unit tests (`npm test`)

- `matching.test.ts`: the link-matching rules against recorded Wikipedia summaries (`test/fixtures/summaries.json`): right page, a disambiguation page, a namesake in another job, a film of the same name from another year, a film accepted by its "(YYYY film)" title, a duo's shared page, a redirect to a film.
- `summary.test.ts`: the subgraph's lookup with a fake `fetch`: mapping, the `User-Agent`, title encoding, 404 and disambiguation give `null`, 429 and network failure give an error, the cache and shared in-flight requests, an empty title.
- `schema.test.ts`: the subgraph schema through Yoga in memory: `_service`, entity resolution by key (including an unknown key), the direct lookup.
- `config.test.ts`: defaults and validation.

## The smoke script (`npm run smoke`)

Against the running stack: a film returns Neo4j fields and its Wikipedia summary in one query, with the Wikidata id; a person likewise; an unlinked person (*Madonna*) gives `null` and no error; a Neo4j-only query works through the gateway; a list of eight films resolves in one request; a mutation through the gateway creates a throwaway film (`ZZ Federation Test`), which starts unlinked, is linked by setting `wikipediaTitle`, and is removed again; the Neo4j subgraph publishes `@key` on Movie and Person; the Wikipedia subgraph answers directly and gives `null` for a page that does not exist.

Also run when this phase was built: `grandstack-web`'s browser checks (`npm run e2e`) through the gateway, with no problems reported, and `grandstack-agents`' tools against the gateway (`get_schema` shows `WikipediaSummary`; `run_query` returns a Wikipedia description).

## What is not tested

Auth with federation, Wikipedia rate limiting or outages through the gateway under load (the error paths are unit tested and checked once by hand), and a Wikipedia that changes its pages: the smoke script expects *Inception*'s page to say "2010 film".
