# B2B Portal — Heading Type Scale

**Date:** 2026-07-15
**Project:** `vilmers-b2b-portal` (Next.js 15 App Router, React 19, Tailwind v3.4)
**Status:** Implemented. Not committed.
**Supersedes:** `2026-07-15-h3-typography-unification-design.md` (deleted — that document
only covered the original h3-only change and predates the base-rule mechanism, the h4
addition, and several corrections below).

## Summary

Headings `h1`–`h4` now get their size, weight, case, and tracking from a base element
rule in `globals.css`, rather than per-usage classes. The user's direction: "just
implement styles — if we need to change the size of some font, we'll change the heading
level." A handful of surfaces that need a different look than their element implies keep
that look automatically, for free, via ordinary CSS specificity — no skip list, no opt-in
class, no per-component exceptions to track.

Since the base rule landed, a second body of work added a **per-brand typography token
tier** underneath it (see below) — the base rule's raw values are now `var(...,
<default>)`-backed tokens a brand preset can override, not hardcoded literals — plus a
run of smaller follow-on fixes (a `PageHeader` visual-size escape hatch, several
section-heading demotions, and a couple of sites that fell out of the "exempt" list).
This revision folds all of that in.

## The scale

| Level | Mobile | Desktop (`small:`, 1024px) | Other |
|---|---|---|---|
| h1 | 40px (`2.5rem`) | 56px (`3.5rem`) | `leading-tight` |
| h2 | 32px (`2rem`) | 40px (`2.5rem`) | `leading-tight` |
| h3 | 24px (`1.5rem`) | flat, no step | `leading-tight`, normal case/tracking |
| h4 | 18px (`text-[18px]`) | flat, no step | `uppercase`, `tracking-[0.2em]`, `font-normal` — the eyebrow/label look |

Root font-size is 16px with no media-query override, so rem→px above is exact.
**Desktop is `small:` (1024px).** This project defines a custom `small` breakpoint under
Tailwind's `extend.screens` (`tailwind.config.js`) alongside the untouched default
scale — so `sm:` (640px, a phone-landscape breakpoint despite the name) still exists and
still resolves. Using `sm:` where `small:` was intended silently ships a wrong,
much-too-early step; every rule in this document uses `small:` only.

These are today's *default* values. Since the per-brand typography token tier (below)
landed, every cell in this table except `uppercase`/`text-transform` is actually a
`var(--heading-*, <default>)` fallback, not a raw literal — the table is still accurate
because neither shipped brand (`vilmers`, `dominari`) overrides any heading field today
(confirmed: `grep -n "typography" src/themes/vilmers.ts src/themes/dominari.ts` returns
no matches), so the rendered scale is unchanged. A future brand preset could override any
single cell without touching this document's mechanism.

## The mechanism

`src/styles/globals.css`, `@layer base`:

```css
h1 {
  @apply text-heading-1 small:text-heading-1-lg;
}
h2 {
  @apply text-heading-2 small:text-heading-2-lg;
}
h3 {
  @apply text-heading-3;
}
h4 {
  @apply text-heading-eyebrow uppercase;
}
```

`text-heading-1`/`-1-lg`/`-2`/`-2-lg`/`-3`/`-eyebrow` are Tailwind `fontSize` tokens
registered in `tailwind.config.js`, each resolving to a `var(--heading-*, <default>)`
expression — see "Per-brand typography token tier" below for the full chain. An earlier
revision of this rule `@apply`ed raw arbitrary values (`text-[2.5rem]` etc.) directly; the
rendered scale did not change, only how each size is sourced.

An element selector (`h1`) has specificity 0-0-1. Any class selector (`.foo`) is 0-1-0,
which always wins regardless of source order. So a heading that must render smaller (or
differently) than the base scale is exempt automatically as long as it carries a class
that sets the properties it needs to keep — no skip list to maintain, and the base rule
never needs to know about individual call sites.

**Size-agnostic vs. size-bundling — the rule for future tokens.** `.page-title` (used by
`page-header/index.tsx:24`, the shared page-title component consumed by ~9 pages) is
`@apply font-medium text-dark-blue` — it sets no `font-size`, so the base `h1`/`h2` rule's
size passes through untouched (see "PageHeader gained two props" below for how the
rendered tag now varies). `.section-title` is `@apply text-lg font-medium
text-dark-blue mb-4` — it bundles its own `text-lg`, so it stays 18px regardless of what
the `h3`/`h4` base rules say, because its own class already resolves the `font-size`
property before the base rule is even considered. When authoring a new component class
that wraps a heading: leave `font-size` out if you want the element's scale to apply;
set it explicitly if you don't. (Both classes confirmed unchanged in current
`globals.css`.)

Confirmed via the project's own `tailwindcss` CLI build against the current
`globals.css` `@layer base` block (re-run for this reconciliation, not assumed): both the
base sizes and the `@media (min-width: 1024px)` step compile for h1 and h2; h3 and h4
compile flat with no media step; h4 compiles to exactly

```css
h4 {
  font-size: var(--heading-eyebrow-size, 18px);
  line-height: var(--heading-eyebrow-leading, 1.25);
  letter-spacing: var(--heading-eyebrow-tracking, 0.2em);
  font-weight: var(--heading-eyebrow-weight, 400);
  text-transform: uppercase;
}
```

and nothing else (no bleed onto unrelated properties). Note this is the current,
token-wrapped compiled form — an earlier revision of this document showed this same block
compiling to bare literals (`font-size: 18px;` etc.); that was accurate for the code at
the time but is now stale given the token tier below. `text-transform: uppercase` is the
only property emitted as a literal rather than a `var()` — see "Per-brand typography
token tier" for why.

## Per-brand typography token tier

The single biggest addition since the base rule above first landed: every property in
the h1-h4 scale except `text-transform: uppercase` is now sourced from an optional
per-brand override, resolved through four cooperating layers. Neither shipped brand
overrides anything today, so this is a **visual no-op under both `vilmers` and
`dominari`** — confirmed by grep, no matches in either preset file — but the plumbing is
live and statically verified.

**1. The type — `src/themes/types.ts:9-22`:**

```ts
export interface HeadingToken {
  size?: string
  sizeLg?: string // desktop step at the `small` (1024px) breakpoint; h1/h2 only
  leading?: string
  tracking?: string // letter-spacing; eyebrow only
  weight?: string // font-weight; eyebrow only
}

