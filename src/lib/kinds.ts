// Type filter of the home page ("All", "Cards", "Integrations"): one definition for the counts rendered on the
// buttons, the statistics and what the filter shows in the browser. Cards and integrations split the projects:
// an integration that ships its own card ("Integration + card") is an integration.
// Plain module, no Astro import: unit-tested with `node --test` (test/kinds.test.mjs).
export type Kind = "card" | "integration";
export type KindFilter = "all" | Kind;

export const inFilter = (kind: string, filter: string) => filter === "all" || kind === filter;

export const kindCounts = (items: { kind: string }[]): Record<KindFilter, number> => ({
  all: items.length,
  card: items.filter((p) => inFilter(p.kind, "card")).length,
  integration: items.filter((p) => inFilter(p.kind, "integration")).length,
});
