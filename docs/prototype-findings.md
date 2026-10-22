# What we tried

The project's brief listed two open questions for this phase. These are the findings from the prototype, run on 2026-10-22, in the order we hit them.

## 1. Does `@neo4j/graphql` v7 do federation?

Yes. The library's [federation guide](https://neo4j.com/docs/graphql/current/integrations/apollo-federation/) describes `getSubgraphSchema()`, a federation `@link` extension and `@key` on `@node` types, and it works with GraphQL Yoga, not only Apollo Server (the guide's example host). `_service { sdl }` returns the schema and `_entities` resolves `Movie` and `Person` by key; an unknown key gives `null`.

**But a dependency breaks it.** `@neo4j/graphql` 7.6.4 depends on `@apollo/subgraph` `^2.2.3`. Version 2.15.1 of that package, which a fresh install picks up, fails at startup with `TypeError: doc.definitions is not iterable`: it wraps the module object the library passes in as if it were a schema document. Version 2.14.4 works. `grandstack-server` pins it with `overrides` in `package.json`. (We tried 2.14.4 only; 2.9.11 was not confirmed.) Re-check when either package updates.

The library's guide mentions only `@key` and federation v2.0. We used only those; `@shareable`, `@external` and `@requires` were not tried.

## 2. Can Mesh's OpenAPI handler make the Wikipedia subgraph?

Mostly. With `@omnigraph/openapi` 0.112.7 and `@graphql-mesh/compose-cli` 1.8.4:

- Wikipedia publishes an OpenAPI 3.0 spec (`/api/rest_v1/?spec`, 46 paths). We trimmed it to the summary path and its schemas.
- Mesh generated a subgraph from it: a query field returning a union of the summary and a problem type (so a 404 is a normal result), with the REST call executed inside the gateway. No separate service needed.
- A `@resolveTo` field added with `additionalTypeDefs` extended `Movie` with `wikipedia`, keyed on `wikipediaTitle`.
- Hive Gateway 2.15.2 served the composed supergraph and a single query returned *Inception* from Neo4j with its Wikipedia extract and image.
- A custom `User-Agent` header (Wikimedia asks for one) set through `operationHeaders` was carried into the supergraph's transport settings, and the calls succeeded.

**What went wrong: a film with no link.** The generated field's `title` argument is required. With a null key the gateway called Wikipedia anyway and the field failed with `DOWNSTREAM_SERVICE_ERROR` ("Variable $title of non-null type String! must not be null"). Making the argument optional avoided the error, but then a null was sent as the text `null`, and Wikipedia has a page called *Null*: the film got that disambiguation page's description. Wrong data with no error is worse than an error. A new film created through the web app has no link, so this would have happened in normal use.

## 3. The decision

A small hand-written subgraph (`wikipedia/`) instead. Federation's own entity mechanism only asks the subgraph about entities that have a key, so a film with no link is skipped and returns `null`, and we control the User-Agent, timeout, caching and errors. Mesh is still used, for composing (`npm run compose`). Hive Gateway serves the result unchanged.

If you want the Mesh OpenAPI route anyway, the cost is guarding against null keys yourself, for example by giving every film a default link that Wikipedia answers with a 404.

## 4. Smaller findings

- Mesh's `loadGraphQLHTTPSubgraph` takes `endpoint` for the live schema; its `source` option expects a schema document, not a GraphQL endpoint (we got `Syntax Error: Expected Name, found String "errors"` when we passed one).
- The supergraph stores the subgraph addresses used while composing; `transportEntries` in the gateway config replaces them at run time.
- Wikimedia rate limits its REST summary endpoint for uncached pages (HTTP 429 with a `Retry-After`). The Action API took 20 titles per request, which is why the link builder uses it.
