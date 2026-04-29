# "All Products" Override Toggle — Design

**Date:** 2026-04-29
**Status:** Approved (brainstorming)
**Project:** vilmers-b2b-portal

## Goal

Mirror the storefront's "All products" checkbox in the b2b-portal: when a privileged user (admin-impersonator or Account Manager) ticks the box, product listings (categories, search) return the **full catalog**, ignoring the acting customer's pricelist and customer-tag filters. When unticked (default), the existing filtering applies.

## Why

Currently in the b2b-portal, an Account Manager (`role === 'admin'`) or an admin who entered via "Impersonate B2B Portal" sees only the products that match the active customer's pricelist/tags. They sometimes need to see the entire catalog to assist the customer or place orders against products outside the customer's standard assortment. The storefront already solves this with a checkbox; the b2b-portal lacks the equivalent.

## Visibility gate

The toggle is visible to two distinct user groups, OR'd together:

- **Case A — admin-impersonator:** the user arrived via the admin panel's "Impersonate B2B Portal" action. Backend sets `managerId` in the JWT payload (`furnisystems-backend/src/types-modified/B2BCustomers/B2BCustomers.ts:1766-1770`). The b2b-portal currently does not read this field anywhere.
- **Case B — Account Manager:** the user logged in directly (e.g. magic link) and their customer record has `role === 'admin'`.

Agents (`role === 'agent'`) and regular customers do **not** see the toggle.

```ts
canShowAllProductsToggle = (jwtPayload.managerId != null) || (customer.role === 'admin')
```

This is narrower than the existing `isAgentOrAdmin(customer)` gate, which continues to control the surrounding beige sub-header (callout + customer-selector). The toggle is one element inside that sub-header with its own narrower gate.

## State storage

A new client-readable cookie `showAllProducts` (`'1'` or unset).

- Cookie pattern mirrors `actingCustomerId` (`src/lib/util/acting-customer-cookie.ts`): one-year `max-age`, `SameSite=Lax`, `Secure` in production.
- Cookie is chosen over `localStorage` (which the storefront uses) because the b2b-portal performs product filtering **server-side** in `getCustomerFilterData()` (`src/lib/data/customer.ts:506-532`); server components cannot read `localStorage`. Cookies are the natural primitive here.
- Default state: cookie absent → toggle is off → filtering applies as today.

## Filter behavior

When the toggle is active (cookie set AND server-side gate passes), `getCustomerFilterData()` returns:

```ts
{ customerTagIds: undefined, priceListIds: [] }
```

This causes `sdk.products.buildWhereFilter()` (`src/lib/furnisystems-sdk/modules/products/index.ts:314-422`) to emit a `where` clause without pricelist or tag restrictions, so `getCategoryProducts()` and `getSearchProducts()` return the full catalog.

This matches the storefront's behavior: when `showAllProducts === true`, both the pricelist filter AND the customer-tag filter are dropped (`furnibay-frontend-shop/src/components/DesktopElements/CategoryPageElements/CategoryProductList.tsx:743-841`).

## Components

### New files

#### `src/lib/util/show-all-products-cookie.ts`

Client-side cookie helpers, mirror of `acting-customer-cookie.ts`:

- `setShowAllProductsCookie(on: boolean): void` — sets `showAllProducts=1` when `on`, deletes the cookie when `!on`.
- `clearShowAllProductsCookie(): void` — alias for `setShowAllProductsCookie(false)`.
- `readShowAllProductsCookie(): boolean` — returns `document.cookie` parse result, `true` when value is `'1'`.

#### `src/lib/data/show-all-products.ts`

Server-only:

- `getShowAllProductsCookie(): Promise<boolean>` — reads the cookie via Next's `cookies()`.
- `canShowAllProductsToggle(): Promise<boolean>` — returns true iff `jwt.managerId != null` OR `customer.role === 'admin'`. Uses `decodeJWTPayload()` from `src/lib/util/jwt-utils.ts` and `retrieveCustomer()`.
- `getShowAllProductsActive(): Promise<boolean>` — `canShowAllProductsToggle() && getShowAllProductsCookie()`. This is the source of truth used by `getCustomerFilterData()`. The gate is checked server-side so a forged or stale cookie on a non-privileged user is inert.

#### `src/modules/layout/components/show-all-products-toggle/index.tsx`

Client component (`"use client"`):