export interface ThemeTypography {
  h1?: HeadingToken
  h2?: HeadingToken
  h3?: HeadingToken
  eyebrow?: HeadingToken // the h4 style; carried by the `h4` element rule AND the `.eyebrow` class
}
```

`Theme.typography?: ThemeTypography` (`types.ts:63`) — every tier and every field within
a tier is optional; an absent theme, tier, or field falls all the way through to today's
default (step 3, below).

**2. Emission — `src/themes/index.ts`'s `themeToCssVars`, lines 157-197.** A `pushHeading`
helper only emits a `--heading-*` declaration when the brand preset actually sets that
field — no default is written here:

```ts
const pushHeading = (
  tier: keyof ThemeTypography,
  prop: keyof HeadingToken,
  cssVarName: string
): void => {
  const value = theme.typography?.[tier]?.[prop]
  if (value != null) {
    typographyEntries.push(`  --${cssVarName}: ${value};`)
  }
}

pushHeading("h1", "size", "heading-h1-size")
pushHeading("h1", "sizeLg", "heading-h1-size-lg")
pushHeading("h1", "leading", "heading-h1-leading")
pushHeading("h2", "size", "heading-h2-size")
pushHeading("h2", "sizeLg", "heading-h2-size-lg")
pushHeading("h2", "leading", "heading-h2-leading")
pushHeading("h3", "size", "heading-h3-size")
pushHeading("h3", "leading", "heading-h3-leading")
pushHeading("eyebrow", "size", "heading-eyebrow-size")
pushHeading("eyebrow", "leading", "heading-eyebrow-leading")
pushHeading("eyebrow", "tracking", "heading-eyebrow-tracking")
pushHeading("eyebrow", "weight", "heading-eyebrow-weight")
```

Because both shipped themes set no `typography` field at all, every call above is a
no-op — `typographyEntries` stays empty and `themeToCssVars` emits **zero**
`--heading-*` lines into the `:root { ... }` block rendered by
`src/app/layout.tsx:89` (`<style>{themeToCssVars(activeTheme)}</style>`).

**3. Canonical defaults — `tailwind.config.js`, `fontSize`, lines ~160-187.** Deliberately
NOT in step 2 above (unlike the `resolveRadius` fallback pattern used for
`--button-radius`/`--input-radius` a few lines earlier in the same file): the defaults
live as the second argument of each token's `var()`:

```js
"heading-1": [
  "var(--heading-h1-size, 2.5rem)",
  { lineHeight: "var(--heading-h1-leading, 1.25)" },
],
"heading-1-lg": [
  "var(--heading-h1-size-lg, 3.5rem)",
  { lineHeight: "var(--heading-h1-leading, 1.25)" },
],
"heading-2": [
  "var(--heading-h2-size, 2rem)",
  { lineHeight: "var(--heading-h2-leading, 1.25)" },
],
"heading-2-lg": [
  "var(--heading-h2-size-lg, 2.5rem)",
  { lineHeight: "var(--heading-h2-leading, 1.25)" },
],
"heading-3": [
  "var(--heading-h3-size, 1.5rem)",
  { lineHeight: "var(--heading-h3-leading, 1.25)" },
],
"heading-eyebrow": [
  "var(--heading-eyebrow-size, 18px)",
  {
    lineHeight: "var(--heading-eyebrow-leading, 1.25)",
    letterSpacing: "var(--heading-eyebrow-tracking, 0.2em)",
    fontWeight: "var(--heading-eyebrow-weight, 400)",
  },
],
```

Why the defaults live here and not in `themeToCssVars`: this makes the token's own
fallback the single source of default truth, and makes the compiled CSS self-sufficient
even if `themeToCssVars`'s `<style>` tag never renders (a stale bundle, an SSR edge case)
— a bare heading still resolves to the right default because the fallback is baked into
the utility class itself, independent of any `:root` block existing.

**4. Consumption — `src/styles/globals.css`.** The `@layer base` block (quoted in full
under "The mechanism") and a new `.eyebrow` utility both simply `@apply` the tokens:

```css
/* Eyebrow (the h4 style) as a standalone class for non-h4 elements.
   Deliberately sets no color — consumers keep their own color class. */
