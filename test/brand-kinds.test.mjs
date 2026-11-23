import { test } from "node:test";
import assert from "node:assert/strict";
import { INTEGRATIONS, brandKind } from "../src/lib/brand-kinds.mjs";

test("integration ids are brands-page ids", () => {
  for (const id of INTEGRATIONS) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
});

test("brandKind defaults to brand", () => {
  assert.equal(brandKind("zha"), "integration");
  assert.equal(brandKind("shelly"), "brand");
  assert.equal(brandKind("something-new"), "brand");
});
