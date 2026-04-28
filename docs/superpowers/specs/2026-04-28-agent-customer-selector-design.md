# Agent / Admin Customer Selector — Design Spec

**Date:** 2026-04-28
**Status:** Draft, ready for plan
**Repos touched:** `furnisystems-backend`, `vilmers-b2b-portal`

## 1. Problem & goal

Today the B2B portal serves a single user — the logged-in customer — and prices, cart, and orders all key off that one identity. We need agents and admins (employees, not B2B end-customers) to act on behalf of a chosen customer: see their prices, build their cart, place their orders, then switch to another customer without logging out.

Goal: introduce a portal-wide "acting customer" concept that overrides the logged-in customer for agent and admin roles, with a small, focused selector UI.

Non-goal: this is not the saas-admin-ui → portal handoff (`auth/impersonate/*`), which already exists for one-shot login. The new selector takes over after that handoff lands a user in the portal.

## 2. Constraints from prior conversations

Decided in the 2026-04-24 brainstorm and confirmed 2026-04-28:

- **Roles:** selector visible only when `customer.role === "agent" | "admin"`.
- **Initial state:** portal browsable without a customer; catalog/PDP/cart show a callout "select a customer to place an order"; cart actions disabled.
- **Customer list scope:** agents see customers they're linked to via the existing `managers` relation; admins see all customers; both routed through one query.
- **Search:** server-side, debounced 250 ms, single backend endpoint for both roles.
- **Default 10:** ordered by "most recently ordered for by this agent", alphabetical fallback.
- **Persistence:** per-device, `localStorage` keyed by logged-in user id; survives logout/login on the same device; another device starts fresh.
- **Cart-on-switch (Q1, 2026-04-28):** each customer keeps their own cart; switching swaps which one is on screen; the previous cart is preserved server-side.
- **Search permissions (Q2, 2026-04-28):** one GraphQL query, role-gated server-side; the frontend never sends a "scope" parameter.

## 3. Architecture

Three layers:

1. **Backend** — one new GraphQL query `searchCustomers(query, limit, ids)`. Resolver enforces role and scope.
2. **SDK** — `searchCustomers` wrapper in the portal's customer SDK module.
3. **Portal** — `ActingCustomerContext` + selector UI + catalog/PDP/cart gating.

```
[CustomerContext]              ← unchanged (logged-in user)
        ↓
[ActingCustomerProvider]       ← new (logged-in user OR a chosen customer)
        ↓
[CartContextProvider]          ← existing, re-keyed to actingCustomer.id
        ↓
   pages, PDP, cart
```

The cart context's only change is reading `actingCustomer?.id` instead of `customer?.id`. Because cart fetches are keyed to a customer id today, "each customer keeps their own cart" falls out for free.

## 4. Backend changes (`furnisystems-backend`)

### 4.1 New query

```graphql
extend type Query {
  searchCustomers(
    query: String
    limit: Int = 10
    ids: [Int!]
  ): [Customer!]!
}
```

File: `src/graphql/Customer/queries/searchCustomers.ts`. Pattern-match neighbouring resolvers under `src/graphql/Customer/queries/`.

### 4.2 Resolver behavior

1. Read caller from auth context. Reject with `AuthenticationError("forbidden")` unless `role` is `"agent"` or `"admin"`.
2. Build Prisma `where`:
   - Base: `is_b2b_user: true`.
   - If `query` non-empty:
     ```ts
     OR: [
       { name:              { contains: query, mode: "insensitive" } },
       { surname:           { contains: query, mode: "insensitive" } },
       { email:             { contains: query, mode: "insensitive" } },
       { account_code:      { contains: query, mode: "insensitive" } },
       { b2b_company_name:  { contains: query, mode: "insensitive" } },
     ]
     ```
   - If `ids` non-empty: add `id: { in: ids }` (intersected with scope below).
   - If caller is `agent`: add `managers: { some: { id: ctx.user.id } }`.
   - If caller is `admin`: no scope filter.