.eyebrow {
  @apply text-heading-eyebrow uppercase;
}
```

`.eyebrow` is `h4`'s exact rule, repackaged as a class for elements that need the eyebrow
*look* without being an `<h4>`. Two live consumers, confirmed by grep: the newsletter
block's label (`home/components/newsletter-block/index.tsx:52`,
`<span className="block eyebrow text-dark-blue-70">`) and three content-block title
sites that are semantically `<h3>` but styled as eyebrows
(`home/components/content-block/index.tsx:300`, `:1372`, `:1489`, each
`<h3 className="... eyebrow ...">`). The latter is a concrete instance of the
"size-bundling" escape hatch from "The mechanism" above: `.eyebrow`'s own `font-size`
(via `text-heading-eyebrow`) beats the `h3` base rule by ordinary class-vs-element
specificity, so a real `<h3>` renders at the eyebrow size.

**Key mechanism fact — `@apply` preserves `var()` references.** Nothing in this chain
needed hand-written raw CSS: `@apply text-heading-1 small:text-heading-1-lg` inlines the
Tailwind utility's compiled declarations verbatim, `var(..., default)` included — no
separate escape hatch was needed to keep the `var()` alive through `@apply`. Confirmed
directly (not assumed) by compiling this project's exact `@layer base` block through its
own `tailwindcss` CLI, as shown under "The mechanism" above.

**`text-transform: uppercase` stays hardcoded.** It's the one property in the h4/eyebrow
rule with no `var()`-backed slot — `HeadingToken` has no `transform` field, and there is
no equivalent token in `tailwind.config.js`. A brand cannot turn off the eyebrow's
uppercase casing without a code change; this is a deliberate, not accidental, gap in the
token surface.

**Prose surfaces are wired to the same tokens.** Both `.prose` wrappers point their
`prose-h1`…`prose-h4` variants at `text-heading-*` — see "CMS / prose surfaces" below for
the exact current strings. Accepted consequence: Tailwind Typography's `prose-sm` preset
sets its own per-level heading line-heights (`h1` ≈ 1.2, `h2` ≈ 1.4, `h3` ≈ 1.56, `h4` ≈
1.43 — read directly from `@tailwindcss/typography`'s `styles.js`), and these are now
uniformly overridden to the token's `1.25` default at every level, because the
`prose-hN:text-heading-N` utilities set their own `line-height` and win (Tailwind's
utilities layer is emitted after the typography plugin's components layer, so it beats
`prose-sm`'s per-level line-heights regardless of specificity ties). The accepted
tradeoff: CMS markdown headings render slightly tighter than `prose-sm`'s own per-level
defaults, in exchange for matching the component heading scale exactly.

**A residual gap: `PageHeader`'s `titleSize` escape hatch does not use these tokens.**
`TITLE_SIZE_CLASSES` in `src/modules/common/components/page-header/index.tsx` hardcodes
`text-[2.5rem] small:text-[3.5rem] leading-tight` / `text-[2rem] small:text-[2.5rem]
leading-tight` directly, rather than referencing `text-heading-1`/`text-heading-2` etc.
— so the one live consumer of this path (`categories/templates/index.tsx`'s
`titleSize="h2"`, see "PageHeader gained two props" below) would not pick up a brand's
`--heading-h2-size` override; it would keep rendering the hardcoded literal instead. Not
fixed here — flagged as a follow-on gap in the token migration, same spirit as the
"Known consequences" section below.

**Verification status.** `Theme.typography`/`themeToCssVars`'s conditional emission /
`tailwind.config.js`'s `var(..., default)` fallbacks / the `globals.css` consumption /
both `.prose` wrappers' current class strings were all confirmed here by direct file
read (not transcribed from a summary), and the compiled-CSS shape of the token chain
(both the `@layer base` block and the prose utilities) was independently reproduced via
a scratch `tailwindcss` CLI build for this reconciliation. Per the engineering notes for
this body of work, the runtime override behavior itself — that a brand-set `--heading-*`
var actually wins in the browser and every component + prose heading responds — was
proven live via a devtools variable override during implementation, and the
zero-emission no-op path was unit-checked against both shipped presets. A full
`NEXT_PUBLIC_THEME=dominari` production build exercising a real typography override
end-to-end has not been run.

## Carve-out (a): `@medusajs/ui`'s `<Heading>`

`<Heading level="h1">`/`<Heading level="h2">` render real `<h1>`/`<h2>` elements but also
inject `@medusajs/ui`'s own `h1-core`/`h2-core` classes, which hard-set **both**
`font-size` and `line-height` (`h1-core`: 1.125rem/1.75rem line-height;
`h2-core`: 1rem/1.5rem). Those are class selectors, so they beat the base rule on
`font-size` — meaning every `<Heading>` call needed (and already has) its own explicit
size class; the base rule was never going to reach them. About nine call sites carry
explicit `text-[…] small:text-[…]` classes for this reason:
`home/components/hero/index.tsx` (4 — two h1, two h2), `cms/components/page-hero/index.tsx`
(2, both h1), `order/[id]/transfer/[token]/{page,accept/page,decline/page}.tsx` (3, h1).

(`cart/components/sign-in-prompt/index.tsx` carried this same `h2` fix in an earlier
revision of this document. It has since been demoted to `level="h3"` along with the
other section headings — see "Section headings demoted (h2 → h3)" below, where the
same hard-set-core-class problem is explained for `h3-core`.)

These also each need an **explicit `leading-*`**, and this was a real bug caught during
implementation: a *named* Tailwind size (`text-6xl`) ships a paired line-height, so it
happened to override `h1-core`'s hard-set 1.75rem/28px. An *arbitrary* size
(`text-[3.5rem]`) sets `font-size` only — no paired line-height — so without an explicit
`leading-tight`, `h1-core`'s 28px line-height won against 56px text and the lines
visually overlapped. Confirmed in the DOM. All four hero headings and the two page-hero
headings now carry `leading-tight` for this reason; it is not decorative.

## Carve-out (b): bare `<Heading>` (no `level` prop) → invisible `h1`s (superseded)

`<Heading>` defaults to `level="h1"` when no `level` prop is passed. Eight call sites in
the codebase originally omitted `level` entirely, each rendering a real, but visually
near-invisible (small, `h1-core`-sized) `<h1>`:

- `order/components/help/index.tsx:8` — `<Heading className="text-base-semi">Need help?</Heading>`
- `cart/components/save-cart-modal/index.tsx:81`
- `account/components/address-card/add-address.tsx:62`
- `account/components/address-card/edit-address-modal.tsx:86` and `:137`
- `account/components/carts-table/index.tsx:395`, `:441`, `:482`

Six of the eight sit inside `Modal.Title` (`save-cart-modal:81`, `add-address:62`,
`edit-address-modal:137`, `carts-table:395/441/482`) — `Modal.Title` wraps Headless UI's
`Dialog.Title`, which auto-registers as the dialog's accessible name
(`aria-labelledby`). The user subsequently decided modals should not be `h1`s, so
**this was fixed, not left alone as an earlier revision of this document claimed.**
**Seven of the eight now carry `level="h3"`** plus an explicit size, verified by direct
file reads:

- `add-address.tsx:62`, `edit-address-modal.tsx:137`, `carts-table/index.tsx:395,441,482`,
  `save-cart-modal/index.tsx:81` — all now
  `<Heading level="h3" className="mb-2 text-[1.5rem] leading-tight">`.
- `edit-address-modal.tsx:86` — now
  `<Heading level="h3" className="text-left text-base-semi" data-testid="address-name">`
  (the address card's person-name; not inside `Modal.Title`).

**Why the six modal titles need an explicit `text-[1.5rem] leading-tight` and can't just
rely on the base `h3` rule:** `level="h3"` applies Medusa's `h3-core` class, which
hard-sets `font-size: 0.875rem` (14px) and `line-height: 1.25rem` — *smaller* than the
18px these titles rendered at before (as bare `h1-core`, 1.125rem). A class always beats
the base element rule, so without an explicit size they would have shrunk to 14px
instead of landing on the intended 24px h3 look. Verified in-browser: `h3-core mb-2`
alone renders 14px; `h3-core mb-2 text-[1.5rem] leading-tight` renders 24px.

`edit-address-modal.tsx:86` was a purely semantic fix, not a visual one — `text-base-semi`
already sets its own 14px size, so it renders identically before and after; it simply
stopped being a semantic `h1` displaying a person's name and became a semantic `h3`
instead.

**Only `order/components/help/index.tsx:8` remains bare (`<Heading>`, no `level`, no
extra size class)** — confirmed to be dead code: it's rendered only by
`order/templates/order-details-template.tsx` and `order/templates/order-completed-template.tsx`
(both in `src/modules/order/templates/`), and neither of those two templates is imported
anywhere under `src/app` or elsewhere in `src` (a distinct, similarly-named
`OrderDetailsTemplate` in `account/components/order-details/index.tsx` is what the real
`/account/orders/details/[id]` route actually renders). No live route reaches
`Help`, so its bare `h1` — while still technically present in source — is not something a
user can encounter today.

## Section headings demoted (h2 → h3)

Follow-on work, not part of the original scope: several card/section titles that used to
be `<h2>` were deliberately demoted to `<h3>`, to keep the document outline sane
underneath the newer `PageHeader` `level="h2"` page titles (see "PageHeader gained two
props" below) — a page with an `<h2>` title should not also have `<h2>` subsection
titles competing with it. Confirmed by direct read; all now plain `<h3>` elements taking
the base h3 rule with no extra size class:

- `cart/components/cart-summary/index.tsx:58`
- `checkout/components/delivery-address-form/index.tsx:123`
- `checkout/components/shipping-details/index.tsx:120`
- `checkout/templates/checkout-form/index.tsx:223`
- `account/components/carts-table/index.tsx:216`
- `account/components/orders-table/index.tsx:157`
- `products/components/product-section/index.tsx:18`

One site needed the medusa-`<Heading>` treatment instead of a plain-element demotion:
`cart/components/sign-in-prompt/index.tsx:8` is now
`<Heading level="h3" className="text-[1.5rem] leading-tight font-normal">`. Same
mechanism as the six `Modal.Title` retags under Carve-out (b): `level="h3"` applies
`@medusajs/ui`'s `h3-core` class, which hard-sets `font-size: 0.875rem` /
`line-height: 1.25rem` / `font-weight: 500`, all class-selector-level, so an explicit
override was needed to land on the intended look. `text-[1.5rem] leading-tight` matches
the modal-title pattern; `font-normal` is the one addition specific to this site,
overriding `h3-core`'s hard-set `font-weight: 500`.

## PageHeader gained two props

`src/modules/common/components/page-header/index.tsx` grew two new optional props since
the original base-rule work landed:

```ts
level?: "h1" | "h2"
titleSize?: "h1" | "h2"
```

`level` (default `"h1"`) picks the rendered tag. `titleSize` (default `= level`) is a
separate visual-size override, applied via a small `TITLE_SIZE_CLASSES` map
(`text-[2.5rem] small:text-[3.5rem] leading-tight` for `"h1"`, `text-[2rem]
small:text-[2.5rem] leading-tight` for `"h2"`) only when `titleSize !== level` — the
escape-hatch case. When they match, no extra class is added at all; the rendered tag's
own base rule (`h1`/`h2` in `globals.css`) supplies the size, as usual.

Nine `PageHeader` call sites now pass `level="h2"`, so their title renders as (and is) a
real `<h2>`, sitting correctly below the page nav/breadcrumb and above the h3 section
titles from the previous section — confirmed by grep across every `<PageHeader` call
site: `checkout/page.tsx`, `search/[query]/page.tsx`, `cart/page.tsx`,
`account/carts/page.tsx`, `account/carts/details/[id]/page.tsx`,
`account/orders/page.tsx`, `account/orders/details/[id]/page.tsx`,
`account/fabric-palettes/page.tsx`, and `account/components/overview/index.tsx`. The
last of these also resolves a consequence previously flagged in this document — see
"Known consequences" below.

The escape hatch itself has exactly one live consumer:
`categories/templates/index.tsx:126` passes `titleSize="h2"` with `level` left at its
default `"h1"` — the category page needs a real `<h1>` for SEO but the design calls for
the smaller h2 visual size, so the semantic tag and the rendered size are deliberately
decoupled. As noted under "Per-brand typography token tier" above, this specific path
does not route through the `text-heading-*` tokens — it's currently the one place in the
codebase where the heading scale is still a hardcoded arbitrary value rather than a
brand-overridable token.

## CMS / prose surfaces

Two independent `.prose` wrappers pin their own `prose-h1`…`prose-h4` variants because
`.prose h1` (a class + descendant element selector) out-specifies the bare `h1` base
rule, so the base rule alone would not reach CMS-authored markdown:

- `src/modules/common/components/rich-text/index.tsx` (`format="markdown"` branch)
- `src/modules/products/templates/index.tsx:61` (product description,
  `dangerouslySetInnerHTML`, aligned to `rich-text`'s heading treatment by deliberate
  choice, not extracted to a shared constant — the two wrappers' strings may drift
  independently later)

Both now point at the same `text-heading-*` tokens the component headings use (see
"Per-brand typography token tier" above) — not raw arbitrary values as an earlier
revision of this document described. `rich-text/index.tsx` (lines 29-32, verbatim):

```
"prose-headings:font-sans prose-headings:font-medium prose-headings:tracking-normal " +
"prose-h1:text-heading-1 small:prose-h1:text-heading-1-lg prose-h2:text-heading-2 small:prose-h2:text-heading-2-lg " +
"prose-h3:text-heading-3 " +
"prose-h4:text-heading-eyebrow prose-h4:uppercase " +
```

`products/templates/index.tsx:61` (single string, verbatim, same heading classes plus
its own layout classes):

```
"text-dark-blue prose prose-sm mb-6 md:w-1/2 prose-headings:font-sans prose-headings:font-medium prose-headings:tracking-normal prose-h1:text-heading-1 small:prose-h1:text-heading-1-lg prose-h2:text-heading-2 small:prose-h2:text-heading-2-lg prose-h3:text-heading-3 prose-h4:text-heading-eyebrow prose-h4:uppercase"
```

**The `!important` markers from an earlier revision of this document are gone — this is
a real code change, not a stale claim carried over by mistake.** A previous revision
required `prose-h4:!font-normal prose-h4:!tracking-[0.2em]` (split `fontWeight`/
`letterSpacing` utilities) because those competed at equal specificity with
`prose-headings:font-medium`/`prose-headings:tracking-normal`, and the winner depended on
Tailwind's generated source order. The current code (both files, confirmed by direct
read) has neither `!` and instead uses one combined utility,
`prose-h4:text-heading-eyebrow`, whose `fontSize`-category declaration bundles
`font-size` + `line-height` + `letter-spacing` + `font-weight` together in a single rule.
Recompiling the current class list through the project's own `tailwindcss` CLI (done for
this reconciliation, not assumed) shows `prose-h4:text-heading-eyebrow`'s rule emitted
*after* `prose-headings:font-medium`/`prose-headings:tracking-normal` in the generated
stylesheet, so it wins the cascade without `!important`. This is the **same** source-order
dependency the removed `!important` was originally guarding against — it simply lands
favorably today because the eyebrow properties now ride one combined utility instead of
two separate ones contesting the same specificity tier as `prose-headings:*`. It is not a
more robust guarantee than before; if a future refactor splits `text-heading-eyebrow`'s
properties back into separate utilities, the ordering could regress silently.
`prose-h1`/`prose-h2`/`prose-h3` still need no `!` — nothing else contests those
properties.

## Deliberate exclusions

**This list is not an exhaustive inventory.** The base rule is designed to reach *every*
heading that doesn't carry its own size class — that's the point of the mechanism, not a
defect to catalogue exception-by-exception. Roughly three dozen further raw `h1`/`h2`/`h3`
elements across the codebase have no size class of their own and now simply inherit the
scale, exactly as intended; they aren't listed individually because there's nothing
notable to say about them. What follows are the sites worth calling out specifically —
because they carry their own class and are therefore immune, because they're borderline,
or because leaving them alone had a consequence worth recording.

Item/record titles — content whose visual weight should reflect what it *is*, not what
heading level it happens to use for document structure — keep their own explicit
size-setting classes and are therefore immune to the scale by the same specificity rule
as everywhere else, confirmed by reading each site:

- **Product title** — `products/templates/index.tsx:50`,
  `text-2xl sm:text-3xl font-medium text-dark-blue` (deliberately decoupled from
  `.page-title` mid-task, after a collision was found: the product title shares a flex
  row with `ConfiguratorButton` and 56px would break that layout). This is a raw `<h1>`,
  not rendered via `PageHeader` — that page's own `PageHeader` call
  (`products/templates/index.tsx:45`) passes only `breadcrumbItems`, no `title`, so it's
  unrelated to the `level`/`titleSize` escape hatch described above.
- **Order number** — `account/components/order-details/index.tsx:128`, `<h2
  className="text-lg sm:text-xl font-medium text-dark-blue">#{order.display_id}</h2>`.
