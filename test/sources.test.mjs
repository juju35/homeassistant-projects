// Sources read at build time (READMEs, CHANGELOGs, GitHub API): retried, and a source that stays unavailable
// stops the build instead of publishing a degraded page, unless ALLOW_MISSING_SOURCES is set (offline dev).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchSource, tolerant } from "../src/lib/sources.ts";

const ok = (body = "ok") => new Response(body, { status: 200 });
const status = (s) => new Response("x", { status: s });
const fast = { delay: 0 };
const sequence = (...answers) => {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const a = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (a instanceof Error) throw a;
    return a();
  };
  return { impl, calls };
};

test("a transient failure is retried", async () => {
  const { impl, calls } = sequence(new TypeError("fetch failed"), () => status(502), () => ok("readme"));
  const res = await fetchSource("https://raw.test/README.md", { what: "x README", fetchImpl: impl, ...fast });
  assert.equal(await res.text(), "readme");
  assert.equal(calls.length, 3);
  assert.ok(calls[0].init.signal, "each attempt has a timeout");
});

test("a source that stays unavailable fails the build with a clear message", async () => {
  const { impl, calls } = sequence(new TypeError("fetch failed"));
  await assert.rejects(
    fetchSource("https://raw.test/ha-parcel/README.md", { what: "ha-parcel README", fetchImpl: impl, tolerant: false, ...fast }),
    (e) => /ha-parcel README/.test(e.message) && /3 attempts/.test(e.message) && /ALLOW_MISSING_SOURCES/.test(e.message),
  );
  assert.equal(calls.length, 3);
});

test("rate limits and server errors also fail the build", async () => {
  for (const s of [403, 429, 500, 503]) {
    const { impl } = sequence(() => status(s));
    await assert.rejects(fetchSource("https://api.test/x", { what: "x", fetchImpl: impl, tolerant: false, ...fast }), new RegExp(`HTTP ${s}`));
  }
});

test("a missing required file fails at once, an optional one is simply absent", async () => {
  let r = sequence(() => status(404));
  await assert.rejects(fetchSource("https://raw.test/README.md", { what: "README", fetchImpl: r.impl, tolerant: false, ...fast }), /HTTP 404/);
  assert.equal(r.calls.length, 1, "a 404 is not retried");
  r = sequence(() => status(404));
  assert.equal(await fetchSource("https://api.test/releases/latest", { what: "release", optional: true, fetchImpl: r.impl, ...fast }), null);
});

test("tolerant mode (offline development) warns and goes on without the source", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const { impl } = sequence(new TypeError("fetch failed"));
  assert.equal(await fetchSource("https://raw.test/README.md", { what: "x README", fetchImpl: impl, tolerant: true, ...fast }), null);
  assert.equal(warn.mock.callCount(), 1);
  assert.match(warn.mock.calls[0].arguments[0], /x README/);
});

test("ALLOW_MISSING_SOURCES turns tolerant mode on", (t) => {
  const before = process.env.ALLOW_MISSING_SOURCES;
  t.after(() => (before === undefined ? delete process.env.ALLOW_MISSING_SOURCES : (process.env.ALLOW_MISSING_SOURCES = before)));
  delete process.env.ALLOW_MISSING_SOURCES;
  assert.equal(tolerant(), false);
  for (const v of ["1", "true", "yes"]) {
    process.env.ALLOW_MISSING_SOURCES = v;
    assert.equal(tolerant(), true, v);
  }
  process.env.ALLOW_MISSING_SOURCES = "0";
  assert.equal(tolerant(), false);
});
