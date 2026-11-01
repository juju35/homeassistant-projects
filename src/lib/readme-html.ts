// HTML rendered from the READMEs and CHANGELOGs of the projects, made safe to publish on this site.
// `marked` keeps raw HTML as is, so a README could otherwise carry a <script>, an onerror= handler or a
// javascript: link onto juju35.github.io. Everything goes through sanitize-html with an allowlist of what the
// READMEs actually use (pictures, folds, tables, links, alerts, task lists); the site's own markup (badges, copy
// buttons, permalinks) is added after this step.
// Plain module, no Astro import: unit-tested with `node --test` (test/readme-html.test.mjs).
import sanitizeHtml from "sanitize-html";

/** Ids coming from a README live under this prefix, so they never collide with the page's own (#overview…). */
export const ID_PREFIX = "readme-";

const ALIGN = ["align"];
const OPTIONS = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "div", "span",
    "blockquote", "pre", "code", "kbd", "samp", "var",
    "a", "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small", "sub", "sup", "abbr", "q", "cite", "dfn",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td",
    "img", "picture", "source", "figure", "figcaption",
    "details", "summary", "input",
  ],
  // `id` / `name` are kept for the README's own anchors, prefixed (see transform below)
  allowedAttributes: {
    "*": ["id", "title", "lang", "dir"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "srcset", "alt", "width", "height", "align", "loading"],
    source: ["srcset", "media", "type", "width", "height", "sizes"],
    code: ["class"],
    details: ["open"],
    ol: ["start", "reversed", "type"],
    td: ["align", "colspan", "rowspan"],
    th: ["align", "colspan", "rowspan", "scope"],
    col: ["span"],
    colgroup: ["span"],
    input: ["type", "checked", "disabled"],
    p: ALIGN, div: ALIGN, h1: ALIGN, h2: ALIGN, h3: ALIGN, h4: ALIGN, h5: ALIGN, h6: ALIGN,
  },
  // Only fenced-code languages ("language-yaml"): no README can borrow the page's classes
  allowedClasses: { code: ["language-*"] },
  allowedSchemes: ["http", "https", "mailto"],
  // data: URIs only for images (inline badges); never javascript:, vbscript:, data: on links
  allowedSchemesByTag: { img: ["http", "https", "data"], source: ["http", "https"] },
  allowedSchemesAppliedToAttributes: ["href", "src", "srcset", "cite"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard" as const,
  // Void elements written without their closing tag (else <source> would come out as <source></source>)
  selfClosing: [...sanitizeHtml.defaults.selfClosing, "source", "col", "wbr"],
  // Script and style bodies go away with their tag (the text of other dropped tags is kept, escaped)
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "template", "svg", "math"],
};

const prefixed = (prefix: string, value: string) => (value.startsWith(prefix) ? value : prefix + value);

/** Sanitizes rendered README / CHANGELOG HTML; ids and names of anchors, and #links to them, get `prefix`. */
export function sanitizeReadme(html: string, prefix = ID_PREFIX): string {
  const transform = (tagName: string, attribs: Record<string, string>) => {
    const out = { ...attribs };
    if (out.id) out.id = prefixed(prefix, out.id);
    if (tagName === "a") {
      if (out.name) out.name = prefixed(prefix, out.name);
      if (out.href?.startsWith("#") && out.href.length > 1) out.href = `#${prefixed(prefix, out.href.slice(1))}`;
      // A new tab never gets a handle on this page
      if (out.target) {
        out.target = "_blank";
        out.rel = "noopener noreferrer";
      } else delete out.rel;
    }
    // Task lists: read-only check boxes, nothing else
    if (tagName === "input") return { tagName, attribs: { type: "checkbox", disabled: "", ...(out.checked !== undefined ? { checked: "" } : {}) } };
    return { tagName, attribs: out };
  };
  return sanitizeHtml(html, {
    ...OPTIONS,
    transformTags: Object.fromEntries(OPTIONS.allowedTags.map((t) => [t, transform])),
    // An <input> that isn't a task list check box is dropped
    exclusiveFilter: (frame) => frame.tag === "input" && (frame.attribs.type ?? "").toLowerCase() !== "checkbox",
  });
}

/**
 * In-page links (#readme-…) whose target isn't on the page, e.g. to a README section the site leaves out
 * ("Screenshots", shown by the gallery instead): sent to `resolve(anchor)` (an in-page #id or a GitHub URL).
 */
export function resolveAnchors(html: string, ids: Set<string>, resolve: (anchor: string) => string, prefix = ID_PREFIX): string {
  return html.replace(/<a\b([^>]*?)\bhref="#([^"]+)"([^>]*)>/g, (m, before: string, id: string, after: string) => {
    if (ids.has(id) || !id.startsWith(prefix)) return m;
    const to = resolve(id.slice(prefix.length));
    const external = /^https?:/.test(to) ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a${before}href="${to.replace(/"/g, "&quot;")}"${external}${after}>`;
  });
}

/** Every id="…" of a piece of HTML. */
export const idsOf = (html: string) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