- **Fabric name** — `fabric-palettes/components/fabric-image-modal/index.tsx:157`, `<h3
  className="text-xl font-semibold text-dark-blue">`.
- **Mobile-menu drawer person-name** — `layout/components/mobile-menu/index.tsx:117`,
  `<h2 className="text-lg font-medium text-dark-blue">{displayName}</h2>` inside the
  slide-out mobile nav drawer.
- **Address-card person-name** — `account/components/address-card/edit-address-modal.tsx:86`,
  covered above under carve-out (b).
- **PWA install-prompt heading** — `components/pwa-install-prompt.tsx:181`, `<h2
  className="text-xl font-semibold text-black">` — a toast/banner, not a heading in the
  document flow sense; self-contained size class.
- **Offer PDF** (`account/carts/details/[id]/offer/page.tsx`) — the on-screen `.offer-page`
  section is a fixed `max-w-[820px] min-h-[1160px]` box rasterized client-side by
  `html2canvas-pro` (`modules/offer/lib/generate-offer-pdf.ts`) to produce the PDF. A
  `small:` (1024px viewport-width) breakpoint is meaningless here in a way that matters
  concretely, not just in theory: the box's own width (820px) never crosses 1024px, but
  `small:` responds to the *browser viewport* at capture time, not the box's width — so
  whether the step fires depends on how wide the window happens to be when html2canvas
  runs, which is incidental to the document and not controlled. One heading in this file,
  `page.tsx:559` (`<h2 className="font-bold uppercase leading-tight text-dark-blue">`),
  does **not** set its own `font-size` and therefore does inherit the base h2 scale —
  this is a live, not hypothetical, instance of the non-determinism above. Left
  unchanged; flagged here rather than fixed, since fixing it (pin a font-size) is outside
  this task's file list.

