# Order Placed — Redirect to Details Page with Success Banner

**Project:** vilmers-b2b-portal
**Date:** 2026-04-20
**Status:** Design approved, pending spec review

## Goal

After a successful checkout, redirect the user to the order details page, show a "Order successfully placed" banner at the top of that page, and clear the cart from the client UI.

## Current behavior

- `CheckoutForm` submits the `CREATE_ORDER` mutation via `placeOrder()` in `src/lib/data/checkout.ts`.
- On success, `placeOrder()` already:
  - Calls `sdk.store.cart.complete(id)` — the backend marks the cart completed.
  - Calls `removeCartId()` — the cart-id cookie is cleared.
- `CheckoutForm` then redirects to `/{languageCode}/order/{orderId}/confirmed`, which renders a minimal "thank you" page (`src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx`).
- The `CartContext` in-memory state is **not** refreshed, so the header cart badge still shows the old items until a full page reload.

## Target behavior

1. User submits `CheckoutForm`.
2. `placeOrder()` runs unchanged — backend order is created, cart is completed server-side, cart cookie is removed.
3. On success, the client awaits `refreshCart()` from `useCart()` so the `CartContext` re-fetches via `getOrCreateActiveCart` and reflects the now-empty cart.
4. Client redirects via `router.push` to `/{languageCode}/account/orders/details/{orderId}?placed=1`.
5. The order details page reads `placed=1` on mount and renders a dismissible success banner at the top of the page: "Order successfully placed".
6. On first render, the banner strips the `placed` query param via `router.replace` so a subsequent refresh does not re-show the banner.
7. The legacy `/{languageCode}/order/{id}/confirmed` route is deleted.

## Files to change

| File | Change |
|---|---|
| `src/modules/checkout/templates/checkout-form/index.tsx` | Replace the post-placement redirect URL (around line 202) with `/{languageCode}/account/orders/details/{orderId}?placed=1`. Await `refreshCart()` from `useCart()` before calling `router.push`. |
| `src/app/[languageCode]/(main)/account/orders/details/[id]/page.tsx` | Read the `placed` search param. If `placed=1`, render the `OrderPlacedBanner` at the top of the page. |
| `src/modules/orders/components/order-placed-banner/index.tsx` *(new, unless a reusable Alert/Banner already exists)* | Success banner with dismiss action. On first mount, call `router.replace` to strip the `placed` param from the URL so a refresh does not re-show it. |
| `src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx` *(and sibling `layout.tsx` / templates under that route if any)* | Delete. |
| Callers that link to `/order/[id]/confirmed` | Update to link to the new details URL or delete (audit as part of implementation). |

## Open items locked as defaults

1. **Feature flag `NEXT_PUBLIC_FEATURE_ORDER_DETAILS`:** Treated as a prerequisite. The flag must be enabled in every environment where checkout runs. No fallback branch to the old confirmation page.
2. **i18n:** Add a new translation key for the banner copy, using the project's existing translation pattern (same helpers the checkout flow already uses).
3. **Cart refresh ordering:** `refreshCart()` is awaited **before** `router.push` so the header cart badge is empty the moment the details page renders.
4. **Banner dismissal:** Both manual dismiss (close button) and automatic URL cleanup on first mount (so refresh does not re-show the banner).

## Items to resolve at implementation time

- Confirm whether a reusable Alert/Banner component already exists in the project. If so, use it instead of creating `OrderPlacedBanner` from scratch.
- Pick the translation key name consistent with other checkout keys.
- Grep for any other callers that link to `/order/[id]/confirmed` and update or remove them before deleting the route.

## Out of scope

- No new backend mutations. The backend already completes the cart on order placement.
- No changes to `placeOrder()` in `src/lib/data/checkout.ts`.
- No changes to the order details page's own content (only the banner slot).
- No changes to other flows (admin UI, shop, legacy admin).

## Acceptance criteria

- Submitting a valid checkout redirects to `/{languageCode}/account/orders/details/{orderId}` with a visible success banner at the top.
- The header cart badge shows an empty cart immediately after redirect, without a manual page reload.
- Dismissing the banner hides it; a page refresh does not re-show it.
- Navigating directly to `/{languageCode}/account/orders/details/{orderId}` (no `placed=1`) does **not** render the banner.
- The route `/{languageCode}/order/{id}/confirmed` no longer exists (returns 404 or Next.js not-found).
