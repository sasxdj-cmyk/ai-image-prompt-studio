# Model profiles: sources and verification

This file records what was actually verified for each model profile, where the
information comes from and when it was consulted. Every claim in
`src/models/profiles.ts` comes from the pages listed here.

**Consultation date for every source below: 2026-10-21.**

The rules followed while writing this:

- only official documentation was used (the vendor's own repository, model card
  or announcement);
- a behaviour that is not documented is reported as *not documented*;
- a model is only listed when its identity, availability and characteristics
  could be checked;
- versions, checkpoints, quantisations and workflows are kept distinct.

## Summary

| Profile | Model | License | Verification |
| --- | --- | --- | --- |
| `general` | — | — | studio convention |
| `z-image-turbo` | `Tongyi-MAI/Z-Image-Turbo` | Apache-2.0 | verified |
| `flux1-schnell` | `black-forest-labs/FLUX.1-schnell` | Apache-2.0 | verified |
| `qwen-image-2.1` | `Qwen/Qwen-Image-2.1` | Qwen Research License | verified |
| `flux2` | `black-forest-labs/FLUX.2-dev`, `FLUX.2-klein` | Apache-2.0 (klein 4B), FLUX Non-Commercial License (dev, klein 9B) | verified |
| `flux3-klein` | `black-forest-labs/flux-3-image-klein` | FLUX Kommunity License | verified |

---

## Z-Image-Turbo

Source: <https://github.com/Tongyi-MAI/Z-Image> (official repository, model
zoo and reference inference script).

Verified facts used by the profile:

| Fact | Where it is written |
| --- | --- |
| 6B parameter model family, four variants (Turbo, base, Omni-Base, Edit) | "Z-Image is a powerful and highly efficient image generation model family with **6B** parameters. Currently there are four variants" |
| Z-Image-Turbo runs in **8 steps** (8 NFEs) | model zoo table: `Z-Image-Turbo … Step: 8` |
| **No classifier-free guidance** in the Turbo checkpoint | model zoo table: `Z-Image-Turbo … CFG: ❌`; the reference script uses `guidance_scale=0.0` with the comment "Guidance should be 0 for the Turbo models" |
| Apache-2.0 | the repository is published under the Apache-2.0 license |
| Photorealism, bilingual (English/Chinese) text rendering, strong instruction adherence | the showcase section of the README |
| A low diversity score in the model zoo | model zoo table: `Z-Image-Turbo … Diversity: Low` |
| Released on 2025-11-26; the technical report on arXiv (2511.22699) | the news section |

Consequences for the profile:

- `negative.supported: false` — without CFG the negative prompt has no effect.
  The note states the reason (no CFG, `guidance_scale=0.0`) instead of just
  saying "not supported".
- `promptStyle: 'sentences'` — the official reference prompts are complete
  declarative sentences.
- The guidance mentions the low diversity score, so the user knows that varying
  the prompt is more effective than sampling the same prompt again.

Note: the *foundation* checkpoint `Z-Image` (not Turbo) is documented with 50
steps, guidance 3.0–5.0 and "Negative prompts: Strongly recommended". That
behaviour is **not** applied to the Turbo profile.

## FLUX.1 [schnell] — the "FLUX.1 Turbo" release

Source: <https://huggingface.co/black-forest-labs/FLUX.1-schnell> (official
model card).

Verified facts:

| Fact | Where it is written |
| --- | --- |
| 12 billion parameter rectified flow transformer | "FLUX.1 [schnell] is a 12 billion parameter rectified flow transformer capable of generating images from text descriptions." |
| Generates in **1 to 4 steps** (latent adversarial diffusion distillation) | "can generate high-quality images in only 1 to 4 steps" |
| Apache-2.0 | "Released under the `apache-2.0` licence" |
| Reference pipeline uses `guidance_scale=0.0`, `num_inference_steps=4`, `max_sequence_length=256` | the diffusers example |
| "Prompt following is heavily influenced by the prompting-style" | the limitations section |

Consequences for the profile:

- `negative.supported: false` — the reference pipeline runs without guidance
  and does not use a negative prompt.
- The profile omits `capture.technical`, `capture.motion` and `capture.aspect`
  and explains why in the guidance: the 256 token limit of the reference
  pipeline. This is a studio convention derived from a documented limit, and it
  is described as such in the interface.

The card also lists the out-of-scope uses of the model; they are not relevant
for a prompt builder and are not reproduced here.

## Qwen-Image-2.1

Source: <https://huggingface.co/Qwen/Qwen-Image-2.1> (official model card) and
<https://github.com/QwenLM/Qwen-Image-2.1>.

Verified facts:

