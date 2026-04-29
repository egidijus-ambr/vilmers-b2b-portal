# All Products Override Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a checkbox to the b2b-portal sub-header that lets admin-impersonators (`jwt.managerId != null`) and Account Managers (`jwt.role === 'admin'`) bypass the acting customer's pricelist + tag filter and browse the full catalog. Mirrors the storefront's "All products" feature.

**Architecture:** Client-readable cookie `showAllProducts=1` toggled by a Tailwind checkbox. Server-side gate in `getCustomerFilterData()` returns an empty filter (`priceListIds: []`, `customerTagIds: undefined`) when the cookie is set AND a JWT-derived gate (managerId or admin role) passes. The gate is enforced server-side, so a forged cookie on a non-privileged user is inert.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Headless UI, react-i18next, custom GraphQL SDK.

**Spec:** `docs/superpowers/specs/2026-04-29-all-products-toggle-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/util/show-all-products-cookie.ts` | Create | Client-side cookie helpers (mirror `acting-customer-cookie.ts`) |
| `src/lib/util/jwt-utils.ts` | Modify | Add `getManagerIdFromToken()` and `getRoleFromToken()` helpers |
| `src/lib/data/show-all-products.ts` | Create | Server-only: cookie reader + JWT-based gate + combined "active" check |
| `src/lib/data/customer.ts` | Modify | `getCustomerFilterData()` bypasses pricelist/tag filter when override is active |
| `src/modules/layout/components/show-all-products-toggle/index.tsx` | Create | Client checkbox component with label + info icon + native title tooltip |
| `src/modules/layout/templates/nav/index.tsx` | Modify | Accept `canShowAllProducts` + `showAllProductsActive` props; render toggle in beige sub-header |
| Nav's parent (server component, locate during Task 6) | Modify | Compute the two new flags server-side and pass them to `<Nav />` |

**Convention notes from codebase exploration:**
- Auth cookie: `_furni_jwt` (httpOnly, server-only). The constant lives in `src/lib/data/cookies.ts`.
- Acting-customer cookie: `actingCustomerId` (client-readable). Pattern: 1-year max-age, `SameSite=Lax`, `Secure` in production.
- i18n: `react-i18next` via `useTranslations()` from `@lib/i18n`. The existing `acting-customer-callout` ships hardcoded English — we follow that pattern (no new translation keys) to keep this plan self-contained.
- Tooltip: no project-wide hover-tooltip primitive in use. Use the native HTML `title` attribute on the info icon.
- Tests: no test runner in evidence. Verification is manual (browser) + `pnpm tsc` for type checks.

---

## Task 1: Add client-side cookie helpers

**Files:**
- Create: `src/lib/util/show-all-products-cookie.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/util/show-all-products-cookie.ts
export const SHOW_ALL_PRODUCTS_COOKIE = 'showAllProducts'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function setShowAllProductsCookie(on: boolean): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  if (on) {
    document.cookie = `${SHOW_ALL_PRODUCTS_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
  } else {
    document.cookie = `${SHOW_ALL_PRODUCTS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}

export function clearShowAllProductsCookie(): void {
  setShowAllProductsCookie(false)
}

export function readShowAllProductsCookie(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SHOW_ALL_PRODUCTS_COOKIE}=([^;]*)`),
  )
  return match?.[1] === '1'
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/util/show-all-products-cookie.ts
git commit -m "feat(show-all-products): add client cookie helpers"
```

---

## Task 2: Extend JWT utils to expose `managerId` and `role`

**Files:**
- Modify: `src/lib/util/jwt-utils.ts`

The existing file defines a private `decodeJWTPayload()` and exposes `isTokenExpired()`, `getCustomerAccountIdFromToken()`, `validateTokenAndExtractCustomerId()`. We add two more readers in the same style.

- [ ] **Step 1: Append the two helpers below `getCustomerAccountIdFromToken`**

Add this code immediately after the closing brace of `getCustomerAccountIdFromToken` and before `validateTokenAndExtractCustomerId`:

```ts
/**
 * Extracts managerId from a JWT token. Set ONLY when the session originated
 * from the admin app's "Impersonate B2B Portal" action. Returns null otherwise.
 */
export function getManagerIdFromToken(token: string): number | null {
  try {
    const payload = decodeJWTPayload(token)
    if (!payload) return null
    const id = payload.managerId
    if (id == null) return null
    const n = Number(id)
    return Number.isFinite(n) ? n : null
  } catch (error) {
    console.error("[getManagerIdFromToken] Error extracting managerId:", error)
    return null
  }
}

/**
 * Extracts the customer role from a JWT token (e.g. 'admin', 'agent', or null).
 */
