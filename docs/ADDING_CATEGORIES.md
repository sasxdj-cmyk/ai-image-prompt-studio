# Adding a category

The category system is data driven: a new category needs one entry in the
manifest, its options in a data file, and nothing else. No component, no CSS
rule and no test needs to change.

## 1. Choose the group and the order

The eleven groups are fixed in `CATALOG_GROUPS` (`src/catalog/manifest.ts`):

```
subject   body   appearance   styling   wardrobe   footwear
accessories   pose   scene   capture   finish
```

The `order` of a category decides where its fragments land in the prompt.
Orders are spaced by ten, so a new category can be inserted without renumbering
the others. Use the first free multiple of ten in the group you want.

## 2. Declare the category in the manifest

Open `src/catalog/manifest.ts` and add one call to the helper `m(...)`:

```ts
m(
  'wardrobe.bags',            // id: lowercase, dot-namespaced, stable forever
  'wardrobe',                 // group
  76,                         // order
  ['Bags', 'Borse'],          // name: [english, italian]
  ['The bags carried by the subject.', 'Le borse portate dal soggetto.'],
  'multi',                    // control: single | multi | chips | swatch
  2,                          // maxSelections (optional)
  [                           // subgroups (optional)
    ['shoulder', ['Shoulder bags', 'Borse a spalla'], 10],
  ],
),
```

The helper signature is:

```ts
m(
  id: string,
  group: CatalogGroupId,
  order: number,
  name: [english, italian],
  description: [english, italian],
  control: 'single' | 'multi' | 'chips' | 'swatch',
  maxSelections: number | undefined,
  subgroups?: Array<[id, [english, italian], order]>,
  sourceTitle?: string,
  exclusiveGroups?: string[],
)
```

`exclusiveGroups` lists the subgroups that cannot be combined with any other
subgroup of the same category. It is how the clothing category prevents a
dress from being combined with a top.

## 3. Add the options to a data file

Pick the data file that matches the group (`src/catalog/data/*.json`) and add
the category with its entries:

```jsonc
{
  "categories": [
    {
      "id": "wardrobe.bags",
      "entries": [
        {
          "id": "wardrobe.bags.shoulder.tote",
          "group": "shoulder",
          "label":  { "en": "Leather tote", "it": "Tote in pelle" },
          "prompt": { "en": "a structured leather tote", "it": "una tote bag strutturata in pelle" },
          "tags": ["bag", "leather"],
          "status": "evergreen"
        }
      ]
    }
  ]
}
```

Rules for the ids:

- lowercase, dot-namespaced, globally unique;
- once published, **never change an id**: the ids are the key used by presets
  and by saved sessions;
- the convention is `<category>.<subgroup>.<option>`, for example
  `wardrobe.garments.outerwear.trench-coat`.

## 4. Run the tests

```bash
npm test
```

The catalog tests verify that the manifest and the data files agree, that the
ids are unique, and that every label and prompt fragment exists in both
languages. A missing or malformed option fails the suite with the exact path of
the problem.

## 5. Check the interface

```bash
npm run dev
```

The new category appears in the left column, under its group, and the option
search filters it like every other category.

## Checklist

- [ ] The id is stable, unique and dot-namespaced.
- [ ] The order fits between its neighbours.
- [ ] The name and the description exist in English and Italian.
- [ ] The control type matches the content: one obvious winner → `single`,
      many combinable options → `multi` or `chips`.
- [ ] `maxSelections` is set for multiple-selection categories.
- [ ] Every option has a short noun-phrase prompt fragment in both languages.
- [ ] No option repeats an existing one.
- [ ] `npm test` passes.