**No longer exempt — folded back into the scale.** Two sites that used to belong on the
list above (each carried its own explicit self-contained size class) were rewritten to
drop that class and now simply inherit the base h4 rule, the same way most of the
codebase's raw headings do:

- The interior-gallery "Gallery" label —
  `products/components/interior-gallery-section/gallery-client.tsx:72` — used to be
  `<h2 className="text-sm font-medium uppercase tracking-[0.2em]">` (fully
  self-contained, and previously listed here as an immune exclusion). It is now a bare
  `<h4>Gallery</h4>` with no className at all, confirmed by direct read — the base
  h4/eyebrow rule reproduces the same look the old self-contained class produced, so this
  was a cleanup, not a visual change.
- The linked-products "Accessories" carousel title, rendered through
  `common/components/product-carousel-grid/index.tsx:90`
  (`<h4 className={titleClassName ?? "!mb-0"}>{title}</h4>`) — `linked-products-section/index.tsx`
  no longer passes a `titleClassName` prop, confirmed by direct read, so this title also
  now falls through to the base h4 rule instead of a caller-supplied override.

## Known consequences (accepted, not fixed)

- **Hero headline split across two levels** — `home/components/hero/index.tsx` renders
  an authored `title` as `<Heading level="h1">` immediately followed by an optional
  `subtitle` as `<Heading level="h2">` in the same `<span>`. When both are present, what
  reads as one continuous headline sentence visually steps down mid-sentence (56px line,
  then 40px line) at desktop, because the CMS treats them as two heading levels, not one
  block of text. Confirmed unchanged in the current file.
