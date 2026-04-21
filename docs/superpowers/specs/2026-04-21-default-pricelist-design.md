# Default Pricelist for Guest Visitors — Design

**Date:** 2026-04-21
**Status:** Draft — awaiting user review

## Problem

The B2B portal currently has public pages (home, categories, product detail, search) that any visitor can browse. Logged-in customers get products filtered and priced through their own pricelist (or customer group's pricelist). Non-logged-in visitors get no pricelist — they see the unfiltered catalog.

We need unauthenticated visitors to browse a curated subset of products: the products that belong to a single admin-designated **default pricelist**. Today this role is filled informally by a pricelist named `Others_EXW`, identified by naming convention only. The admin needs a first-class way to set which pricelist is the default.

Non-goals for this work:
- Showing any prices to guests (prices are never displayed in the portal outside the configurator modal; guests cannot open it).
- Allowing guests to configure, add to cart, or place orders (already gated).
- Changing the behavior for logged-in customers in any way.

## Goals

1. An admin can mark exactly one pricelist as the default from the admin UI.
2. Non-logged-in visitors on the B2B portal only see products that are in the default pricelist.
3. If no default is set, behavior falls back deterministically to pricelist `id=1`.
4. Guests still cannot use the configurator, cart, or checkout (already the case — verified, no regression).

## Architecture Overview

Three cooperating changes across the stack, each with a narrow responsibility:

1. **Backend (`furnisystems-backend`)** owns the "which pricelist is default" invariant. It exposes a mutation that flips the flag atomically, a query that reads it, and a delete-protection rule.
2. **Admin UI (`saas-admin-ui`)** exposes a one-click radio control on the pricelist list view. It is a thin client on top of the backend mutation.
3. **B2B Portal (`vilmers-b2b-portal`)** is a read-only consumer. On any unauthenticated request it resolves the default pricelist ID server-side, injects it into the existing filter pipeline, and 404s product pages outside the default.

The trust boundary is the backend mutation. Admin UI and portal treat the default as backend-authoritative.

## Backend Changes (`furnisystems-backend`)

### Data model

**No schema migration needed.** `PriceList.default Boolean @default(false)` already exists in `prisma/schema.prisma` (~line 347). The admin UI's existing `CoreData` fragment already selects it.

### New mutation: `setDefaultPriceList`

File: `src/graphql/PriceList/setDefault.ts`

Signature:

```graphql
setDefaultPriceList(id: Int!): PriceList!
```

Implementation runs inside a single Prisma `$transaction`:

1. Verify the target pricelist exists; else throw `NotFoundError`.
2. `priceList.updateMany({ where: { default: true, NOT: { id } }, data: { default: false } })`.
3. `priceList.update({ where: { id }, data: { default: true } })`.
4. Return the updated row.

Atomicity guarantees no observable window with zero or two defaults. If step 3 fails after step 2, the transaction rolls back and the prior default is preserved.

### New query: `defaultPriceList`

File: `src/graphql/PriceList/defaultOne.ts`

Signature:

```graphql
defaultPriceList: PriceList!
```

Logic:

```
findFirst({ where: { default: true } })
  ?? findUnique({ where: { id: 1 } })
  ?? throw
```

The fallback to `id=1` matches the existing cleanup-script convention in the backend. If both are absent, the query throws — callers must treat this as a server error, not as "no filter".

### Delete protection

The generated `deleteOnePriceList` and `deleteManyPriceList` mutations must refuse to remove a pricelist where `default=true`. Error message: `"Cannot delete the default pricelist — set a different default first."`

Implementation: a Prisma middleware / resolver wrapper that checks the target row(s) before delegating to the generated resolver.

### Authorization

`src/permissions.ts`:

- `setDefaultPriceList` → admin role only. Matches the existing permission model for pricelist writes.
- `defaultPriceList` → public (no guard). The B2B portal calls this unauthenticated.

### Optional: `priceListIds` parameter on product-by-permalink

If the PDP guard implementation takes the preferred path (see §B2B Portal → PDP not-found guard), the backend query used by `getProductByPermalink` must accept an optional `priceListIds` argument and return null when the product is not in any of them. If the fallback path is chosen instead, this change is not needed. Decision deferred to the implementation plan.

### Known limitation — generic update

`updateOnePriceList` (auto-generated nexus resolver) currently allows any admin to toggle the `default` boolean directly, bypassing the atomic mutation. In practice this is a non-issue because admin UI will always use `setDefaultPriceList`. If strict enforcement becomes necessary later, we can strip the `default` field from the generic update's input type or add a shield rule. Out of scope here.

## Admin UI Changes (`saas-admin-ui`)

### Files touched

- `src/containers/PriceLists/PriceLists.tsx` — list view (add radio column)
- `src/containers/PriceLists/priceListQueries.ts` — add mutation
- `src/containers/PriceLists/components/PriceListDetails.tsx` — add read-only "Default" badge

### New mutation

```ts
export const SET_DEFAULT_PRICELIST = gql`
  mutation SET_DEFAULT_PRICELIST($id: Int!) {
    setDefaultPriceList(id: $id) {
      id
      default
    }
  }
`
```

### List view: default radio column

Add a column titled **"Default"** rendering one radio button per row. Radio-group semantics:

- The row whose `default === true` is checked.
- Clicking an unchecked radio calls `SET_DEFAULT_PRICELIST({ id })`.
- Clicking the already-checked radio is a no-op (cannot uncheck — enforces "always exactly one default" at the UI level).

Flow when user clicks an unchecked radio:

1. Optimistically toggle local state so the row flips to checked.
2. Fire the mutation.
3. On success: refetch the pricelist list (simpler than surgical cache update; list is small).
4. On error: revert optimistic state and show a toast with the backend error.

### Detail page

`PriceListDetails.tsx` gets a small read-only badge next to the pricelist name — a visible `Default` tag (styled green) when `default === true`, nothing otherwise. No inline edit form introduced; keeps scope contained.

### Delete UX

The existing bulk-delete path already calls `deleteManyPriceList`. Backend now rejects deletion of the default. Error surfaces via the existing toast path — no new UI work beyond ensuring the backend message is clear.

### Form library

No new forms. Radio click maps directly to a mutation call, not form-driven state. Existing react-hook-form + zod usage is unchanged.

## B2B Portal Changes (`vilmers-b2b-portal`)

### New server helper

File: `src/lib/data/default-pricelist.ts`

```ts
export const getDefaultPriceListId = async (): Promise<number>
```

Calls the backend `defaultPriceList` query, returns the ID. Wrapped in Next.js `unstable_cache` with:

- TTL: **300s** (5 minutes).
- Tag: `'default-pricelist'` — reserved for future webhook-based invalidation if the delay becomes a problem. Out of scope now.

The cache is per server instance, so guest requests across the fleet amortize to roughly one backend call per instance per 5 minutes.

### Modify `getCustomerFilterData()`

File: `src/lib/data/customer.ts`

Current logic composes `priceListIds` from `customer.price_listId` and group pricelist. Add a guest branch: when `customer` is null, populate `priceListIds` with `[await getDefaultPriceListId()]`. Logged-in users are unaffected — the default helper is not called when a customer is present, even if that customer has neither a personal nor a group pricelist (this edge case is pre-existing and out of scope).

This single change propagates filtering to every downstream use — category listings, search, product detail — because they all flow through `getCustomerFilterData()`.

### PDP not-found guard

File: `src/app/[languageCode]/(main)/products/[handle]/page.tsx`

After the existing `getProductByPermalink(handle, languageCode)` call, if the visitor is a guest and the product is not in the default pricelist, trigger Next.js `notFound()`. Two feasible implementations, in order of preference (final choice settled during implementation):

1. **Preferred:** thread `priceListIds` into `getProductByPermalink` so the backend query returns null when the product is out of scope — the existing null-check path fires `notFound()` naturally.
2. **Fallback:** after fetching, explicitly check whether the product has any price entry (base price or fabric-category price) for the default pricelist; if not, `notFound()`.

This prevents guests from bypassing the listing filter by navigating directly to a product URL.

### Unchanged

- **Configurator button** — already hidden when `!customer` at `src/modules/products/components/configurator/configurator-button.tsx:29`.
- **Cart** — `cart-context.tsx` already returns null when there's no customerId; cart UI doesn't render.
- **Checkout** — `/checkout/page.tsx` already client-side redirects to `/account` for guests.
- **Search & category pages** — already consume `getCustomerFilterData()`; the new filter flows through automatically.

### i18n

No new guest-facing copy. The existing 404 page handles the out-of-scope PDP case. If a friendlier "catalog coming soon" state is wanted later when both the default and `id=1` are missing, we can add it — out of scope here.

## Error Handling & Edge Cases

| Case | Handling |
|------|----------|
| `setDefaultPriceList` mutation fails in admin UI | Revert optimistic state, show error toast; default unchanged. |
| Two pricelists have `default=true` (data drift / direct DB edit) | `defaultPriceList` uses `findFirst` and returns one deterministically. Admin can re-click a radio to re-normalize. No error thrown. |
| Zero pricelists marked default | `defaultPriceList` falls back to `id=1`. |
| Neither a `default=true` row nor `id=1` exists | `defaultPriceList` throws. B2B portal surfaces a server error on guest pages. We do NOT silently broaden visibility to "no filter". |
| Admin deletes the current default | Backend rejects with a clear message. Admin must set a different default first. |
| Admin deletes `id=1` while it is also default | Rejected (same rule). |
| Admin deletes `id=1` when it is NOT the default | Allowed — the real default remains. |
| Guest navigates to a product URL outside the default pricelist | `notFound()` → standard 404 page. |
| Logged-in user's request arrives with no customer (e.g., expired token) | Treated as a guest — sees default-pricelist catalog until re-auth. Cart and checkout guards still prevent order actions. |
| Logged-in customer has neither a personal nor a group pricelist | Unchanged behavior: `priceListIds` is empty. Default helper is NOT called (would change behavior for logged-in users). Pre-existing condition; out of scope here. |
| Default changes while `unstable_cache` is still hot | Guests may see the old default for up to ~5 minutes. Acceptable; avoids per-request backend call. |
| Product detail fetched but guest's `priceListIds` would exclude it | Backend query returns null (preferred path) OR explicit cross-check → `notFound()`. Never render a PDP the listing would have filtered out. |

## Testing Strategy

### Backend (`furnisystems-backend`)

Integration tests against the test DB (no mocks for DB layer):

- `setDefaultPriceList` flips target to `default=true` and unsets all others — verified even when multiple were true beforehand (drift recovery).
- `setDefaultPriceList` with an invalid id throws; no rows mutated.
- `setDefaultPriceList` rejected for unauthenticated / non-admin callers.
- `defaultPriceList` returns the one `default=true` row when exactly one exists.
- `defaultPriceList` returns `id=1` when none are marked default.
- `defaultPriceList` throws when neither `default=true` nor `id=1` exists.
- `deleteOnePriceList` / `deleteManyPriceList` reject deletion of a pricelist with `default=true`.
- Transaction atomicity: induce failure mid-mutation and confirm rollback — no zero-default state.

### Admin UI (`saas-admin-ui`)

- List view: clicking unchecked radio calls `SET_DEFAULT_PRICELIST` with correct id; row reflects optimistic state.
- Error path: mocked failure → row reverts, toast shown.
- Delete-default path: mocked backend rejection → toast shows backend message.

### B2B Portal (`vilmers-b2b-portal`)

- `getCustomerFilterData()` unit tests:
  - Logged-in customer with `price_listId=7` → `priceListIds = [7]`; default helper NOT called.
  - Customer with group pricelist → unchanged behavior.
  - No customer, no group → `priceListIds = [<defaultId>]`; `getDefaultPriceListId` called once.
- Cache test: multiple consecutive guest requests dedup to a single backend call within the TTL.
- PDP guard: guest requesting a product outside the default pricelist → 404. Logged-in customer requesting the same product → renders normally (when in their own pricelist).

### E2E (Playwright)

One flow covers the critical path:

1. As admin, set pricelist A as default. Verify radio reflects it.
2. As guest, load `/categories/<cat>`. Verify only products priced in A appear.
3. As guest, load a product URL known to be outside A. Verify 404.
4. As guest, verify configurator button is absent and `/cart` redirects to login.
5. As admin, switch default to pricelist B. Wait past the TTL (or invalidate). Verify guest listings change.
6. As admin, attempt to delete pricelist B (current default). Verify rejection with clear error.

## Out of Scope

- Webhook-based cache invalidation from admin to portal on default change (300s TTL is acceptable for now).
- Hiding the `default` field from the generic `updateOnePriceList` input (relying on admin UI discipline).
- Guest-visible "catalog coming soon" UI when the default pricelist configuration is missing entirely.
- Any change to pricing visibility (prices are already absent from guest-visible views).
- Renaming `Others_EXW` or migrating existing data. The admin flips the flag on whichever pricelist they choose; the name is irrelevant.
