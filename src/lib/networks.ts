// Cities and networks of a public transport project, read from its README (ha-public-transport): the networks that
// have a provider of their own (the rows of its "Supported networks" table, but the generic one) and the networks
// reached through GTFS-RT (the table between its `networks` markers, written there by its scripts/networks_readme.py).
// Plain module, no Astro import: unit-tested with `node --test` (test/networks.test.mjs).

export interface Network {
  /** The city or the area it serves, as the README names it. */
  area: string;
  name: string;
  url: string;
  /** Publishes traffic alerts. */
  alerts: boolean;
}

export interface Networks {
  /** Networks with a provider of their own (STAR, IDFM, TCL, CTS…). */
  own: Network[];
  /** Networks reached through the generic GTFS-RT provider, sorted by area. */
  gtfs: Network[];
}

const START = "<!-- networks:start -->";
const END = "<!-- networks:end -->";

/** The cells of a Markdown table row, `|` escaped as `\|` kept inside its cell. */
const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

const link = (cell: string): { name: string; url: string } | null => {
  const m = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(cell);
  return m ? { name: m[1], url: m[2] } : null;
};

const yes = (cell: string) => /^yes\b/i.test(cell);

/** The rows of the first Markdown table in `md` (header and separator left out). */
const tableRows = (md: string): string[][] => {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^\s*\|/.test(l));
  if (start < 0) return [];
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!/^\s*\|/.test(line)) break;
    rows.push(cells(line));
  }
  return rows;
};

export function networks(md: string): Networks | null {
  const a = md.indexOf(START);
  const b = md.indexOf(END);
  if (a < 0 || b < a) return null;
  const gtfs = tableRows(md.slice(a + START.length, b))
    .map(([area, net, alerts]) => {
      const l = link(net ?? "");
      return l ? { area: area === "—" ? "" : area, ...l, alerts: yes(alerts ?? "") } : null;
    })
    .filter((n): n is Network => n !== null);
  // "| Network | Area | Modes | Real time | Alerts | Data |" under "## Supported networks"
  const section = /^##\s+Supported networks\s*$/m.exec(md);
  const own = section
    ? tableRows(md.slice(section.index))
        .map((row) => {
          const l = link(row[0] ?? "");
          return l ? { area: row[1] ?? "", ...l, alerts: yes(row[4] ?? "") } : null;
        })
        .filter((n): n is Network => n !== null)
    : [];
  return gtfs.length || own.length ? { own, gtfs } : null;
}
