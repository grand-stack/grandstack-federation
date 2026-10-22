# Recipes

## Link one more film or person

> **Where to run this.** Commands on this page that start with `npm`, `node` or `docker build` run inside a clone of this repository: `git clone https://github.com/grand-stack/grandstack-federation`, then `cd grandstack-federation` (Node 22 or later; run `npm ci` once). Commands that need the running stack use the `grandstack` repository's compose files: see the [quickstart](https://grandstack.ai/quickstart/).

**By hand, for one entry** (works immediately, through the gateway or the subgraph on :4001). Madonna is one of the three people the builder does not link:

```graphql
mutation {
  updatePeople(where: { name: { eq: "Madonna" } }, update: { wikipediaTitle: { set: "Madonna" } }) { people { name wikipedia { description } } }
}
```

returns `"American singer and songwriter (born 1958)"`. For a film use `updateMovies(where: { title: { eq: "..." } }, ...)`. Use the page title exactly as Wikipedia shows it (spaces are fine). A hand-set link survives restarts. To remove one again: `mutation { updatePeople(where: { name: { eq: "Madonna" } }, update: { wikipediaTitle: { set: null } }) { people { name wikipediaTitle } } }`.

To list what is not linked yet: `{ people(where: { wikipediaTitle: { eq: null } }) { name } }` (the same for `movies`). All films in the sample data are linked; to see an unlinked film, create one (`createMovies`, as the smoke script does), and its `wikipedia` is `null`.

The query fields are `movies` and `people` (the server's usual generated ones), and a person's film counts are `actedCount` and `directedCount`; see the server's [schema reference](../../grandstack-server/docs/schema-reference.md).

**For many entries, or to keep it in the repo:** add the entry to `seed/wikipedia-links.cypher` in the same shape as the others, or change `scripts/matching.ts` so the builder accepts it, add a test with a recorded response in `test/fixtures/summaries.json`, and run `npm run links`.

**For a new dataset** (say, books): run the stack on it, change `scripts/resolve-links.ts` (the query, the candidates and the match function) and `schema/federation.graphql` (the types and key), and rerun.

## Add a field from Wikipedia's response

Wikipedia's summary has more than we expose (for example `timestamp`, `lang`, `coordinates`). To add one, say `lastEdited`:

1. `wikipedia/summary.ts`: add it to `WikipediaSummary` and `RawSummary`, and map it in `fetchOne`.
2. `wikipedia/schema.ts`: add `lastEdited: String` to the `WikipediaSummary` type, with a description.
3. Tests: in `test/summary.test.ts` add it to the sample page (with a distinctive value; Wikipedia's `timestamp` is an ISO 8601 string, so `String` is the right type) and to the expected result; in `test/schema.test.ts` add it to the typed `inception` fixture. Run `npm test` **and** `npm run typecheck`: the second catches the fixture, the first does not.
4. Rebuild and restart the subgraph, then `npm run compose` and rebuild the gateway so the supergraph knows the field (see [composition](composition.md)).

### Try it beside the running stack first

To test without touching the stack's containers, run your changed subgraph and a gateway on other ports (the three commands were run for this recipe):

```sh
PORT=4011 npm run wikipedia                              # your subgraph; the stack's is on 4010
NEO4J_URL=http://localhost:4001/graphql WIKIPEDIA_URL=http://localhost:4011/graphql npm run compose
NEO4J_URL=http://localhost:4001/graphql WIKIPEDIA_URL=http://localhost:4011/graphql npm run gateway -- --port 4301
```

Then query `localhost:4301`, for example `{ movies(where: { title: { eq: "Heat" } }) { wikipedia { description lastEdited } } }`. A later `--port` overrides the script's 4300.

**Before you commit**, recompose with the default addresses (`npm run compose` with no variables, the stack's own subgraphs running): composing with other addresses stores them in `gateway/supergraph.graphql`, which is committed.

## Add another subgraph

Any GraphQL server that can extend `Movie` or `Person` by key can join. Outline (not run here):

1. Write the subgraph with `type Movie @key(fields: "wikipediaTitle") { wikipediaTitle: String! yourField: ... }` (as in `wikipedia/schema.ts`), using `@apollo/subgraph` (keep 2.14.4 for the Neo4j one; the other subgraph is yours to choose).
2. Add it to `gateway/mesh.config.ts` and as a service in `compose.federation.yaml`; add its address to `transportEntries` in `gateway/gateway.config.ts`.
3. `npm run compose`, rebuild the gateway.

A different key (say `wikidataId`) works the same way: add `@key(fields: "wikidataId")` to the Neo4j subgraph's types as well and use it in the new subgraph.
