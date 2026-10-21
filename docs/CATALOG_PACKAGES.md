# Catalog packages and updates

The catalog shipped with the application is always complete: the core features
never need a connection. Updates exist to add or correct content without
forcing the user to reinstall the application.

**Only data is ever read.** A package is JSON. The application never downloads
or executes code, and the online check is disabled until the user explicitly
enables it and configures a URL.

## The two mechanisms

### 1. Import a package from a file

*Settings → Catalog → Import a catalog package.*

The file is parsed, validated and applied. If anything is wrong the current
catalog is kept and the reason is shown. The catalog that was active before the
import stays available as a rollback point.

### 2. Check online for a new version

*Settings → Catalog → Allow online catalog updates* has to be enabled and a
manifest URL has to be configured. Then *Check for catalog updates* performs:

1. `GET <manifestUrl>` → a JSON manifest;
2. a version comparison: if the manifest is not newer, the app says the catalog
   is already up to date;
3. `GET <packageUrl>` → the package JSON;
4. the same validation and application as the manual import.

If the network is unavailable the app says so and the bundled catalog keeps
working. Nothing is cached from a failed request.

## Manifest format

```json
{
  "catalogVersion": "1.1.0",
  "packageUrl": "https://example.org/catalog/catalog-1.1.0.json",
  "publishedAt": "2026-11-01",
  "notes": "Adds the winter fabrics and fixes two Italian fragments.",
  "schemaVersion": 1
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `catalogVersion` | yes | semantic version |
| `packageUrl` | yes | absolute URL of the package |
| `publishedAt` | no | ISO date |
| `notes` | no | shown in the interface |
| `schemaVersion` | no | the schema the package uses |

## Package format

```json
{
  "kind": "catalog-package",
  "schemaVersion": 1,
  "catalogVersion": "1.1.0",
  "baseCatalogVersion": "1.0.0",
  "publishedAt": "2026-11-01",
  "description": "Adds the winter fabrics and fixes two Italian fragments.",
  "categories": [
    {
      "id": "wardrobe.materials",
      "entries": [
        {
          "id": "wardrobe.materials.wool-melton",
          "label": { "en": "Melton wool", "it": "Lana Melton" },
          "prompt": { "en": "dense melton wool", "it": "lana Melton compatta" },
          "tags": ["wool"],
          "status": "evergreen"
        }
      ]
    }
  ],
  "removedCategoryIds": [],
  "removedEntryIds": []
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `kind` | yes | must be `catalog-package` |
| `schemaVersion` | yes | must match the application |
| `catalogVersion` | yes | semantic version, not older than the installed one |
| `baseCatalogVersion` | no | the version the package was built against |
| `publishedAt` | no | ISO date |
| `description` | no | shown in the interface |
| `categories` | yes | the categories whose entries are replaced |
| `removedCategoryIds` | no | categories to drop |
| `removedEntryIds` | no | entries to drop from every category |

### What a package does

- For every category in `categories`, **the entries of that category are
  replaced** by the entries of the package. Send the complete list of entries
  of the category, not only the new ones.
- The categories that are not mentioned are left untouched.
- `removedEntryIds` removes entries from every category.
- The result is validated as a whole. If it is invalid, nothing is applied.

## Publishing a package

1. Copy the entries of the affected categories from the data files.
2. Edit them, keeping the ids stable.
3. Bump the catalog version: `minor` for new content, `patch` for corrections.
4. Write the package JSON with `kind`, `schemaVersion`, `catalogVersion` and the
   affected categories.
5. Validate it before publishing:

   ```ts
   import { parseCatalogPackage, applyCatalogPackage } from './src/updates/catalog-updates';
   import { getBuiltinCatalog } from './src/catalog/builtin';

   const parsed = parseCatalogPackage(await readFile('package.json', 'utf8'));
   if (!parsed.package) throw new Error(parsed.error);
   const outcome = applyCatalogPackage(getBuiltinCatalog(), parsed.package);
   console.log(outcome.status);
   ```

6. Publish the package and a manifest pointing to it, for example:

   ```
   https://example.org/catalog/manifest.json
   https://example.org/catalog/catalog-1.1.0.json
   ```

7. Write the changes in `CHANGELOG.md`.

A quick automated check is available as a test: add the package to
`src/updates/catalog-updates.test.ts` and assert that
`applyCatalogPackage` returns `applied` and that the expected options are
present.

## Rollback

*Settings → Catalog → Restore the previous catalog* brings back the last
version that was installed before the current one. The application keeps the
three most recent versions in `localStorage`, so a bad update can always be
undone without a new download.

## What a package cannot do

- It cannot introduce a new category: the structure of the categories lives in
  the manifest, inside the application. A new category needs a release.
- It cannot change the schema version.
- It cannot downgrade the catalog.
- It cannot execute code, load a script or fetch anything else.
