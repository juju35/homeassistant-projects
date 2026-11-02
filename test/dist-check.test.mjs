// Checks run on the built pages at the end of the build (astro.config.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { checkDist, checkPage } from "../src/lib/dist-check.mjs";

test("an id used twice is reported", () => {
  const problems = checkPage('<section id="overview"></section><h3 id="overview">Overview</h3><p id="x"></p>', "p.html");
  assert.equal(problems.length, 1);
  assert.match(problems[0], /p\.html: duplicate ids #overview \(×2\)/);
  assert.deepEqual(checkPage('<section id="overview"></section><h3 id="readme-overview">Overview</h3>'), []);
});

test("any mention of IPTV is reported, in text as well as in links", () => {
  assert.equal(checkPage("<p>like the cards of ha-parcel, ha-iptv and ha-carburants-france</p>").length, 1);
  assert.equal(checkPage("<p>like in the IPTV card</p>").length, 1);
  assert.equal(checkPage('<a href="https://github.com/juju35/ha-iptv">x</a>').length, 1);
  assert.deepEqual(checkPage("<p>Home Assistant projects</p>"), []);
});

// The real build, when there is one (CI runs these checks inside `npm run build`)
const dist = new URL("../dist/", import.meta.url);
test("the built site passes the checks", { skip: !existsSync(dist) && "no dist/ (run npm run build)" }, async () => {
  assert.deepEqual(await checkDist(dist.pathname), []);
});
