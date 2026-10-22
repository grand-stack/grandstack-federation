# grandstack-federation

GraphQL federation for GRANDstack. The Neo4j server becomes a **subgraph**, a small **Wikipedia subgraph** is added, and a **gateway** composes them, so one query returns movie and person data from Neo4j together with a Wikipedia summary, image and page link.

![Federation overview](docs/diagrams/federation-overview.svg)

1. Clients (`grandstack-web`, agents, curl) send one query to the gateway.
2. The gateway (Hive Gateway) serves the composed supergraph on port 4000 and plans each query.
3. `supergraph.graphql` is composed from the two subgraphs by `npm run compose` and committed.
4. The Neo4j subgraph is `grandstack-server` with `FEDERATION=true`; Movie and Person are keyed on `wikipediaTitle`.
5. The Wikipedia subgraph adds a `wikipedia` field to Movie and Person and calls the public Wikipedia API.
6. `seed/wikipedia-links.cypher` stores each film's and person's Wikipedia page at server start.

```graphql
{
  movies(where: { title: { eq: "Heat" } }) {
    title released
    wikipedia { description extract pageUrl thumbnailUrl }
  }
}
```

returns the film from Neo4j and `"1995 crime drama film by Michael Mann"` from Wikipedia. A film or person with no link (for example *Madonna*) gives `wikipedia: null`, with no error.

> **Needs internet.** The Wikipedia part calls the live public Wikipedia API. Content, descriptions and rate limits are Wikipedia's, and its text is available under CC BY-SA 4.0 (show the `pageUrl` when you display it). The stack is open, with no auth; see [auth and agents](docs/how-it-works.md#auth-and-agents).

## Run it

Clone `grandstack`, `grandstack-server`, `grandstack-web` and this repo side by side into one folder, then start the stack from the `grandstack` folder:

```sh
mkdir grand-stack && cd grand-stack      # any folder name
for repo in grandstack grandstack-server grandstack-web grandstack-federation; do git clone https://github.com/grand-stack/$repo; done
cd grandstack
docker compose -f compose.yaml -f compose.federation.yaml up --build
```

| Open | What |
| --- | --- |
| http://localhost:4000/graphql | The gateway: the one endpoint for everything (the web app uses it too) |
| http://localhost:3000 | `grandstack-web`, unchanged, now talking to the gateway |
| http://localhost:4001/graphql | The Neo4j subgraph, for development |
| http://localhost:4010/graphql | The Wikipedia subgraph, for development |

The first start of the gateway needs a `gateway/supergraph.graphql`; the committed one works as it is. After changing either subgraph's schema, run `npm run compose` (see [composition](docs/composition.md)). With the stack up, run `npm ci` and then `npm run smoke` inside the `grandstack-federation` folder.

## Documentation

| Read | To learn |
| --- | --- |
| [How it works](docs/how-it-works.md) | The pieces, one federated query step by step, auth and agents |
| [The subgraphs](docs/subgraphs.md) | The `FEDERATION` setting, the `@key`, the Wikipedia subgraph, caching, errors |
| [Linking films and people to Wikipedia](docs/linking.md) | The link builder, matching rules, coverage, what is not matched |
| [Composition and the gateway](docs/composition.md) | `npm run compose`, the supergraph, addresses, when to recompose |
| [What we tried](docs/prototype-findings.md) | Mesh's OpenAPI handler, version pins, and why the Wikipedia subgraph is hand-written |
| [Recipes](docs/recipes.md) | Link another entity, add another subgraph |
| [Exercise: show Wikipedia in grandstack-web](docs/exercise-show-wikipedia-in-grandstack-web.md) | A follow-up task for a developer or coding agent |
| [Testing](docs/testing.md) | Unit tests, the smoke script |
| [Troubleshooting](docs/troubleshooting.md) | Errors we hit and their fixes |

Working with a coding agent? Start with [AGENTS.md](AGENTS.md).

Last verified: grandstack-federation v0.1.1 with grandstack-server v0.9.0, grandstack-web v0.5.1, Hive Gateway 2.15.2, Mesh compose CLI 1.8.4, `@apollo/subgraph` 2.14.4, Neo4j 2026.10 community, under Podman 6 on macOS.

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). The same licence applies to every GRANDstack repository and to [grandstack.ai](https://www.grandstack.ai).
