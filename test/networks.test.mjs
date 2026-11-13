// Cities and networks of ha-public-transport, read from its README.
import { test } from "node:test";
import assert from "node:assert/strict";
import { networks } from "../src/lib/networks.ts";

const README = [
  "## Supported networks",
  "",
  "| Network | Area | Modes | Real time | Alerts | Data |",
  "|---|---|---|---|---|---|",
  "| [STAR](https://www.star.fr) | Rennes Métropole (France) | Bus, metro | Yes | Yes, with their level | x |",
  "| [TCL](https://www.tcl.fr) | Lyon | Metro | Yes | Yes | x |",
  "| **GTFS-RT** | Any network | All | Yes | When the network publishes service alerts | x |",
  "",
  "Through GTFS-RT: Toulouse…",
  "",
  "<details>",
  "<!-- networks:start -->",
  "2 networks, from the catalogue.",
  "",
  "| City / area | Network | Alerts |",
  "|---|---|---|",
  "| Bordeaux Métropole | [Réseau urbain et scolaire TBM](https://transport.data.gouv.fr/datasets/tbm) | Yes |",
  "| Pau \\| Béarn | [Idelis](https://transport.data.gouv.fr/datasets/idelis) | — |",
  "<!-- networks:end -->",
  "</details>",
].join("\n");

test("the networks with a provider of their own, then the GTFS-RT ones", () => {
  const n = networks(README);
  assert.deepEqual(
    n.own.map((x) => [x.name, x.area, x.alerts]),
    [
      ["STAR", "Rennes Métropole (France)", true],
      ["TCL", "Lyon", true],
    ],
  );
  assert.deepEqual(n.gtfs, [
    { area: "Bordeaux Métropole", name: "Réseau urbain et scolaire TBM", url: "https://transport.data.gouv.fr/datasets/tbm", alerts: true },
    { area: "Pau | Béarn", name: "Idelis", url: "https://transport.data.gouv.fr/datasets/idelis", alerts: false },
  ]);
});

test("nothing for a README without the markers", () => {
  assert.equal(networks("# A card\n\n| a | b |\n|---|---|\n| [x](https://x.y) | z |"), null);
});
