# Customer-Specific Discount Display (Configurator + Cart/Checkout)

**Status:** Design approved, ready for plan
**Scope:** `vilmers-b2b-portal` (Next.js App Router) + additive changes in `furnisystems-backend`
**Out of scope:** storefront (`furnibay-frontend-shop`), admin UIs, product cards, product detail, order history

## 1. Problem

B2B customers in the Vilmers B2B Portal can have a per-account percentage discount
stored as `Customer.b2b_customer_discount` (integer, 0–100). Today this value is
read only at order creation (`createNewOrder` mutation) and is never surfaced to
the user while they are configuring a product or reviewing their cart. The user
sees the full, pre-discount price everywhere and only learns their real price
after the order is placed.

Goal: wherever a price is displayed in the configurator and in the cart/checkout
flow, show the pre-discount price with a strikethrough and the discounted price
as the emphasized value. When the customer has no discount, show a single price
exactly as today.

## 2. Scope

In scope:

- Configurator price surfaces (sofa module cards, additional component cards,
  footer total, any summary rows inside the configurator).
- Cart line items, cart summary totals, checkout order summary.
- Backend GraphQL: additive fields on cart/order line items and summaries, plus
  an explicit B2B gate on the discount resolver logic.

Out of scope (explicitly deferred to later specs):

- Storefront UI and storefront GraphQL consumers — must remain behaviorally
  unchanged.
- Product catalog pages (category grid, product preview, product detail).
- Order history / past order detail.
- Any change to how `b2b_customer_discount` is stored, sourced, or administered.

## 3. Key Decisions

1. **Hybrid computation model.** Configurator applies the discount on the client
   (it already does all other price math on the client). Cart/checkout relies on
   backend-computed discounted values so the displayed total always matches what
   the order will be charged.
2. **Additive GraphQL changes only.** No existing field renames, no changes to
   the semantics of fields storefront currently reads. New fields default to
   `null` / `0` for non-B2B callers.
3. **Explicit B2B gate in the resolver.** The discount is only applied when the
   caller is a B2B customer, independent of what the DB contains. This is
   defense in depth beyond the fact that storefront customers do not carry
   `b2b_customer_discount`.
4. **Zero-discount behavior.** When `b2b_customer_discount` is `null` or `0`,
   the UI renders a single price with no strikethrough. Identical to today.
5. **Configurator coverage.** Strikethrough + discounted price appears
   everywhere a price is rendered in the configurator — module cards, component
   cards, footer, and any summary rows. Free / priceless components still render
   nothing (unchanged).

## 4. Architecture

### 4.1 Configurator context (frontend-computed)

```
Session/customer data (already loaded)
  → useCustomerDiscount() → { discountPct | null }
  → getAdvancedProductPrice() → regular price (unchanged)
  → applyDiscount(regular, discountPct) → { regular, discounted, hasDiscount }
  → <PriceDisplay regular discounted /> → renders dual or single price
```

No new network calls. The existing `useConfiguratorPrice` dependency graph
triggers re-renders as it does today.

### 4.2 Cart / checkout context (backend-authoritative, B2B-gated)

```
Cart/order GraphQL query
  → resolver: is caller a B2B customer?
      no  (storefront) → unit_price = raw
                         original_unit_price = null
                         discount_total = 0
      yes (b2b portal) → unit_price = raw * (1 - pct/100)
                         original_unit_price = raw
                         discount_total = Σ(original - discounted)
  → Frontend line-item components render via <PriceDisplay>
  → Cart/order summary renders "You save €X" when discount_total > 0
```

Storefront is guaranteed untouched: the resolver short-circuits on non-B2B
callers before any pricing math runs.

### 4.3 Consistency guarantee

The discount math used by the cart/checkout resolver is the same calculation the
existing `createNewOrder` mutation applies. The implementation plan will extract
this into a shared helper so the displayed cart total cannot diverge from the
charged order total.

## 5. Components

### 5.1 `<PriceDisplay>` (new, shared)

Location: `src/modules/common/components/price-display/index.tsx`.

Props:

```
{
  regular: number | null,
  discounted: number | null,   // null/undefined → no discount rendered
  currency: string,
  language?: string,
  size?: "sm" | "md" | "lg",
  align?: "left" | "right",
}
```

Behavior:

- `regular == null` → renders nothing.
- `discounted == null` or `discounted === regular` → single price using the
  existing locale-aware formatter. No strikethrough.
- Otherwise → dual layout: struck-through `regular` (muted), emphasized
  `discounted`.

### 5.2 `useCustomerDiscount()` (new hook)

Location: `src/lib/hooks/use-customer-discount.ts`.

- Reads the already-loaded customer from the same source used by
  `getCustomerFilterData()` for price-list resolution.
- Returns `{ discountPct: number | null }`.
- Treats `null`, `undefined`, and `0` as "no discount" (returns `null`).