- Props: `initialChecked: boolean`.
- UI: Tailwind checkbox styled to match the b2b-portal aesthetic (no MUI). Label: **"All products"** with an info icon and a tooltip: *"Show all products, including those not available in the customer's pricelist or market."* Use whatever tooltip primitive is already in use elsewhere in the b2b-portal (the customer-selector uses Headless UI Popover; pick the matching primitive at implementation time).
- Local `useState` mirrors `initialChecked`. On change: `setShowAllProductsCookie(next)` then `router.refresh()` so server components re-fetch with the new filter.
- The component does not render a visibility check itself — the parent decides via `canShow`.

### Modified files

#### `src/lib/util/jwt-utils.ts`

Extend the existing payload type and `decodeJWTPayload()` return so `managerId: number | null` is exposed alongside the current `customer_accountId` and `exp`.

#### `src/lib/data/customer.ts`

`getCustomerFilterData()` (lines 506-532):

```ts
const showAll = await getShowAllProductsActive()
if (showAll) return { customerTagIds: undefined, priceListIds: [] }
// ...existing logic
```

Place the bypass at the top of the function so we don't pay for unnecessary work when override is on.

#### `src/modules/layout/templates/nav/index.tsx`

In the agent/admin sub-header block (lines 208-214):

```tsx
{!isHomePage && isAgentOrAdmin(customer) && (
  <div className="...beige sub-header...">
    <ActingCustomerCallout />
    {canShowAllProducts && (
      <ShowAllProductsToggle initialChecked={showAllProductsActive} />
    )}
    <CustomerSelector />
  </div>
)}
```

`canShowAllProducts` and `showAllProductsActive` are computed server-side at the top of the `Nav` component via the new helpers and passed in. (Final position of the toggle within the bar — left of `CustomerSelector`, right of callout — confirmed during implementation; trivially adjustable.)

## Data flow

```
[Privileged user toggles checkbox]
      │
      ▼
client cookie `showAllProducts=1`  →  router.refresh()
      │
      ▼
Server component re-renders Nav + page
      │
      ▼
getCategoryProducts() / getSearchProducts()
      │
      ▼
getCustomerFilterData()
      │
      ▼
getShowAllProductsActive() === true
      │
      ▼
returns { priceListIds: [], customerTagIds: undefined }
      │
      ▼
sdk.products.buildWhereFilter() emits unrestricted `where`
      │
      ▼
GraphQL returns full catalog
```

## Edge cases

- **Forged / stale cookie on non-privileged user:** the server-side gate (`canShowAllProductsToggle`) blocks the bypass. The cookie is inert without the gate. No data leak.
- **No acting customer selected:** the toggle still works. With no acting customer, `getCustomerFilterData()` already produces a permissive filter; with the toggle on, both that path and the privileged path are unrestricted.
- **Logout / role change:** the cookie persists by default but is inert without the gate. Optional cookie-clearing on logout is not in scope (server-side gate is sufficient).
- **i18n:** the label and tooltip flow through the existing translation pipeline used by `acting-customer-callout` and `nav/index.tsx`. Keys: `nav.showAllProducts.label`, `nav.showAllProducts.tooltip`.
- **Mobile:** the existing beige sub-header is desktop-oriented; the toggle inherits the same responsiveness as the customer-selector. If the customer-selector is hidden on mobile, the toggle follows. (Concrete handling deferred to implementation; matches sibling-component behavior.)

## Out of scope

- No GraphQL or SDK changes. `buildWhereFilter()` already supports an empty `priceListIds`.
- No backend changes. The `managerId` JWT claim already exists.
- No market selector UI (the storefront has none either).
- No changes to nav menu items, the Products dropdown, or the mega-menu.
- No "remember per acting customer" behavior — the toggle is a single global preference.

## Acceptance criteria

1. An Account Manager (`role === 'admin'`) sees the "All products" checkbox in the beige sub-header on every non-home page.
2. A user arriving via "Impersonate B2B Portal" sees the same checkbox, regardless of the impersonated customer's `role`.
3. An agent (`role === 'agent'`) and a regular customer do **not** see the checkbox.
4. With the checkbox unchecked, category and search pages return only products allowed by the acting customer's pricelist + tags (today's behavior, unchanged).
5. With the checkbox checked, category and search pages return the full catalog regardless of pricelist or tags.
6. Toggling the checkbox updates the listing on the current page (via `router.refresh()`).
7. The setting persists across sessions via the `showAllProducts` cookie.
8. A non-privileged user who manually sets `showAllProducts=1` in their cookies sees no change in the listing (server-side gate blocks the bypass).
9. The tooltip "Show all products, including those not available in the customer's pricelist or market" is reachable on hover/focus.
