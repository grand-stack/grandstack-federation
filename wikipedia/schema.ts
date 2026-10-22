// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
import { parse } from "graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import type { SummaryLookup } from "./summary.js";

// Movie and Person are entities owned by the Neo4j subgraph; this subgraph adds one field to each. The gateway asks for
// them with only the key (`wikipediaTitle`), and skips the call when a film or person has no link.
export const typeDefs = /* GraphQL */ `
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  """A short summary of an English Wikipedia article. Text and images come from Wikipedia and are available under CC BY-SA 4.0 and the licences stated on each page; show the page link when you use them."""
  type WikipediaSummary {
    """The article title."""
    title: String!
    """A one-line description, for example "1999 film by the Wachowskis"."""
    description: String
    """The first paragraph of the article, as plain text."""
    extract: String
    """A small image (thumbnail) for the article, if it has one."""
    thumbnailUrl: String
    """The full-size lead image for the article, if it has one."""
    imageUrl: String
    """Link to the article on Wikipedia."""
    pageUrl: String
    """The Wikidata item id of the article, for example Q25188."""
    wikidataId: String
  }

  type Movie @key(fields: "wikipediaTitle") {
    """English Wikipedia page title of this film. Provided by the Neo4j subgraph."""
    wikipediaTitle: String!
    """The English Wikipedia summary for this film. Null when the film is not linked, or Wikipedia has no such page."""
    wikipedia: WikipediaSummary
  }

  type Person @key(fields: "wikipediaTitle") {
    """English Wikipedia page title of this person. Provided by the Neo4j subgraph."""
    wikipediaTitle: String!
    """The English Wikipedia summary for this person. Null when the person is not linked, or Wikipedia has no such page."""
    wikipedia: WikipediaSummary
  }

  type Query {
    """Look up an English Wikipedia article summary by page title, for example "Inception (film)". Null when there is no such page."""
    wikipediaSummary("The page title." title: String!): WikipediaSummary
  }
`;

export function createSchema(lookup: SummaryLookup) {
  const reference = (ref: { wikipediaTitle: string }) => ref;
  return buildSubgraphSchema({
    typeDefs: parse(typeDefs),
    resolvers: {
      Query: { wikipediaSummary: (_: unknown, { title }: { title: string }) => lookup(title) },
      Movie: { __resolveReference: reference, wikipedia: (m: { wikipediaTitle: string }) => lookup(m.wikipediaTitle) },
      Person: { __resolveReference: reference, wikipedia: (p: { wikipediaTitle: string }) => lookup(p.wikipediaTitle) },
    },
  });
}
