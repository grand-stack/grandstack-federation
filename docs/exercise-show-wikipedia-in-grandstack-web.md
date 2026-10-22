# Exercise: show Wikipedia in grandstack-web

A follow-up task for a developer or a coding agent. `grandstack-web` is deliberately unchanged by this repo; with the federation stack running it already talks to the gateway, so it can ask for the new fields. The task is to show them.

## The goal

On a film's page and a person's page, show the Wikipedia **description**, the first paragraph (**extract**) and a **link to the article**, with a "Source: Wikipedia (CC BY-SA 4.0)" credit. When there is no Wikipedia data (`wikipedia: null`), show nothing, with no error message. The image is optional: the web app already draws generated posters and avatars.

## What you need

- The federation stack running: `docker compose -f compose.yaml -f compose.federation.yaml up --build` in `grandstack`.
- The query to add. It was run against the gateway:

```graphql
{
  movies(where: { title: { eq: "Heat" } }) {
    title released
    wikipedia { description extract pageUrl thumbnailUrl }
  }
}
```

It returns `"1995 crime drama film by Michael Mann"` and the article text for *Heat*. The same `wikipedia { ... }` selection works on `people`.

## Steps

1. Read `grandstack-web/docs/customising.md` and `docs/recipes.md`, then find the movie page and person page queries (under `src/`, with their `.graphql` documents) and the codegen setup.
2. Add the `wikipedia { description extract pageUrl }` selection to both queries. Run codegen against the running gateway (`GRAPHQL_URL=http://localhost:4000/graphql`, as the web docs describe) so the generated types include it.
3. Render it in the pages, handling `null`. Keep the layout working at phone width (the web app's browser checks test for horizontal overflow).
4. Check it: open a linked film (*Inception*), a linked person (*Christopher Nolan*) and an unlinked person (*Madonna*) in a browser, and run the web app's `npm run e2e`.

## Notes

- Wikipedia is a live dependency: expect `null` plus an error if it is slow or rate limiting. The Neo4j fields still arrive. Decide how the page should behave, and test it by stopping the `wikipedia` container.
- Without the federation stack (the plain `docker compose up`), the server has no `wikipedia` field and the new query fails validation. A real change to the web app would need to decide whether it requires federation, or tolerate both.
- **No reference solution is shipped** for this exercise, unlike the auth exercise. The query above is verified; the web changes are yours.
