// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
// Hive Gateway serving gateway/supergraph.graphql: the one GraphQL endpoint for both subgraphs.
// The supergraph was composed against localhost addresses; here the subgraph addresses are replaced for the compose network.
import { defineConfig } from "@graphql-hive/gateway";

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map((o) => o.trim()).filter(Boolean);

export const gatewayConfig = defineConfig({
  cors: { origin: origins, credentials: !origins.includes("*") },
  transportEntries: {
    Neo4j: { location: process.env.NEO4J_URL ?? "http://server:4000/graphql" },
    Wikipedia: { location: process.env.WIKIPEDIA_URL ?? "http://wikipedia:4010/graphql" },
  },
});
