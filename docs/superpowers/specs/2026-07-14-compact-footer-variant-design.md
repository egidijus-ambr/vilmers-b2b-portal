# Compact Footer Variant — Design

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation
**Scope:** `vilmers-b2b-portal` frontend only. No backend / GraphQL / DB changes.

## Problem

The site footer (`src/modules/layout/templates/footer/index.tsx`) is tall: its
height comes almost entirely from `py-24` (192px) on the top content row, plus a
dead, fully commented-out block wrapped in `py-8` (64px of empty space), plus the
bottom disclaimer row. We want a second, **compact** footer variant that is roughly
**70% shorter**, selectable per brand, with **Dominari** using compact and
**Vilmers** keeping the current full footer unchanged.

## Decisions (locked)

1. **Selection = theme-config knob**, mirroring the existing navbar-layout-config
   pattern (`languageSwitcher.placement`). A new optional field on
   `ThemeLayout.footer`, read via `activeTheme.layout.footer` at build/render time.
   Not a component prop, not a runtime toggle, not an env override.
2. **Dominari → `compact`, Vilmers → `full`.** Vilmers keeps the current footer.
3. **Compact layout = single inline row.** Help text + social icons + copyright on
   one row with tight padding. Divider and the dead commented block are not rendered
   in the compact branch.
4. **No-op fidelity:** the existing full-footer JSX is left completely untouched, so
   Vilmers renders pixel-identical. Compact is an additive, early-return branch.

## Design

### 1. Theme config field

`src/themes/types.ts` — inside `ThemeLayout.footer`:

```ts
footer?: {
  variant?: "full" | "compact" // defaults to "full" when omitted
  facebook?: string
  twitter?: string
  instagram?: string
  pinterest?: string
  linkedin?: string
  footer_support_email?: string // rendered as a mailto: link
  footer_privacy_url?: string
}
```

- `src/themes/dominari.ts` → add `variant: "compact"` to its `footer` block.
- `src/themes/vilmers.ts` → unchanged (field omitted ⇒ `"full"`).

### 2. Footer component branch

`src/modules/layout/templates/footer/index.tsx`:

- Compute `const variant = activeTheme.layout.footer?.variant ?? "full"`.
- If `variant === "compact"`, return the compact markup (early return).
- Otherwise fall through to the **existing, unmodified** full JSX.

Compact markup (single row):

- Container: `<footer className="bg-footer-background w-full">` with an inner
  `content-container ... px-10`, then a single row:
  `flex flex-col gap-y-3 xsmall:flex-row items-center justify-between py-6`.
- **Left:** "How we can help? `Contact Us`" — reuses the existing support-email
  `mailto:` link and i18n keys (`how-can-we-help`, `contact-us`). Gated on
  `footer_support_email` via the existing `show()` helper.
- **Right cluster:** the social icons (reusing the current icon set + `hasAnySocial`
  / `show()` gating) followed by the copyright text inline
  (`text-sm text-footer-foreground/80`), sourced from
  `shopSettings.footer_copyright_text` with the same `© {year} {brand}` fallback the
  full footer uses.
- **Not rendered in compact:** the divider (`border-t`) and the dead commented-out
  categories block.

### 3. Height

Full footer ≈ 370px (192px `py-24` + content + 64px dead block + disclaimer row).
Compact target ≈ 100px (`py-6` = 48px + a single content row). ~70–75% shorter.
"70%" is approximate; actual rendered pixel height is verified during
implementation.

## Out of scope (YAGNI)

- **No build-time guard.** The `"full" | "compact"` union already rejects invalid
  values; there is no contradictory-config case like the navbar top-bar/switcher one.
- **No i18n changes.** Compact reuses existing keys.
- **No backend / `ShopSetting` / GraphQL / Prisma changes.** Copyright text remains
  backend-driven exactly as today.
- **No CSS variables.** Padding differences are plain Tailwind utilities on the
  compact branch.
- **The full footer's dead commented-out block is left as-is** — removing it would
  touch the full branch and risk Vilmers no-op fidelity.

## Files touched

| File | Change |
|------|--------|
| `src/themes/types.ts` | Add `variant?: "full" \| "compact"` to `ThemeLayout.footer` |
| `src/themes/dominari.ts` | Set `footer.variant: "compact"` |
| `src/modules/layout/templates/footer/index.tsx` | Add compact early-return branch; full JSX untouched |
| `src/themes/vilmers.ts` | **Unchanged** (verification of no-op) |
| `src/app/.../layout.tsx` | **Unchanged** (no call-site change) |

## Verification

1. `pnpm build` (or `tsc --noEmit`) passes.
2. `NEXT_PUBLIC_THEME=vilmers` build renders the footer **pixel-identical** to today.
3. `NEXT_PUBLIC_THEME=dominari` build renders the single-row compact footer.
4. Measure the Dominari footer height and confirm it is ~70% shorter than Vilmers.
5. Empty-config gating still works (missing support email / socials hide gracefully).
