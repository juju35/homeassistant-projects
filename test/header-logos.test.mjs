// Logos at the top of a README: the project's own logo, then the brands it supports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { headerLogos } from "../src/lib/header-logos.ts";

const BASE = "https://raw.githubusercontent.com/juju35/ha-x/main/";
const BADGES =
  "[![Release](https://img.shields.io/github/v/release/juju35/ha-x)](https://github.com/juju35/ha-x/releases)\n" +
  "[![Validate](https://github.com/juju35/ha-x/actions/workflows/validate.yml/badge.svg)](x)\n";

test("own logo, then the brand logos in order", () => {
  const md = [
    "# ha-x",
    BADGES,
    `<p align="center"><img src="${BASE}images/icon.svg" alt="X Card" width="120"></p>`,
    "",
    '<p align="center">',
    `  <img src="${BASE}images/sonos.png" alt="Sonos" width="64">&nbsp;&nbsp;`,
    `  <img src="${BASE}images/spotify.png" alt="Spotify" width="64">`,
    "</p>",
    "",
    "Intro.",
    "",
    "## Supported integrations",
    `<p align="center"><img src="${BASE}images/later.png" alt="Later" width="64"></p>`,
  ].join("\n");
  const { own, brands } = headerLogos(md, BASE);
  assert.deepEqual(own, { src: `${BASE}images/icon.svg`, alt: "X Card" });
  assert.deepEqual(brands.map((b) => b.alt), ["Sonos", "Spotify"]);
});

test("a single brand logo after the own logo is a brand", () => {
  const md = `# x\n<p align="center"><img src="images/icon.svg" alt="X" width="120"></p>\n\n<p align="center">\n  <img src="images/alarmo.png" alt="Alarmo" width="64">\n</p>\n`;
  const { own, brands } = headerLogos(md, BASE);
  assert.equal(own.src, `${BASE}images/icon.svg`);
  assert.deepEqual(brands, [{ src: `${BASE}images/alarmo.png`, alt: "Alarmo" }]);
});

test("the archived banner and badges are skipped, relative paths resolved", () => {
  const md = [
    "# x",
    '<p align="center"><img src="images/archived.svg" alt="Archived" width="800"></p>',
    '<p align="center"><img src="./custom_components/x/brand/icon.png" alt="X" width="120"></p>',
    '<p align="center"><a href="https://my.home-assistant.io/redirect/x"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open"></a></p>',
  ].join("\n");
  const { own, brands } = headerLogos(md, BASE);
  assert.equal(own.src, `${BASE}custom_components/x/brand/icon.png`);
  assert.deepEqual(brands, []);
});

test("no logo at all, foreign hosts ignored, duplicate brands once", () => {
  assert.deepEqual(headerLogos("# x\n\nText\n", BASE), { own: null, brands: [] });
  const md = [
    '<p align="center"><img src="https://evil.example/x.png" alt="X" width="120"></p>',
    '<p align="center"><img src="images/a.png" alt="A" width="120"></p>',
    '<p align="center"><img src="images/b.png" alt="B"><img src="images/b2.png" alt="b"><img src="images/c.png" alt=""></p>',
  ].join("\n");
  const { own, brands } = headerLogos(md, BASE);
  assert.equal(own.alt, "A");
  assert.deepEqual(brands.map((b) => b.alt), ["B"]);
});