- **`account/components/product-photos-nav/index.tsx:96`** — `<h4
  className="text-xs-semi text-gray-700 uppercase tracking-wide">`. `text-xs-semi` is
  **not defined anywhere in the repo** — not in `tailwind.config.js`, not in
  `globals.css`; this is its only usage in the codebase, confirmed by grep. It is a
  pre-existing bug (a typo or a class that was never added), invisible before this
  change because an undefined class contributes no styling either way. The base h4 rule
  exposes it rather than causing it: since the class sets no `font-size` or
  `font-weight` of its own, this heading now takes 18px + `font-normal` +
  `leading-tight` from the base rule (now the `heading-eyebrow` token's default
  fallback, same effective value). Its own `uppercase` matches the intended look, and
  `tracking-wide` (a real, defined Tailwind utility, `0.025em`) wins over the base rule's
  `0.2em` on specificity, so the letter-spacing ends up tighter than the rest of the h4
  scale. Still not fixed, still open — flagged as a pre-existing bug the base rule
  surfaced, not introduced.

**Resolved since the previous revision of this document** (kept here, marked resolved,
rather than deleted, so the history stays legible):

- **`account/components/overview/index.tsx:147`** — previously flagged: `<PageHeader
  title={customer?.full_name || customer?.name || "User"} />` rendered the customer's
  name as a full 56px `<h1>` (via `.page-title`, which sets no size of its own).
  **Resolved** — this call site was updated to pass `level="h2"` (confirmed by direct
  read, `overview/index.tsx:149`), so the name now renders at the h2 scale (40px
  desktop) via the `PageHeader` `level` prop (see "PageHeader gained two props" above),
  not the 56px h1 scale. Kept here as a record that the consequence existed and was
  subsequently addressed by unrelated follow-on work, not by anything in the original
  scope.
