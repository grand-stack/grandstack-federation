// Copyright (c) "Neo4j"
// Neo4j Sweden AB [http://neo4j.com]
// Checks a RUNNING federation stack (docker compose -f compose.yaml -f compose.federation.yaml up --build):
// one query returns Neo4j and Wikipedia data, unlinked entities give null, writes work through the gateway.
// Needs internet (the Wikipedia part is live). Creates and removes a movie titled "ZZ Federation ...".
//   npm run smoke         (GATEWAY_URL, NEO4J_URL, WIKIPEDIA_URL to change the addresses)
const gateway = process.env.GATEWAY_URL ?? "http://localhost:4000/graphql";
const neo4j = process.env.NEO4J_URL ?? "http://localhost:4001/graphql";
const wikipedia = process.env.WIKIPEDIA_URL ?? "http://localhost:4010/graphql";

type Result = { data?: any; errors?: { message: string }[] };
async function gql(url: string, query: string, variables?: Record<string, unknown>): Promise<Result> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  return (await res.json()) as Result;
}

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : detail ? `: ${detail}` : ""}`);
  if (!ok) failed++;
}
const show = (r: Result) => JSON.stringify(r).slice(0, 200);

const linked = await gql(gateway, `{ movies(where: { title: { eq: "Inception" } }) { title released wikipediaTitle wikipedia { title description pageUrl wikidataId } }
  people(where: { name: { eq: "Christopher Nolan" } }) { name directedCount wikipedia { description pageUrl } } }`);
const movie = linked.data?.movies?.[0];
check("a film returns Neo4j fields and its Wikipedia summary in one query", !linked.errors && movie?.released === 2010 && movie?.wikipedia?.pageUrl === "https://en.wikipedia.org/wiki/Inception" && /2010 film/.test(movie?.wikipedia?.description ?? ""), show(linked));
check("the Wikidata id comes through", movie?.wikipedia?.wikidataId === "Q25188", show(linked));
const person = linked.data?.people?.[0];
check("a person returns Neo4j fields and a Wikipedia summary", person?.directedCount === 8 && /filmmaker/.test(person?.wikipedia?.description ?? ""), show(linked));

const unlinked = await gql(gateway, `{ people(where: { name: { eq: "Madonna" } }) { name wikipediaTitle wikipedia { title } } }`);
check("an unlinked person gives null, with no error", !unlinked.errors && unlinked.data?.people?.[0]?.wikipediaTitle === null && unlinked.data?.people?.[0]?.wikipedia === null, show(unlinked));

const count = await gql(gateway, `{ moviesConnection { totalCount } }`);
check("a Neo4j-only query works through the gateway", count.data?.moviesConnection?.totalCount >= 150, show(count));

const many = await gql(gateway, `{ movies(limit: 8, sort: [{ released: DESC }]) { title wikipedia { title } } }`);
check("a list of films is resolved in one request", !many.errors && many.data?.movies?.length === 8, show(many));

const created = await gql(gateway, `mutation { createMovies(input: [{ title: "ZZ Federation Test", released: 2031 }]) { movies { title wikipediaTitle wikipedia { title } } } }`);
const made = created.data?.createMovies?.movies?.[0];
check("a mutation through the gateway works, and a new film starts unlinked (null, no error)", !created.errors && made?.title === "ZZ Federation Test" && made?.wikipedia === null, show(created));
const link = await gql(gateway, `mutation { updateMovies(where: { title: { eq: "ZZ Federation Test" } }, update: { wikipediaTitle: { set: "Inception" } }) { movies { wikipedia { title } } } }`);
check("setting wikipediaTitle links the film", link.data?.updateMovies?.movies?.[0]?.wikipedia?.title === "Inception", show(link));
const removed = await gql(gateway, `mutation { deleteMovies(where: { title: { eq: "ZZ Federation Test" } }) { nodesDeleted } }`);
check("the test film is removed again", removed.data?.deleteMovies?.nodesDeleted === 1, show(removed));

const sdl = await gql(neo4j, `{ _service { sdl } }`);
check("the Neo4j subgraph publishes its federation schema (@key on Movie and Person)", /type Movie[^{]*@key\(fields: "wikipediaTitle"\)/.test(sdl.data?._service?.sdl ?? "") && /type Person[^{]*@key/.test(sdl.data?._service?.sdl ?? ""), show(sdl));
const direct = await gql(wikipedia, `{ a: wikipediaSummary(title: "Inception (film)") { title } b: wikipediaSummary(title: "ZZ no such page 31415") { title } }`);
check("the Wikipedia subgraph answers directly, and null for a page that does not exist", direct.data?.a?.title === "Inception" && direct.data?.b === null, show(direct));

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
