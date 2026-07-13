# B2B Portal — Theming + Feature Config

**Date:** 2026-07-08
**Project:** `vilmers-b2b-portal` (Next.js 15 App Router, React 19, Tailwind v3, Medusa starter)
**Scope:** Frontend-only (b2b portal). No backend/Prisma changes required.
**Status:** Approved design, ready for implementation planning.

## Goal

Let the same app be deployed as separate branded instances with a different look
(colors, fonts) and a different enabled feature set, both driven by `.env`, with
brand *content* (logo, name, footer) pulled from the DB per store.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Deployment model | **Build per brand** — each instance = its own `next build` + its own `.env` |
| Theme source | **Preset file per brand** in repo, selected by `NEXT_PUBLIC_THEME` |
| Token mechanism | **CSS-variable foundation** — Tailwind colors reference `var(--…)` |
| Feature flags | **Centralize all ~15 existing flags** into one typed module (preserve each default) |
| Brand content (logo/name/footer/favicon) | **From DB `ShopSetting`** via existing `ShopSettingsProvider` |
| Spacing/radius theming | **Reserve slots only** — do not refactor the 88 files' spacing in v1 |

## Architecture — three independent layers

| Layer | Source | Timing | Controls |
|---|---|---|---|
| Theme tokens | Preset file, selected by `NEXT_PUBLIC_THEME` | Build-time (per brand) | Colors, fonts → CSS variables |
| Feature set | `NEXT_PUBLIC_FEATURE_*`/`NEXT_PUBLIC_SHOW_*` → typed `features` module | Build-time (per brand) | Features on/off |
| Brand content | DB `ShopSetting` via `ShopSettingsProvider` | Runtime (per store) | Logo, favicon, brand name, footer text |

**Invariant (must be documented in `.env.template` and in `src/themes/index.ts`):**
One deployment = one brand = one store. `NEXT_PUBLIC_THEME` MUST match the store the
deployment points at. Because build-per-brand freezes theme colors at build time,
serving a different store from the same build would render one brand's palette under
another brand's logo.

---

## Layer 1 — Theme (CSS-variable foundation)

### Why CSS variables
The brand tokens live as hardcoded hex in `tailwind.config.js` and are used as static
classes (`bg-dark-blue`, `text-gold`) in **387 places across 88 files**. Converting the
Tailwind color tokens to `var(--…)` means all 387 usages keep working with **zero
per-file edits** — only the config, globals, and font wiring change.

### New: `src/themes/`
- **`types.ts`** — the `Theme` type:
  ```ts
  export interface Theme {
    name: string
    colors: Record<string, string>   // token name -> hex, e.g. "dark-blue": "#222D37"
    font: { family: string }         // brand font family name (loaded via next/font)
    spacing?: Record<string, string> // RESERVED for v1 (maps to current defaults)
    radius?: Record<string, string>  // RESERVED for v1 (maps to current borderRadius)
  }
  ```
- **`vilmers.ts`** — the current Vilmers values, lifted verbatim from `tailwind.config.js`.
  This is the reference preset; new brands copy it and change values. Tokens to include:
  - Colors: `primary`(=dark-blue), `dark-blue` `#222D37`, `dark-blue-70` `#646C73`,
    `gold` `#9A8555`, `gold-10` `#F5F3EE`, `gold-20` `#EBE7DD`, `gold-30` `#E1DACC`,
    `line` `#D3D5D7`, `beige` `#DFD6C7`, `beige-10/20/80`, `white`, `white-20/80`,
    `sale` `#E07E5A`, `divider`, `image-overlay`, `gray-inactive` `#F4F4F5`,
    `status-completed/awaiting-payment/pending/shipping/canceled/paid/delivered`,
    the legacy `grey` 0–90 scale.
  - Font: `family: "Montserrat"`.
  - `radius` (reserve): `soft/base/rounded/large/circle` = today's values.
