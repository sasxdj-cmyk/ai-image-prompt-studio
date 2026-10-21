/**
 * Model profiles.
 *
 * A profile describes how a specific image model is fed: the order of the
 * categories, the categories that are not sent, the documented support for a
 * negative prompt and the prompt style.
 *
 * Every factual statement about a model comes from the official source
 * recorded in `source`. Where a behaviour is not documented, the profile says
 * so instead of guessing.
 */
import type { ModelProfile } from '../catalog/types';

const VERIFIED_ON = '2026-10-21';

/** The order used when no model specific profile is selected. */
const FULL_ORDER = [
  'subject.presentation',
  'subject.count',
  'subject.age',
  'subject.role',
  'subject.look',
  'body.build',
  'body.height',
  'body.proportions',
  'body.shoulders',
  'body.musculature',
  'body.silhouette',
  'appearance.skin.tone',
  'appearance.skin.texture',
  'appearance.skin.features',
  'appearance.face.shape',
  'appearance.face.features',
  'appearance.face.expression',
  'appearance.eyes.color',
  'appearance.eyes.shape',
  'appearance.eyes.intensity',
  'appearance.eyes.gaze',
  'appearance.eyes.makeup',
  'appearance.makeup.base',
  'appearance.makeup.lips',
  'appearance.makeup.cheeks',
  'styling.hair.length',
  'styling.hair.cut',
  'styling.hair.style',
  'styling.hair.texture',
  'styling.hair.color',
  'styling.hair.detail',
  'wardrobe.look',
  'wardrobe.garments',
  'wardrobe.materials',
  'wardrobe.colors',
  'wardrobe.patterns',
  'wardrobe.fit',
  'footwear.style',
  'footwear.silhouette',
  'footwear.material',
  'accessories.eyewear',
  'accessories.hats',
  'accessories.bags',
  'accessories.jewellery',
  'accessories.belts',
  'accessories.hair',
  'pose.body',
  'pose.arms',
  'pose.hands',
  'pose.legs',
  'pose.torso',
  'pose.view',
  'pose.interaction',
  'scene.type',
  'scene.details',
  'scene.atmosphere',
  'capture.type',
  'capture.framing',
  'capture.angle',
  'capture.lens',
  'capture.dof',
  'capture.motion',
  'capture.rendition',
  'capture.aspect',
  'capture.composition',
  'capture.technical',
  'capture.lighting.type',
  'capture.lighting.quality',
  'capture.lighting.color',
  'capture.lighting.level',
  'finish.style',
  'finish.boost',
];