### 5.3 `applyDiscount()` (new helper)

Location: `src/configurator/lib/price-utils.ts`.

- Pure function: `applyDiscount(regular, pct) → { regular, discounted, hasDiscount }`.
- `pct` null / 0 → `{ regular, discounted: regular, hasDiscount: false }`.
- Clamps `pct` to `[0, 100]`; out-of-range values log a dev warning and are
  clamped rather than producing nonsense.
- Rounds `discounted` to 2 decimals.

### 5.4 Configurator touch points

Each of these render sites switches from raw `priceFormatter(...)` /
`formatPrice(...)` to `<PriceDisplay ... />`:

- `src/modules/products/components/configurator/price-footer.tsx`
- Sofa module selection cards (wherever a module price is rendered).
- Additional component cards (when the component has a price).
- Any summary rows inside the configurator.

Exact file list and line numbers are enumerated in the implementation plan.

### 5.5 Cart / checkout touch points

- `src/modules/common/components/line-item-price/index.tsx` — swap internal
  dual-price logic for `<PriceDisplay>` driven by backend fields.
- `src/modules/common/components/line-item-unit-price/index.tsx` — same.
- `src/modules/cart/components/cart-summary/index.tsx` — add "You save €X" row
  when `discount_total > 0`.
- `src/modules/order/components/order-summary/index.tsx` — same.

### 5.6 Backend changes (furnisystems-backend)

All additive.

- Cart line item type: add `original_unit_price: Float` (nullable).
- Order line item type: add `original_unit_price: Float` (nullable).
- Cart summary and order summary types: add `discount_total: Float` (default 0)
  if not already present — to verify in the plan.
- Resolver logic:
  - Detect whether the caller is a B2B customer (session/role check). If not,
    short-circuit: `unit_price` stays at raw price-list value,
    `original_unit_price` is `null`, `discount_total` is `0`.
  - If yes and `b2b_customer_discount > 0`: `unit_price = raw * (1 - pct/100)`,
    `original_unit_price = raw`, `discount_total` aggregated across line items.
  - Reuse (or extract) the same helper that `createNewOrder` uses, so cart and
    order stay in lockstep.
- No change to the existing `createNewOrder` mutation signature.

## 6. Data Flow Edge Cases

- **Customer data not yet loaded (configurator):** `useCustomerDiscount()`
  returns `null`; `<PriceDisplay>` shows single price; no flash of wrong price.
- **`b2b_customer_discount` out of `[0, 100]`:** clamped by `applyDiscount()`
  with a dev warning. Never produces nonsense prices.
- **`regular` is `null` / `0`:** `<PriceDisplay>` renders nothing — matches
  today's behavior for free additional components.
- **Non-B2B caller:** resolver returns raw prices, `original_unit_price: null`,
  `discount_total: 0`. Storefront UI behaves identically to today.
- **B2B caller with `b2b_customer_discount == null`:** treated as 0%, no
  discount applied, `original_unit_price: null`, UI shows single price.

## 7. Rounding

- Backend rounds `unit_price` to 2 decimals after applying the discount, matching
  money field convention.
- Frontend `applyDiscount()` rounds the same way.
- Configurator totals vs cart totals may differ by <1 cent due to independent
  rounding paths. Accepted — within the rounding noise the app already tolerates.

## 8. Testing

Backend:

- Unit tests on the resolver helper covering: B2B caller with discount, B2B
  caller without discount, storefront (non-B2B) caller. Assert `unit_price`,
  `original_unit_price`, and `discount_total` for each.
- Integration test: an order created from a discounted cart has line-item and
  grand-total numbers that match the cart snapshot that produced it.

Frontend:

- `<PriceDisplay>` rendering tests: single price, dual price, zero discount,
  null regular.
- `useCustomerDiscount()` tests: null customer, 0%, 15%, 100%.
- `applyDiscount()` unit tests including `-5`, `0`, `15`, `100`, `150`.
- Manual smoke (B2B user with non-zero discount): configure a sofa → verify
  dual prices on module cards, additional components, and footer → add to cart
  → verify dual prices in cart line items and a "You save €X" row → place order
  → verify the charged total matches the cart snapshot.
- Regression smoke (storefront account): add product to cart → assert single
  prices everywhere and no visual regressions.

## 9. Non-Goals

- No new discount administration UI.
- No compounding with product-level `price_type === "sale"` — that surface is
  storefront-only and out of scope.
- No change to how customers are assigned a `b2b_customer_discount`.
- No refactor of the existing `formatPrice` / `priceFormatter` utilities.

## 10. Rollout

- Single merge, backend + frontend together, because the B2B Portal cart reads
  the new `original_unit_price` / `discount_total` fields as soon as they exist.
- Storefront is untouched; no staged rollout needed there.
- Manual verification on staging with a seeded B2B customer (non-zero discount)
  and a seeded storefront customer (no discount) before promoting to production.
