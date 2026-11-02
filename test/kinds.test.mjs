// Type filter of the home page: the count on each button is the number of projects the button shows,
// the same number as the statistics above it ("22 Cards", "10 Integrations").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { inFilter, kindCounts } from "../src/lib/kinds.ts";

const { projects } = load(readFileSync(new URL("../src/data/projects.yaml", import.meta.url), "utf8"));

test("Cards and Integrations split the projects: one definition for the counts and the filter", () => {
  const counts = kindCounts(projects);
  const cards = projects.filter((p) => p.kind === "card").length;
  assert.equal(counts.card, cards, "Cards = the Lovelace cards, as in the statistics");
  assert.equal(counts.integration, projects.length - cards);
  assert.equal(counts.all, projects.length);
  assert.equal(counts.card + counts.integration, counts.all);
  for (const f of ["all", "card", "integration"]) {
    assert.equal(projects.filter((p) => inFilter(p.kind, f)).length, counts[f], f);
  }
});

test("an integration that ships a card is listed (and counted) once, under Integrations", () => {
  const withCard = projects.find((p) => p.kind === "integration" && p.withCard);
  assert.ok(withCard, "projects.yaml has an integration with its own card");
  assert.equal(inFilter(withCard.kind, "card"), false);
  assert.equal(inFilter(withCard.kind, "integration"), true);
  assert.equal(inFilter(withCard.kind, "all"), true);
});

test("the home page renders and filters with these helpers only", () => {
  const page = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
  assert.match(page, /from "\.\.\/lib\/kinds"/);
  assert.doesNotMatch(page, /withCard\)?\s*\)?;?\s*$|dataset\.withCard/m, "no second definition in the page script");
});
