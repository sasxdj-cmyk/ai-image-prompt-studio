# Catalog terminology: what was verified and what was not

**Research date: 2026-10-21.**

This note records the provenance of the vocabulary used by the catalog. It is
the honest counterpart of [model-profiles.md](model-profiles.md): the model
profiles are verified line by line, while the catalog vocabulary is mostly
general descriptive language.

## The rule that was applied

| Material | Treatment |
| --- | --- |
| Vendor documentation (models) | quoted, cited and dated — see [model-profiles.md](model-profiles.md) |
| Industry terminology (garments, fabrics, shoes) | written as general descriptive vocabulary, marked `evergreen` at category level, checked against the references listed below |
| Seasonal trends | **not used as catalog claims**; the only trend-flavoured entries are look registers (`quiet luxury`, `heritage`, `dark academia`, …) and they are marked as such in the label, not as a fact about a season |
| Brand names, product names, collections | **not used**: no entry references a brand, a designer, a collection or an article |

The reason is practical as well as legal: descriptive vocabulary (garment
names, fabric names, lighting setups, focal lengths) is what an image model has
most likely seen during training, and it is not attributable to a single
publication. Copying or paraphrasing magazine copy would create a licensing
problem without improving a single prompt.

## Sources actually consulted

### 1. Wikipedia — "Espadrille"

<https://en.wikipedia.org/wiki/Espadrille> (fetched on 2026-10-21)

Used to check the footwear category. The article confirms:

- espadrilles are casual shoes with a rope sole, the upper usually in canvas or
  cotton, usually flat but sometimes wedge-shaped — which matches the entry
  `footwear.style.espadrilles` ("espadrilles with a rope sole") and the
  `footwear.silhouette` options about the sole.

The article's navigation index also enumerates the standard shoe-style
taxonomy used by the industry. Every shoe type in the catalog was checked
against that index: Derby, Brogue, Oxford, Chelsea boot, combat boot,
ankle/knee-high boot, cowboy boot, platform, stiletto, kitten heel, wedge,
mule, boat shoe, football boot, skate shoe, hiking boot, loafer, plimsoll,
sneaker, espadrille. The catalog uses these names and adds the commercial
sub-types (low-top, mid-top, high-top, chunky, retro court) that the same
index lists under "Sneakers" and "Skate shoes".

### 2. Business of Fashion — "Fashion A-Z"

<https://www.businessoffashion.com/articles/creative-class/fashion-a-z/> (fetched on 2026-10-21)

The industry glossary of the publication. It was read to check the spelling
and the meaning of the A–Z fashion vocabulary (silhouette, hemline, toile,
espadrilles, …). It is listed here as a consulted reference, not as the source
of any wording: the catalog fragments are original short descriptions.

### 3. Vogue — "Quiet Luxury Reigns at Retail, But at Couture, Color Makes a Comeback"

<https://www.vogue.com/article/color-makes-a-comeback-at-couture> (searched on 2026-10-21)

Consulted to check that "quiet luxury" is a documented term of the industry and
not an invention. It is: the term is used by Vogue for a register of dressing
that signals wealth without visible logos. The catalog contains it as a **look
register** (`wardrobe.look.quiet-luxury`), not as a statement about a
collection or a season, and it is not attributed to any article.

### 4. GQ — "The GQ guide to the best quiet luxury brands for every budget"

<https://www.gq-magazine.co.uk/article/best-quiet-luxury-brands> (searched on 2026-10-21)

Consulted for the same check, from a second publication. It confirms the term
is used across the industry press, not only by one title.

## What was deliberately not used

- **Brand and product names** (for example a specific sneaker model): the
  catalog only describes types, silhouettes, materials and finishes. A brand
  name would also raise trademark questions in generated images.
- **Designer collections and runway looks**: no entry references a collection,
  a season or a show.
- **"Trend of the season" entries**: the catalog is meant to stay useful
  outside a season, so it does not contain anything that would be wrong in six
  months.
- **"Masterpiece", "8K", "ultra detailed", "trending on ArtStation"**: these
  are not vocabulary. They are not in the catalog and they are not injected
  automatically. The `finish.boost` category offers the few technical
  keywords that can be useful, and only as an explicit choice.

## How a term enters the catalog

1. Write the prompt fragment as a short noun phrase describing something
   visible: `a classic trench coat`, not `a timeless and elegant coat`.
2. Check that the term is the one the industry uses (this file lists the
   references to check against).
3. Check that it does not duplicate an existing entry.
4. Add it with the tag that the users would search for.
5. If the term is a look register rather than a physical detail, put it in the
   `wardrobe.look` or `subject.look` category, never in a physical-detail
   category.

## If you want to extend the sourcing

The catalog data format supports per-entry provenance (`source` with `kind`,
`title`, `url`, `consulted`). A future contribution could add the source of a
subset of the vocabulary — for example the pages of a clothing museum or an
official brand lookbook — and mark those entries `verified`. The engine and
the schema already support it: nothing in the code has to change, only the
data.
