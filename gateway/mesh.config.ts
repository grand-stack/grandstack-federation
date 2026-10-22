// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
// Composes the two subgraphs into gateway/supergraph.graphql. Run `npm run compose` with the federation stack up:
// the schemas are read from the subgraphs' published ports on your machine. The addresses stored in the supergraph are
// those same localhost ones; gateway.config.ts replaces them with the service names when the gateway runs in compose.
import { defineConfig, loadGraphQLHTTPSubgraph } from "@graphql-mesh/compose-cli";

export const composeConfig = defineConfig({
  subgraphs: [
    { sourceHandler: loadGraphQLHTTPSubgraph("Neo4j", { endpoint: process.env.NEO4J_URL ?? "http://localhost:4001/graphql" }) },
    { sourceHandler: loadGraphQLHTTPSubgraph("Wikipedia", { endpoint: process.env.WIKIPEDIA_URL ?? "http://localhost:4010/graphql" }) },
  ],
});
