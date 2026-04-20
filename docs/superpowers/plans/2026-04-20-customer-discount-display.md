# Customer Discount Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show strikethrough regular price + discounted price throughout the B2B
Portal configurator and the cart/checkout flow when the logged-in customer has a
non-zero `b2b_customer_discount`. Storefront behavior must remain identical.

**Architecture:** Hybrid computation — the configurator applies the discount on
the client (where all other price math already lives). Cart/checkout prices are
computed on the backend with an explicit B2B caller gate, so what the user sees
matches what the order will be charged. All GraphQL changes are additive.

**Tech Stack:** Next.js 14 App Router (client + server components), TypeScript,
Tailwind CSS, Medusa SDK types, Nexus GraphQL, Prisma, PostgreSQL. No test
runner is configured in either repo — pure helpers are verified with ts-node
scripts; UI is verified via manual smoke tests.

**Spec:** `docs/superpowers/specs/2026-04-20-customer-discount-display-design.md`

**Repositories touched:**
- B2B Portal: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal`
- Backend: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend`

All commands below are given as absolute paths so they work regardless of the
current working directory. Adjust if you `cd` into a repo first.

---

## Phase 0 — Verification

One-time checks to lock in unknowns before writing code. These exist because the
exploration surfaced two points that the engineer must confirm against live code
rather than assume.

### Task 0.1: Confirm `b2b_customer_discount` reaches the client customer object

**Files:**
- Read: `vilmers-b2b-portal/src/lib/types/customer.ts`
- Read: `vilmers-b2b-portal/src/lib/furnisystems-sdk/modules/customer/types.ts`
- Read: `vilmers-b2b-portal/src/lib/data/customer.ts` (`retrieveCustomer`, `validateSession`)
- Read: `vilmers-b2b-portal/src/lib/context/customer-context.tsx`

- [ ] **Step 1: Inspect the customer type chain**

Open each file above. Verify whether `ExtendedStoreCustomer` (or the underlying
SDK `Customer` type) exposes `b2b_customer_discount: number | null`.

- [ ] **Step 2: Inspect the runtime object**

Search for where `validateSession()` returns the customer. Add a one-line
`console.log("[debug] customer payload keys", Object.keys(customer || {}))` in
`retrieveCustomer` only temporarily. Log in as a B2B user with a known non-zero
`b2b_customer_discount`, refresh, and inspect the server log.

- [ ] **Step 3: Record the result**

Note down which of these is true (update this plan file in a subsequent commit
if needed — do not commit the debug log):

- **A.** Field is already on the customer object at runtime, just missing from
  TypeScript. → Task 1.1 only needs to add the type.
- **B.** Field is missing from the runtime payload entirely. → Task 1.1 must
  also fix the session/validation mapping to include it from Prisma.

Remove the debug log afterwards.

- [ ] **Step 4: Commit only the removal (if any changes were made)**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
git status
# Expected: clean (the temporary log was removed)
```

No commit expected unless Step 2 modified the file. If the file was touched and
cleaned up, no commit is needed.

### Task 0.2: Confirm cart line-item GraphQL shape used by the B2B Portal cart page

**Files:**
- Read: `vilmers-b2b-portal/src/modules/cart/components/cart-summary/index.tsx`
- Read: `vilmers-b2b-portal/src/modules/cart/` (find the query that feeds the cart page)
- Read: `furnisystems-backend/src/graphql/CartItem/type.ts`

- [ ] **Step 1: Trace what field(s) `cart-summary/index.tsx` reads**

It reads `item.price`. Find the GraphQL query that hydrates this component and
note which backend field `item.price` maps to. Likely it is the direct
`CartItem.price` field (nexus `t.nullable.float('price')` at
`furnisystems-backend/src/graphql/CartItem/type.ts:16`).

- [ ] **Step 2: Trace what `line-item-price/index.tsx` reads**

It reads `item.total` and `item.original_total`. Confirm these are Medusa
`StoreCartLineItem` fields and note whether this component is used on the cart
page, in the checkout review, in the cart dropdown, or all three. Record the
surface list.

- [ ] **Step 3: Record the mapping**

Write down here (inline in this plan, commit the update) which UI surface uses
which backend/SDK shape. This determines whether Task 4.x touches Medusa-style
fields, Furnisystems CartItem fields, or both.

No code change in this task.

---

## Phase 1 — Frontend foundation (B2B Portal)

Shared hook, helper, and presentational component. Nothing observable changes
in the UI yet.

### Task 1.1: Add `b2b_customer_discount` to the customer TypeScript type

**Files:**
- Modify: `vilmers-b2b-portal/src/lib/furnisystems-sdk/modules/customer/types.ts`
- Modify (only if Phase 0 Task 0.1 outcome was **B**):
  `vilmers-b2b-portal/src/lib/data/customer.ts`

- [ ] **Step 1: Extend the SDK Customer type**

Add a nullable numeric field. Open the file, locate the `Customer` interface
(around lines 91-133 per the exploration), and add the field. Keep it nullable
to avoid breaking existing object construction.

```ts
// Somewhere inside the Customer interface
b2b_customer_discount?: number | null
```

- [ ] **Step 2: (Only if outcome B) map the field in `validateSession` / `retrieveCustomer`**

Find where the customer object is built from the backend response and ensure
`b2b_customer_discount` is copied across. Match the pattern of adjacent fields
such as `price_listId` or `is_b2b_user`.

- [ ] **Step 3: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/furnisystems-sdk/modules/customer/types.ts src/lib/data/customer.ts
git commit -m "feat(customer): expose b2b_customer_discount on client customer type"
```

