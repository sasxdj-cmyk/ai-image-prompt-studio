# Data format and versioning

The catalog data has two independent versions:

| Version | Where | Meaning |
| --- | --- | --- |
| **schema version** (`schemaVersion`) | every catalog document and package | the *format* of the data: which fields exist and how they are shaped |
| **catalog version** (`catalogVersion`) | every catalog document and package | the *content*: which options are included |

The schema version is currently `1`. The catalog version is a semantic version
(`major.minor.patch`):

- **patch** — typo fixes, better wording, added tags;
- **minor** — new options, new categories, new translations;
- **major** — a change that removes or renames existing identifiers.

`src/catalog/validate.ts` exports `CURRENT_SCHEMA_VERSION`, and both the
bundled catalog and every package declare the schema version they use.

## Document

```jsonc
{
  "schemaVersion": 1,
  "catalogVersion": "1.0.0",
  "name": "AI Image Prompt Studio base catalog",
  "generatedAt": "2026-10-21",
  "groups": [
    { "id": "subject", "name": { "en": "Subject & character", "it": "Soggetto e personaggio" }, "order": 10 }
  ],
  "categories": [
    {
      "id": "subject.look",
      "group": "subject",
      "order": 14,
      "name": { "en": "Editorial character", "it": "Personaggio editoriale" },
      "description": { "en": "…", "it": "…" },
      "control": "single",
      "maxSelections": 1,
      "subgroups": [],
      "source": { "kind": "terminology", "title": "…" },
      "entries": [
        {
          "id": "subject.look.editorial",
          "label": { "en": "Fashion editorial", "it": "Editoriale di moda" },
          "prompt": { "en": "fashion editorial", "it": "editoriale di moda" },
          "tags": ["fashion"],
          "status": "evergreen"
        }
      ]
    }
  ]
}
```

### Field reference

#### Document

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | number | yes | must be `1` |
| `catalogVersion` | string | yes | `x.y.z` |
| `name` | string | yes | human readable |
| `generatedAt` | string | yes | ISO date |
| `groups` | array | yes | the navigation groups |
| `categories` | array | yes | at least one |

#### Group

| Field | Type | Required |
| --- | --- | --- |
| `id` | string | yes |
| `name` | localised text | yes |
| `order` | number | yes |

#### Category

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | dot-namespaced, unique |
| `group` | string | yes | must exist in `groups` |
| `order` | number | yes | unique in the document |
| `name` | localised text | yes | |
| `description` | localised text | yes | |
| `control` | `single`/`multi`/`chips`/`swatch` | yes | |
| `maxSelections` | number | no | at least 1 |
| `minSelections` | number | no | at least 0 |
| `subgroups` | array | no | `{ id, name, order }` |
| `exclusiveGroups` | string[] | no | subgroups that exclude every other subgroup |
| `source` | source reference | no | |
| `entries` | array | yes | at least one |

#### Entry

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | dot-namespaced, unique in the document |
| `label` | localised text | yes | shown in the interface |
| `prompt` | localised text | yes | the fragment added to the prompt |
| `group` | string | no | a subgroup id of the category |
| `tags` | string[] | no | used by the search |
| `synonyms` | string[] | no | normalised tokens, used to detect repetitions |
| `conflicts` | string[] | no | entry ids that cannot be active together |
| `softConflicts` | string[] | no | unusual, but only reported |
| `requires` | string[] | no | entry ids that make sense together |
| `weight` | number | no | positive, relative weight for the randomiser |
| `color` | string | no | hex colour, for swatch controls |
| `notes` | localised text | no | short hint |
| `source` | source reference | no | |
| `status` | `verified`/`unverified`/`partial`/`evergreen` | no | |

#### Source reference

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | `evergreen`/`terminology`/`trend`/`documentation` | no | |
| `title` | string | yes | |
| `url` | string | no | only when it was actually fetched |
| `consulted` | string | no | ISO date |
| `note` | string | no | |

## Validation

`validateCatalogDocument(value)` checks a full document and returns
`{ errors, warnings }` instead of throwing, so the user interface can show the
problems inline.

`validateCatalogFragment(value)` checks a partial document: only the entries
are validated, because the metadata of a category comes from the manifest.

The rules are listed in [CATALOG.md](CATALOG.md#rules-the-engine-applies) for
the engine and in the source of `src/catalog/validate.ts` for the schema.

## Compatibility

- A package with a **different schema version** is rejected: the data format
  changed and the application has to be updated first.
- A package with an **older catalog version** is rejected: it would remove
  content that is already installed.
- A package that introduces a **category that does not exist in the manifest**
  is rejected. A new category needs a new release of the application.
- A package that leaves the resulting document invalid is rejected, and the
  current catalog is kept.

## Local storage keys

| Key | Content |
| --- | --- |
| `aips.v1.preferences` | the user preferences |
| `aips.v1.presets` | the saved presets |
| `aips.v1.history` | the last 50 generated prompts |
| `aips.v1.session` | the current selections and prompt |
| `aips.v1.catalog` | the installed catalog version |
| `aips.v1.catalog.history` | the previous catalog versions, for the rollback |

The `v1` in the key is the storage format version, not the catalog version: a
change of the storage format gets a new prefix, and the old data is ignored
instead of being misread.