- **`index.ts`** — the theme registry + selector + emitter:
  - `themes = { vilmers }` registry.
  - `activeTheme` resolved from `process.env.NEXT_PUBLIC_THEME` (default `"vilmers"`);
    unknown value throws a clear build-time error (fail fast, don't silently fall back).
  - `themeToCssVars(theme): string` — renders `:root { --color-dark-blue: #222D37; … }`.
    **Color tokens only**, one var per token as `--color-<name>`. It does **NOT** emit
    `--font-brand` — that variable is owned by `next/font` (see Fonts below), so emitting
    it here too would conflict.

### Wiring
1. **`src/app/layout.tsx`** — inject `<style>{themeToCssVars(activeTheme)}</style>` into
   `<head>` (build-time value, single active theme — coherent with build-per-brand).
2. **`tailwind.config.js`** — reference the CSS vars. **Channel form is required for
   Tailwind opacity modifiers:** solid colors are stored as raw RGB channels
   (`themeToCssVars` emits `--color-dark-blue: 34 45 55`) and referenced as
   `"dark-blue": "rgb(var(--color-dark-blue) / <alpha-value>)"`. A bare
   `var(--color-*)` full-color reference silently DROPS the alpha on `bg-x/10`,
   `text-x/80`, `hover:bg-x/90`, etc. (Tailwind can't parse channels out of a full color),
   so channels + `<alpha-value>` are mandatory. Already-`rgba()` tokens (`divider`,
   `image-overlay`, `white-20/80`) stay full values and use a bare `var(--color-*)` (never
   used with an opacity modifier). Point `fontFamily.sans` at
   `["var(--font-brand)", -apple-system, …]`. Keep `borderRadius`, `screens`,
   `fontSize`, `maxWidth`, `keyframes`, `animation` as-is.
3. **Fonts (unify onto one variable, owned by `next/font`):**
   - Change the `next/font/google` Montserrat init to use the `variable: "--font-brand"`
     option; apply `brandFont.variable` on `<html>`/`<body>` instead of
     `montserrat.className`. `next/font` generates `--font-brand` with the optimized,
     self-hosted font — this is the single owner of that variable.
   - **Per-brand font (build-time):** since `next/font` loaders need static literal args,
     put them in the theme registry — declare one loader per brand
     (`const montserrat = Montserrat({ …, variable: "--font-brand" })`), map theme name →
     loader, and export the selected one as `brandFont` chosen by `NEXT_PUBLIC_THEME`
     (fallback Montserrat). For v1 only Montserrat exists; adding a brand font = one more
     loader + registry entry. (Extra loaders bundle their CSS but only the selected
     `.variable` is applied — acceptable for a handful of brands.)
   - Delete the **12 arbitrary `font-['Montserrat']` classes** across 7 files
     (nav, top-bar, mobile-menu, action-card, nav-menu-item, pwa-install-prompt,
     language-switcher) — they inherit `font-sans` (= `var(--font-brand)`) now.
4. **Cleanups folded in (do not expand scope beyond these):**
   - Remove the dead/conflicting `:root` block in `globals.css:7-22` (it defines
     `--dark-blue: #3b1e2a` etc., referenced nowhere and conflicting with the config).
   - Collapse the redundant `primary` (== `dark-blue`, both `#222D37`).
   - Fix the `var(--color-gold-10)` typo bug at `sofa-modules-selector.tsx:167`
     (globals only ever defined `--gold-10`); it now resolves to `--color-gold-10`.
   - Replace arbitrary hex color classes like `text-[#9A8555]`
     (`pwa-install-prompt.tsx:206`) with the token class (`text-gold`).

### Reserved, NOT refactored in v1
`spacing` and `radius` slots exist in the `Theme` type and map to today's values so the
mechanism is complete and future-proof — but **no component spacing is rewritten**.
Nothing differs on spacing between brands yet (YAGNI).

---

## Layer 2 — Features (centralize the scattered flags)

### New: `src/lib/env.ts`
The single place `process.env` is read for flags. Helpers:
- `getBool(key: string, defaultValue: boolean): boolean` with a `parseBool` that
  **preserves each flag's current default** (see table). Default-OFF flags use
  `=== "true"`; the Tawk flag is default-ON (`!== "false"`).
- `getString(key, defaultValue?)`.

### New: `src/lib/features.ts`
Exports a single typed `features` object. Client-safe (all inputs `NEXT_PUBLIC_`).

| `features.*` | Env var | Current default | Consumers to migrate |
|---|---|---|---|
| `orderDetails` | `NEXT_PUBLIC_FEATURE_ORDER_DETAILS` | OFF | `orders-table/index.tsx:143`, `account/orders/details/[id]/page.tsx:15` |
| `productCatalog` | `NEXT_PUBLIC_FEATURE_PRODUCT_CATALOG` | OFF | `layout/templates/nav/index.tsx:86` |
| `configurator` | `NEXT_PUBLIC_CONFIGURATOR_PAGE_ENABLED` | OFF | `configurator-button.tsx:36`, `category-product-card/index.tsx:119`, `(main)/layout.tsx:72`, `products/[handle]/configurator/page.tsx:16`, `lib/data/go-to-configurator.ts:20` |
| `newsletter` | `NEXT_PUBLIC_NEWSLETTER_ENABLED` | OFF | `(main)/page.tsx:114`, `categories/templates/index.tsx:171` |
| `tawk` | `NEXT_PUBLIC_TAWK_ENABLED` | **ON** | `app/layout.tsx:95`, `(main)/layout.tsx:92` |
| `showVolume` | `NEXT_PUBLIC_SHOW_VOLUME` | OFF | `order-details/index.tsx:71`, `offer-pdf.ts:48,79` |
| `showDeliveryShippingInfo` | `NEXT_PUBLIC_SHOW_DELIVERY_SHIPPING_INFORMATION` | OFF | `order-details/index.tsx:70` |
| `showPvm` | `NEXT_PUBLIC_SHOW_PVM` | OFF | `order-details/index.tsx:68`, `offer-pdf.ts:47,78` |

Replace every scattered `process.env.NEXT_PUBLIC_X === "true"` with `features.x`.

### Orphan reconciliation (do while centralizing)
- `NEXT_PUBLIC_DELIVERY_DATE_SELECT` — declared, unused → remove from `.env`/`.env.template`.
- `NEXT_PUBLIC_FURNISYSTEMS_PUBLISHABLE_KEY` — used (`lib/config.ts:7`), undeclared → add to `.env.template`.
- `NEXT_PUBLIC_SHOW_SOFA_SHAPE_GIZMO`, `NEXT_PUBLIC_SHOW_PWA_PROMPT` — used, undeclared (dev toggles) → document in `.env.template` as dev-only; can stay direct reads (not user-facing features) or move to `features` if desired.
- Tawk widget/property IDs — declared but the `<Script>` uses hardcoded IDs → out of scope, note only.

### Validation
Register any new **required** vars in `check-env-variables.js` (already wired into
`next.config.js`). `NEXT_PUBLIC_THEME` is optional (defaults to `vilmers`), so it need
not be required; document it in `.env.template`. Feature flags remain optional with
defaults. (No `zod` introduced — out of scope.)

---

## Layer 3 — Brand content from DB (frontend-only)

The backend `ShopSetting` GraphQL type **already exposes** these fields; the portal just
doesn't query them. **No backend/Prisma work.**

### SDK changes
- **`src/lib/furnisystems-sdk/modules/shop-settings/index.ts`** — extend the
  `APP_SHOP_SETTINGS` GraphQL query to also select:
  `favicon { … }`, `footer_logo_image { … }`, `footer_copyright_text`,
  `default_manufacturer { company_name, logo_image { … } }`.
  (Match the existing Image sub-selection shape used elsewhere in the SDK.)
- **`src/lib/furnisystems-sdk/modules/shop-settings/types.ts`** — extend the
  `ShopSetting` interface with the same optional fields.
- `src/lib/data/shop-settings.ts` and `src/lib/context/shop-settings-context.tsx`
  need no shape changes beyond the wider type flowing through.

### Consumers
- **Nav** (`src/modules/layout/templates/nav/index.tsx`) — logo `src` from
  `footer_logo_image` (or `default_manufacturer.logo_image`), **fallback to
  `/images/logo.svg`**. Preserve the homepage inverted variant behavior.
- **Footer** (`src/modules/layout/templates/footer/index.tsx`) — brand name from
  `default_manufacturer.company_name`; copyright from `footer_copyright_text`
  (fallback to current hardcoded strings).
- **Favicon / title** — via `generateMetadata` reading shop settings (nice-to-have;
  requires a shop-settings fetch in the root layout's `generateMetadata`).

### Deferred
- `supportEmail` — no such field on `ShopSetting`. Footer support email stays hardcoded
  in v1. (Adding it = backend change → out of scope.)

---

## Files touched

**New:**
`src/themes/types.ts`, `src/themes/vilmers.ts`, `src/themes/index.ts`,
`src/lib/env.ts`, `src/lib/features.ts`

**Modified:**
`tailwind.config.js`, `src/styles/globals.css`, `src/app/layout.tsx`,
`src/modules/layout/templates/nav/index.tsx`,
`src/modules/layout/templates/footer/index.tsx`,
the ~15 feature-flag consumer files (table above),
the 7 files with `font-['Montserrat']`,
`src/lib/furnisystems-sdk/modules/shop-settings/{index,types}.ts`,
`.env` / `.env.template` (document new vars, reconcile orphans),
`check-env-variables.js` (only if a new required var is added).

---

## Layer 4 — Semantic surface tokens (role-based theming)

Added after Layers 1–3. Introduces a **second tier** on top of the primitive palette:
brands override ~10 *roles* (where a color is used) instead of raw hex. Approved
decisions: **explicit role names** for classes; **named surfaces only** (do not broadly
migrate the 88 files off primitives).

### Two-tier model
- Tier 1 (primitives, already built): `--color-dark-blue: #222D37`, etc.
- Tier 2 (semantic surfaces, new): each defaults to a primitive, so it's a **visual no-op**
  until a brand overrides it:
  ```
  --top-menu-background: var(--color-dark-blue);
  --footer-foreground:  var(--color-white);
  ```

### The 10 tokens (default → primitive; implementer confirms the surface's ACTUAL current color and maps the default to that so it stays a no-op)
| Token (`surfaces` key) | CSS var | Tailwind token | Default primitive | Applied at |
|---|---|---|---|---|
| `page_background` | `--page-background` | `page-background` | `gold-10` | body / main page wrapper |
| `page_foreground` | `--page-foreground` | `page-foreground` | `dark-blue` | default body text |
| `top_menu_background` | `--top-menu-background` | `top-menu-background` | `dark-blue` | top bar |
| `top_menu_foreground` | `--top-menu-foreground` | `top-menu-foreground` | `white` | top bar text |
| `nav_background` | `--nav-background` | `nav-background` | `white` | main nav bar (non-transparent state) |
| `nav_foreground` | `--nav-foreground` | `nav-foreground` | `dark-blue` | nav links/text |
| `product_card_background` | `--product-card-background` | `product-card-background` | `gold-20` | product & category cards (intentional: card becomes a warm gold-20 panel, distinct from the gold-10 page) |
| `footer_background` | `--footer-background` | `footer-background` | `dark-blue` | footer |
| `footer_foreground` | `--footer-foreground` | `footer-foreground` | `white` | footer text |
| `accent` | `--accent` | `accent` | `gold` | primary buttons, active states, links |

Classes read as `bg-top-menu-background`, `text-footer-foreground`, `bg-accent`, etc.

### Mechanism
- **`src/themes/types.ts`** — add `surfaces: Record<string, string>` to `Theme`. Each value
  is a **primitive token key** (e.g. `"dark-blue"`) or a raw CSS value.
- **`src/themes/vilmers.ts`** — add the `surfaces` map above.
- **`src/themes/index.ts`** — extend `themeToCssVars` to append the semantic vars AFTER the
  primitive vars: for each surface, if the value matches a known `colors` key emit
  `--<token>: var(--color-<key>);`, else emit the raw value. (Order matters: primitives
  first so the `var(--color-*)` references resolve.)
- **`tailwind.config.js`** — add the 10 semantic tokens to `theme.extend.colors`. Because
  each surface maps to a channel-based primitive, use the **channel form** so opacity
  modifiers (`hover:bg-accent/90`, `text-nav-foreground/80`) work:
  `"accent": "rgb(var(--accent) / <alpha-value>)"`, etc. `themeToCssVars` emits
  `--accent: var(--color-gold)` (which now holds channels). (Primitives stay; this is
  additive.)

### Application (named surfaces only — must stay visually identical to post-Layer-3)
- **top bar** (`top-bar/index.tsx`): `bg-dark-blue` → `bg-top-menu-background`; white text → `text-top-menu-foreground`.
- **body / page** (`app/layout.tsx`): body `bg-gold-10` → `bg-page-background`; base text → `text-page-foreground`. Do NOT disturb the Layer-1 theme `<style>` / `brandFont`.
- **nav** (`nav/index.tsx`): non-transparent nav bg → `bg-nav-background`; links → `text-nav-foreground`. **PRESERVE the transparent-homepage behavior** (transparent bg + inverted logo) — only the solid state uses `nav-background`. Keep Layer 2 (`features.productCatalog`) and Layer 3 (DB logo) edits intact.
- **product/category cards** (`category-product-card/index.tsx`, the `B2BProductCard` used app-wide): apply `bg-product-card-background` to the card container. Default `gold-20` — an INTENTIONAL change: the card becomes a warm gold-20 panel distinct from the gold-10 page (per user's reference screenshot). (`page_foreground` remains dormant per user.)
- **footer** (`footer/index.tsx`): `bg-primary` → `bg-footer-background`; text → `text-footer-foreground`. Keep Layer 3 DB name/copyright.
- **accent**: the gold-accent usages (primary/gold button variant in `common/components/button`, active states, links) → `bg-accent`/`text-accent`. Be conservative — only clearly-gold-accent spots.

### Folded-in fix (from Layer 3 review)
Drop `footer_logo_image` from the **nav** logo resolution chain (it's a footer-authored,
often white-on-white asset). Nav logo becomes `default_manufacturer.logo_image?.src →
"/images/logo.svg"`. (Footer keeps using the DB name/copyright text as-is.)

### Out of scope for Layer 4
Broad migration of the remaining primitive-class usages; DB-overriding the semantic tokens
at runtime (still needs the v2 runtime-injection path); spacing/radius roles.

## Out of scope for v1

- Runtime DB color-override (`theme_main_color`/`theme_secondary_color`/`theme_override`)
  — needs runtime CSS-var injection; deferred to v2.
- Themed spacing adoption across components (reserved only).
- Configurator (Konva/SVG) element FILL colors — these are genuinely data-driven and
  live in TS data (`configurator/lib/vilmers.ts`), immune to CSS-variable theming;
  separate config path. This does NOT include the configurator's page/modal/canvas
  Tailwind BACKGROUND chrome (breadcrumb band, `ResponsiveDialog` modal background,
  canvas backdrop) — that chrome IS themed via `bg-page-background` like the rest of
  the app and must not be re-skipped in future audits.
- `supportEmail` as a DB field (backend change).
- `zod`/typed env-validation library.

## Risks & notes

- **Build-time freeze:** `NEXT_PUBLIC_THEME` and all `NEXT_PUBLIC_*` flags are inlined at
  `next build`. Changing brand/features = rebuild. This is the accepted model.
- **`@lib/config` alias is taken** by the SDK file `lib/config.ts` — do **not** create a
  `lib/config/` directory. New modules are flat files under `src/lib/` (`env.ts`,
  `features.ts`), matching the existing `src/lib/util/env.ts` convention.
- **Tailwind config is `.js`** importing a `.ts` preset — verify the toolchain resolves
  it (the config already runs under the Next/PostCSS pipeline). If `.ts` import from the
  JS config is a problem, keep the emitted CSS-var *names* stable and have the config
  reference `var(--color-*)` literally (no TS import needed in the config itself) — the
  preset only needs to be imported where the `<style>` is emitted (`layout.tsx`, a TS/TSX
  file). **Preferred:** config references `var(--color-*)` strings directly; preset TS is
  imported only in `layout.tsx`. This avoids JS→TS import entirely.
- **Verification:** `pnpm build` must succeed; visually confirm the app renders identical
  to today with `NEXT_PUBLIC_THEME=vilmers` (the refactor should be visually a no-op),
  then flip one color in a throwaway `brandx.ts` preset + `NEXT_PUBLIC_THEME=brandx` to
  prove the mechanism.

## Verification plan

1. `pnpm build` succeeds (catches Tailwind/CSS-var + font wiring errors).
2. Run dev, load key pages (home, product, nav, footer, account/orders) with default
   `vilmers` theme → pixel-identical to pre-change (refactor is a no-op for Vilmers).
3. Add a temporary `brandx` preset with a distinct primary color + `NEXT_PUBLIC_THEME=brandx`
   → colors change app-wide via the 387 existing classes; revert the temp preset.
4. Toggle one feature flag off (e.g. `NEXT_PUBLIC_NEWSLETTER_ENABLED=false`) → feature
   hides, confirming the centralized `features` module drives behavior.
5. Point at a store whose `ShopSetting` has `footer_logo_image`/`company_name` set →
   nav logo + footer name reflect the DB (with graceful fallback when unset).