### Task 1.2: Create `applyDiscount` pure helper

**Files:**
- Modify: `vilmers-b2b-portal/src/configurator/lib/price-utils.ts`
- Create: `vilmers-b2b-portal/scripts/verify-apply-discount.ts`

- [ ] **Step 1: Append the helper to `price-utils.ts`**

At the bottom of `src/configurator/lib/price-utils.ts`:

```ts
export type DiscountResult = {
  regular: number
  discounted: number
  hasDiscount: boolean
}

/**
 * Apply a customer-level percentage discount to a price.
 * Null/0/undefined pct is treated as "no discount".
 * Out-of-range values are clamped to [0, 100] with a dev warning.
 */
export const applyDiscount = (
  regular: number,
  pct: number | null | undefined
): DiscountResult => {
  if (pct == null || pct === 0) {
    return { regular, discounted: regular, hasDiscount: false }
  }
  let safePct = pct
  if (pct < 0 || pct > 100) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[applyDiscount] pct ${pct} out of range [0,100], clamping`
      )
    }
    safePct = Math.max(0, Math.min(100, pct))
  }
  const raw = regular * (1 - safePct / 100)
  const discounted = Math.round(raw * 100) / 100
  return { regular, discounted, hasDiscount: discounted < regular }
}
```

- [ ] **Step 2: Write a ts-node verification script**

Create `scripts/verify-apply-discount.ts`:

```ts
import { applyDiscount } from "../src/configurator/lib/price-utils"

const cases: Array<[number, number | null | undefined, { discounted: number; hasDiscount: boolean }]> = [
  [100, null, { discounted: 100, hasDiscount: false }],
  [100, 0, { discounted: 100, hasDiscount: false }],
  [100, 15, { discounted: 85, hasDiscount: true }],
  [1234.56, 12, { discounted: 1086.41, hasDiscount: true }],
  [100, 100, { discounted: 0, hasDiscount: true }],
  [100, -5, { discounted: 100, hasDiscount: false }],
  [100, 150, { discounted: 0, hasDiscount: true }],
]

let failed = 0
for (const [regular, pct, expected] of cases) {
  const actual = applyDiscount(regular, pct)
  const ok =
    Math.abs(actual.discounted - expected.discounted) < 0.005 &&
    actual.hasDiscount === expected.hasDiscount
  console.log(
    `${ok ? "PASS" : "FAIL"}  applyDiscount(${regular}, ${pct}) => ${JSON.stringify(actual)}`
  )
  if (!ok) failed++
}
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 3: Run it**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm exec ts-node --transpile-only scripts/verify-apply-discount.ts
```

Expected: all `PASS` lines, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/configurator/lib/price-utils.ts scripts/verify-apply-discount.ts
git commit -m "feat(configurator): add applyDiscount helper for b2b discount math"
```

### Task 1.3: Create `useCustomerDiscount` hook

