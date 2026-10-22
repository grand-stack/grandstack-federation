# AGENTS.md: grandstack-federation

Federation for GRANDstack: the Neo4j subgraph (`grandstack-server` with `FEDERATION=true`), a Wikipedia subgraph (`wikipedia/`), and a Hive Gateway serving the composed supergraph. Open stack, no auth.

## Commands

```sh
npm ci
npm test               # unit tests (22 today), no network
npm run typecheck
npm run docs:check     # links, anchors, alt text, SVGs, diagram legends
npm run wikipedia      # the Wikipedia subgraph on :4010 (PORT to change)
npm run gateway        # a local gateway on :4300 (see docs/composition.md)
npm run compose        # recompose gateway/supergraph.graphql (subgraphs must be running)
npm run smoke          # needs the federation stack running and internet
npm run links          # rebuild seed/wikipedia-links.cypher (stack and internet)
```

The stack: `docker compose -f compose.yaml -f compose.federation.yaml up --build` in `grandstack`. Ports: gateway 4000, Neo4j subgraph 4001, Wikipedia subgraph 4010.

## Where things are

- `wikipedia/` the subgraph: `summary.ts` (lookup, cache, errors), `schema.ts` (SDL and resolvers), `config.ts`, `index.ts`.
- `schema/federation.graphql` extra schema mounted into the server; `seed/wikipedia-links.cypher` is GENERATED (do not edit; use `npm run links` or the recipes).
- `scripts/matching.ts` the rules for accepting a Wikipedia page; `scripts/resolve-links.ts` the builder; `scripts/smoke.ts`.
- `gateway/` `mesh.config.ts` (composition), `gateway.config.ts` (addresses, CORS), `supergraph.graphql` (GENERATED, committed), `Dockerfile`.

## Rules

- Recompose (`npm run compose`) and rebuild the gateway whenever a subgraph schema changes; commit the new supergraph.
- Keep `@apollo/subgraph` at 2.14.4 (the server pins it too); 2.15.1 breaks `@neo4j/graphql` 7.6.4.
- A wrong Wikipedia link is worse than none: do not loosen `matching.ts` without a test with a recorded response.
- Wikipedia is live and rate limited; unit tests must not call it (use a fake `fetch`).
- Do not claim in docs what you did not run. Auth with federation is not built or tested; keep saying so.
- Keep the diagram legends and coverage numbers in the docs true when the data or links change.
