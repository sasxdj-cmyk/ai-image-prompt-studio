# Example files

Two ready-to-use files to try the import features of AI Image Prompt Studio.

| File | What it is | How to use it |
| --- | --- | --- |
| `catalog-package-1.1.0.json` | a valid **catalog package** (version 1.1.0) that adds two atmospheric conditions to the `scene.atmosphere` category | *Settings → Catalog → Import a catalog package* |
| `presets-example.json` | a valid **preset export** with two ready-made looks | *Presets → Import* |

Both files are checked by the test suite (`src/examples.test.ts`): they are
parsed with the real parsers and the ids are verified against the bundled
catalog, so an example that goes stale fails the build instead of confusing a
user.

## The catalog package

A package **replaces** the entries of the categories it contains, so the file
carries the complete list of the `scene.atmosphere` entries: the nine that
already exist plus the two new ones.

```jsonc
{
  "kind": "catalog-package",
  "schemaVersion": 1,
  "catalogVersion": "1.1.0",
  "baseCatalogVersion": "1.0.0",
  "categories": [
    { "id": "scene.atmosphere", "entries": [ /* the full list */ ] }
  ]
}
```

After the import the catalog version becomes `1.1.0` and the two new options
(*Heat haze*, *Dust in the light*) appear in the *Atmosphere & weather*
category. The previous catalog stays available as a rollback point:
*Settings → Catalog → Restore the previous catalog*.

The format is described in [../CATALOG_PACKAGES.md](../CATALOG_PACKAGES.md).

## The preset export

```jsonc
{
  "kind": "preset-export",
  "version": 1,
  "exportedAt": "2026-10-21T12:00:00.000Z",
  "presets": [
    {
      "id": "example-street-editorial",
      "name": "Street editorial",
      "profileId": "general",
      "selections": { "subject.look": ["subject.look.streetwear"], "…": [] }
    }
  ]
}
```

Importing it adds two presets to the *Presets* panel:

- **Street editorial** — a full-body street look with a bomber jacket, straight
  trousers and soft light;
- **Studio beauty close-up** — a close-up beauty portrait with the
  `z-image-turbo` profile.

Use *Restore selections* to load one of them into the current session.
