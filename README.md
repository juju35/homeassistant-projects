# Home Assistant projects

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
- `hero`, `screenshots`, `animations`: images given as `{ src, dark, caption }`, where `src` and `dark` are file names inside the `screenshots/` folder of the repository's `main` branch

Images are loaded from `raw.githubusercontent.com`, so the site always shows the current captures without a rebuild. `dark` gives the dark-theme twin of an image.

## Add a project

1. Add an entry to `src/data/projects.yaml`.
2. Make sure the referenced images exist in the repository's `screenshots/` folder on `main`.
3. Open a pull request.

## Develop locally

```sh
npm ci        # install dependencies
npm run dev   # start the dev server
npm run build # build the static site into dist/
```

## Deployment

The site is built and deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`, or manually with `workflow_dispatch`. In the repository's Settings → Pages, Source must be set to "GitHub Actions".

## License

[MIT](LICENSE)
