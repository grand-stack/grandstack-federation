# Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `doc.definitions is not iterable` when the server starts with `FEDERATION=true` | `@apollo/subgraph` 2.15.1 with `@neo4j/graphql` 7.6.4. `grandstack-server` pins 2.14.4 (`overrides`); keep it. See [what we tried](prototype-findings.md) |
| `typeDefs must contain \`@link\` schema extension...` | The server has `FEDERATION=true` but not `schema/federation.graphql`. Set `SCHEMA_EXTRA_PATHS` as in `compose.federation.yaml` |
| The gateway container fails to build: `COPY supergraph.graphql ... no such file` | `gateway/supergraph.graphql` is missing. Restore it from git, or compose it (`npm run compose` with the subgraphs running) |
| `npm run compose` fails with `Syntax Error: Expected Name, found String "errors"` | A subgraph was given as `source` instead of `endpoint` in `gateway/mesh.config.ts`. Use `endpoint` |
| `npm run compose` cannot reach a subgraph | Start the stack first. The subgraphs must answer on `localhost:4001` and `localhost:4010`, or set `NEO4J_URL` and `WIKIPEDIA_URL` |
| Subgraph calls fail inside the compose network and the error mentions `localhost` | A supergraph composed on your machine holds localhost addresses, which only work from your machine. `gateway.config.ts` replaces them with the service names, so check that it is in the gateway image (rebuild it). Not seen in practice; this is the expected cause |
| A new field is missing at the gateway | The supergraph is out of date. `npm run compose`, then rebuild the gateway image |
| `wikipedia` is `null` for a film or person | It is not linked (`{ wikipediaTitle }` is null), or Wikipedia has no such page. Link it by hand ([recipes](recipes.md)) |
| `wikipedia` is `null` with `WIKIPEDIA_UNAVAILABLE` | The Wikipedia API answered with an error or timed out (often a rate limit, HTTP 429). Retry later; results are cached for an hour. Set `WIKIPEDIA_USER_AGENT` to identify yourself |
| `wikipedia` is `null` with `Unexpected error.` | The Wikipedia subgraph is down. `docker compose ... logs wikipedia`; its health is `http://localhost:4010/healthz` |
| `npm run links` waits with `HTTP 429` | Wikipedia is rate limiting. The script waits as long as the server asks and retries; it keeps a cache in `scripts/.cache/`, so run it again if it gives up |
| Port 4000 is taken | The default stack, the auth stack or the agents setup is still running. Stop it first (`docker compose ... down`); the federation setup replaces them, it does not run beside them |
| `docker` commands fail on macOS | `docker` may be Podman: `podman machine start`, and set `DOCKER_HOST` to the socket it prints |