export const MODEL_PROFILES: ModelProfile[] = [
  {
    id: 'general',
    name: { en: 'General (any model)', it: 'Generale (qualsiasi modello)' },
    description: {
      en: 'Model agnostic profile. Use it when you do not target a specific checkpoint.',
      it: 'Profilo indipendente dal modello. Usalo quando non punti a un checkpoint specifico.',
    },
    reference: 'Any text-to-image model',
    order: FULL_ORDER,
    omit: [],
    negative: {
      supported: true,
      note: {
        en: 'Whether a negative prompt is useful depends on the model you run.',
        it: 'L\'utilità del prompt negativo dipende dal modello che usi.',
      },
    },
    promptStyle: 'fragments',
    guidance: {
      en: 'Keeps the complete catalog: subject, styling, scene, photography and finish. Nothing is removed.',
      it: 'Mantiene il catalogo completo: soggetto, styling, scena, fotografia e resa. Niente viene rimosso.',
    },
    source: {
      kind: 'evergreen',
      title: 'Studio convention: neutral assembly order',
    },
    verification: 'evergreen',
    verifiedOn: VERIFIED_ON,
    tags: ['default', 'model-agnostic'],
  },
  {
    id: 'z-image-turbo',
    name: { en: 'Z-Image-Turbo', it: 'Z-Image-Turbo' },
    description: {
      en: 'Distilled 6B text-to-image model from the Tongyi-MAI Z-Image family (8 steps, no classifier-free guidance).',
      it: 'Modello distillato da 6B per testo-immagine della famiglia Tongyi-MAI Z-Image (8 step, senza classifier-free guidance).',
    },
    reference: 'Tongyi-MAI/Z-Image-Turbo (Apache-2.0)',
    order: FULL_ORDER,
    omit: [],
    negative: {
      supported: false,
      note: {
        en: 'Z-Image-Turbo is distilled without CFG (official model zoo lists CFG: no) and the reference pipeline uses guidance_scale=0.0, so a negative prompt has no effect.',
        it: 'Z-Image-Turbo è distillato senza CFG (il model zoo ufficiale indica CFG: no) e la pipeline di riferimento usa guidance_scale=0.0, quindi il prompt negativo non ha effetto.',
      },
    },
    promptStyle: 'sentences',
    guidance: {
      en: 'Official model card highlights photorealism, bilingual text rendering and strong instruction adherence. The model zoo lists a low diversity score, so vary the prompt yourself instead of relying on repeated sampling.',
      it: 'Il model card ufficiale evidenzia fotorealismo, rendering di testi bilingue e forte aderenza alle istruzioni. Il model zoo indica un punteggio di diversità basso: varia tu il prompt invece di affidarti a campionamenti ripetuti.',
    },
    examples: [
      {
        prompt:
          'young woman in a red silk slip dress, shoulder-length dark wavy hair, standing in a sunlit studio, full-body editorial photograph, soft directional light',
        note: {
          en: 'Plain declarative sentence structure, as in the official reference prompts.',
          it: 'Struttura in frasi dichiarative semplici, come nei prompt di riferimento ufficiali.',
        },
      },
    ],
    source: {
      kind: 'documentation',
      title: 'Tongyi-MAI/Z-Image official repository - model zoo and reference inference',
      url: 'https://github.com/Tongyi-MAI/Z-Image',
      consulted: VERIFIED_ON,
    },
    verification: 'verified',
    verifiedOn: VERIFIED_ON,
    tags: ['tongyi', 'alibaba', 'turbo', '8-step', 'no-cfg'],
  },
  {
    id: 'flux1-schnell',
    name: { en: 'FLUX.1 [schnell] (FLUX.1 Turbo)', it: 'FLUX.1 [schnell] (FLUX.1 Turbo)' },
    description: {
      en: 'The 12B distilled FLUX.1 release (1-4 inference steps, Apache-2.0), commonly used as "FLUX.1 Turbo".',
      it: 'La release distillata FLUX.1 da 12B (1-4 step di inferenza, Apache-2.0), comunemente usata come "FLUX.1 Turbo".',
    },
    reference: 'black-forest-labs/FLUX.1-schnell (Apache-2.0)',
    order: [
      'subject.presentation',
      'subject.count',
      'subject.age',
      'subject.role',
      'subject.look',
      'body.build',
      'body.height',
      'body.proportions',
      'body.shoulders',
      'body.musculature',
      'body.silhouette',
      'appearance.skin.tone',
      'appearance.skin.texture',
      'appearance.skin.features',
      'appearance.face.shape',
      'appearance.face.features',
      'appearance.face.expression',
      'appearance.eyes.color',
      'appearance.eyes.shape',
      'appearance.eyes.intensity',
      'appearance.eyes.gaze',
      'appearance.eyes.makeup',
      'appearance.makeup.base',
      'appearance.makeup.lips',
      'appearance.makeup.cheeks',
      'styling.hair.length',
      'styling.hair.cut',
      'styling.hair.style',
      'styling.hair.texture',
      'styling.hair.color',
      'styling.hair.detail',
      'wardrobe.look',
      'wardrobe.garments',
      'wardrobe.materials',
      'wardrobe.colors',
      'wardrobe.patterns',
      'wardrobe.fit',
      'footwear.style',
      'footwear.silhouette',
      'footwear.material',
      'accessories.eyewear',
      'accessories.hats',
      'accessories.bags',
      'accessories.jewellery',
      'accessories.belts',
      'accessories.hair',
      'pose.body',
      'pose.arms',
      'pose.hands',
      'pose.legs',
      'pose.torso',
      'pose.view',
      'pose.interaction',
      'scene.type',
      'scene.details',
      'scene.atmosphere',
      'capture.type',
      'capture.framing',
      'capture.angle',
      'capture.lens',
      'capture.dof',
      'capture.rendition',
      'capture.composition',
      'capture.lighting.type',
      'capture.lighting.quality',
      'capture.lighting.color',
      'capture.lighting.level',
      'finish.style',
      'finish.boost',
    ],
    omit: ['capture.technical', 'capture.motion', 'capture.aspect'],
    negative: {
      supported: false,
      note: {
        en: 'The reference pipeline runs with guidance_scale=0.0 and no negative prompt parameter; the model card lists negative prompts as not applicable to this distilled release.',
        it: 'La pipeline di riferimento gira con guidance_scale=0.0 e senza parametro negative prompt; il model card non indica il prompt negativo per questa release distillata.',
      },
    },
    promptStyle: 'fragments',
    guidance: {
      en: 'The model card states that prompt following is heavily influenced by the prompting style, and the reference pipeline caps the text at 256 tokens. This profile therefore drops the numeric exposure settings and keeps the prompt compact.',
      it: 'Il model card afferma che l\'aderenza al prompt dipende fortemente dallo stile di scrittura e la pipeline di riferimento limita il testo a 256 token. Per questo il profilo esclude le impostazioni numeriche di esposizione e mantiene il prompt compatto.',
    },
    examples: [
      {
        prompt: 'adult male fashion model, short dark textured hair, black oversized technical jacket, walking in a concrete underpass, full body shot',
        note: {
          en: 'Short, front-loaded subject description.',
          it: 'Descrizione breve del soggetto, posta all\'inizio.',
        },
      },
    ],
    source: {
      kind: 'documentation',
      title: 'black-forest-labs/FLUX.1-schnell model card',
      url: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell',
      consulted: VERIFIED_ON,
    },
    verification: 'verified',
    verifiedOn: VERIFIED_ON,
    tags: ['black-forest-labs', 'apache-2.0', '1-4-steps', 'distilled'],
  },
  {
    id: 'qwen-image-2.1',
    name: { en: 'Qwen-Image-2.1', it: 'Qwen-Image-2.1' },
    description: {
      en: 'Unified text-to-image and editing model from the Qwen family (7B visual component, native 2K, RGBA support).',
      it: 'Modello unificato di generazione e editing della famiglia Qwen (7B per la componente visiva, 2K nativo, supporto RGBA).',
    },
    reference: 'Qwen/Qwen-Image-2.1 (Qwen Research License)',
    order: FULL_ORDER,
    omit: [],
    negative: {
      supported: false,
      note: {
        en: 'The official model card documents a single prompt parameter; no negative prompt is part of the documented interface.',
        it: 'Il model card ufficiale documenta un solo parametro prompt; il prompt negativo non fa parte dell\'interfaccia documentata.',
      },
    },
    promptStyle: 'sentences',
    guidance: {
      en: 'The model card documents native 2K output, transparency (RGBA), up to 10 reference images and improved typography and portrait lighting. The official prompt enhancer rewrites a prompt into a long detailed English description, so longer, well ordered sentences work well here.',
      it: 'Il model card documenta output 2K nativo, trasparenza (RGBA), fino a 10 immagini di riferimento e miglioramenti in tipografia e luci del ritratto. Il prompt enhancer ufficiale riscrive il prompt in una descrizione inglese lunga e dettagliata: qui funzionano bene frasi più lunghe e ben ordinate.',
    },
    examples: [
      {
        prompt:
          'A woman with shoulder-length copper waves stands against a warm grey studio wall, wearing a charcoal wool coat over a cream silk shirt, relaxed three-quarter view, soft window light from the left.',
        note: {
          en: 'Complete sentences, the format the official prompt enhancer produces.',
          it: 'Frasi complete, il formato prodotto dal prompt enhancer ufficiale.',
        },
      },
    ],
    source: {
      kind: 'documentation',
      title: 'Qwen/Qwen-Image-2.1 model card (Hugging Face)',
      url: 'https://huggingface.co/Qwen/Qwen-Image-2.1',
      consulted: VERIFIED_ON,
    },
    verification: 'verified',
    verifiedOn: VERIFIED_ON,
    tags: ['qwen', '2k', 'rgba', 'editing', 'multi-reference'],
  },
  {
    id: 'flux2',
    name: { en: 'FLUX.2 (dev / klein)', it: 'FLUX.2 (dev / klein)' },
    description: {
      en: 'Black Forest Labs generation and editing family: FLUX.2 [dev] 32B and the distilled FLUX.2 [klein] 4B / 9B.',
      it: 'Famiglia di generazione ed editing di Black Forest Labs: FLUX.2 [dev] 32B e la distillata FLUX.2 [klein] 4B / 9B.',
    },
    reference: 'black-forest-labs/FLUX.2-dev and FLUX.2-klein (Apache-2.0 for klein 4B)',
    order: FULL_ORDER,
    omit: [],
    negative: {
      supported: false,
      note: {
        en: 'The official reference scripts expose prompt, reference prompts and guidance parameters; no negative prompt parameter is documented for FLUX.2.',
        it: 'Gli script di riferimento ufficiali espongono prompt, prompt di riferimento e parametri di guidance; per FLUX.2 non è documentato alcun parametro negative prompt.',
      },
    },
    promptStyle: 'fragments',
    guidance: {
      en: 'The official repository documents prompt upsampling for FLUX.2 [dev] (the same model family performs the text encoding) and recommends it for best results. Distilled [klein] checkpoints run in 4 steps, base checkpoints in 50.',
      it: 'Il repository ufficiale documenta il prompt upsampling per FLUX.2 [dev] (la stessa famiglia esegue la codifica del testo) e lo raccomanda per risultati migliori. I checkpoint distillati [klein] girano in 4 step, quelli base in 50.',
    },
    examples: [
      {
        prompt:
          'editorial fashion portrait, young woman in a structured black blazer, silver jewellery, neutral studio background, soft beauty dish light, medium format look',
        note: {
          en: 'Dense, well ordered fragments - the format that benefits most from prompt upsampling.',
          it: 'Frammenti densi e ben ordinati: il formato che beneficia di più del prompt upsampling.',
        },
      },
    ],
    source: {
      kind: 'documentation',
      title: 'black-forest-labs/flux2 official inference repository',
      url: 'https://github.com/black-forest-labs/flux2',
      consulted: VERIFIED_ON,
    },
    verification: 'verified',
    verifiedOn: VERIFIED_ON,
    tags: ['black-forest-labs', 'editing', 'multi-reference', 'distilled'],
  },
  {
    id: 'flux3-klein',
    name: { en: 'FLUX 3 Image Klein', it: 'FLUX 3 Image Klein' },
    description: {
      en: 'Open weights image model of the FLUX 3 family (5.6B, native 4K, multi-reference, FLUX Kommunity License).',
      it: 'Modello open weights della famiglia FLUX 3 (5.6B, 4K nativo, multi-reference, FLUX Kommunity License).',
    },
    reference: 'black-forest-labs/flux-3-image-klein (FLUX Kommunity License)',
    order: FULL_ORDER,
    omit: [],
    negative: {
      supported: false,
      note: {
        en: 'The release announcement documents prompt upsampling and pixel restoration, but no negative prompt parameter.',
        it: 'L\'annuncio di rilascio documenta prompt upsampling e pixel restoration, ma nessun parametro negative prompt.',
      },
    },
    promptStyle: 'fragments',
    guidance: {
      en: 'The official announcement documents native 4K generation, editing and multi-reference generation with up to 10 reference images, and bounding boxes that control where elements are placed. A step distilled checkpoint and a 50 step base checkpoint are available.',
      it: 'L\'annuncio ufficiale documenta generazione 4K nativa, editing e generazione multi-reference con fino a 10 immagini di riferimento, oltre a bounding box che controllano il posizionamento degli elementi. Sono disponibili un checkpoint distillato e uno base da 50 step.',
    },
    examples: [
      {
        prompt:
          'full body street style photograph, model in layered olive technical jacket and wide charcoal trousers, concrete plaza, overcast light, 35mm reportage look',
        note: {
          en: 'Clear subject-to-context ordering, useful when the prompt is upsampled by the API.',
          it: 'Ordinamento chiaro dal soggetto al contesto, utile quando il prompt viene upsamplato via API.',
        },
      },
    ],
    source: {
      kind: 'documentation',
      title: 'Black Forest Labs - FLUX 3 Image Klein release announcement',
      url: 'https://bfl.ai/blog/flux-3-image-klein',
      consulted: VERIFIED_ON,
    },
    verification: 'verified',
    verifiedOn: VERIFIED_ON,
    tags: ['black-forest-labs', '4k', 'multi-reference', 'open-weights'],
  },
];

export function getProfile(id: string | null | undefined): ModelProfile | undefined {
  if (!id) return undefined;
  return MODEL_PROFILES.find((profile) => profile.id === id);
}

export function getGeneralProfile(): ModelProfile {
  const general = MODEL_PROFILES.find((profile) => profile.id === 'general');
  if (!general) throw new Error('The general model profile is missing');
  return general;
}
