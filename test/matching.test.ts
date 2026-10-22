import { describe, expect, it } from "vitest";
import { filmCandidates, matchFilm, matchPerson, personCandidates } from "../scripts/matching.js";
import fixtures from "./fixtures/summaries.json" with { type: "json" };

describe("film matching", () => {
  it("accepts a film page whose description names the year", () => {
    expect(matchFilm(fixtures.matrix, 1999)).toEqual({ page: "The Matrix", wikidataId: "Q83495" });
    expect(matchFilm(fixtures.heatFilm, 1995)?.page).toBe("Heat (1995 film)");
  });
  it("tolerates a release year that is one off", () => {
    expect(matchFilm(fixtures.matrix, 2000)?.page).toBe("The Matrix");
  });
  it("rejects a page that is not about a film", () => {
    expect(matchFilm(fixtures.heatEnergy, 1995)).toBeUndefined();
    expect(matchFilm(fixtures.parasiteBiology, 2019)).toBeUndefined();
  });
  it("rejects disambiguation pages and error documents", () => {
    expect(matchFilm(fixtures.alienDisambiguation, 1979)).toBeUndefined();
    expect(matchFilm(fixtures.problem, 1979)).toBeUndefined();
  });
  it("rejects a film of the same name from another year", () => {
    expect(matchFilm(fixtures.alienFilmWrongYear, 1986)).toBeUndefined();
  });
  it("accepts a page whose title says \"(YYYY film)\" with the right year even when the description does not say film", () => {
    expect(matchFilm(fixtures.pianistBiopic, 2002)?.page).toBe("The Pianist (2002 film)");
    expect(matchFilm(fixtures.pianistBiopic, 1990)).toBeUndefined();
  });
  it("tries the most specific title first", () => {
    expect(filmCandidates("Heat", 1995)).toEqual(["Heat (1995 film)", "Heat (film)", "Heat"]);
  });
});

describe("person matching", () => {
  it("accepts a page described with a screen occupation", () => {
    expect(matchPerson(fixtures.nolan)).toEqual({ page: "Christopher Nolan", wikidataId: "Q25191" });
  });
  it("rejects a namesake with another occupation, and non-pages", () => {
    expect(matchPerson(fixtures.chrisEvansPresenter)).toBeUndefined();
    expect(matchPerson(fixtures.parasiteBiology)).toBeUndefined();
    expect(matchPerson(fixtures.alienDisambiguation)).toBeUndefined();
    expect(matchPerson(fixtures.problem)).toBeUndefined();
  });
  it("accepts a plural occupation (a page about two filmmakers), but not a film page reached by redirect", () => {
    expect(matchPerson(fixtures.wachowskis)?.page).toBe("The Wachowskis");
    expect(matchPerson(fixtures.aliensForActress)).toBeUndefined();
  });
  it("tries the plain name first", () => {
    expect(personCandidates("Tom Hanks")[0]).toBe("Tom Hanks");
  });
});
