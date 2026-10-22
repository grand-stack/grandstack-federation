// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
import { createYoga } from "graphql-yoga";
import { describe, expect, it } from "vitest";
import { createSchema } from "../wikipedia/schema.js";
import type { WikipediaSummary } from "../wikipedia/summary.js";

const inception: WikipediaSummary = { title: "Inception", description: "2010 film", extract: "x", thumbnailUrl: null, imageUrl: null, pageUrl: "https://en.wikipedia.org/wiki/Inception", wikidataId: "Q25188" };
const schema = createSchema(async (title) => (title === "Inception" ? inception : null));
// Run through Yoga over HTTP (in memory), as in production, so the test also covers the real request path.
const yoga = createYoga({ schema, logging: false });
async function run(query: string, variables?: Record<string, unknown>) {
  const res = await yoga.fetch("http://localhost/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  return (await res.json()) as { data?: unknown; errors?: unknown };
}

describe("wikipedia subgraph schema", () => {
  it("exposes the federation fields", async () => {
    const result = await run("{ _service { sdl } }");
    const sdl = (result.data as { _service: { sdl: string } })._service.sdl;
    expect(sdl).toContain('@key(fields: "wikipediaTitle")');
    expect(sdl).toContain("wikipedia: WikipediaSummary");
  });
  it("resolves entities by key, with null for an unknown page", async () => {
    const result = await run(
      "query($r: [_Any!]!) { _entities(representations: $r) { __typename ... on Movie { wikipedia { title pageUrl wikidataId } } ... on Person { wikipedia { title } } } }",
      { r: [{ __typename: "Movie", wikipediaTitle: "Inception" }, { __typename: "Person", wikipediaTitle: "Nobody" }] },
    );
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ _entities: [
      { __typename: "Movie", wikipedia: { title: "Inception", pageUrl: "https://en.wikipedia.org/wiki/Inception", wikidataId: "Q25188" } },
      { __typename: "Person", wikipedia: null },
    ] });
  });
  it("answers a direct lookup", async () => {
    expect((await run('{ wikipediaSummary(title: "Inception") { title } }')).data).toEqual({ wikipediaSummary: { title: "Inception" } });
    expect((await run('{ wikipediaSummary(title: "x") { title } }')).data).toEqual({ wikipediaSummary: null });
  });
});