export function getRoleFromToken(token: string): string | null {
  try {
    const payload = decodeJWTPayload(token)
    if (!payload) return null
    return typeof payload.role === 'string' ? payload.role : null
  } catch (error) {
    console.error("[getRoleFromToken] Error extracting role:", error)
    return null
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/util/jwt-utils.ts
git commit -m "feat(jwt): expose managerId and role readers"
```

---

## Task 3: Add server-side gate + cookie reader

**Files:**
- Create: `src/lib/data/show-all-products.ts`

This module is **server-only** — it imports from `next/headers`. Other server-only files in `src/lib/data/` follow the same convention.

- [ ] **Step 1: Locate the auth-cookie constant**

Open `src/lib/data/cookies.ts` and find the constant for the JWT cookie (it should be named `_furni_jwt` or similar — confirm the exported identifier, e.g. `AUTH_TOKEN_COOKIE`). Note the import path you will use in Step 2.

- [ ] **Step 2: Create the server-only module**

```ts
// src/lib/data/show-all-products.ts
import { cookies } from "next/headers"
import {
  getManagerIdFromToken,
  getRoleFromToken,
} from "@lib/util/jwt-utils"
import { SHOW_ALL_PRODUCTS_COOKIE } from "@lib/util/show-all-products-cookie"
// Adjust this import to the auth-cookie constant exported from cookies.ts:
import { AUTH_TOKEN_COOKIE } from "@lib/data/cookies"

/**
 * Reads the showAllProducts cookie. Returns true iff the cookie value is "1".
 * Server-only. Does NOT enforce the privilege gate — call canShowAllProductsToggle for that.
 */
export async function getShowAllProductsCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(SHOW_ALL_PRODUCTS_COOKIE)?.value === "1"
}

/**
 * Reads the auth JWT and decides whether the current user is allowed to use
 * the override toggle.
 *
 * Returns true for:
 *   A) admin-impersonator sessions (jwt.managerId != null)
 *   B) Account Manager sessions  (jwt.role === 'admin')
 *
 * False for everyone else (regular customers, agents).
 */
export async function canShowAllProductsToggle(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value
  if (!token) return false

  if (getManagerIdFromToken(token) != null) return true
  if (getRoleFromToken(token) === "admin") return true
  return false
}

/**
 * True iff the gate passes AND the cookie is set. This is the boolean that
 * `getCustomerFilterData()` consults to decide whether to bypass filtering.
 */
export async function getShowAllProductsActive(): Promise<boolean> {
  const [allowed, on] = await Promise.all([
    canShowAllProductsToggle(),
    getShowAllProductsCookie(),
  ])
  return allowed && on
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS. If the import for `AUTH_TOKEN_COOKIE` doesn't resolve, look up the actual exported constant name in `src/lib/data/cookies.ts` and update the import.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/show-all-products.ts
git commit -m "feat(show-all-products): server gate + cookie reader"
```

---

## Task 4: Bypass pricelist/tag filter when override is active

**Files:**
- Modify: `src/lib/data/customer.ts` (function `getCustomerFilterData`, currently lines ~506–532)

- [ ] **Step 1: Add the import**

At the top of `src/lib/data/customer.ts`, after the existing `import { getActingCustomer } from "./acting-customer"` line, add:

```ts
import { getShowAllProductsActive } from "./show-all-products"
```

- [ ] **Step 2: Add the bypass at the top of `getCustomerFilterData`**

Replace the current function body. Before:

```ts
export async function getCustomerFilterData(): Promise<{
  customerTagIds: number[] | undefined
  priceListIds: number[]
}> {
  let customer = null
  try {
    customer = await getActingCustomer()
  } catch {
    // Not authenticated — no filtering
  }

  const customerTagIds = customer?.tags?.map((t: { id: number }) => t.id)
  const groupPriceListId = await getGroupPriceListId()

  let priceListIds: number[]
  if (!customer) {
    const defaultId = await getDefaultPriceListId()
    priceListIds = [defaultId]
  } else {
    priceListIds = [
      ...(customer.price_listId ? [parseInt(customer.price_listId)] : []),
      ...(groupPriceListId ? [parseInt(groupPriceListId)] : []),
    ]
  }

  return { customerTagIds, priceListIds }
}
```

After:

```ts
export async function getCustomerFilterData(): Promise<{
  customerTagIds: number[] | undefined
  priceListIds: number[]
}> {
  // Privileged override: when an admin-impersonator or Account Manager has
  // ticked the "All products" checkbox, return an empty filter so the catalog
  // is unrestricted. The gate is enforced server-side inside
  // getShowAllProductsActive(), so a forged cookie on a non-privileged user
  // is inert.
  if (await getShowAllProductsActive()) {
    return { customerTagIds: undefined, priceListIds: [] }
  }

  let customer = null
  try {
    customer = await getActingCustomer()
  } catch {
    // Not authenticated — no filtering
  }

  const customerTagIds = customer?.tags?.map((t: { id: number }) => t.id)
  const groupPriceListId = await getGroupPriceListId()

  let priceListIds: number[]
  if (!customer) {
    const defaultId = await getDefaultPriceListId()
    priceListIds = [defaultId]
  } else {
    priceListIds = [
      ...(customer.price_listId ? [parseInt(customer.price_listId)] : []),
      ...(groupPriceListId ? [parseInt(groupPriceListId)] : []),
    ]
  }

  return { customerTagIds, priceListIds }
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/customer.ts
git commit -m "feat(filter): bypass pricelist/tag filter when override is active"
```

---

## Task 5: Build the `ShowAllProductsToggle` component

**Files:**
- Create: `src/modules/layout/components/show-all-products-toggle/index.tsx`

A minimal Tailwind checkbox + label "All products" with an info-symbol affordance and a native `title` tooltip. Matches the lo-fi style of the existing `acting-customer-callout`. On change → write cookie + `router.refresh()`.

- [ ] **Step 1: Create the component**

```tsx
// src/modules/layout/components/show-all-products-toggle/index.tsx
"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { setShowAllProductsCookie } from "@lib/util/show-all-products-cookie"

const TOOLTIP =
  "Show all products, including those not available in the customer's pricelist or market."

type Props = {
  initialChecked: boolean
}

export default function ShowAllProductsToggle({ initialChecked }: Props) {
  const router = useRouter()
  const [checked, setChecked] = useState(initialChecked)
  const [, startTransition] = useTransition()

  const onChange = (next: boolean) => {
    setChecked(next)
    setShowAllProductsCookie(next)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-dark-blue cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-dark-blue cursor-pointer"
      />
      <span>All products</span>
      <span
        aria-label={TOOLTIP}
        title={TOOLTIP}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-dark-blue text-[10px] leading-none text-dark-blue cursor-help"
      >
        i
      </span>
    </label>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/layout/components/show-all-products-toggle/index.tsx
git commit -m "feat(layout): ShowAllProductsToggle component"
```

---

## Task 6: Wire the toggle into the Nav

`Nav` is a client component (`"use client"` at the top of `src/modules/layout/templates/nav/index.tsx`). The privilege gate (`canShowAllProductsToggle`) and current cookie state (`getShowAllProductsCookie`) must be read server-side and passed in as props from the server component that renders `<Nav />` — typically a layout file.

**Files:**
- Modify: `src/modules/layout/templates/nav/index.tsx`
- Modify: Nav's parent (the server component that renders `<Nav />` — locate in Step 1)

- [ ] **Step 1: Find Nav's render site**

```bash
grep -rn "from \"@modules/layout/templates/nav\"" src/app src/modules
grep -rn "<Nav " src/app src/modules
```

The render site is almost certainly in a Next.js App Router layout under `src/app/[languageCode]/`. Confirm the file is a server component (no `"use client"` at the top, and uses `async` data fetches).

- [ ] **Step 2: Add the new props to `NavProps` and the component signature**

In `src/modules/layout/templates/nav/index.tsx`, find the existing `NavProps` type (it currently includes `customer` and `categories`). Extend it:

```ts
type NavProps = {
  customer: ... // existing
  categories: ... // existing
  canShowAllProducts: boolean
  showAllProductsActive: boolean
}
```

Then update the default-export signature:

```ts
export default function Nav({
  customer,
  categories,
  canShowAllProducts,
  showAllProductsActive,
}: NavProps) {
```

- [ ] **Step 3: Import the toggle in `nav/index.tsx`**

Add this import alongside the other `@modules/layout/components/...` imports near the top:

```ts
import ShowAllProductsToggle from "@modules/layout/components/show-all-products-toggle"
```

- [ ] **Step 4: Render the toggle in the beige sub-header**

Find the existing block (currently around lines 208–214):

```tsx
{!isHomePage && isAgentOrAdmin(customer) && (
  <div className="flex h-10 items-center justify-end gap-4 border-b border-line bg-beige-20 px-6">
    <ActingCustomerCallout />
    <CustomerSelector />
  </div>
)}
```

Replace with:

```tsx
{!isHomePage && isAgentOrAdmin(customer) && (
  <div className="flex h-10 items-center justify-end gap-4 border-b border-line bg-beige-20 px-6">
    <ActingCustomerCallout />
    {canShowAllProducts && (
      <ShowAllProductsToggle initialChecked={showAllProductsActive} />
    )}
    <CustomerSelector />
  </div>
)}
```

- [ ] **Step 5: Compute the props in Nav's parent**

In the server-component file located in Step 1, add these imports:

```ts
import {
  canShowAllProductsToggle,
  getShowAllProductsCookie,
} from "@lib/data/show-all-products"
```

Inside the parent component (it must be `async`; if it isn't already, make it async — App Router layouts can be async server components), compute the flags and pass them:

```ts
const [canShowAllProducts, showAllProductsActive] = await Promise.all([
  canShowAllProductsToggle(),
  getShowAllProductsCookie(),
])
```

Then in the JSX, update the `<Nav ... />` call site:

```tsx
<Nav
  customer={customer}
  categories={categories}
  canShowAllProducts={canShowAllProducts}
  showAllProductsActive={showAllProductsActive}
/>
```

(Adjust whitespace and prop order to match the file's existing style.)

- [ ] **Step 6: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/layout/templates/nav/index.tsx <path-to-Nav-parent>
git commit -m "feat(nav): mount ShowAllProductsToggle for privileged users"
```

---

## Task 7: Manual verification in the browser

No automated test runner is configured in the b2b-portal — verification is manual. The dev server runs on port 3002.

**Test data needed:**
- An Account Manager account (role=`admin`) able to log in via magic link.
- A regular customer / agent account (role=`agent` or null) for negative-case verification.
- Access to the admin app to trigger "Impersonate B2B Portal" on a customer row.

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm dev
```

Wait until you see `Local: http://localhost:3002`.

- [ ] **Step 2: Case A — admin-impersonator visibility**

In the admin app, find a B2B customer row. Click the `…` menu → **Impersonate B2B Portal**. A new b2b-portal tab opens. Once you land on a non-home page (the impersonate redirect lands on `/account` or similar — navigate to `/categories/<any>` if needed):

Expected: the beige sub-header shows the **"All products"** checkbox, unchecked, alongside the customer-selector.

- [ ] **Step 3: Case A — toggle effect**

Tick the checkbox.

Expected: the page refreshes (via `router.refresh()`); the product grid now shows products that were previously filtered out by the impersonated customer's pricelist/tags. Untick to confirm the original filtered list returns.

- [ ] **Step 4: Case B — Account Manager visibility**

In a private window, log in as an Account Manager (`role === 'admin'`) via magic link. Navigate to a category page.

Expected: the beige sub-header shows the **"All products"** checkbox. Toggle it and confirm the catalog expands/contracts.

- [ ] **Step 5: Case C — agent must NOT see the toggle**

Log in as a user whose JWT has `role === 'agent'` (no `managerId`). Navigate to a category page.

Expected: the beige sub-header (callout + customer-selector) is still visible (existing behavior), but the **"All products"** checkbox is **absent**.

- [ ] **Step 6: Case C — regular customer must NOT see the toggle**

Log out, log in as a regular B2B customer (no admin role, no impersonation). Navigate to a category page.

Expected: no beige sub-header at all (existing behavior). No "All products" checkbox anywhere.

- [ ] **Step 7: Forged-cookie inertness**

While logged in as the regular customer from Step 6, open DevTools → Application → Cookies → set `showAllProducts=1` manually. Navigate to a category page (or hard-refresh).

Expected: the listing is **unchanged** — the server-side gate blocks the bypass for non-privileged users. No products outside the customer's pricelist appear.

- [ ] **Step 8: Persistence across reload**

As an Account Manager (Case B), tick the toggle, then hard-reload the page (Cmd+Shift+R).

Expected: the checkbox is still ticked after reload, and the listing is still unrestricted.

- [ ] **Step 9: Tooltip is reachable**

Hover over the small `i` icon next to the "All products" label.

Expected: a native browser tooltip appears with text *"Show all products, including those not available in the customer's pricelist or market."*

- [ ] **Step 10: Final commit (only if cleanup needed)**

If any small fix-ups were needed during verification, commit them now:

```bash
git add -A
git commit -m "fix(show-all-products): manual verification follow-ups"
```

If nothing needs fixing, skip this step.

---

## Self-Review Checklist (run before declaring done)

- [ ] All seven tasks complete and committed.
- [ ] `pnpm tsc --noEmit` passes.
- [ ] All six verification cases (A-show, A-effect, B-show, C-agent-hide, C-customer-hide, forged-cookie-inert) behaved as expected.
- [ ] The beige sub-header still shows correctly for all `isAgentOrAdmin` users (existing behavior is not regressed — the toggle is purely additive within the bar).
- [ ] No `console.error` from the new JWT decoders in normal operation (errors should only fire on genuinely malformed tokens).
- [ ] The two pre-existing uncommitted edits in `nav/index.tsx` and `navigation.ts` are still present (the `!isHomePage` guard and the removed "About" dropdown).
