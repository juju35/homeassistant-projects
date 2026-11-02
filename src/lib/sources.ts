// Network sources read at build time: READMEs and CHANGELOGs on raw.githubusercontent.com, releases on the GitHub API.
// Each request is retried (3 attempts, growing pause, 30 s timeout). When a source stays unavailable, the build
// fails with a message naming it, so a passing incident never gets published as a page without its documentation,
// changelog or version: the deployment stops and the site already online stays as it is.
// For offline development, ALLOW_MISSING_SOURCES=1 (and `astro dev`) only warn and go on without that source.
// Plain module, no Astro import: unit-tested with `node --test` (test/sources.test.mjs).

export interface SourceOptions {
  /** What is fetched, for the messages ("ha-parcel README"). */
  what: string;
  /** A 404 means "there is none" (no release yet, no CHANGELOG): `null`, no error. */
  optional?: boolean;
  /** Warn and return `null` instead of failing. Defaults to ALLOW_MISSING_SOURCES. */
  tolerant?: boolean;
  init?: RequestInit;
  attempts?: number;
  /** Pause before the 2nd attempt, in ms (doubled each time). */
  delay?: number;
  timeout?: number;
  fetchImpl?: typeof fetch;
}

/** ALLOW_MISSING_SOURCES=1|true|yes: build without the sources that can't be reached. */
export const tolerant = () => /^(1|true|yes)$/i.test(process.env.ALLOW_MISSING_SOURCES ?? "");

// Worth another try: network errors, timeouts, rate limits and server errors.
const transient = (s: number) => s === 403 || s === 408 || s === 429 || s >= 500;

export async function fetchSource(url: string, opts: SourceOptions): Promise<Response | null> {
  const { what, optional = false, init, attempts = 3, delay = 1000, timeout = 30_000, fetchImpl = fetch } = opts;
  let reason = "";
  for (let i = 0; i < attempts; i++) {
    if (i) await new Promise((r) => setTimeout(r, delay * 2 ** (i - 1)));
    try {
      const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeout) });
      if (res.ok) return res;
      if (res.status === 404 && optional) return null;
      reason = `HTTP ${res.status}`;
      if (!transient(res.status)) break;
    } catch (e) {
      reason = (e as Error).message || String(e);
    }
  }
  const failure = `${what}: ${url} could not be loaded (${reason}${/HTTP 404/.test(reason) ? "" : `, ${attempts} attempts`}).`;
  if (opts.tolerant ?? tolerant()) {
    console.warn(`[sources] ${failure} Built without it (ALLOW_MISSING_SOURCES or astro dev): don't publish this build.`);
    return null;
  }
  throw new Error(
    `${failure} The build stops so that a page without it isn't published; set ALLOW_MISSING_SOURCES=1 to build without it (offline development).`,
  );
}
