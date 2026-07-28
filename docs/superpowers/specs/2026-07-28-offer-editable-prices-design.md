# Editable Prices in Offer Overview (B2B Portal)

**Date:** 2026-07-28
**Status:** Approved

## Goal

Let portal users edit the unit price of each item in the OFFER OVERVIEW table of the cart offer page. All dependent prices — row subtotal, grand subtotal, VAT, grand total, and the per-item TOTAL on each item's detail page — update from the entered values. Edits flow into the exported/emailed PDF automatically because the PDF is a DOM raster of this page.

## Decisions

- **Persistence:** Client-only. Overrides live in page state; lost on reload. No backend, SDK, or schema changes.
- **Edit scope:** Editing a unit price updates everywhere `totalNet` is rendered — overview row subtotal, grand totals (subtotal/VAT/total), and the item detail page TOTAL.
- **Interaction:** Invisible inline inputs (Option A). The PRICE cell is always a number input styled like the current text; no edit mode or toggle.

## Where

All changes in one file:
`vilmers-b2b-portal/src/app/[languageCode]/(main)/account/carts/details/[id]/offer/page.tsx`

No changes to `generate-offer-pdf.ts`, the SDK offer-pdf module, or the backend.

## Design

### State

- New `useState<Record<string, number>>` in `CartOfferContent`: `priceOverrides`, keyed by item id, value = overridden **unit** price.
- Helper: `effectiveTotalNet(item) = priceOverrides[item.id] != null ? priceOverrides[item.id] * item.quantity : item.totalNet` (quantity 0 → override used as-is, matching the existing `totalNet` fallback).

### Data flow

Every read of `item.totalNet` switches to `effectiveTotalNet(item)`:

- Item detail page TOTAL (~line 426) and its VAT lines (~432–438)
- Overview unit price derivation (~617–618)
- Overview SUBTOTAL cell (~660)
- Grand totals reduce (~567–569) — VAT and total recompute for free.

### The input

- Controlled number-ish input in the PRICE cell showing the effective unit price.
- While focused it holds raw text (no formatter fighting); on blur/Enter it parses and commits.
- Invalid input (NaN, negative) is a no-op — reverts to the previous displayed value.
- Clearing the field removes the override, restoring the backend price.
- Unfocused display uses the existing `eur()` formatting.
- Styling: borderless/transparent, right-aligned, matches current typography. Hover/focus shows a light background for discoverability. Since hover/focus styles don't apply during html2canvas rasterization, the PDF looks identical to plain text.

### PDF / email

No changes. html2canvas rasterizes the live DOM; an unfocused chrome-less input renders as its text value.

## Testing

Manual, in browser:

1. Edit a unit price → row subtotal, grand subtotal, VAT, grand total update.
2. Item's detail page TOTAL reflects the edit.
3. Clear the field → backend price restored.
4. Export PDF → edited values present, no input chrome visible.
5. "Show prices" toggle still works (overview page removed entirely when unchecked).