3. Order: prefer `latest_order_at DESC NULLS LAST, name ASC`. **Open question:** if `latest_order_at` does not exist on `Customer`, derive it via `_max` aggregate over the `Order` relation, or fall back to `updated_at`. Plan must answer this with a one-line schema check before resolver work begins.
4. `take: Math.min(limit ?? 10, 50)` — hard cap.
5. Returns `Customer[]`. Frontend selects: `id`, `name`, `surname`, `email`, `account_code`, `b2b_company_name`, `price_listId`, `role`. Existing field-level permissions still apply.

### 4.3 `ids` overload (hydration)

Used by the portal to validate a stored acting-customer-id on page load. The resolver applies the same role-and-scope rules to `ids`-mode requests; an agent passing an id they're not linked to gets back `[]`, which the portal interprets as "stored id is stale, clear it". One query, one permission boundary.

### 4.4 Permission test matrix

| Caller role            | Behavior                                              |
|------------------------|-------------------------------------------------------|
| Guest / no auth        | 403                                                   |
| B2B end-customer       | 403                                                   |
| Agent linked to X      | Returns X (and other linked customers); not Y         |
| Agent unlinked         | Returns `[]`                                          |
| Admin                  | Returns any matching customer                         |

Tests live alongside the resolver under `src/graphql/Customer/queries/__tests__/`.

### 4.5 No schema migration

Reuses existing `managers` relation and `Customer` shape. No new tables, no new columns.

## 5. SDK changes (`vilmers-b2b-portal/src/lib/furnisystems-sdk/modules/customer`)

Add `searchCustomers({ query, limit, ids })` wrapper. Mirrors the existing module style (compare to neighbouring methods in `customer/index.ts`). Returns `SearchCustomerResult[]` — a thin shape with the seven fields listed in §4.2 step 5.

No client-side role logic. The portal calls the same wrapper for agents and admins; the server differentiates.

## 6. Portal changes (`vilmers-b2b-portal`)

### 6.1 Role helpers

New file `src/lib/util/roles.ts`:

```ts
export const isAgent        = (c?: { role?: string } | null) => c?.role === "agent"
export const isAdmin        = (c?: { role?: string } | null) => c?.role === "admin"
export const isAgentOrAdmin = (c?: { role?: string } | null) => isAgent(c) || isAdmin(c)
```

Used by `ActingCustomerProvider`, the sub-header, and the catalog/PDP/cart callouts. Replaces existing magic-string `customer?.role === "agent" || customer?.role === "admin"` checks in `src/modules/account/components/order-details/index.tsx` and `orders-table/index.tsx`.

### 6.2 Persistence — cookie as source of truth

The acting-customer selection is persisted in a **cookie** (not `localStorage`). Reason: pricing flows through server-side data helpers (`src/lib/data/customer.ts:505 getCustomerFilterData()`, called from category/PDP/search server components) which cannot read `localStorage`. A cookie is readable by both client and server.

Cookie spec:

- Name: `actingCustomerId`
- Value: stringified customer id, or absent
- `Path=/`, `SameSite=Lax`, **not** `HttpOnly` (selector needs to write it client-side), not `Secure` in dev / `Secure` in prod
- `Max-Age` = 365 days. Auto-persists across logout / login on the same browser, matching the per-device persistence intent.

Two helpers:

- **Server** (`src/lib/data/acting-customer.ts`):
  - `getActingCustomerId(): Promise<number | null>` — reads the cookie via `cookies()` from `next/headers`, parses to number, returns `null` if absent or invalid.
  - `getActingCustomer(): Promise<Customer | null>` — reads logged-in customer via existing `getMe()`. If non-agent/admin, returns the logged-in customer (passthrough). If agent/admin and cookie is set, fetches that customer via `searchCustomers({ ids: [cookieId] })`; on empty result clears the cookie and returns `null`. If agent/admin with no cookie, returns `null`.
- **Client** (`src/lib/util/acting-customer-cookie.ts`):
  - `setActingCustomerCookie(id: number): void`
  - `clearActingCustomerCookie(): void`
  - Both write `document.cookie` with the attributes above. Used by the selector and the clear (✕) button only.

### 6.3 `ActingCustomerContext` (client)

New file `src/lib/context/acting-customer-context.tsx`. Mounts inside `CustomerProvider` and outside `CartProvider`. Exposes:

