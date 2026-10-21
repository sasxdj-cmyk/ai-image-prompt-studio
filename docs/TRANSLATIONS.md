# Translations

The application ships three independent language settings.

| Setting | Where it is used | Default |
| --- | --- | --- |
| Interface language | every label, button, message and warning | English |
| Prompt language | the prompt fragment each option contributes | English |
| Catalog language | the label and the prompt fragment of every option | English and Italian, both always present |

They are independent on purpose: you can work in Italian and generate an
English prompt, which is usually what an image model expects.

## Interface strings

The interface strings live in two files:

- `src/i18n/en.ts` — the reference dictionary;
- `src/i18n/it.ts` — the Italian dictionary.

Both export a flat object of `key: string` pairs. The English file is typed
with `as const`, so `TranslationKey` is the union of the known keys.

```ts
// en.ts
export const en = {
  'action.generate': 'Generate prompt',
  'prompt.negative': 'Negative prompt',
} as const;
```

```ts
// it.ts
export const it: Dictionary = {
  'action.generate': 'Genera prompt',
  'prompt.negative': 'Prompt negativo',
};
```

The keys are namespaced by area: `app.`, `nav.`, `topbar.`, `action.`,
`search.`, `category.`, `summary.`, `prompt.`, `warnings.`, `warning.detail.`,
`random.`, `presets.`, `history.`, `settings.`, `model.`, `confirm.`, `error.`,
`status.`, `panel.`.

## Rules

1. **Never hardcode a string in a component.** If it should be translatable,
   it goes through `useT()`:

   ```tsx
   const t = useT();
   return <button>{t('action.generate')}</button>;
   ```

2. **Never translate inside a component.** Use `t(key, params)` with
   placeholders:

   ```ts
   t('summary.total', { count: 12, categories: 4 });
   ```

   The placeholders are `{name}` and are replaced literally.

3. **The two dictionaries must have exactly the same keys.** A unit test
   (`src/i18n/i18n.test.ts`) compares them and fails with the list of the
   missing and the unused keys. Run `npm test` after every change.

4. **The English dictionary is the fallback.** If a key is missing in Italian,
   the English text is used, and the test reports it.

## Catalog strings

The catalog options carry their own translations inside the data files:

```json
{
  "id": "wardrobe.garments.outerwear.trench-coat",
  "label":  { "en": "Trench coat", "it": "Trench" },
  "prompt": { "en": "a classic trench coat", "it": "un trench classico" }
}
```

Rules for the Italian prompt fragments:

- keep the English technical term when the Italian word would be less precise
  for an image model (`oversized`, `tailoring`, `bokeh`, `cropped`);
- keep the same meaning as the English fragment: the two are interchangeable
  inside the same prompt, they are never mixed in one prompt;
- do not use the Italian text in the English fragment and vice versa.

## Finding the missing translations

```bash
npm test
```

The test `has no missing translation between English and Italian` lists every
key that is missing or unused. A small helper is also available for the
console:

```ts
import { missingKeys } from './src/i18n';
console.log(missingKeys('en', 'it'));
```

## Adding a language

1. Copy `src/i18n/it.ts` to `src/i18n/xx.ts` and translate the values.
2. Add the locale to `LOCALES` in `src/catalog/types.ts`.
3. Add it to `UI_LOCALES` in `src/i18n/index.ts`.
4. Add the `xx` label to every catalog entry in the data files.
5. Update `src/i18n/i18n.test.ts` to compare the new dictionary as well.

Steps 1 to 3 are enough for the interface; step 4 is needed for the catalog to
be complete in that language.