**Files:**
- Create: `vilmers-b2b-portal/src/lib/hooks/use-customer-discount.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client"

import { useCustomer } from "@lib/context/customer-context"

/**
 * Returns the logged-in B2B customer's discount percentage or null when
 * the customer is absent, non-B2B, or has no discount set.
 */
export function useCustomerDiscount(): { discountPct: number | null } {
  const { customer } = useCustomer()
  const raw = customer?.b2b_customer_discount
  if (raw == null || raw === 0) {
    return { discountPct: null }
  }
  return { discountPct: raw }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
```

Expected: no new type errors. (Depends on Task 1.1 having added the field to
the type.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-customer-discount.ts
git commit -m "feat(hooks): add useCustomerDiscount hook"
```

### Task 1.4: Create `<PriceDisplay>` shared component

**Files:**
- Create: `vilmers-b2b-portal/src/modules/common/components/price-display/index.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from "react"
import { convertToLocale } from "@lib/util/money"

type Size = "sm" | "md" | "lg"
type Align = "left" | "right"

export type PriceDisplayProps = {
  regular: number | null | undefined
  discounted?: number | null
  currencyCode: string
  locale?: string
  size?: Size
  align?: Align
  className?: string
}

const sizeClasses: Record<Size, { regular: string; discounted: string }> = {
  sm: { regular: "text-xs", discounted: "text-xs font-semibold" },
  md: { regular: "text-sm", discounted: "text-sm font-semibold" },
  lg: { regular: "text-base", discounted: "text-lg font-semibold" },
}

/**
 * Renders either a single price or a dual strikethrough + discounted price.
 * Renders nothing when `regular` is null/undefined.
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({
  regular,
  discounted,
  currencyCode,
  locale,
  size = "md",
  align = "left",
  className = "",
}) => {
  if (regular == null) return null

  const hasDiscount =
    discounted != null && discounted !== regular && discounted < regular

  const format = (amount: number) =>
    convertToLocale({ amount, currency_code: currencyCode, locale })

  const alignClass = align === "right" ? "items-end text-right" : "items-start"

  if (!hasDiscount) {
    return (
      <span className={`${sizeClasses[size].discounted} ${className}`}>
        {format(regular)}
      </span>
    )
  }

  return (
    <span className={`flex flex-col ${alignClass} ${className}`}>
      <span
        className={`line-through text-ui-fg-muted ${sizeClasses[size].regular}`}
        data-testid="price-original"
      >
        {format(regular)}
      </span>
      <span
        className={`text-dark-blue ${sizeClasses[size].discounted}`}
        data-testid="price-discounted"
      >
        {format(discounted as number)}
      </span>
    </span>
  )
}

export default PriceDisplay
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/common/components/price-display/index.tsx
git commit -m "feat(components): add shared PriceDisplay component"
```

---

## Phase 2 — Configurator wiring

Two render sites have prices today: the footer total and the sofa-modules drawer
card. Everything else in the configurator either has no price rendered or is
covered by Phase 4 via cart propagation.

### Task 2.1: Wire discount into `price-footer.tsx`

**Files:**
- Modify: `vilmers-b2b-portal/src/modules/products/components/configurator/price-footer.tsx:71-80`

- [ ] **Step 1: Update imports**

Replace the `priceFormatter` import with imports for the helper, hook, and
component:

```tsx
import { applyDiscount } from "@configurator/lib/price-utils"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import PriceDisplay from "@modules/common/components/price-display"
```

(Retain `priceFormatter` only if other parts of the file still use it.)

- [ ] **Step 2: Replace the render**

Inside the component body, before the JSX:

```tsx
const { discountPct } = useCustomerDiscount()
const priced =
  displayPrice != null ? applyDiscount(displayPrice, discountPct) : null
```

Replace the existing `displayPrice != null` block (lines 71-80) with:

```tsx
{priced != null ? (
  <PriceDisplay
    regular={priced.regular}
    discounted={priced.hasDiscount ? priced.discounted : null}
    currencyCode={currency ?? "EUR"}
    size="lg"
    align="right"
  />
) : (
  <p className="text-sm text-gray-400">Select options to see price</p>
)}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
```

- [ ] **Step 4: Manual smoke**

Start the dev server:

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm dev
```

Log in as a B2B user with `b2b_customer_discount = 15`. Open a configurable
sofa. Verify the footer shows a struck-through regular total and a bold
discounted total below it. Log out, log in as a user with no discount — verify
single price (no strikethrough).

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/components/configurator/price-footer.tsx
git commit -m "feat(configurator): show b2b discounted total in price footer"
```

### Task 2.2: Wire discount into the sofa-modules drawer card

**Files:**
- Modify: `vilmers-b2b-portal/src/modules/products/components/configurator/sofa-modules-drawer.tsx:218-219`

- [ ] **Step 1: Update imports**

At the top of the file, add:

```tsx
import { applyDiscount } from "@configurator/lib/price-utils"
import { useCustomerDiscount } from "@lib/hooks/use-customer-discount"
import PriceDisplay from "@modules/common/components/price-display"
```

(Keep `getPriceFromPriceCategories`; drop `priceFormatter` if no other code
in the file uses it.)

- [ ] **Step 2: Read the discount once**

Inside the component body, near the existing hook calls:

```tsx
const { discountPct } = useCustomerDiscount()
```

- [ ] **Step 3: Replace the price render**

Locate the block at lines 218-219:

```tsx
{price != null && price > 0 && (
  <p className="text-xs text-gray-500">{priceFormatter(price, currency)}</p>
)}
```

Replace with:

```tsx
{price != null && price > 0 && (
  (() => {
    const priced = applyDiscount(price, discountPct)
    return (
      <PriceDisplay
        regular={priced.regular}
        discounted={priced.hasDiscount ? priced.discounted : null}
        currencyCode={currency ?? "EUR"}
        size="sm"
      />
    )
  })()
)}
```

- [ ] **Step 4: Type-check + smoke**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
pnpm dev
```

Open a configurable sofa as a B2B user with a discount, open the module drawer,
verify each module card shows struck-through + discounted price. As a user
without a discount, verify single price.

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/components/configurator/sofa-modules-drawer.tsx
git commit -m "feat(configurator): show b2b discounted price on module cards"
```

---

## Phase 3 — Backend additive fields and B2B gate

All changes are additive. No existing field changes meaning. Storefront queries
continue to return the same values they return today.

### Task 3.1: Extract the B2B discount math into a shared helper

**Files:**
- Create: `furnisystems-backend/src/utilities/priceUtils/index.ts` (or add to if it exists)
- Modify: `furnisystems-backend/src/types-modified/Order.ts:533-539,735-745`

- [ ] **Step 1: Check for an existing file**

```bash
ls /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/utilities/priceUtils/ 2>/dev/null
```

If `index.ts` exists, append the function. If not, create the directory and
file.

- [ ] **Step 2: Write the helper**

```ts
/**
 * Apply a B2B customer discount percentage to a price.
 * Returns the original price unchanged when the percentage is null/0.
 * Rounds the result to two decimals.
 */
export const applyB2bDiscount = (
  price: number,
  discountPercent: number | null | undefined
): number => {
  if (!discountPercent || discountPercent <= 0) return price
  const safePct = Math.min(100, discountPercent)
  const raw = price - price * (safePct / 100)
  return Math.round(raw * 100) / 100
}
```

- [ ] **Step 3: Replace the inline math in `Order.ts`**

Open `src/types-modified/Order.ts`. Import the helper at the top:

```ts
import { applyB2bDiscount } from "../utilities/priceUtils"
```

At lines 535-538 replace:

```ts
if (b2bCustomerDiscount) {
  modifiedOrderItemPrice =
    modifiedOrderItemPrice -
    modifiedOrderItemPrice * (b2bCustomerDiscount / 100)
}
```

with:

```ts
modifiedOrderItemPrice = applyB2bDiscount(
  modifiedOrderItemPrice,
  b2bCustomerDiscount
)
```

At lines 735-745 replace the three similar `if (b2bCustomerDiscount)` blocks
with:

```ts
modifiedSubTotalPrice = applyB2bDiscount(
  modifiedSubTotalPrice,
  b2bCustomerDiscount
)
modifiedTotalPrice = applyB2bDiscount(modifiedTotalPrice, b2bCustomerDiscount)
modifiedTotalPriceWithoutVat = applyB2bDiscount(
  modifiedTotalPriceWithoutVat,
  b2bCustomerDiscount
)
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm typecheck || pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add src/utilities/priceUtils/index.ts src/types-modified/Order.ts
git commit -m "refactor(pricing): extract b2b discount math into shared helper"
```

### Task 3.2: Add a B2B caller detection helper

**Files:**
- Create: `furnisystems-backend/src/utilities/b2bContext/index.ts`

- [ ] **Step 1: Write the helper**

```ts
import { Context } from "../../context"
import { getVerifiedToken } from "../authentication"

export type B2bContextResult = {
  isB2b: boolean
  customerId: number | null
  discountPercent: number | null
}

/**
 * Resolves whether the caller is an authenticated B2B customer and, if so,
 * returns their customer id and active discount percentage.
 * Returns `isB2b: false` for unauthenticated or non-B2B callers so resolvers
 * can short-circuit before touching price math.
 */
export async function resolveB2bContext(
  ctx: Context
): Promise<B2bContextResult> {
  try {
    const token = getVerifiedToken(ctx)
    const customerId = token?.customerId ?? null
    if (!customerId) {
      return { isB2b: false, customerId: null, discountPercent: null }
    }
    const customer = await ctx.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        is_b2b_user: true,
        b2b_customer_discount: true,
      },
    })
    if (!customer?.is_b2b_user) {
      return { isB2b: false, customerId, discountPercent: null }
    }
    return {
      isB2b: true,
      customerId,
      discountPercent: customer.b2b_customer_discount ?? null,
    }
  } catch {
    return { isB2b: false, customerId: null, discountPercent: null }
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm typecheck || pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/utilities/b2bContext/index.ts
git commit -m "feat(pricing): add resolveB2bContext helper for resolver gating"
```

### Task 3.3: Add `original_unit_price` to `CartItem` type

**Files:**
- Modify: `furnisystems-backend/src/graphql/CartItem/type.ts`

- [ ] **Step 1: Add the nullable float field to the type definition**

Inside the `definition(t) { ... }` block, near the existing `t.nullable.float('price')` at line 16, add:

```ts
t.nullable.float("original_unit_price", {
  resolve: async (parent, _args, ctx) => {
    const { resolveB2bContext } = await import(
      "../../utilities/b2bContext"
    )
    const b2b = await resolveB2bContext(ctx)
    if (!b2b.isB2b || !b2b.discountPercent) return null
    return parent.price ?? null
  },
})
```

Then change the existing `t.nullable.float('price')` so it routes through a
resolver that returns the discounted value for B2B callers:

```ts
t.nullable.float("price", {
  resolve: async (parent, _args, ctx) => {
    const { resolveB2bContext } = await import(
      "../../utilities/b2bContext"
    )
    const { applyB2bDiscount } = await import("../../utilities/priceUtils")
    const stored = parent.price
    if (stored == null) return null
    const b2b = await resolveB2bContext(ctx)
    if (!b2b.isB2b || !b2b.discountPercent) return stored
    return applyB2bDiscount(stored, b2b.discountPercent)
  },
})
```

(The dynamic `import()` calls avoid circular import issues with the nexus
registry — use normal imports if the file can be loaded eagerly.)

- [ ] **Step 2: Regenerate nexus schema**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm generate || pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/graphql/CartItem/type.ts
git commit -m "feat(cart): expose original_unit_price and b2b-discounted price on CartItem"
```

### Task 3.4: Add `original_unit_price` to `OrderItem` type

**Files:**
- Modify: `furnisystems-backend/src/graphql/OrderItem/type.ts`

- [ ] **Step 1: Add the field**

For `OrderItem`, the stored `price` on an already-placed order is whatever was
written at order creation. If `createNewOrder` was called with a
`b2b_customer_discount`, the stored `price` is already discounted. Surface the
pre-discount value as a resolver-derived field based on the `discount_applied`
column of the parent order.

Find the existing `t.float('price')` at line 13 and add next to it:

```ts
t.nullable.float("original_unit_price", {
  resolve: async (parent, _args, ctx) => {
    const order = await ctx.prisma.order.findFirst({
      where: { id: parent.orderId ?? undefined },
      select: { discount_applied: true },
    })
    const applied = order?.discount_applied ?? null
    if (!applied || applied <= 0) return null
    // parent.price is the already-discounted stored price
    return Math.round((parent.price / (1 - applied / 100)) * 100) / 100
  },
})
```

(If the `OrderItem` row carries its own discount record, adjust the lookup.
Verify the parent relation name with `schema.prisma`.)

- [ ] **Step 2: Regenerate nexus schema + type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm generate || pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/graphql/OrderItem/type.ts
git commit -m "feat(order): expose original_unit_price on OrderItem for b2b discount display"
```

### Task 3.5: Add `b2b_discount_total` to `Order` type

**Files:**
- Modify: `furnisystems-backend/src/graphql/Order/type.ts`

- [ ] **Step 1: Add the field**

Near the existing `t.float('discount_applied')` at line 19:

```ts
t.nullable.float("b2b_discount_total", {
  resolve: (parent) => {
    const applied = parent.discount_applied ?? 0
    if (applied <= 0) return null
    const subtotal = parent.sub_total_price ?? 0
    // subtotal is the post-discount amount; reconstruct pre-discount and subtract
    const pre = subtotal / (1 - applied / 100)
    return Math.round((pre - subtotal) * 100) / 100
  },
})
```

- [ ] **Step 2: Regenerate + type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm generate || pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/graphql/Order/type.ts
git commit -m "feat(order): expose b2b_discount_total summary field"
```

### Task 3.6: Storefront-untouched sanity run

**Files:**
- None modified.

- [ ] **Step 1: Run the backend**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm dev
```

- [ ] **Step 2: Query as a storefront user**

From the GraphQL playground or from `furnibay-frontend-shop`, issue a cart
query with the existing `price` selection. Confirm the returned numbers are
identical to before this branch (use an existing cart snapshot if available).
`original_unit_price` should return `null`; `b2b_discount_total` on an order
should return `null`.

- [ ] **Step 3: Query as a B2B user with a non-zero discount**

Confirm `price` is the discounted value and `original_unit_price` is the raw
stored price. Confirm `b2b_discount_total` is greater than zero on a placed
order.

No commit in this task.

---

## Phase 4 — Cart and checkout wiring

### Task 4.1: Update `line-item-price` to also recognize B2B pre-discount

**Files:**
- Modify: `vilmers-b2b-portal/src/modules/common/components/line-item-price/index.tsx`

Context: the component currently uses Medusa's `item.total` and
`item.original_total`. With the backend changes, a B2B line item now also
returns `original_unit_price`. Integrate it so either source of a pre-discount
value produces the strikethrough.

- [ ] **Step 1: Replace the internal logic with `<PriceDisplay>`**

Replace the body (lines 17-59) with:

```tsx
import { HttpTypes } from "@medusajs/types"
import PriceDisplay from "@modules/common/components/price-display"

type LineItemPriceProps = {
  item:
    | (HttpTypes.StoreCartLineItem & {
        original_unit_price?: number | null
        unit_price?: number | null
      })
    | (HttpTypes.StoreOrderLineItem & {
        original_unit_price?: number | null
        unit_price?: number | null
      })
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  const quantity = item.quantity ?? 1
  const currentTotal = item.total ?? 0
  const originalFromMedusa = item.original_total ?? currentTotal
  const originalFromB2b =
    item.original_unit_price != null
      ? item.original_unit_price * quantity
      : null
  const regular = Math.max(originalFromMedusa, originalFromB2b ?? 0)
  const hasDiscount = regular > currentTotal

  return (
    <PriceDisplay
      regular={regular}
      discounted={hasDiscount ? currentTotal : null}
      currencyCode={currencyCode}
      size={style === "default" ? "md" : "sm"}
      align="right"
    />
  )
}

export default LineItemPrice
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/common/components/line-item-price/index.tsx
git commit -m "feat(cart): unify line-item-price on shared PriceDisplay with b2b discount"
```

### Task 4.2: Update `line-item-unit-price` to use `<PriceDisplay>`

**Files:**
- Modify: `vilmers-b2b-portal/src/modules/common/components/line-item-unit-price/index.tsx`

- [ ] **Step 1: Replace the body (lines 11-59)**

```tsx
import { HttpTypes } from "@medusajs/types"
import PriceDisplay from "@modules/common/components/price-display"

type LineItemUnitPriceProps = {
  item:
    | (HttpTypes.StoreCartLineItem & {
        original_unit_price?: number | null
        unit_price?: number | null
      })
    | (HttpTypes.StoreOrderLineItem & {
        original_unit_price?: number | null
        unit_price?: number | null
      })
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  const quantity = item.quantity ?? 1
  const currentUnit = (item.total ?? 0) / quantity
  const originalUnitMedusa =
    item.original_total != null ? item.original_total / quantity : currentUnit
  const originalUnitB2b = item.original_unit_price ?? null
  const regular = Math.max(originalUnitMedusa, originalUnitB2b ?? 0)
  const hasDiscount = regular > currentUnit

  return (
    <PriceDisplay
      regular={regular}
      discounted={hasDiscount ? currentUnit : null}
      currencyCode={currencyCode}
      size={style === "default" ? "md" : "sm"}
      align="right"
    />
  )
}

export default LineItemUnitPrice
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/common/components/line-item-unit-price/index.tsx
git commit -m "feat(cart): unify line-item-unit-price on shared PriceDisplay"
```

### Task 4.3: Show dual price in the custom `cart-summary` (B2B cart page)

**Files:**
- Modify: `vilmers-b2b-portal/src/modules/cart/components/cart-summary/index.tsx:46-101`

Context: this is the Furnisystems-specific cart page view. It reads
`item.price` (the backend field now returns discounted for B2B callers) and
multiplies by quantity. We need to also read `item.original_unit_price` so we
can show the pre-discount total alongside.

- [ ] **Step 1: Confirm the cart query requests the new fields**

Find the GraphQL query that feeds `cart-summary`. Add `original_unit_price` to
the `CartItem` selection set if it is not already present. Example selection
addition:

```graphql
query GetCart(...) {
  cart(...) {
    items {
      id
      price
      original_unit_price   # NEW
      quantity
      # ...
    }
  }
}
```

- [ ] **Step 2: Replace the price render in the component**

At the lines 75-101 area where `const price = (item.price ?? 0) * quantity` is
computed, swap to `<PriceDisplay>`:

```tsx
import PriceDisplay from "@modules/common/components/price-display"

// ... inside the map over items:
const quantity = item.quantity ?? 1
const discounted = (item.price ?? 0) * quantity
const regular =
  item.original_unit_price != null
    ? item.original_unit_price * quantity
    : discounted

return (
  <PriceDisplay
    regular={regular}
    discounted={regular > discounted ? discounted : null}
    currencyCode="EUR"
    locale={localeMap[language] || "en-GB"}
    size="md"
    align="right"
  />
)
```

Remove the inline `formatPrice` closure now that `<PriceDisplay>` handles
formatting. Keep the `localeMap` import used elsewhere in the file.

- [ ] **Step 3: Type-check + smoke**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm typecheck || pnpm build
pnpm dev
```

As a B2B user with a discount: add a configured sofa to the cart, open the
cart page, verify dual prices per line. As a non-discount user: single prices.

- [ ] **Step 4: Commit**

```bash
git add src/modules/cart/components/cart-summary/index.tsx src/modules/cart/queries/*.ts
git commit -m "feat(cart): show b2b discount dual price in cart summary"
```

### Task 4.4: Show "You save" row in cart-totals and order-summary

**Files:**
- Modify: `vilmers-b2b-portal/src/modules/common/components/cart-totals/index.tsx`
- Modify: `vilmers-b2b-portal/src/modules/order/components/order-summary/index.tsx`
- Modify: `vilmers-b2b-portal/src/modules/cart/components/cart-summary/index.tsx` (totals row, if a totals block exists separately)

- [ ] **Step 1: cart-totals — the `discount_total` row already exists**

Confirm at `cart-totals/index.tsx` lines 44-48 that the `discount_total` field
is already rendered. The backend B2B discount now contributes to this via the
existing `discount_applied` / cart discount path — or a separate
`b2b_discount_total` field. If the number is not surfacing, add the B2B
portion:

```tsx
// Near the existing discount row:
{!!b2b_discount_total && (
  <div className="flex items-center justify-between">
    <span>B2B discount</span>
    <span>- {convertToLocale({ amount: b2b_discount_total, currency_code })}</span>
  </div>
)}
```

Destructure `b2b_discount_total` from the `totals` prop and ensure the cart
query selects it.

- [ ] **Step 2: order-summary — add the row**

Inside `order-summary/index.tsx`, add a conditional row after the subtotal:

```tsx
{!!order.b2b_discount_total && (
  <div className="flex items-center justify-between text-base-regular text-ui-fg-base mb-2">
    <span>B2B discount</span>
    <span>- {getAmount(order.b2b_discount_total)}</span>
  </div>
)}
```

Ensure the order query selects `b2b_discount_total`.

- [ ] **Step 3: Smoke test**

Place an order as a B2B user with a discount. Verify the order confirmation
page shows the "B2B discount" row with the correct negative amount and that
the total reconciles.

- [ ] **Step 4: Commit**

```bash
git add src/modules/common/components/cart-totals/index.tsx src/modules/order/components/order-summary/index.tsx src/modules/cart/queries/*.ts src/modules/order/queries/*.ts
git commit -m "feat(cart,order): surface b2b discount total row"
```

### Task 4.5: Cart-dropdown verification

**Files:**
- Modify (if needed): `vilmers-b2b-portal/src/modules/layout/components/cart-dropdown/index.tsx`

- [ ] **Step 1: Inspect**

The dropdown already renders `<LineItemPrice />` (lines 157-162). With Task 4.1
done, the dropdown will automatically pick up strikethrough rendering as long
as the dropdown's cart query selects `original_unit_price` on cart items.

- [ ] **Step 2: Add the field to the query if missing**

Look for the cart dropdown's query file and add `original_unit_price` to the
`items { ... }` selection.

- [ ] **Step 3: Smoke test**

As a B2B user with a discount: add an item, open the header cart dropdown,
verify dual price appears next to each line and that the subtotal at the
bottom (lines 188-191) uses the discounted total.

- [ ] **Step 4: Commit**

```bash
git add src/modules/layout/components/cart-dropdown/**
git commit -m "feat(cart): request original_unit_price in cart dropdown query"
```

---

## Phase 5 — Final verification

### Task 5.1: End-to-end manual smoke test

- [ ] **B2B user, non-zero discount (e.g. 15%):**
  - Configurator: footer total shows strikethrough regular + discounted total.
  - Module drawer: each module card shows struck-through + discounted.
  - Cart page: each line item shows dual price; "You save" row present.
  - Cart dropdown: dual price per line; discounted subtotal at bottom.
  - Checkout review: dual prices per line; totals reconcile.
  - Place order: order-confirmation page shows discounted line totals and
    `B2B discount` row in summary; total matches what the cart showed.

- [ ] **Non-B2B (storefront) user:**
  - Furnibay Shop app behaves identically to before — single prices
    everywhere, no "B2B discount" row, no strikethrough anywhere except
    product-preview sale items (which are independent).

- [ ] **B2B user, zero / null discount:**
  - Every surface shows a single price (no strikethrough).

- [ ] **Zero-price components:**
  - A free additional component continues to render nothing — no empty
    strikethrough artifact.

### Task 5.2: Commit notes / changelog

- [ ] **Step 1: Write a summary in commit message style**

(No changelog file exists in this repo; skip unless requested. Otherwise a
final empty commit on the branch with a summary is optional.)

---

## Self-Review Notes

Spec coverage:

- Section 4.1 (configurator frontend-computed) → Phase 1 + Phase 2.
- Section 4.2 (backend-authoritative cart/checkout with B2B gate) → Phase 3 +
  Phase 4.
- Section 4.3 (shared helper with `createNewOrder`) → Task 3.1.
- Section 5 (components) → Tasks 1.2, 1.3, 1.4.
- Section 5.4 (configurator touch points) → Tasks 2.1, 2.2. Component-card and
  summary-row sites don't currently display prices; no action needed there.
- Section 5.5 (cart/checkout touch points) → Tasks 4.1–4.5.
- Section 5.6 (backend) → Tasks 3.1–3.5.
- Section 6 (edge cases) → covered in Task 1.2 helper + Task 3.2 gate.
- Section 7 (rounding) → `applyDiscount` and `applyB2bDiscount` both round to 2
  decimals.
- Section 8 (testing) → framework absent; replaced with `verify-apply-discount`
  ts-node script (Task 1.2) + manual smoke matrix (Task 5.1). The spec's unit
  tests for `<PriceDisplay>` and `useCustomerDiscount` are deferred.

Known open items flagged to the engineer:

- Task 0.1 outcome (A vs B) determines Task 1.1 scope.
- Task 0.2 confirms the cart-page line-item shape. If it turns out the B2B
  cart page uses a materially different type than CartItem, Task 4.3 may need
  additional GraphQL field work.
- Task 3.4's `original_unit_price` computation on `OrderItem` reconstructs the
  pre-discount value from the parent order's `discount_applied`. If an order
  item can carry its own discount independent of the order-level one, this
  needs revisiting during Task 3.4.
