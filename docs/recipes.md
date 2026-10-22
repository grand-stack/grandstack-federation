# Recipes

## Link one more film or person

**By hand, for one entry** (works immediately, through the gateway or the subgraph on :4001). Madonna is one of the three people the builder does not link:

```graphql
mutation {
  updatePeople(where: { name: { eq: "Madonna" } }, update: { wikipediaTitle: { set: "Madonna" } }) { people { name wikipedia { description } } }
}
```

returns `"American singer and songwriter (born 1958)"`. For a film use `updateMovies(where: { title: { eq: "..." } }, ...)`. Use the page title exactly as Wikipedia shows it (spaces are fine). A hand-set link survives restarts. To remove one again, set it to `null`.

**For many entries, or to keep it in the repo:** add the entry to `seed/wikipedia-links.cypher` in the same shape as the others, or change `scripts/matching.ts` so the builder accepts it, add a test with a recorded response in `test/fixtures/summaries.json`, and run `npm run links`.

**For a new dataset** (say, books): run the stack on it, change `scripts/resolve-links.ts` (the query, the candidates and the match function) and `schema/federation.graphql` (the types and key), and rerun.

## Add a field from Wikipedia's response

Wikipedia's summary has more than we expose (for example `timestamp`, `lang`, `coordinates`). To add one, say `lastEdited`:

1. `wikipedia/summary.ts`: add it to `WikipediaSummary` and `RawSummary`, and map it in `fetchOne`.
2. `wikipedia/schema.ts`: add `lastEdited: String` to the `WikipediaSummary` type, with a description.
3. `test/summary.test.ts`: add it to the sample page and the expected result. `npm test`.
4. Rebuild and restart the subgraph, then `npm run compose` and rebuild the gateway so the supergraph knows the field (see [composition](composition.md)).

## Add another subgraph

Any GraphQL server that can extend `Movie` or `Person` by key can join. Outline (not run here):

1. Write the subgraph with `type Movie @key(fields: "wikipediaTitle") { wikipediaTitle: String! yourField: ... }` (as in `wikipedia/schema.ts`), using `@apollo/subgraph` (keep 2.14.4 for the Neo4j one; the other subgraph is yours to choose).
2. Add it to `gateway/mesh.config.ts` and as a service in `compose.federation.yaml`; add its address to `transportEntries` in `gateway/gateway.config.ts`.
3. `npm run compose`, rebuild the gateway.

A different key (say `wikidataId`) works the same way: add `@key(fields: "wikidataId")` to the Neo4j subgraph's types as well and use it in the new subgraph.