- **`content-block/index.tsx:1579` (now `:1575-1579` after other edits shifted line
  numbers) and `products/components/comfort-section/index.tsx:46`** — previously
  flagged as "in-between state" h4s: each set its own `font-size`/`font-weight` via a
  class but not `text-transform`/`letter-spacing`, so each kept its old 14px size while
  gaining unwanted `uppercase` + `0.2em` tracking from the new base h4 rule.
  **Resolved** — both were converted from `<h4>` to `<p>`, confirmed by direct read:
  `content-block/index.tsx:1575` is now `<p className="mt-3 text-sm font-medium" ...>`,
  and `comfort-section/index.tsx:46` is now
  `<p className="text-sm font-semibold text-dark-blue mb-3">`. As plain paragraphs they
  are no longer heading elements at all, so the base h4 rule (which only targets the
  `h4` element selector) no longer reaches them — the in-between look is gone. The
  sibling h4 at `content-block/index.tsx:945` (shifted from the previously-cited `:949`;
  `text-sm font-medium uppercase tracking-wider text-dark-blue`) was, and remains,
  unaffected either way — it already sets all four contested properties itself and is
  fully shielded.

## Verification performed

- **Live browser (computed styles), not typecheck** — the scale, the `h1-core`/`h2-core`
  line-height interaction, and the h3-base-rule leak that motivated moving the eyebrow
  look from h3 to h4 were all confirmed against the running dev server's computed
  styles, not inferred from source alone.
