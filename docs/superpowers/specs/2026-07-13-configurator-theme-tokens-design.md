# Configurator Theme Tokens — Design

**Date:** 2026-07-13
**Project:** vilmers-b2b-portal
**Status:** Approved (pending spec review)

## Problem

The sofa configurator hardcodes two raw colors throughout its UI:
- `gold-20` (`#EBE7DD`) — the warm-beige "resting surface" (drawer panels, module cards, selected-options chips, bottom action bar, inactive stepper, etc.)
- `#1e2a3a` (navy) with a `#2a3a4a` hover — the paired "active/selected" surface (active stepper dot, selected chips, primary buttons, selection/focus rings)

Neither participates in the theme system. `page_background` and `product_card_background` are theme tokens overridden per brand (e.g. `dominari` uses a grey palette), but because the configurator uses the raw `gold-20` Tailwind class and inline `#1e2a3a`, **under the `dominari` theme every configurator surface still renders warm beige and navy**, clashing with dominari's grey `page_background`. This is a live cross-theme bug, not just cosmetic.

## Goal / Scope

Make the sofa configurator's surface and accent colors theme-configurable via the existing token mechanism, so each brand's theme controls them.

**In scope:** all `gold-20` surfaces in the configurator + the drawer backgrounds, and the paired `#1e2a3a`/`#2a3a4a` accent states.

**Out of scope (flagged, untouched):**
- The amber "no fabric palette assigned" warning box (`amber-50`/`amber-200`) — stock Tailwind amber, a separate concern.
- The `#F2F0EF` image placeholder in component-drawer cards.
- The `gold-10` fade gradient at `sofa-modules-selector.tsx:171` (pre-existing minor mismatch).

## Token Set (5 new `surfaces` tokens)

| Token | Vilmers | Dominari | Role |
|---|---|---|---|
| `configurator_surface` | gold-20 | grey-20 | resting beige surface: 4 drawer panels, collapsed SOFA MODULES strip, selected-options chips, bottom action bar, stepper inactive dots/connectors, disabled Next button, canvas instruction pill + border, combination unselected chip |
| `configurator_card` | gold-20 | grey-20 | module cards in the Sofa Modules drawer + Konva dimension-label bg. Flush with the drawer by design (no visual change to Vilmers) — separate token so brands can differentiate later. |
| `configurator_accent` | #1e2a3a | #1e2a3a | active stepper dot/connector, enabled Next & Add buttons, selected chips, selection rings/borders, search focus rings |
| `configurator_accent_hover` | #2a3a4a | #2a3a4a | accent button hover background |
| `configurator_accent_foreground` | white | white | text/icons on the accent |

The accent values are identical across the two current brands but are still tokenized so future brands can override them independently.

## Wiring (follows the `page_background` precedent exactly)

1. **Palette primitives (for the raw hex accents):** `configurator_accent` (#1e2a3a) and `configurator_accent_hover` (#2a3a4a) are raw hex, not existing primitives. Tailwind exposes surface tokens as `rgb(var(--token) / <alpha-value>)`, which requires the CSS var to hold **space-separated RGB channels**, not a hex string. So add these as new palette primitives in each theme's `colors` block (same format/treatment as `gold-20`) and point the tokens at those primitives. During implementation, verify the exact channel format `themeToCssVars()` produces for `--color-*` and match it. `configurator_surface`/`configurator_card` reference the existing `gold-20`/`grey-20` primitives; `configurator_accent_foreground` references `white`.
2. **`surfaces` block:** add the 5 tokens to both `vilmers.ts` and `dominari.ts`. `themeToCssVars()` auto-emits `--configurator-surface`, etc. — no change needed to that function or `layout.tsx`.
3. **`tailwind.config.js`:** add `"configurator-surface": "rgb(var(--configurator-surface) / <alpha-value>)"` and the same for `configurator-card`, `configurator-accent`, `configurator-accent-hover`, `configurator-accent-foreground`.

## File-by-file changes

### → `bg-configurator-surface` (from `bg-gold-20`)
- `sofa-modules-drawer.tsx:341`, `fabric-drawer.tsx:142`, `component-drawer.tsx:84`, `fabric-combination-drawer.tsx:59` — drawer panels
- `sofa-modules-selector.tsx:151` — collapsed strip label block
- `configuration-summary.tsx:74, 240, 271` — selected-options chips
- `price-footer.tsx:59` — bottom action bar
- `configurator-stepper.tsx:42, 87` — inactive step circle & connector
- `configurator-content.tsx:549` — disabled Next button
- `sofa-stage-container.tsx:205` — `border-gold-20` → `border-configurator-surface`; `:236` — `bg-gold-20/80` → `bg-configurator-surface/80`
- `fabric-combination-drawer.tsx:112` — unselected label chip

### → `bg-configurator-card` (from `bg-gold-20`)
- `sofa-modules-drawer.tsx:201` — ModuleCard background
- `sofa-modules-drawer.tsx:101` — Konva label bg: replace literal `"#EBE7DD"` with the `configurator_card` value resolved from the active theme object at build time (JS constant, since Konva needs a string not a class)

### → accent tokens (from `#1e2a3a` / `#2a3a4a`)
- `configurator-stepper.tsx:40, 86` — active step circle / completed connector
- `configurator-content.tsx:548` — enabled Next button (bg + hover + foreground)
- `fabric-combination-drawer.tsx:87, 111` — selected ring/border + selected chip
- `component-drawer-card.tsx:100, 212` — selected ring / checkmark badge
- `fabric-drawer-card.tsx:26, 49` — selected ring / checkmark badge
- `fabric-swatch.tsx:27` — selected ring
- `sofa-modules-drawer.tsx:226` — Add button (border/text/hover)
- `fabric-drawer.tsx:165`, `sofa-modules-drawer.tsx:375` — search input focus ring

Mapping: `bg-[#1e2a3a]`→`bg-configurator-accent`, `text-[#1e2a3a]`→`text-configurator-accent`, `border-[#1e2a3a]`→`border-configurator-accent`, `ring-[#1e2a3a]`→`ring-configurator-accent`, `hover:bg-[#2a3a4a]`→`hover:bg-configurator-accent-hover`, and `text-white` sitting on an accent background → `text-configurator-accent-foreground`.

The implementer must grep `#1e2a3a`, `#2a3a4a`, and `gold-20` across the configurator scope to catch any straggler not listed above.

## Verification
- Grep proves zero `gold-20`, `#1e2a3a`, `#2a3a4a` remain in the configurator scope.
- `tsc --noEmit` parity vs baseline; `next build` exit 0.
- Visual: build/run under `NEXT_PUBLIC_THEME=dominari` (grey palette) and confirm the configurator surfaces render grey (not beige) and accents theme correctly; confirm Vilmers is visually unchanged (surface + card both gold-20).

## Risks
- **Konva sync:** the `#EBE7DD` literal must track `configurator_card`; resolve from the theme object so it can't drift.
- **4-drawer duplication:** the panel `bg-gold-20` is copy-pasted across 4 drawer files with no shared base — all must be changed consistently.
- **Card/panel flush:** cards and drawer share the same value (gold-20) by decision; keep them on separate tokens but equal values for Vilmers.
- **Channel format:** the accent primitives must be added in the same RGB-channel format the palette uses, or the `rgb(var())` Tailwind wrapper breaks.
