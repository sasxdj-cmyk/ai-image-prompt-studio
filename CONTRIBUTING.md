# Contributing to AI Image Prompt Studio

Thanks for taking the time to contribute. The most valuable contribution is
usually **catalog content**: a well written, non redundant option in the right
category.

## Before you start

```bash
npm install
npm run verify     # lint + typecheck + tests + build
```

`npm run verify` must pass before you open a pull request.

## Repository layout

| Path | What lives there |
| --- | --- |
| `src/catalog/manifest.ts` | the structure of every category |
| `src/catalog/data/*.json` | the catalog content |
| `src/catalog/validate.ts` | the schema the data must satisfy |
| `src/engine/` | the prompt engine (pure TypeScript, no React) |
| `src/i18n/` | the interface strings |
| `src/models/profiles.ts` | the model profiles |
| `src/ui/` | the React components |

The rule that keeps this project maintainable: **the UI never contains catalog
content**. If you find yourself typing a list of garment names into a
component, it belongs in a data file instead.

## Adding catalog content

Read [docs/ADDING_CATEGORIES.md](docs/ADDING_CATEGORIES.md) for the full
guide. The short version:

1. Pick the category (and subgroup) the option belongs to.
2. Add an entry to the matching file in `src/catalog/data/`.
3. Give it a stable, dot-namespaced id that never changes once published.
4. Write a short English prompt fragment (a noun phrase, no full sentences)
   and the Italian equivalent.
5. Add tags so the option is findable with the search box.
6. Run `npm test` — the catalog tests validate the whole file.

### Writing rules for the prompt fragments

- **A fragment, not a sentence.** `a classic trench coat`, not
  `The subject is wearing a classic trench coat`.
- **No duplicates.** If an existing option says the same thing, extend that
  one instead of adding a second.
- **Do not add marketing noise.** "masterpiece", "8K", "ultra detailed",
  "best quality" and similar clichés are not vocabulary. They live in the
  opt-in `finish.boost` category.
- **Keep the technical terms in English** in the Italian fragments when the
  Italian word would be less precise for an image model (`oversized`,
  `tailoring`, `bokeh`).
- **Never encode a stereotype.** Physical traits, ethnicity and profession are
  independent categories on purpose: do not couple them inside one option.

## Adding a category

1. Add one entry to `CATEGORY_MANIFEST` in `src/catalog/manifest.ts` with a
   unique `id`, a unique `order`, a group, a control type, a limit and the
   localised name and description.
2. Add the options to the matching data file.
3. Run `npm test`: the catalog test fails if a manifest category has no content
   or a data file has a category the manifest does not declare.

No component has to change. The browser, the panel, the summary and the
warnings all read the definition from the data.

## Adding a model profile

Read [docs/ADDING_MODEL_PROFILES.md](docs/ADDING_MODEL_PROFILES.md).

The rules are strict on purpose: a profile states how a model is fed, so every
factual claim has to come from the vendor's own documentation, with the URL
and the consultation date. If the behaviour is not documented, write
"not documented" instead of guessing, and set `verification` to
`unverified` or `partial`.

## Adding or changing a translation

Read [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md). Interface strings live in
`src/i18n/en.ts` and `src/i18n/it.ts` and must have exactly the same keys; a
test enforces it. Catalog options carry their own `en` and `it` strings inside
the data files.

## Code contributions

- Keep the engine free of React and of DOM access: it must stay testable with
  `vitest` in a node environment.
- Add a test for every behaviour you add or change. The suite must stay green.
- Prefer small, focused modules over long files.
- Follow the existing style: TypeScript strict mode, named exports, no
  `any`, no comments that merely restate the code.

## Commit and pull request style

- One topic per commit, imperative subject line, e.g.
  `Add wool fabrics to the materials category`.
- Describe in the pull request what changed, why, and how you verified it
  (`npm run verify`, plus a screenshot for interface changes).
- Reference the issue when there is one.

## Changing the product name

The product name is a working name and is easy to change. It appears in five
places:

| Where | What to change |
| --- | --- |
| `package.json` | `name` and `description` |
| `index.html` | the `<title>` and the meta description |
| `src/i18n/en.ts` | `app.name` and `app.tagline` |
| `src/i18n/it.ts` | `app.name` and `app.tagline` |
| `README.md`, `README.it.md` | the title and the references |

The name is not used as a key anywhere: the catalog, the presets and the local
storage use their own identifiers, so renaming the product does not invalidate
the data of the users. The GitHub repository name and the `package.json`
`name` have to stay in sync for the deployment to work.

## License

The project is released under the **MIT license**: you can use, modify,
distribute and sell it, including commercially, as long as the copyright notice
is kept. Contributions you submit are accepted under the same license.

If the project is useful to you, a [PayPal donation](https://paypal.me/SalvaCucca)
via the **Dona / Donate** button is welcome — but it is never required, and
the application works exactly the same without it.

## Reporting a problem

Open an issue with the steps to reproduce, the browser version and what you
expected. For a prompt that came out wrong, please include the prompt and the
selections that produced it: that is usually enough to find the conflicting
entries.
