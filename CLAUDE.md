# Repository guide for agents

Showcase site of the `ha-*` Home Assistant projects (cards, integrations, themes), built with Astro and
published on GitHub Pages: https://juju35.github.io/homeassistant-projects/. See `README.md` for how the
build works; this file is about how to work on it.

## Commits
- Write every commit message in **English**, following **Conventional Commits**:
  `type(scope): subject` — types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`,
  `perf`, `test`, `build`, `ci`, `revert` (`feat` for new projects or sections, `docs` for text and
  capture updates of `projects.yaml`). Subject in imperative mood, lower case, no trailing period, ≤ 72 chars.
- Author identity must be **juju35** (`juju35 <julienstephan29@gmail.com>`), never an assistant identity.
- The site has **no version**: no bump, no CHANGELOG, no tag — the PR number is the only suffix
  (`feat: add Notify Hub, Maintenance and Z-Wave Card (#131)`).
- Keep history clean and linear: small, focused commits; `main` is squash-merged
  (PR **title + description**), merged branches are deleted by `cleanup-branches.yml`.

## Before opening a PR — run the checks locally
```sh
npm ci
npm test                               # unit tests (node --test test/*.test.mjs)
ALLOW_MISSING_SOURCES=1 npm run build  # full build; offline/agent sandbox: api.github.com is refused (403),
                                       # releases are skipped — never publish such a build
node scripts/check-links.mjs dist      # internal links and #anchors of the build
node scripts/visual.mjs dist           # WebKit renders to visual/ (BROWSER=chromium BROWSER_PATH=… locally)
node scripts/check-captures.mjs        # every capture of projects.yaml answers 200 (also weekly in CI)
```
On a PR, the **Rendering** workflow renders the home, two project pages and the 404 in WebKit (light/dark,
desktop/phone) and attaches the captures as the `webkit-captures` artifact: look at them for Safari.
The build takes ~10 min the first time (every capture is fetched and re-encoded to WebP); run it in the
background. It fails on a duplicate id or any **IPTV** mention in the pages (`src/lib/dist-check.mjs`).

Deployment is automatic (`deploy.yml`) on push to `main`, daily, and within ~15 min of any project release
(`watch-releases.yml`): nothing to trigger by hand.

## Where things live
- `src/data/projects.yaml` — **the content**: `categories`, `contributors`, `projects` (one entry per repo,
  fields documented at the top of `README.md`). Almost every update is an edit of this file only.
- `src/lib/docs.ts`, `changelog.ts`, `releases.ts` — documentation, changelog and version read from each
  repo at build time: never copy README text or versions into the YAML.
- `src/lib/header-logos.ts` / `logos.ts` — the project's own logo and the **brand logos** are read from the
  top of its README (centered `<p align="center">` blocks before the first `##`). A missing or wrong logo is
  fixed **in the project's README**, not here.
- `src/lib/projects.ts` — `CUSTOM_ICONS` for icons MDI lacks (e.g. `matterLogo`); check an MDI name exists
  in `node_modules/@mdi/js/mdi.js` before using it.
- `astro.config.mjs` — `renamed`: add `"old-name": "new-name"` when a repo is renamed (old page redirects).

## Editorial rules (decided by the owner — keep them)
- **Never mention IPTV / `ha-iptv`** anywhere on the site.
- English everywhere; in lists of languages, **French first**.
- `highlights`: short English phrases, no trailing period, quoted when they contain `:`, `'` or `#`;
  describe what the user gets, not the implementation. `keywords`: add French and brand terms for search.
- Captures come **only from the project's repo** (`screenshots/` on `main`) and must also be shown in its
  README; dark twins (`X-dark.png`) are found automatically, set `dark` only when the name differs.
  One tab (`group`) per card/variant; animations under `animations`. Check every new file answers 200:
  `curl -sI https://raw.githubusercontent.com/juju35/<repo>/main/screenshots/<file>`.
- Icons: home tiles all use the site pastille (`icon` + `accent`); a card's page uses its card icon, an
  integration's page its own README icon, shown whole (never cropped to a circle). For a new project, take
  `icon`/`accent` from its brand icon (integrations) or card pastille.
- Archived/deprecated projects stay on the site (`archived: true`, optional `replacedBy`).
- `contributors`: only people who actually opened a PR / supplied a patch or translation — one tile per
  login, several entries allowed.
- Themes are a kind of their own (`kind: theme`); dashboard plugins without card types show as such.
- Layout follows the ha-* card charter (« C · Rayons illustrés »: one illustrated 90 px header per
  category). Check rendering in **Safari/WebKit**. Keep share pictures, home-screen icons, the official
  Marketplace badge colour and the rounded Buy Me a Coffee button. No mention of the owner's city.
- Visual reworks: propose design options to choose from before implementing.

## Routine: "update the site with the news and the new projects"
1. Clone the sources: for each slug of `projects.yaml` (and any new repo), fetch
   `https://raw.githubusercontent.com/juju35/<slug>/main/{README,CHANGELOG}.md` (the GitHub API is not
   reachable from the sandbox; raw files are).
2. **New repos**: the sandbox cannot list the owner's repos — ask, or take the names from the conversation.
   Add an entry (category, kind/withCard, icon, accent, tagline, summary, highlights, homeassistant from
   `hacs.json`, keywords, worksWith both ways, cardTypes, hero/screenshots/animations from its README).
3. **News**: read the CHANGELOG sections dated after the last site commit (`git log -1 --format=%ci`);
   keep `### Features` that matter to a user (new devices, sections, panels, integrations), skip editor-only
   options, fixes and maintenance. Reflect them in `highlights`/`tagline`/`keywords` and add the new
   captures the README now shows.
4. List the README captures not yet on the site (compare `screenshots/…` refs with the YAML) and add the
   ones tied to the news.
5. `npm test`, background build, PR titled like `feat: add X and this week's new features (#n)`.

## Conventions
- Prefer YAML over UI configuration; keep changes minimal; test iteratively.
- The `ha-*` repos stay **independent** and untouched by the site: anything missing (logo, capture,
  section) is fixed in that repo's README first.
- Call it the **Marketplace** (Home Assistant 2026.11), not HACS.
- Reply to GitHub issues in the **language of the issue / reporter**.