- **`./node_modules/.bin/tsc --noEmit`** held at **1663** pre-existing errors throughout
  every step of the original body of work (verified after each file change); zero new
  errors introduced at the time. (Direct binary invocation, not the `yarn`/`pnpm`
  wrapper script — the repo has both `yarn.lock` and `pnpm-lock.yaml` present, which
  trips corepack's package-manager guard on the wrapped script.) Not re-run for this
  reconciliation pass, which is doc-only and touches no code.
- **`next lint` / `eslint`** could not be run to completion — it crashes repo-wide,
  reproducible on files untouched by this work, for a pre-existing, unrelated
  environment reason (multiple lockfiles causing `next lint` to infer the wrong
  workspace root, breaking `@next/eslint-plugin-next` page-path resolution). Not caused
  by, and not fixable within, this change.
- Every `@apply`-with-responsive-variant combination in this document
  (`small:text-heading-1-lg` inside `@layer base`, `small:prose-h1:text-heading-1-lg`
  stacked with a prose variant) was confirmed to actually generate the expected CSS —
  including the specific media query — by running the project's own `tailwindcss` CLI
  against the real, current source strings and reading the output (re-run for this
  reconciliation using today's token-based class names, superseding an earlier
  verification pass that used the now-retired arbitrary-value class names), rather than
  assumed to work from Tailwind's general variant-stacking rules.
- **Per-brand typography tokens** — `Theme.typography`/`themeToCssVars`'s conditional
  emission, `tailwind.config.js`'s `var(..., default)` fallbacks, and both `.prose`
  wrappers' current class strings were all confirmed by direct file read for this
  reconciliation; the compiled-CSS shape of the token chain was independently reproduced
  via the project's own `tailwindcss` CLI. Runtime override behavior in a real browser,
  and a full themed production build, were not re-verified here — see "Per-brand
  typography token tier" → Verification status above for exactly what was and wasn't
  confirmed, and by whom.

## Files touched by this body of work

This list reflects the **original** scope only — the base h1-h4 rule plus the two
`<Heading>` carve-outs. Considerable follow-on work has landed since (the per-brand
typography token tier, the `PageHeader` `level`/`titleSize` props, the h2→h3
section-heading demotions, and the Gallery/Accessories/`content-block`/`comfort-section`
fixes described in the sections above), touching `src/themes/types.ts`,
`src/themes/index.ts`, `tailwind.config.js`,
`src/modules/common/components/page-header/index.tsx`, its nine consumer call sites, the
seven demoted section-heading sites, and several more. That later work is not
re-enumerated file-by-file here, in keeping with this document's own "not an exhaustive
inventory" stance (see "Deliberate exclusions") — the sections above are the source of
truth for what changed and where; this list is kept as a historical record of the
original nine files.

- `src/styles/globals.css`
- `src/modules/common/components/rich-text/index.tsx`
- `src/modules/products/templates/index.tsx` (prose div only, line 61; the h1 at line 50
  is a separate, deliberately decoupled surface — see Deliberate exclusions)
- `src/modules/home/components/hero/index.tsx`
- `src/modules/cms/components/page-hero/index.tsx`
- `src/modules/account/components/address-card/add-address.tsx` (carve-out (b) retag,
  `level="h3"` + explicit size)
- `src/modules/account/components/address-card/edit-address-modal.tsx` (carve-out (b)
  retag, two sites — one `Modal.Title`, one semantic-only)
- `src/modules/account/components/carts-table/index.tsx` (carve-out (b) retag, three
  `Modal.Title` sites)
- `src/modules/cart/components/save-cart-modal/index.tsx` (carve-out (b) retag,
  `Modal.Title`)

Nine files, original scope. Sites listed under "Deliberate exclusions" and "Known
consequences" were read for this document but not modified **at the time this list was
first written**; several have since been modified by the follow-on work described above
(most notably the interior-gallery, `product-carousel-grid`, `content-block`, and
`comfort-section` sites, and the `account/overview` `PageHeader` call) — see those
sections above for current status, not this list.
