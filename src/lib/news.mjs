// What's new: the latest versions across the projects, from their changelogs. Plain module (no Astro import),
// unit-tested in test/news.test.mjs.

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const text = (html) => decode(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/** First item of the version's Features list (or of its first list), as plain text, at most `max` characters. */
export function headline(html, max = 120) {
  const features = /<h\d[^>]*>[^<]*feature[^<]*<\/h\d>\s*<ul>\s*<li>([\s\S]*?)<\/li>/i.exec(html);
  const first = features ?? /<li>([\s\S]*?)<\/li>/i.exec(html) ?? /<p>([\s\S]*?)<\/p>/i.exec(html);
  if (!first) return "";
  // A nested list stays out of the line
  const t = text(first[1].split(/<ul>|<ol>/)[0]);
  return t.length > max ? `${t.slice(0, max - 1).replace(/[\s,.;:–-]+\S*$/, "")}…` : t;
}

/** Newest first (by `at`, the release time when known, else `date`), then by title; undated entries are left out. */
export function newest(items, n) {
  const key = (i) => i.at || i.date;
  return items
    .filter((i) => i.date)
    .sort((a, b) => b.date.localeCompare(a.date) || key(b).localeCompare(key(a)) || a.title.localeCompare(b.title))
    .slice(0, n);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Atom feed of `items` ({ title, version, date, url, html }), newest first. */
export function atom({ id, title, link, self, updated, items }) {
  const entries = items.map(
    (i) => `  <entry>
    <id>${esc(i.url)}</id>
    <title>${esc(`${i.title} ${i.version}`)}</title>
    <link rel="alternate" href="${esc(i.url)}"/>
    <updated>${i.date}T00:00:00Z</updated>
    <summary>${esc(headline(i.html, 200))}</summary>
    <content type="html">${esc(i.html)}</content>
  </entry>`,
  );
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${esc(id)}</id>
  <title>${esc(title)}</title>
  <link rel="alternate" href="${esc(link)}"/>
  <link rel="self" href="${esc(self)}"/>
  <updated>${updated}</updated>
  <author><name>juju35</name></author>
${entries.join("\n")}
</feed>
`;
}
