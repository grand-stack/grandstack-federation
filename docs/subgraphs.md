# The subgraphs

## The Neo4j subgraph

`grandstack-server` becomes a subgraph with one setting:

```sh
FEDERATION=true
SCHEMA_EXTRA_PATHS=/app/schema/federation.graphql
```

`FEDERATION=true` makes the server call `getSubgraphSchema()` instead of `getSchema()` ([the library's federation guide](https://neo4j.com/docs/graphql/current/integrations/apollo-federation/)). The schema must opt in with a federation `@link`, which is why the extra file is needed:

```graphql
extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

extend type Movie @key(fields: "wikipediaTitle") {
  wikipediaTitle: String
  wikidataId: String
}
```

(The real file, `schema/federation.graphql`, has descriptions and does the same for `Person`.) `@key` makes the type an entity: another subgraph can extend it, and the gateway can ask this one for it by key. Checked on the running subgraph:

- `{ _service { sdl } }` returns the schema with the `@key` directives.
- `_entities(representations: [{ __typename: "Movie", wikipediaTitle: "Inception" }])` returns the film, and `null` for a key that matches nothing.
- Everything else (`movies`, mutations, the stored counts) works as before.

The key and the Wikidata id are ordinary properties on the nodes. They are writable through the generated mutations, so a film can be linked by hand:

```graphql
mutation { updatePeople(where: { name: { eq: "Madonna" } }, update: { wikipediaTitle: { set: "Madonna" } }) { people { name wikipedia { description } } } }
```

(The [recipes](recipes.md#link-one-more-film-or-person) show it and how to undo it; the smoke script does the same for a film.) The links file only fills in a link that is not set yet, so a link you set by hand is kept when the server restarts.

**Version pin.** `@neo4j/graphql` 7.6.4 brings `@apollo/subgraph`, and version 2.15.1 of it crashes with `doc.definitions is not iterable`. The server pins 2.14.4 with `overrides` in its `package.json`. See [what we tried](prototype-findings.md).

## The Wikipedia subgraph

`wikipedia/` is a small federated GraphQL server (`@apollo/subgraph` and GraphQL Yoga). Its schema:

```graphql
type Movie  @key(fields: "wikipediaTitle") { wikipediaTitle: String!  wikipedia: WikipediaSummary }
type Person @key(fields: "wikipediaTitle") { wikipediaTitle: String!  wikipedia: WikipediaSummary }
type WikipediaSummary { title description extract thumbnailUrl imageUrl pageUrl wikidataId }
type Query { wikipediaSummary(title: String!): WikipediaSummary }
```

The gateway asks it for `Movie` and `Person` by key only; it never sees the other Neo4j fields. `wikipediaSummary(title:)` is a direct lookup for testing, for example `{ wikipediaSummary(title: "Inception (film)") { title pageUrl } }`.

How a lookup behaves (`wikipedia/summary.ts`, covered by unit tests with a fake `fetch`):

| Case | Result |
| --- | --- |
| Page found | A `WikipediaSummary` (title, description, extract, thumbnail, image, page URL, Wikidata id) |
| HTTP 404 | `null` |
| A disambiguation page | `null`: it lists meanings, it is not the article |
| Rate limit (429), server error or timeout | A GraphQL error with code `WIKIPEDIA_UNAVAILABLE`; the field is `null`, other fields are unaffected |
| Same title again within the cache time | Served from memory (default one hour); concurrent lookups share one request |
| Empty title | `null`, no request |

### Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4010` | HTTP port |
| `WIKIPEDIA_BASE_URL` | `https://en.wikipedia.org/api/rest_v1` | The REST API (change for another language edition, or a stub in tests) |
| `WIKIPEDIA_USER_AGENT` | `grandstack-federation/0.1 (GraphQL federation demo)` | Sent with every request. Wikimedia asks clients to identify themselves; set this to something with your contact details if you run it for real |
| `TIMEOUT_MS` | `8000` | Per request |
| `CACHE_TTL_SECONDS` | `3600` | How long a result (including "no page") is kept |

The cache is per process and in memory: it is gone when the container restarts, and each replica has its own.
