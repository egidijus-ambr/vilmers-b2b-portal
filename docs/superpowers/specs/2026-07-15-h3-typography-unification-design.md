# B2B Portal — H3 Typography Unification

**Date:** 2026-07-15 (revised)
**Project:** `vilmers-b2b-portal` (Next.js 15 App Router, React 19, Tailwind v3)
**Scope:** CSS/markup only — an opt-in `.heading-3` utility class. No new components,
no theme-system changes.
**Status:** Approved design, ready for implementation planning. **Revision 2** — replaces
the bare `h3 { }` element-selector mechanism from the first draft (see Revision history).

## Revision history

- **Rev 1 (2026-07-15):** Proposed a global `h3 { }` element rule in `@layer base`. The
  survey of live `<h3>` usages surfaced a bucket of h3s that are record/item titles
  (product names, cart line-item names) rather than section headings — a global
  element selector cannot distinguish the two, so it would uppercase/track product
  names as a side effect. Flagged for user confirmation.
- **Rev 2 (this document):** User confirmed item titles are excluded. **Consequence:
  the element-selector mechanism is dead** — it can't be role-aware. Replaced with an
  opt-in class, `.heading-3`, applied only to the section-heading/eyebrow h3s.

## Goal

Section-heading and eyebrow `<h3>`s render uniformly via a new `.heading-3` class:

| Property | Value |
|---|---|
| `font-size` | `18px` |
| `text-transform` | `uppercase` |
| `letter-spacing` | `0.2em` |
| `font-weight` | `400` |

Item/record-title h3s (product names, cart line items, etc.) are **excluded by
design** — see Bucket B below — and keep their current typography untouched.

## Approach

1. **Add `.heading-3`** to `src/styles/globals.css`, inside the existing
   `@layer components` block (`src/styles/globals.css:132-149`), alongside
   `.section-title` / `.page-title`, matching their style:
   ```css
   .heading-3 {
     @apply text-[18px] uppercase tracking-[0.2em] font-normal;
   }
   ```
2. **Apply `.heading-3` only to Bucket A** (section-heading/eyebrow h3s, listed below):
   strip their conflicting `text-{size}` / `font-{weight}` / `uppercase` / `tracking-*`
   classes and add `heading-3`. Keep all non-typographic classes (color, margin,
   alignment, `titleAlignClass(...)` calls) — see per-row notes for the two rows where
   the existing class bundles typography with color/margin (`section-title`).
3. **Do not touch Bucket B** (item-title h3s) — leave exactly as they are today.
4. **CMS rich-text h3s** — both prose surfaces get the same treatment:
   - `src/modules/common/components/rich-text/index.tsx:24-44` — replace
     `prose-h3:text-xl` with explicit variants matching the scale:
     `prose-h3:text-[18px] prose-h3:uppercase prose-h3:tracking-[0.2em]
     prose-h3:font-normal`. **Ordering/specificity requirement:** the wrapper also sets
     `prose-headings:font-medium` (line 29). Tailwind Typography plugin variants
     (`prose-h3:*`, `prose-headings:*`) compile to CSS selectors of *equal specificity*
     (both are single class selectors targeting `h3` via `:where()`), so the winner is
     whichever rule is declared **later in the generated stylesheet** — which follows
     the order Tailwind encounters the classes when scanning the source, not JSX/string
     order within the template literal. This must be verified empirically during
     implementation (render and inspect computed `font-weight` on a CMS h3), not
     assumed from source order. If `prose-headings:font-medium` wins, the fix is to
     drop `font-medium` from the `prose-headings:` line and let each heading level set
     its own weight explicitly, rather than fighting specificity.
   - `src/modules/products/templates/index.tsx:61` — this is a **second, separate**
     prose wrapper (`className="text-dark-blue prose prose-sm mb-6 md:w-1/2"` around
     `dangerouslySetInnerHTML={{ __html: product.description }}` for CMS product
     descriptions) with **no `prose-h3` override today** — it falls back to Tailwind
     Typography defaults. Add the same explicit variants used in rich-text:
     `prose-h3:text-[18px] prose-h3:uppercase prose-h3:tracking-[0.2em]
     prose-h3:font-normal`. This wrapper has no competing `prose-headings:font-medium`,
     so no specificity fight is expected here — but confirm empirically anyway.

## Files affected