```ts
type ActingCustomerContextValue = {
  actingCustomer: SearchCustomerResult | Customer | null
  setActingCustomer: (c: SearchCustomerResult | null) => void
  clearActingCustomer: () => void
  isAgentOrAdmin: boolean
}
```

The provider receives an `initialActingCustomer` prop populated by the parent **server** layout (which calls `getActingCustomer()` once per request). The client never re-hydrates from a stored value — the server already did it. This keeps SSR-rendered prices and client-rendered cart in agreement.

Behavior by caller:

- **Guest:** `actingCustomer = null`, `isAgentOrAdmin = false`. Provider passes through; cookies are never written.
- **B2B end-customer (logged-in, not agent/admin):** `actingCustomer = customer` (passthrough). `setActingCustomer` is a no-op. Cookies are never written.
- **Agent / admin:**
  - Initial state: `initialActingCustomer` from the server (already validated against the agent's linked-customers via `searchCustomers({ ids })`).
  - `setActingCustomer(c)` writes the cookie via `setActingCustomerCookie(c.id)`, updates client state, and **calls `router.refresh()`** so server-rendered pricing-keyed pages refetch with the new acting customer in scope.
  - `clearActingCustomer()` calls `clearActingCustomerCookie()`, sets state to `null`, and `router.refresh()`.

### 6.4 Provider mount

The portal mounts `CustomerProvider` in two places: `src/app/[languageCode]/(main)/layout.tsx:51` (root) and `src/app/[languageCode]/(main)/account/layout.tsx:74` (nested). Both files mount `ActingCustomerProvider` directly inside their `CustomerProvider`, before `CartProvider` (root layout) or any account-section content (account layout). The server-side `getActingCustomer()` is called once per layout render and passed as `initialActingCustomer`.

Provider tree (root layout):

```
CustomerProvider customer={customer}                          // existing
  └─ ActingCustomerProvider initialActingCustomer={acting}    // new
       └─ ShopSettingsProvider                                // existing
            └─ CartProvider                                   // existing, re-keyed
                 └─ ...
```

The server-rendered `initialActingCustomer` ensures the first paint matches the cookie state — no client-only flash where prices are wrong for a moment.

### 6.5 Cart context wiring

In `src/lib/context/cart-context.tsx`, the line that today reads:

```ts
const customerId = customer?.id ? Number(customer.id) : undefined
```

becomes:

```ts
const customerId = actingCustomer?.id ? Number(actingCustomer.id) : undefined
```

Effect dependencies on `customerId` already exist; switching customers will refetch through the existing path. Add an "ignore stale response" guard so a slow first switch doesn't overwrite a fast second switch.

### 6.6 Pricing & data-fetch swap surface

Pricing already keys off `customer.price_listId` via `getCustomerFilterData()` and `default-pricelist.ts`. The codebase has **no** SWR or `react.cache()` callsites and only three `unstable_cache` calls — none of which key on `customer.id` or `price_listId`. The actual swap surface is concentrated in five places:

1. `src/lib/data/customer.ts:505` — `getCustomerFilterData()` reads `customer.price_listId` and `customer.tags`. Switch to read from `getActingCustomer()`. Single-source-of-truth swap; downstream callers (`category-filters.ts:10`, `category-products.ts:15`, `category-products.ts:61`, `search-products.ts:13`, `search-products.ts:42`) pick up the change automatically.
2. `src/lib/context/cart-context.tsx:26` — covered by §6.5.
3. `src/modules/products/components/configurator/configurator-content.tsx:57-86, 317-318, 338` — reads `customer?.price_listId` and `customer.additional_components` to drive configurator data, price, and visible steps. Swap to acting customer.
4. `src/modules/checkout/templates/checkout-form/index.tsx:105` — `fetchCustomerAddresses(Number(customer.id))`. Swap to acting customer's id.
5. `src/modules/checkout/templates/checkout-form/index.tsx:184` — `customer_accountId` on order placement. Swap so the order is recorded against the acting customer.

The plan enumerates each of these as a discrete task with the line number and exact replacement.

### 6.6 Sub-header row

In `src/modules/layout/templates/nav/index.tsx`, add a conditional row directly below the 72 px header. Renders only when `isAgentOrAdmin(customer)` (the logged-in user, not the acting one — the row exists regardless of selection state).

- Height: 40 px. Background: muted (e.g. `bg-neutral-50` with bottom border).
- Sticky with the header.
- Single child for MVP: the customer selector (left side). Right side empty, reserved for future use.

### 6.8 Selector component

New file under `src/modules/layout/components/customer-selector/`. Uses Headless UI `Popover`, mirroring the pattern in `src/modules/layout/components/cart-dropdown/`.

Closed state:

- `actingCustomer === null`: button reads **"Select customer"** with chevron, amber border accent.
- `actingCustomer set`: button reads `<account_code> · <b2b_company_name || name>` with a small ✕ that calls `clearActingCustomer()`.

Open state (popover panel, ~360 px wide):

- Top: search input, autofocus on open, placeholder "Search customers…".
- List below: max 10 visible, scrollable.
- Empty query → header "Recent" + default 10 results.
- Typed query → debounced 250 ms; header "Results"; "No customers found" empty state.
- Loading → skeleton rows.
- Error → inline message + retry button. Page does not crash.
- Keyboard: ↑/↓ navigate, Enter pick, Esc close (Headless UI defaults).
- On pick: call `setActingCustomer(c)`, close popover. Cart re-keys via context; the provider also calls `router.refresh()` so server-rendered pricing-keyed pages refetch.

Mobile (`< sm`): same content, but rendered as a Headless UI `Dialog` full-screen sheet instead of a fixed-width popover.

### 6.9 Catalog / PDP / cart gating callout

New component `src/modules/layout/components/acting-customer-callout/` (or co-located if it ends up trivial).

- Renders on catalog list, PDP, and cart pages when `isAgentOrAdmin(customer) && !actingCustomer`.
- Position: directly below the sub-header, full-width banner.
- Copy: **"You're viewing the general catalog. Select a customer to see their pricing and place an order."**
- Action: "Select a customer" button opens the selector popover.
- Style: informational tone (blue/neutral), not error.
- Not dismissible — disappears the moment a customer is selected.

### 6.10 Disabled cart actions when no acting customer

When `isAgentOrAdmin(customer) && !actingCustomer`:

- "Add to cart" buttons disabled with tooltip "Select a customer first".
- Cart drawer/page shows the same callout; "Place order" disabled with same tooltip.
- For non-agent/admin users: zero change.

### 6.11 Out-of-scope for MVP

- "Shop / sub-account" dimension (the orders module already shows `purchased_subAccount?.name` — future selector).
- Per-customer "remember last viewed page".
- Bulk actions across customers.
- Audit trail of "agent X acted as customer Y at time T". Flag for follow-up if compliance requires.

## 7. Data flow summary

**Login (agent/admin):**

1. Server layout calls `getActingCustomer()`. It calls `getMe()` for the logged-in user, reads cookie `actingCustomerId`, and if set validates via `searchCustomers({ ids: [cookieId] })`. Returns the customer or `null`.
2. `ActingCustomerProvider` mounts with `initialActingCustomer` already populated. No client-side hydration round-trip.
3. Cart context reads `actingCustomer?.id` from the new context and fetches `getOrCreateActiveCart(id)` if non-null.

**Pick / switch:**

1. User opens selector → client calls SDK `searchCustomers({ query: "", limit: 10 })`.
2. User types → debounced `searchCustomers({ query, limit: 20 })`.
3. User picks → `setActingCustomer(c)` writes the cookie, updates client state, calls `router.refresh()`.
4. Cart context re-fetches with new id (effect dep on `actingCustomer.id`); previous cart preserved server-side, new cart on screen.
5. `router.refresh()` re-renders server components → pricing-keyed pages refetch with the new acting customer.

**Logout:**

- The cookie is preserved (we only clear it on explicit ✕ or backend-rejected hydration). Same browser, same user resumes their last selection on next login.

## 8. Testing

**Backend:**

- Resolver unit tests for the four-row permission matrix, plus `query`, `limit`, `ids` variants. Pattern under `src/graphql/Customer/queries/__tests__/`.

**SDK:**

- Round-trip test for the `searchCustomers` wrapper using the existing customer-module mock pattern.

**Portal:**

- `roles.ts` — three trivial unit tests.
- `ActingCustomerProvider` — guest, end-customer passthrough, agent with `initialActingCustomer` populated, agent with `initialActingCustomer = null`, `setActingCustomer` writes cookie + calls `router.refresh()`, `clearActingCustomer` clears cookie + calls `router.refresh()`.
- `getActingCustomer()` server helper — returns logged-in customer for end-customer, returns cookie-validated customer for agent, returns `null` and clears cookie when validation returns `[]`, returns `null` for agent with no cookie.
- Selector component — closed/open/searching/no-results/error renders.
- Cart re-key test: mock `getOrCreateActiveCart`, flip acting-customer, assert second call uses new id and previous cart no longer rendered.
- Manual / Playwright E2E checklist:
  1. Agent logs in → "Select customer" visible → callout on catalog → cart actions disabled.
  2. Search → pick customer X → prices visible, fresh empty cart, callout gone.
  3. Add item to X's cart.
  4. Switch to customer Y → Y's cart shown (empty or pre-existing), X's items not visible.
  5. Switch back to X → X's cart restored with the item.
  6. Logout, log back in same browser → X still selected.
  7. Open in different browser → no selection, fresh start.
  8. End-customer login (not agent/admin) → no sub-header, no callout, no behavior change.

## 9. Rollout

- Backend PR first → merges to `develop` (workspace memory: backend → develop).
- SDK + portal PR together → merges to `main` (workspace memory: portal → main).
- No feature flag. The selector renders only for `agent | admin` and there are no agent/admin users in production B2B traffic today; conditional render is sufficient isolation. If a kill-switch is required later, gate the `ActingCustomerProvider` mount on `process.env.NEXT_PUBLIC_ENABLE_ACTING_CUSTOMER`.

## 10. Risks

1. **Missed swap site.** A read of `customer.id` or `customer.price_listId` left in place would mean prices/cart for the logged-in user, not the acting customer. Mitigation: the implementation plan lists every site (§6.6) as a discrete TDD task; manual E2E checklist covers prices on catalog/PDP, cart, checkout, configurator.
2. **Race on rapid switch.** Double-click on two different rows fires two cart fetches; slower wins. Mitigation: stale-response guard in cart context (compare against current `actingCustomer.id`).
3. **Stale cookie.** Cookie id no longer linked to agent → `getActingCustomer()` server helper sees empty result from `searchCustomers({ ids })` → clears the cookie and returns `null`. Handled in §6.2.
4. **Missing `latest_order_at` field.** Audit confirmed it does not exist. Resolver uses `orderBy: { orders: { _count: "desc" } }` as a stable proxy ("agents who have placed many orders for a customer rank that customer higher"). Acceptable for MVP given the hard `limit ≤ 50`. If the proxy proves wrong in practice, swap to a `groupBy` on Order with `_max(createdAt)` followed by an in-memory sort.
5. **Mobile UX.** Popover on a 360 px panel is cramped on phones. Mitigation: full-screen `Dialog` sheet on `< sm` viewports.
6. **Two `CustomerProvider` mount points.** Root layout and `account/layout.tsx` both mount `CustomerProvider`. Both must also mount `ActingCustomerProvider`, otherwise the account section sees the wrong context. Plan handles both.

## 11. Plan-time facts (resolved during planning)

- **Ordering field for default 10:** `Customer.latest_order_at` does not exist. Use `orderBy: { orders: { _count: "desc" } }` (Prisma supports relation-`_count` ordering natively) with `name ASC` as tiebreaker.
- **Layout mount points:** `src/app/[languageCode]/(main)/layout.tsx:51` (root) — wraps `CustomerProvider` around the rest of the tree; `src/app/[languageCode]/(main)/account/layout.tsx:74` (nested) — wraps `CustomerProvider` around the account section. Both layouts mount `ActingCustomerProvider` directly inside their `CustomerProvider`.
- **Swap surface:** `getCustomerFilterData()` is the only data-layer site that reads `customer.price_listId` / `customer.tags`. Three additional read sites outside the data layer are listed in §6.6 (configurator and checkout). No `useSWR`, no `react.cache()`, no `unstable_cache` calls in the codebase are keyed on customer id.
