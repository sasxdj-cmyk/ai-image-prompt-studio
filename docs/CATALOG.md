# The catalog

The catalog is the data behind AI Image Prompt Studio. It is split in two parts
so that content and structure can evolve independently:

| Part | File | Contains |
| --- | --- | --- |
| Structure | `src/catalog/manifest.ts` | identity, order, control type, limits, subgroups, localised name and description of every category |
| Content | `src/catalog/data/*.json` | the options themselves |

`src/catalog/builtin.ts` merges the two into a `CatalogDocument` and
`src/catalog/validate.ts` checks the result. The UI never imports a data file
directly: it reads the merged document from the application context.

## Current size

| Metric | Value |
| --- | --- |
| Categories | 72 |
| Options | 803 |
| Groups | 11 |
| Subgroups | 15 (all in the clothing category) |
| Multiple-selection categories | 28 |
| Single-selection categories | 44 |
| Catalog version | 1.0.0 |
| Data schema version | 1 |

Per group:

| Group | Categories | Options |
| --- | --- | --- |
| subject | 5 | 54 |
| body | 6 | 42 |
| appearance | 14 | 105 |
| styling | 6 | 58 |
| wardrobe | 6 | 226 |
| footwear | 3 | 55 |
| accessories | 6 | 58 |
| pose | 7 | 50 |
| scene | 3 | 37 |
| capture | 14 | 101 |
| finish | 2 | 17 |

## Category definition

```jsonc
{
  "id": "wardrobe.garments",       // stable, dot-namespaced, never reused
  "group": "wardrobe",             // one of the eleven groups
  "order": 71,                     // global assembly order, lower comes first
  "name":    { "en": "Garments", "it": "Capi" },
  "description": { "en": "…", "it": "…" },
  "control": "chips",              // single | multi | chips | swatch
  "maxSelections": 6,              // optional
  "minSelections": 0,              // optional
  "exclusiveGroups": ["dresses"],  // optional: mutually exclusive subgroups
  "subgroups": [
    { "id": "outerwear", "name": { "en": "Outerwear & coats", "it": "Capispalla e cappotti" }, "order": 60 }
  ],
  "source": { "kind": "terminology", "title": "General fashion wardrobe vocabulary" },
  "entries": [ /* … */ ]
}
```

### Control types

| Type | Behaviour | Used by |
| --- | --- | --- |
| `single` | one active option, selecting another replaces it | most categories |
| `multi` | any number of options, toggled independently | feature categories |
| `chips` | like `multi`, rendered as a wrap grid of chips | clothing, patterns |
| `swatch` | like `chips`, with a colour swatch | the colour palette |

### Order

`order` defines where the fragments of a category land in the prompt. The
values are spaced by ten so a category can be inserted later without
renumbering everything. The current order is:

```
subject (10-14)  body (20-25)  appearance (30-50)  styling (60-65)
wardrobe (70-75)  footwear (80-82)  accessories (85-90)  pose (95-101)
scene (105-107)  capture (110-123)  finish (130-131)
```

## Entry definition

```jsonc
{
  "id": "wardrobe.garments.outerwear.trench-coat",
  "group": "outerwear",                       // optional subgroup id
  "label":  { "en": "Trench coat", "it": "Trench" },
  "prompt": { "en": "a classic trench coat", "it": "un trench classico" },
  "tags": ["outerwear", "classic"],
  "synonyms": ["trench"],                      // normalised tokens for redundancy
  "conflicts": [],                            // entry ids that cannot coexist
  "softConflicts": [],                        // unusual, but only reported
  "requires": [],                             // entry ids that make sense together
  "weight": 1,                                // relative weight for the randomiser
  "color": "#c19a6b",                         // optional hex, for swatch controls
  "notes": { "en": "…", "it": "…" },          // optional hint
  "source": { "kind": "evergreen", "title": "…" },
  "status": "evergreen"                       // verified | unverified | partial | evergreen
}
```

### Rules the engine applies

| Rule | Effect |
| --- | --- |
| `maxSelections` | the options beyond the limit stay selected in the interface but are left out of the prompt, with a warning |
| `conflicts` | the second option of the pair is left out of the prompt; both stay selected so the user can fix it |
| `exclusiveGroups` (category) | the same, for example a dress against a top |
| `softConflicts` | both options stay in the prompt, the combination is reported |
| `requires` | a warning: the option works better together with another one |
| `synonyms` | the second option is removed as a repetition, with a warning |
| identical `prompt` text | the second option is removed as a duplicate |

Nothing is ever added to the prompt that the user did not select.

### Provenance and verification

`source.kind` describes where the wording comes from:

| Kind | Meaning |
| --- | --- |
| `evergreen` | timeless descriptive vocabulary, no specific source needed |
| `terminology` | general industry term, no single source |
| `trend` | tied to a documented season or collection |
| `documentation` | taken from official model documentation |

`status` records how confident the project is about the entry:
`evergreen` (descriptive vocabulary), `verified` (checked against a source),
`partial` (partly verified) and `unverified`.

The catalog is descriptive vocabulary written from domain knowledge and is
marked `evergreen` at category level. **Six entries are marked `verified`**
and carry their own source URL and consultation date:

| Entry | Source |
| --- | --- |
| `wardrobe.materials.wool-melton` | Wikipedia - Melton |
| `wardrobe.materials.wool-gabardine` | Wikipedia - Gabardine |
| `footwear.style.espadrilles` | Wikipedia - Espadrille |
| `capture.dof.bokeh` | Wikipedia - Bokeh |
| `capture.dof.deep` | Wikipedia - Bokeh |
| `capture.lighting.type.rembrandt` | Wikipedia - Rembrandt lighting |

A unit test fails if a `verified` entry loses its source, if its source has no
URL or no consultation date, or if the list drifts away from the data. The
sources and the checks that did **not** succeed are documented in
[research/terminology-notes.md](research/terminology-notes.md).

## Files

| File | Categories |
| --- | --- |
| `src/catalog/data/01-subject-body.json` | subject and body |
| `src/catalog/data/02-appearance.json` | skin, face, eyes, make-up |
| `src/catalog/data/03-hair.json` | hair and grooming |
| `src/catalog/data/04-wardrobe.json` | clothing |
| `src/catalog/data/05-footwear-accessories.json` | shoes and accessories |
| `src/catalog/data/06-pose-scene.json` | pose and setting |
| `src/catalog/data/07-capture-finish.json` | photography, lighting, style |

## Validation

`npm test` runs the catalog tests, which check that:

- the merged document is valid against the schema;
- every manifest category has content and every data category is declared;
- the entry ids are unique across the whole catalog;
- every label and prompt fragment exists in English and Italian and is not
  empty;
- the categories have a description, a control type and a unique order;
- the catalog is large enough to be useful (at least 50 categories and 500
  options);
- the clothing category keeps its depth.

## Writing a good option

- The prompt fragment is a **noun phrase**, not a sentence.
- It describes what is visible, not what it means: `wide-leg trousers`, not
  `elegant bottoms`.
- It is specific: `a classic trench coat` rather than `a coat`.
- It does not repeat another option: if two options say the same thing, one of
  them is wrong.
- It keeps the English technical term in the Italian fragment when the
  translated word would be less precise for an image model.
