// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
// The Wikipedia subgraph: a small federated GraphQL server that adds a Wikipedia summary to Movie and Person.
import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { loadConfig } from "./config.js";
import { createSchema } from "./schema.js";
import { createSummaryLookup } from "./summary.js";

const config = loadConfig();
const yoga = createYoga({ schema: createSchema(createSummaryLookup(config)), graphqlEndpoint: "/graphql", landingPage: false });
const server = createServer((req, res) => {
  if (req.url === "/healthz") return void res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
  return yoga(req, res);
});
server.listen(config.port, () => console.log(`Wikipedia subgraph ready at http://localhost:${config.port}/graphql (${config.baseUrl})`));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { server.close(); process.exit(0); });