| Fact | Where it is written |
| --- | --- |
| Unified text-to-image and editing model, **7B** parameters in the visual generation component, 32 Single-Stream DiT layers | the introduction |
| Reference pipeline: `QwenImage21Pipeline`, `num_inference_steps=40`, 2048×2048 | the quick start |
| Supported aspect ratios 1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16 | the aspect ratio table |
| Native transparency (RGBA), up to **10 reference images**, local edits via circles, painted annotations or masks | "Versatile Editing" |
| Improved typography and portrait lighting | "Realistic Textures and Refined Aesthetics" |
| Licensed under the **Qwen Research License** | the license section |

Consequences for the profile:

- `negative.supported: false` — the documented interface exposes a single
  prompt; no negative prompt parameter is documented.
- `promptStyle: 'sentences'` — the official prompt enhancer
  (`Qwen/Qwen-Image-2.1-PE-T2I`) rewrites a prompt into a "long detailed
  English prompt", so complete sentences are the format the model is tuned
  for.

## FLUX.2

Source: <https://github.com/black-forest-labs/flux2> (official inference
repository).

Verified facts:

| Fact | Where it is written |
| --- | --- |
| FLUX.2 [dev]: **32B**, released 2025-11-25, text-to-image and editing (single and multi reference) | the news and the model overview |
| FLUX.2 [klein] 4B and 9B released 2026-01-15, **Apache-2.0** for the 4B, non-commercial for the 9B | the model overview table |
| Distilled checkpoints run in **4 steps**, base checkpoints in 50 | "Distilled (4-step) … Base (50-step)" |
| FLUX.2 [dev] benefits significantly from **prompt upsampling**, performed by the same model family used for the text encoding (`Mistral-Small-3.2-24B-Instruct-2506`) | the prompt upsampling section |
| The reference scripts expose prompt, reference prompts and guidance; no negative prompt parameter is documented | the reference scripts and the model cards |
| FLUX.2 [pro] and [flex] are API models; [flex] is positioned for typography | the vendor's own model page and the skills reference |

Consequences for the profile:

- `negative.supported: false`, with the note that no negative prompt parameter
  is documented for FLUX.2.
- The guidance mentions the prompt upsampling, which is a documented feature
  of [dev], so the profile keeps the prompt dense and well ordered.

## FLUX 3 Image Klein

Source: <https://bfl.ai/blog/flux-3-image-klein> (official announcement,
published 2026-10-15) and the linked model and inference repositories.

Verified facts:

| Fact | Where it is written |
| --- | --- |
| **5.6B** parameter open weights model for text-to-image, editing and multi-reference generation with up to **10 reference images** | the first paragraph |
| **Native 4K** generation, pixel-perfect editing, bounding boxes that control where elements are placed | the first paragraph |
| A base model (50 steps) for fine-tuning and a step-distilled model | the release description |
| FLUX **Kommunity License**: free commercial use for individuals and companies with annual revenue under $5M, plus research and non-commercial use | the license section |
| The API offers prompt upsampling and pixel restoration | the "Get started" section |
| The model is 5.6B against 7B for Qwen-Image 2.1 (vendor comparison) | the performance section |

Consequences for the profile:

- `negative.supported: false` — the announcement documents prompt upsampling
  and pixel restoration, but no negative prompt parameter.
- The guidance mentions the 4K output, the multi-reference and the bounding
  box control, because those are the documented capabilities of this model.

### About "FLUX.3"

The first generation of the FLUX 3 family is a multimodal model (image, video,
audio and action prediction) announced in July 2026. The **image** release
available with open weights at the time of writing is **FLUX 3 Image Klein**,
and that is the release this profile describes. A separate "FLUX.3" image
checkpoint with different characteristics has not been verified here, so no
profile was created for it.

## The fashion and photography catalog

The catalog options (garments, fabrics, footwear, poses, lighting setups,
camera vocabulary) are **descriptive vocabulary**, not quotations. They were
written from domain knowledge and are marked `evergreen` at category level,
with `source.kind: "terminology"`.

This is a deliberate decision: the wording is generic descriptive language
(garment names, fabric names, lighting setups, focal lengths) that is not
attributable to a single publication, and copying or paraphrasing long
passages from fashion magazines or lookbooks would create a licensing problem
without improving the catalog.

What this means in practice:

- the terms are the ones used by the industry, and they are the terms an image
  model is likely to have seen during training;
- no trend claim is made anywhere in the catalog;
- no collection, designer, runway or article is referenced, because none was
  verified against a fetched source.

The model profiles are the part of the project where sourcing matters most,
and they are documented above with the exact URL, the date and the passage
that supports each statement.

## Re-verifying a profile

1. Open the source URL.
2. Check that the facts in the profile still match the page.
3. Update `consulted` and `verifiedOn` in `src/models/profiles.ts`.
4. Update the table in this file.
5. Run `npm run verify`.
