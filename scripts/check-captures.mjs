// Every capture named in projects.yaml (hero, screenshots, animations and their explicit dark twins) must answer
// 200 on raw.githubusercontent.com: a renamed or deleted file in a project's repo would otherwise leave a hole in
// the gallery. Run weekly by .github/workflows/links.yml; exits 1 with the list of missing files.
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

const OWNER = "juju35";
const data = load(readFileSync(new URL("../src/data/projects.yaml", import.meta.url), "utf8"));

const urls = new Map(); // url -> "slug: file"
for (const p of data.projects) {
  const shots = [p.hero, ...(p.screenshots ?? []), ...(p.animations ?? [])].filter(Boolean);
  for (const s of shots)
    for (const file of [s.src, s.dark].filter(Boolean))
      urls.set(`https://raw.githubusercontent.com/${OWNER}/${p.slug}/main/screenshots/${file}`, `${p.slug}: ${file}`);
}

async function status(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.status !== 429 && res.status < 500) return res.status;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  return "unreachable";
}

const queue = [...urls.keys()];
const missing = [];
await Promise.all(
  Array.from({ length: 16 }, async () => {
    for (let url; (url = queue.shift()); ) {
      const s = await status(url);
      if (s !== 200) missing.push(`${urls.get(url)} (${s})`);
    }
  }),
);

console.log(`${urls.size} captures checked`);
if (missing.length) {
  console.error(`${missing.length} missing:\n  ${missing.sort().join("\n  ")}`);
  process.exit(1);
}