### `src/styles/globals.css`
New `.heading-3` class inside the existing `@layer components` block (see Approach #1).
`.section-title` (`text-lg font-medium text-dark-blue mb-4`) and `.page-title` are
**not modified** — `.heading-3` is a new, separate class.

### Bucket A — GETS `.heading-3` (20 of 25 live h3s)

Section headings and eyebrow labels. Strip the listed classes, add `heading-3`, keep
everything else.

| # | File:line | Classes to strip | Notes |
|---|---|---|---|
| 1 | `home/components/content-block/index.tsx:302` | `text-2xl font-medium` | keep `titleAlignClass(...)`, color style |
| 2 | `home/components/content-block/index.tsx:1375` | `text-xs font-medium uppercase tracking-[0.2em] small:text-sm` | keep `titleAlignClass(...)`; responsive `small:text-sm` is removed (see Consequences) |
| 3 | `home/components/content-block/index.tsx:1492` | `text-xs font-medium uppercase tracking-[0.2em] small:text-sm` | same as #2 |
| 4 | `fabric-palettes/components/fabric-feature-display/index.tsx:57` | `text-xs font-semibold tracking-[0.2em] uppercase` | |
| 5 | `fabric-palettes/components/fabric-feature-filter-modal/index.tsx:301` | `text-xs tracking-[0.2em] uppercase` | |
| 6 | `fabric-palettes/components/fabric-feature-filter-modal/index.tsx:337` | `text-xs tracking-[0.2em] uppercase` | |
| 7 | `categories/components/product-filter-modal/index.tsx:244` | `text-xs font-bold tracking-[0.2em] uppercase` | |
| 8 | `categories/components/product-filter-modal/index.tsx:291` | `text-xs tracking-[0.2em] uppercase` | |
| 9 | `products/components/configurator/configurator-content.tsx:508` | `text-lg font-semibold` | static "Sofa Modules" heading |
| 10 | `products/components/configurator/fabric-section.tsx:178` | `text-sm font-semibold` | static "Fabric Selection" heading |
| 11 | `products/components/configurator/fabric-section.tsx:213` | `text-sm font-semibold` | static "Fabric Selection" heading |
| 12 | `layout/components/cart-dropdown/index.tsx:106` | `text-large-semi` (component class, purely typographic — see `globals.css:85-87`) | static "Cart" heading |
| 13 | `account/components/order-details/index.tsx:89` | `section-title` | **replace with `heading-3 text-dark-blue mb-4`**, not a bare swap — `section-title` bundles typography with color+margin (`globals.css:142-144`); those two must be re-added explicitly since `.heading-3` is typography-only |
| 14 | `account/components/order-details/index.tsx:140` | `section-title` | same as #13 |
| 15 | `account/components/order-details/index.tsx:185` | `text-lg font-medium` | keep `mb-6`, `text-dark-blue` |
| 16 | `(main)/account/product-photos/[productName]/product-photos-content.tsx:150` | `text-lg font-medium` | empty-state heading ("No Photos Available"); keep `mb-2`, color |
| 17 | `account/templates/clear-session-template.tsx:83` | `text-lg font-medium` | keep `mb-2`, color |
| 18 | `account/templates/clear-session-template.tsx:134` | `font-medium` | keep `mb-2`, color |
| 19 | `products/components/comfort-section/index.tsx:29` | `text-base` | **reclassified from Rev 1** — see note below |
| 20 | `search/components/search-modal/index.tsx:245` | `text-2xl` | **reclassified from Rev 1** — see note below |

**Reclassification notes (rows 19, 20):** Rev 1's survey labeled these two as
item-titles without reading full surrounding context; closer reading shows both are
headings, not record names:
- Row 19 (`comfort-section/index.tsx:29`): the h3 renders `group.title` — a
  category/group label (e.g. "Frame", "Cushioning") that groups multiple items below
  it. The actual item name (`item.name`) renders as `<h4>` on line 46, a sibling
  inside each item card — confirming the h3 is a subsection heading, not a record
  title.
- Row 20 (`search-modal/index.tsx:245`): the h3 renders `t("search-no-results-title")`
  — a static empty-state message ("no results found"), structurally identical to the
  empty-state heading at row 16. It is not a search-result item title (actual search
  result cards reuse the category-product-card component, counted separately at
  Bucket B row 3).

Neither reclassification was ambiguous once the surrounding code was read — both are
included in Bucket A, not a separate "needs a call" bucket. No other row required a
call; the full 25-row set split cleanly into Bucket A / Bucket B.

### Bucket B — UNTOUCHED (5 of 25 live h3s)

Item/record-title h3s. Leave exactly as they are today — no class changes.

| # | File:line | Current classes (kept as-is) | What it names |
|---|---|---|---|
| 1 | `cart/templates/items.tsx:306` | `text-lg font-medium text-dark-blue` | cart line-item name (full cart page) |
| 2 | `layout/components/cart-dropdown/index.tsx:137` | `text-base-regular overflow-hidden text-ellipsis` | cart line-item name (dropdown) |
| 3 | `categories/components/category-product-card/index.tsx:198` | `text-sm font-medium text-gray-900 line-clamp-2` | product name (category grid card) |
| 4 | `fabric-palettes/components/fabric-image-modal/index.tsx:157` | `text-xl font-semibold text-dark-blue` | fabric group name (modal) |
| 5 | `(main)/account/product-photos/page.tsx:89` | `font-medium text-ui-fg-base text-sm line-clamp-2 group-hover:text-ui-fg-interactive transition-colors` | product name (product-photos grid card) |

### "Needs a call" bucket

None. All 25 live h3s classified without ambiguity (see reclassification notes above
for the two rows where Rev 1's initial labels were corrected on closer reading).

### Prose (CMS rich text) — both surfaces in scope

- `src/modules/common/components/rich-text/index.tsx:24-44` — CMS markdown content
  blocks. Replace `prose-h3:text-xl`; watch the `prose-headings:font-medium`
  specificity fight (see Approach #4).
- `src/modules/products/templates/index.tsx:61` — CMS product description HTML
  (`dangerouslySetInnerHTML`), currently no `prose-h3` override at all. Add the same
  explicit `prose-h3:*` variants.

### Exclusions (dead/unrendered code — confirmed via grep, not touched)
- `src/lib/i18n/components/translation-demo.tsx` (6 `<h3>`s) — exported from
  `src/lib/i18n/index.ts` but never rendered as JSX anywhere in the app (only appears
  in a README code sample).
- `src/modules/common/components/shop-settings-test/index.tsx:34` — imported in
  `src/app/[languageCode]/(main)/page.tsx` but never rendered (dead import).

**Total: 25 live `<h3>` (20 Bucket A + 5 Bucket B) + 2 prose surfaces + 7 dead/excluded.**

## Known accepted consequences (confirmed with user)

- Home content-block titles (Bucket A #1) drop from `text-2xl` (24px) title-case to
  18px uppercase.
- Existing eyebrow h3s (Bucket A #4–8, `text-xs` ≈12px, semibold/bold, uppercase)
  become 18px regular — larger and lighter than today.
- Responsive sizing is removed at content-block Bucket A #2/#3
  (`text-xs small:text-sm` → uniform 18px).
- Cart dropdown header ("Cart", Bucket A #12) and configurator section headings
  ("Sofa Modules" #9, "Fabric Selection" #10/#11) go from semibold to regular weight.
  This does **not** include cart line-item names or any other item-title h3
  (Bucket B) — those are excluded and keep their current weight/case entirely.

## Out of scope (explicit)

- Per-brand typography tokens. `src/themes/` has no typography tier; this change does
  not add one. `.heading-3` is global across vilmers and dominari.
- `h1`, `h2`, `h4`, `h5`, `h6` — untouched.
- No new shared `Heading` component.
- **Item/record-title h3s keep their current typography by design** (Bucket B) — this
  was the user's explicit decision after reviewing the survey.
- **Opt-in trade-off:** because `.heading-3` is a class, not an element rule, a future
  `<h3>` added anywhere in the app will **not** automatically pick up this styling —
  a developer must remember to add `heading-3` explicitly. This is the deliberate
  trade-off versus the Rev 1 element-selector approach, which was rejected specifically
  because it couldn't distinguish section headings from item titles.

## Verification plan

Visual check (no automated visual regression exists for this app):
1. Home page — content-block titles (both the 24px-title and eyebrow-style Bucket A
   rows).
2. A category page with the filter modal open — eyebrow filter labels (Bucket A
   #5–8) — **and** confirm the product card title (Bucket B #3) is unchanged.
3. Cart dropdown and full cart page — "Cart" heading (Bucket A #12) changes, cart
   line-item names (Bucket B #1, #2) do **not** change.
4. Configurator — "Sofa Modules" / "Fabric Selection" headings (Bucket A #9–11).
5. An order details page — address cards, general info (Bucket A #13/#14, confirm
   color+margin preserved after the `section-title` → `heading-3` swap), "Follow Your
   Order" (#15).
6. A CMS rich-text content block (markdown) **and** a product detail page whose
   description contains an `<h3>` — confirm both prose surfaces match 18px/uppercase/
   0.2em/400, and specifically confirm computed `font-weight` in rich-text (the
   `prose-headings:font-medium` fight).
7. Product-photos empty state (#16), clear-session page (#17/#18), comfort section
   group headings (#19), search "no results" (#20) — and confirm product-photos grid
   card names (Bucket B #5) and fabric-image-modal group name (Bucket B #4) are
   unchanged.

Run `yarn tsc --noEmit` after edits (class removals/additions only, no logic changes
expected to affect types).
