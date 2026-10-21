# Adding a model profile

A model profile describes **how one image model is fed**. It is data, not code:
`src/models/profiles.ts` is a list of `ModelProfile` objects.

```ts
export interface ModelProfile {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  reference: string;             // the model this profile targets
  order: string[];               // category ids, in assembly order
  omit: string[];                // category ids that are not sent
  negative: {
    supported: boolean;
    note?: LocalizedText;        // required when supported is false
  };
  promptStyle: 'fragments' | 'sentences';
  prefix?: LocalizedText;
  guidance?: LocalizedText;      // shown in the settings panel
  examples?: { prompt: string; note?: LocalizedText }[];
  source?: SourceRef;            // the documentation the facts come from
  verification: 'verified' | 'unverified' | 'partial' | 'evergreen';
  verifiedOn?: string;           // ISO date
  tags: string[];
}
```

## The rules

1. **Every factual claim comes from the vendor's own documentation.** Add the
   `source` with the title, the URL and the consultation date. If you cannot
   reach the source, the profile is `unverified` and must not state behaviour
   as fact.
2. **Do not guess a syntax.** Do not claim that a model "requires" a particular
   prompt structure unless the documentation says so. Describe what the
   documentation says: step counts, guidance, context length, negative prompt
   support, reference models, licenses.
3. **Document the absence.** If the official reference implementation has no
   negative prompt parameter, say exactly that in `negative.note` instead of
   pretending the feature exists.
4. **The profile does not clear the selections.** Changing the profile changes
   the order and the content, and the app reports the categories the profile
   omits. A profile that would need to clear the selections is a bad profile.
5. **`order` lists category ids that exist in the manifest.** A typo is
   silently ignored by the engine, so copy the ids from
   `src/catalog/manifest.ts`.

## The `order` list

`order` is the full list of category ids in the order the model should receive
them. The general profile uses the catalog order:

```ts
const FULL_ORDER = [
  'subject.presentation', 'subject.count', 'subject.age', /* … */
  'finish.boost',
];
```

A profile that wants a different order copies the list and rearranges it; a
profile that wants to leave something out removes the ids and adds them to
`omit`. Categories that are in neither list keep the catalog order and are
still sent, so a profile can never silently lose content by accident.

## The `promptStyle`

- `fragments`: the fragments are joined with commas and no final period.
- `sentences`: the same, with a final period, and an optional `prefix` is
  placed in front (`a photograph of, …`).

The choice is a studio convention informed by the documentation of the model;
the `guidance` field explains it to the user.

## Adding a profile

1. Write the profile object in `src/models/profiles.ts` and add it to the
   `MODEL_PROFILES` array.
2. Document the facts in `docs/research/model-profiles.md`: the source, the URL,
   the consultation date and the quoted passage.
3. Set `verification` honestly: `verified` only when the documentation was
   actually read, `partial` when only some behaviours are documented,
   `unverified` otherwise, `evergreen` for studio conventions such as the
   general profile.
4. Run `npm test` and `npm run verify`.

The profile selector in the top bar and the settings panel read the list
automatically.

## Example: a minimal profile

```ts
{
  id: 'my-model',
  name: { en: 'My Model', it: 'Il mio modello' },
  description: {
    en: 'Short context model: the numeric exposure settings are left out.',
    it: 'Modello a contesto breve: le impostazioni numeriche di esposizione sono escluse.',
  },
  reference: 'vendor/model-name',
  order: FULL_ORDER,
  omit: ['capture.technical'],
  negative: {
    supported: false,
    note: {
      en: 'The reference implementation does not expose a negative prompt.',
      it: 'L’implementazione di riferimento non espone un prompt negativo.',
    },
  },
  promptStyle: 'fragments',
  guidance: {
    en: 'The reference pipeline caps the text at 256 tokens, so the profile keeps the prompt compact.',
    it: 'La pipeline di riferimento limita il testo a 256 token, quindi il profilo mantiene il prompt compatto.',
  },
  source: {
    kind: 'documentation',
    title: 'Official model card',
    url: 'https://example.org/model-card',
    consulted: '2026-10-21',
  },
  verification: 'verified',
  verifiedOn: '2026-10-21',
  tags: ['example'],
}
```
