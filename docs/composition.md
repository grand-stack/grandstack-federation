# Composition and the gateway

**Composition** turns the subgraphs' schemas into one file, the *supergraph*, that says what the combined API looks like and which subgraph owns each field. The **gateway** serves that file.

> **Where to run this.** Commands on this page that start with `npm`, `node` or `docker build` run inside a clone of this repository: `git clone https://github.com/grand-stack/grandstack-federation`, then `cd grandstack-federation` (Node 22 or later; run `npm ci` once). Commands that need the running stack use the `grandstack` repository's compose files: see the [quickstart](https://www.grandstack.ai/quickstart/).

## Composing

With the stack up (the subgraphs must be reachable):

```sh
npm run compose      # reads the schemas from :4001 and :4010, writes gateway/supergraph.graphql
```

This runs Mesh's compose CLI (`@graphql-mesh/compose-cli`) with `gateway/mesh.config.ts`, which lists the two subgraphs. It detects a federation subgraph by its `_service` field and reads its schema from it. `gateway/supergraph.graphql` is committed, so a fresh clone runs without composing.

**Recompose whenever a subgraph's schema changes**: a new field in `wikipedia/schema.ts`, a change to `schema/federation.graphql` or to the server schema. The gateway watches the file and reloads it, but only a rebuilt image (`docker compose ... up --build gateway`) carries a new file into the container.

## Addresses

The supergraph stores each subgraph's address. Composing from your machine stores `http://localhost:4001/graphql` and `http://localhost:4010/graphql`, which are wrong inside the compose network. `gateway/gateway.config.ts` replaces them at run time:

```ts
transportEntries: {
  Neo4j: { location: process.env.NEO4J_URL ?? "http://server:4000/graphql" },
  Wikipedia: { location: process.env.WIKIPEDIA_URL ?? "http://wikipedia:4010/graphql" },
}
```

To compose against other addresses, set `NEO4J_URL` and `WIKIPEDIA_URL` when running `npm run compose` (they are then stored in the supergraph, so recompose with the defaults before you commit it; see the [recipe](recipes.md#try-it-beside-the-running-stack-first)); to run the gateway somewhere else, set the same variables on the gateway.

## The gateway

Hive Gateway runs in supergraph mode (`gateway/Dockerfile`, image `ghcr.io/graphql-hive/gateway:2.15.2`) on port 4000 with CORS for `http://localhost:3000` (`CORS_ORIGIN` to change). To run a second gateway on your machine against the published subgraph ports (handy while developing a subgraph): `NEO4J_URL=http://localhost:4001/graphql WIKIPEDIA_URL=http://localhost:4010/graphql npm run gateway`, which listens on port 4300 (`npm run gateway -- --port 4301` for another) and uses the same config.

## Why not Mesh's OpenAPI source for Wikipedia?

We built that first and it worked for linked films, but it handled a film with no link badly. See [what we tried](prototype-findings.md).
