# Home Assistant projects

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

Showcase site for my Home Assistant custom integrations and Lovelace cards.

Live site: https://juju35.github.io/homeassistant-projects/

## How it works

The site is a static [Astro](https://astro.build) site. Every project is an entry of `src/data/projects.yaml`:

- `slug`: the repository name (`github.com/juju35/<slug>`)
- `title`: the display name
- `kind`: `card` or `integration`
- `withCard`: for an integration, whether it ships its own Lovelace card
- `category`: the id of one of the `categories` declared at the top of the file
- `icon`: an MDI icon export name from [`@mdi/js`](https://pictogrammers.com/library/mdi/), e.g. `mdiWeatherPartlyCloudy`
- `accent`: the project's accent colour
- `tagline`, `summary`, `highlights`: the descriptive text
- `homeassistant`: the minimum Home Assistant version
- `cardTypes`: the Lovelace card types the project provides
- `hero`, `screenshots`, `animations`: images given as `{ src, dark, caption, group }`, where `src` and `dark` are file names inside the `screenshots/` folder of the repository's `main` branch, and `group` is the gallery tab the image is shown under (one card or variant per tab, e.g. `Card`, `Mini card`, `Map card`). Animations always go under an `Animations` tab.

Images are fetched from `raw.githubusercontent.com` at build time and re-encoded as WebP at the widths the pages need (animated GIFs as animated WebP) by `src/lib/optimize.ts`, so new captures show at the next (daily) build. Their sizes are read at build time (`src/lib/imgsize.ts`) to reserve their space and to frame portrait captures from the top. When an entry has no `dark`, the build looks for a twin in the repository (`src/lib/twins.ts`): `X-dark.png` for a light `X.png`, or `X-light.png` for a dark-default `X.png` (same for `.gif` animations), so a twin added to a repository shows on the site at the next build. `dark` gives the dark-theme twin of an image.

The documentation of each project (features, prerequisites, configuration and options, entities, actions, how it works) is taken from its `README.md` at build time (`src/lib/docs.ts`) and rendered on the project page, followed by the last versions of its `CHANGELOG.md` (`src/lib/changelog.ts`). Installation, screenshots, development and translation sections are left out. The site is rebuilt every day to pick up README changes.

The HTML of the READMEs and CHANGELOGs is sanitized at build time (`src/lib/readme-html.ts`, [sanitize-html](https://github.com/apostrophecms/sanitize-html)): pictures, folds, tables, links and alerts are kept; scripts, event handlers, frames, forms, styles and `javascript:` / `data:` links (data images excepted) are dropped. Ids coming from a README are prefixed with `readme-` so they never collide with the page's own sections (`#overview`, `#install`…); a GitHub-style `#options` link still lands on `#readme-options`.

## Add a project

1. Add an entry to `src/data/projects.yaml`.
2. Make sure the referenced images exist in the repository's `screenshots/` folder on `main`.
3. Open a pull request.

## Develop locally

```sh
npm ci        # install dependencies
npm test      # unit tests (node --test)
npm run dev   # start the dev server
npm run build # build the static site into dist/
ALLOW_MISSING_SOURCES=1 npm run build # offline: build without the READMEs, CHANGELOGs or releases that can't be fetched
```

## Deployment

The site is built and deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`, every day, or manually with `workflow_dispatch`. `.github/workflows/watch-releases.yml` also checks the latest release of every project every 15 minutes and starts a deployment as soon as one of them changed, so a new release shows up on its page (version, changelog, documentation) within about 15 minutes, without anything to set up in the project repositories. The build needs network access to `raw.githubusercontent.com` (READMEs, CHANGELOGs, screenshots) and `api.github.com` (releases). Every request is tried three times (`src/lib/sources.ts`); a source that stays unavailable fails the build with a message naming it, so nothing is deployed and the site already online stays as it is (a repository without a release or a `CHANGELOG.md` simply shows none). The build also fails when a page has an id twice or mentions IPTV (`src/lib/dist-check.mjs`). `.github/workflows/keepalive.yml` re-enables the scheduled workflows every week, so GitHub doesn't turn them off after 60 days without a commit. In the repository's Settings → Pages, Source must be set to "GitHub Actions".

## License

[MIT](LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
