/**
 * Core data model for the catalog, model profiles and generated prompts.
 *
 * Everything the user can select lives in the catalog (data, not code).
 * The UI renders categories generically, so adding a category never
 * requires touching a component.
 */

/** Languages shipped with the application. */
export const LOCALES = ['en', 'it'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** A string with one variant per shipped locale. */
export interface LocalizedText {
  en: string;
  it: string;
}

/** Logical grouping of categories, used for navigation and prompt order. */
export type CatalogGroupId =
  | 'subject'
  | 'body'
  | 'appearance'
  | 'styling'
  | 'wardrobe'
  | 'footwear'
  | 'accessories'
  | 'pose'
  | 'scene'
  | 'capture'
  | 'finish';

export interface CatalogGroup {
  id: CatalogGroupId;
  name: LocalizedText;
  order: number;
}

/** How a category presents its options in the UI. */
export type ControlType =
  /** exactly one option may be active (radio-like) */
  | 'single'
  /** any number of options may be active (checkbox-like) */
  | 'multi'
  /** options rendered as a wrap grid of chips */
  | 'chips'
  /** options rendered as colour swatches (falls back to chips) */
  | 'swatch';

/** Provenance of a catalog entry or model profile. */
export interface SourceRef {
  /**
   * - `evergreen`: timeless descriptive vocabulary, no specific source needed
   * - `terminology`: general industry term, no single source
   * - `trend`: tied to a documented season/collection
   * - `documentation`: taken from official model documentation
   */
  kind: 'evergreen' | 'terminology' | 'trend' | 'documentation';
  title: string;
  url?: string;
  /** ISO date (YYYY-MM-DD) the source was consulted, when applicable. */
  consulted?: string;
  note?: string;
}

export type VerificationStatus = 'verified' | 'unverified' | 'partial' | 'evergreen';

export interface CatalogEntry {
  /** Stable, globally unique identifier (dot-namespaced). */
  id: string;
  /** Short label shown in the UI. */
  label: LocalizedText;
  /** The fragment this entry contributes to a generated prompt. */
  prompt: LocalizedText;
  /** Optional subgroup inside the category (e.g. `outerwear` in clothing). */
  group?: string;
  /** Free-form tags for search and filtering. */
  tags?: string[];
  /**
   * Normalised tokens that make two entries redundant with each other.
   * Used by the de-duplication pass to avoid repeating the same idea.
   */
  synonyms?: string[];
  /** Entry ids that must not be active at the same time (hard conflict). */
  conflicts?: string[];
  /** Entry ids that are suspicious together (soft conflict, only reported). */
  softConflicts?: string[];
  /** Entry ids that should be active for this entry to make sense. */
  requires?: string[];
  /** Relative weight used by the randomiser (default 1). */
  weight?: number;
  /** Optional hex colour, used by swatch controls. */
  color?: string;
  /** Short contextual hint shown next to the label. */
  notes?: LocalizedText;
  /** Where the wording comes from. */
  source?: SourceRef;
  /** Verification state of the wording itself. */
  status?: VerificationStatus;
}

export interface Subgroup {
  id: string;
  name: LocalizedText;
  order: number;
}

export interface CategoryDef {
  /** Stable identifier, e.g. `wardrobe.outerwear`. */
  id: string;
  group: CatalogGroupId;
  /** Global assembly order of the category inside a prompt (lower = earlier). */
  order: number;
  name: LocalizedText;
  description: LocalizedText;
  control: ControlType;
  /** Maximum number of simultaneously active entries (multi/chips only). */
  maxSelections?: number;
  /** Minimum number of active entries for the category to be considered complete. */
  minSelections?: number;
  subgroups?: Subgroup[];
  /**
   * Subgroups that cannot be combined with any other subgroup of the same
   * category (for example a dress group next to tops and bottoms groups).
   */
  exclusiveGroups?: string[];
  /** Provenance of the category wording as a whole. */
  source?: SourceRef;
  entries: CatalogEntry[];
}

/** A complete, self-contained catalog document. */
export interface CatalogDocument {
  /** Version of the data format. Bumped on breaking format changes. */
  schemaVersion: number;
  /** Semantic version of the catalog content. */
  catalogVersion: string;
  name: string;
  generatedAt: string;
  groups: CatalogGroup[];
  categories: CategoryDef[];
}

/** Result of validating catalog data. */
export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

/** A generated prompt fragment, kept for transparency in the UI. */
export interface PromptFragment {
  entryId: string;
  categoryId: string;
  text: string;
  /** Assembly position after ordering. */
  index: number;
}

export type WarningCode =
  | 'conflict'
  | 'soft-conflict'
  | 'duplicate'
  | 'synonym'
  | 'missing-requirement'
  | 'max-selections'
  | 'incompatible-category'
  | 'negative-unsupported'
  | 'unknown-entry'
  | 'empty';

export interface PromptWarning {
  code: WarningCode;
  /** Human readable, already localized by the caller if needed. */
  message: string;
  entryIds: string[];
  categoryIds: string[];
}

export interface OmittedEntry {
  entryId: string;
  categoryId: string;
  reason: WarningCode;
}

export interface BuildResult {
  /** Final positive prompt. */
  prompt: string;
  /** Final negative prompt (only filled when the user typed one). */
  negative: string;
  /** Fragments that made it into the prompt, in assembly order. */
  fragments: PromptFragment[];
  /** Conflicts / redundancies detected. */
  warnings: PromptWarning[];
  /** Entries that were dropped from the prompt (with the reason). */
  omitted: OmittedEntry[];
  /** The model profile that produced the ordering. */
  profileId: string;
}

/** How a model profile treats a category. */
export type ProfileCategoryPolicy = 'include' | 'omit';

export interface ModelProfile {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Human readable reference of the model this profile targets. */
  reference: string;
  /** Category ids in the order they should be assembled. */
  order: string[];
  /** Category ids that are not sent for this model. */
  omit: string[];
  /** Whether the model understands a negative prompt. */
  negative: {
    supported: boolean;
    note?: LocalizedText;
  };
  /** Prompt style: flowing sentence fragments vs compact tag list. */
  promptStyle: 'fragments' | 'sentences';
  /** Optional prefix added in front of the assembled prompt. */
  prefix?: LocalizedText;
  /** Prompt-engineering guidance shown in the UI. */
  guidance?: LocalizedText;
  /** Short usage examples. */
  examples?: { prompt: string; note?: LocalizedText }[];
  /** Where the information comes from. */
  source?: SourceRef;
  /** Verification state of the profile. */
  verification: VerificationStatus;
  /** ISO date of the last verification. */
  verifiedOn?: string;
  tags: string[];
}

/** Selection state: category id -> selected entry ids. */
export type SelectionMap = Record<string, string[]>;
