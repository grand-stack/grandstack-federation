// Rules for deciding whether a Wikipedia summary is the right page for a film or a person. Pure functions, no network.
export interface Summary {
  type?: string;
  titles?: { normalized?: string; canonical?: string };
  title?: string;
  description?: string;
  extract?: string;
  wikibase_item?: string;
}

export interface Link { page: string; wikidataId?: string }

const PERSON_WORDS = /\b(actors?|actress(?:es)?|directors?|filmmakers?|film makers?|producers?|screenwriters?|comedians?|cinematographers?|stuntmen|stuntman|animators?|sound designers?)\b/i;

/** Page titles to try for a film, most specific first. */
export function filmCandidates(title: string, released: number): string[] {
  return [`${title} (${released} film)`, `${title} (film)`, title];
}

/** Page titles to try for a person, most specific first. */
export function personCandidates(name: string): string[] {
  return [name, `${name} (actor)`, `${name} (actress)`, `${name} (director)`, `${name} (filmmaker)`];
}

function pageOf(summary: Summary): string | undefined {
  return summary.titles?.normalized ?? summary.title;
}

function usable(summary: Summary): boolean {
  // Disambiguation pages and error documents are never the answer.
  return summary.type === "standard" && !!pageOf(summary);
}

/**
 * A film page: a standard page that is plainly about a film from about the right year. Two kinds of evidence are accepted:
 * the page title itself says "(YYYY film)" with that year (give or take one), or the description names a film and the year.
 */
export function matchFilm(summary: Summary, released: number): Link | undefined {
  if (!usable(summary)) return undefined;
  const years = [released - 1, released, released + 1].map(String);
  const titleYear = pageOf(summary)!.match(/\((\d{4}) film\)$/)?.[1];
  if (titleYear && years.includes(titleYear)) return { page: pageOf(summary)!, wikidataId: summary.wikibase_item };
  const description = summary.description ?? "";
  if (!/\bfilm\b|\bmovie\b/i.test(description)) return undefined;
  const text = `${description} ${summary.extract ?? ""}`;
  if (!years.some((y) => text.includes(y))) return undefined;
  return { page: pageOf(summary)!, wikidataId: summary.wikibase_item };
}

/** A person page: a standard page whose description names a screen-related occupation. */
export function matchPerson(summary: Summary): Link | undefined {
  if (!usable(summary)) return undefined;
  if (!PERSON_WORDS.test(summary.description ?? "")) return undefined;
  return { page: pageOf(summary)!, wikidataId: summary.wikibase_item };
}
