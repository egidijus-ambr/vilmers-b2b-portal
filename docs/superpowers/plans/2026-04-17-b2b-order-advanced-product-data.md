# B2B Portal: Pass Configuration Data on Order Creation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the B2B portal send fabric/sofa/additional-component configuration with each order item, so configured orders (e.g., ALICE sofa) render fabric details in the admin instead of "No fabric information available."

**Architecture:** The backend's `createNewOrder` mutation already accepts `advanced_product_data` per `OrderItemCustomInput`, and the admin's `ConfigurationDrawer` already reads `orderItem.cart_item.cartItemFabrics` via the existing order query. The B2B portal's checkout-form drops configuration during its `items → orderItems` mapping. Fix = (1) extend the cart query/fragment to fetch the IDs we need, (2) widen the `FurnisystemsCartItem` TypeScript type to match, (3) build an `advanced_product_data` object in the checkout mapping for advanced products.

**Tech Stack:** Next.js App Router, TypeScript, Apollo Client, GraphQL, pnpm.

**Root cause reference:** `src/modules/checkout/templates/checkout-form/index.tsx:102-113` — `orderItems` mapping omits `advanced_product_data` and sets `metadata: null`.

---

## File Structure

Files touched by this plan:

- **Modify** `src/lib/furnisystems-sdk/modules/cart/index.ts` — extend `CART_ITEM_FRAGMENT` to select the IDs we need on `fabric`, `fabric_group`, `fabricCombination`, and `cartItemFabrics[].combination_option`.
- **Modify** `src/lib/furnisystems-sdk/modules/cart/types.ts` — tighten `FurnisystemsCartItem` so the new fields are reachable with types.
- **Modify** `src/modules/checkout/templates/checkout-form/index.tsx` — build `advanced_product_data` in the `orderItems` mapping for advanced products.

No backend or admin changes — both sides already round-trip configuration correctly.

---

## Task 1: Extend cart fragment to fetch configuration IDs

**Why:** `advanced_product_data` expects Prisma `{ id }` relation references for `fabric`, `fabric_group`, `fabricCombination`, and each `combination_option`. The current fragment doesn't select them — we can't send what we can't read.

**Files:**
- Modify: `src/lib/furnisystems-sdk/modules/cart/index.ts` (the `CART_ITEM_FRAGMENT` gql tag, approximately lines 9–137)

- [ ] **Step 1: Read the current fragment**

Open `src/lib/furnisystems-sdk/modules/cart/index.ts` and locate the `CART_ITEM_FRAGMENT` (or whatever name holds the `fragment CartItemFields on CartItem { ... }` body). Confirm its current selection matches the reference at the bottom of this task.

- [ ] **Step 2: Add top-level `fabric` and `fabric_group` selections**

Inside the fragment body, immediately after `fabric_group_name`, add:

```graphql
    fabric {
      id
    }
    fabric_group {
      id
    }
```

- [ ] **Step 3: Add `id` to `fabricCombination`**

Find the existing `fabricCombination` block (currently selects only `image { src, src_xs, src_thumbnail }`). Change it to:

```graphql
    fabricCombination {
      id
      image {
        src
        src_xs
        src_thumbnail
      }
    }
```

- [ ] **Step 4: Add `id` to `cartItemFabrics[].combination_option`**

Find the `combination_option` block inside `cartItemFabrics`. Change:

```graphql
      combination_option {
        fabricCombinationOptionProfiles {
          language
          name
        }
      }
```

to:

```graphql
      combination_option {
        id
        fabricCombinationOptionProfiles {
          language
          name
        }
      }
```

- [ ] **Step 5: Verify the fragment compiles**

Run:

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```

Expected: no new errors from the fragment file. `FurnisystemsCartItem` type-mismatch errors are expected here (Task 2 fixes them) but they should be limited to property-access sites, not GraphQL parse errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
git add src/lib/furnisystems-sdk/modules/cart/index.ts
git commit -m "feat(cart): select configuration IDs in CART_ITEM_FRAGMENT

Adds id to fabric, fabric_group, fabricCombination and cartItemFabrics[].combination_option so the B2B checkout can forward them to createNewOrder as advanced_product_data."
```

**Reference — full final fragment body (verbatim target):**

```graphql
fragment CartItemFields on CartItem {
  id
  quantity
  price
  volume
  reference
  product_type
  advanced_product_type
  fabric_code
  fabric_group_name
  fabric {
    id
  }
  fabric_group {
    id
  }
  selected_sofa_combinations
  cartId
  productContainerId
  createdAt
  updatedAt
  product_container {
    single_product {
      images { src src_xs src_thumbnail }
      product_profiles { name language }
    }
    advanced_product {
      images { src src_xs src_thumbnail }
      advanced_product_profiles { name language }
      dimensions {
        width height length seat_height seat_width seat_depth
        headboard_height headboard_width mattress_width mattress_length
        table_extended_lengh table_top_thickness table_leg_width
        shade_height shade_radius
      }
    }
  }
  additional_components {
    id
    code
    additional_component_profiles { name material_name language }
    image { src src_thumbnail }
    color { id hex background }
    additional_component_group {
      id
      code
      additional_component_group_profiles { name language }
    }
    dimensions { width height length }
  }
  cartItemFabrics {
    id
    fabric {
      id
      code
      color_name
      image { src src_thumbnail }
    }
    fabric_group {
      id
      code
      type
      fabric_group_profiles { language name }
    }
    combination_option {
      id
      fabricCombinationOptionProfiles { language name }
    }
  }
  sofa_forms { id name code }
  fabricCombination {
    id
    image { src src_xs src_thumbnail }
  }
}
```

> If you inlined the field groups (`{ src src_xs src_thumbnail }` on one line) but the existing file uses multi-line form, keep the existing formatting — only the *selection set* matters.

---

## Task 2: Tighten `FurnisystemsCartItem` type

**Why:** The TS type currently has `fabric: any | null`, `fabric_group: any | null`, and `fabricCombination: { image?: ... } | null`. Tightening them makes the mapping in Task 3 type-safe and surfaces missing IDs at compile time.

**Files:**
- Modify: `src/lib/furnisystems-sdk/modules/cart/types.ts` (lines 11–72 define `FurnisystemsCartItem`)

- [ ] **Step 1: Replace `fabric` and `fabric_group` field types**

Change:

```typescript
  fabric_group: any | null
  fabric: any | null
```

to:

```typescript
  fabric_group: { id: number } | null
  fabric: { id: number } | null
```

- [ ] **Step 2: Extend `fabricCombination` with `id`**

Change:

```typescript
  fabricCombination: { image?: { src?: string; src_xs?: string; src_thumbnail?: string } } | null
```

to:

```typescript
  fabricCombination: {
    id: number
    image?: { src?: string; src_xs?: string; src_thumbnail?: string }
  } | null
```

- [ ] **Step 3: Add `id` to `cartItemFabrics[].combination_option`**

Find the `combination_option` field on `cartItemFabrics`:

```typescript
    combination_option?: {
      fabricCombinationOptionProfiles?: { language: string; name: string }[]
    }
```

Change to:

```typescript
    combination_option?: {
      id: number
      fabricCombinationOptionProfiles?: { language: string; name: string }[]
    }
```

- [ ] **Step 4: Typecheck**

Run:

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```

Expected: any pre-existing errors may remain, but no *new* errors coming from these type changes. If callers were relying on `any` to access non-existent properties, fix only the direct consumers — do NOT widen the types back.

- [ ] **Step 5: Commit**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
git add src/lib/furnisystems-sdk/modules/cart/types.ts
git commit -m "refactor(cart): narrow FurnisystemsCartItem config field types

Types now reflect ids selected by CART_ITEM_FRAGMENT for fabric, fabric_group, fabricCombination, and cartItemFabrics[].combination_option."
```

---

## Task 3: Build `advanced_product_data` in checkout mapping

**Why:** This is the actual fix. For advanced products, map each cart item's configuration fields into the shape `AdvancedProductDataCustomInput` expects, and pass it through as the `advanced_product_data` field of each order item.

**Target input shape** (from `furnisystems-backend/src/types-modified/Order.ts:141-154`):

```
advanced_product_data?: {
  advanced_product_type?: string
  selected_sofa_combinations?: string
  fabric_code?: string
  fabric_group?: { id: number }   // FabricGroupWhereUniqueInput
  fabric?: { id: number }          // FabricGroupWhereUniqueInput
  fabricCombination?: {
    id?: number
    fabrics?: { fabricId: number; fabric_groupId: number; optionId: number }[]
  }
  additional_components?: { id: number }[]
}
```

**Files:**
- Modify: `src/modules/checkout/templates/checkout-form/index.tsx` (the `handlePlaceOrder` function, lines 80–113)

- [ ] **Step 1: Add a helper that builds `advanced_product_data` from a cart item**

Above `handlePlaceOrder` (or at module scope, above the component), add this pure helper. Importing `FurnisystemsCartItem` should already work — if not, import it from `@/lib/furnisystems-sdk/modules/cart/types`.

```typescript
import type { FurnisystemsCartItem } from "@/lib/furnisystems-sdk/modules/cart/types"

function buildAdvancedProductData(item: FurnisystemsCartItem) {
  if (!item.product_container?.advanced_product) return undefined

  const fabricCombinationFabrics = item.cartItemFabrics
    ?.filter(
      (f) => f.fabric?.id != null && f.fabric_group?.id != null && f.combination_option?.id != null
    )
    .map((f) => ({
      fabricId: f.fabric!.id,
      fabric_groupId: f.fabric_group!.id,
      optionId: f.combination_option!.id,
    }))

  const fabricCombination =
    item.fabricCombination?.id != null || (fabricCombinationFabrics && fabricCombinationFabrics.length > 0)
      ? {
          id: item.fabricCombination?.id,
          fabrics: fabricCombinationFabrics,
        }
      : undefined

  const additional_components = item.additional_components?.length
    ? item.additional_components.map((c) => ({ id: c.id }))
    : undefined

  const data = {
    advanced_product_type: item.advanced_product_type ?? undefined,
    selected_sofa_combinations: item.selected_sofa_combinations ?? undefined,
    fabric_code: item.fabric_code ?? undefined,
    fabric_group: item.fabric_group?.id != null ? { id: item.fabric_group.id } : undefined,
    fabric: item.fabric?.id != null ? { id: item.fabric.id } : undefined,
    fabricCombination,
    additional_components,
  }

  const hasAny = Object.values(data).some((v) => v !== undefined)
  return hasAny ? data : undefined
}
```

Rationale per field:
- We gate the whole object on `product_container.advanced_product` so single products send nothing, matching their `product_type: "single"`.
- Each `cartItemFabrics` entry is dropped unless it has all three relation IDs — partial rows would fail the backend's non-null `fabricId`/`fabric_groupId`/`optionId` (`Order.ts:124-131`).
- `fabricCombination` is only emitted if we have either its own `id` or at least one fabric row to carry.
- Empty arrays become `undefined` so we don't send noise.

- [ ] **Step 2: Wire the helper into the `orderItems` mapping**

Replace the current mapping (lines 102–113):

```typescript
    const orderItems = items.map((item) => ({
      product_container: { id: item.productContainerId },
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
      sku: item.fabric_code || "",
      product_type: item.product_container?.advanced_product ? "advanced" : "single",
      shipping_price: 0,
      expected_delivery_date: deliveryDate?.toISOString() || new Date().toISOString(),
      shipping_method: { id: 6 },
      status: "PENDING",
      metadata: null,
    }))
```

with:

```typescript
    const orderItems = items.map((item) => ({
      product_container: { id: item.productContainerId },
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
      sku: item.fabric_code || "",
      product_type: item.product_container?.advanced_product ? "advanced" : "single",
      shipping_price: 0,
      expected_delivery_date: deliveryDate?.toISOString() || new Date().toISOString(),
      shipping_method: { id: 6 },
      status: "PENDING",
      advanced_product_data: buildAdvancedProductData(item),
      metadata: null,
    }))
```

Only two lines added: the `advanced_product_data` field and the import at the top of the file. Everything else stays — we are NOT changing `product_type`, `sku`, `metadata`, `shipping_method`, etc. in this change.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```

Expected: passes. If a type error complains about `buildAdvancedProductData` return type not matching the inferred `orderItems` element, inline-type the helper as `: AdvancedProductDataPayload | undefined` and define that type locally — but do not loosen the input validation.

- [ ] **Step 4: Commit**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
git add src/modules/checkout/templates/checkout-form/index.tsx
git commit -m "fix(checkout): forward advanced_product_data on order placement

The B2B checkout was dropping fabric, fabric combination, sofa combinations and additional-component selections when mapping cart items to createNewOrder's orderItems. As a result, admin saw 'No fabric information available' for configured products (e.g. ALICE sofa). Forward advanced_product_data for advanced products so the backend persists the configuration onto the OrderItem's CartItem and the admin ConfigurationDrawer can render it."
```

---

## Task 4: Manual end-to-end verification

**Why:** There is no checkout-form unit test harness in this project, and the real failure mode is a shape mismatch between three services. The fastest confidence is placing a real order and reading the admin. Required skill: `superpowers:verification-before-completion` — do not claim done without this.

- [ ] **Step 1: Start the stack**

In three terminals from `/Users/egidijus/Documents/GitHub/furnisystems-workspace`:

```bash
# Backend
cd furnisystems-backend && pnpm dev

# B2B portal
cd vilmers-b2b-portal && pnpm dev

# Admin
cd saas-admin-ui && pnpm dev
```

- [ ] **Step 2: Configure and place an order in the B2B portal**

Open http://localhost:3002, log in as a B2B customer, and:
1. Open the ALICE (or any advanced product) configurator.
2. Pick a fabric combination — choose at least one fabric across multiple combination options so `cartItemFabrics` has ≥2 rows.
3. Add at least one additional component.
4. Add to cart.
5. Go to checkout, fill address, select order type, click **Place Order**.

Expected: order placed successfully. Note the order ID.

- [ ] **Step 3: Inspect the GraphQL payload**

In the browser DevTools Network tab, find the `CreateOrder` mutation request. Confirm its `variables.order_items[0].advanced_product_data` is populated:

```json
{
  "advanced_product_type": "...",
  "selected_sofa_combinations": "[{...}]",
  "fabric_code": "...",
  "fabric_group": { "id": <number> },
  "fabric": { "id": <number> },
  "fabricCombination": {
    "id": <number>,
    "fabrics": [
      { "fabricId": <number>, "fabric_groupId": <number>, "optionId": <number> }
    ]
  },
  "additional_components": [{ "id": <number> }]
}
```

If any field is `null`/`undefined` that shouldn't be, stop and return to Task 1 or Task 3 — don't proceed to admin-side verification.

- [ ] **Step 4: Verify the admin ConfigurationDrawer**

Open http://localhost:3001 (admin), navigate to the new order, open the order item's configuration drawer.

Expected:
- "Fabrics" section lists the chosen fabric(s) with thumbnails and group/option names — NOT "No fabric information available."
- Additional components appear under their respective section.

If the drawer still shows the empty state, check the admin's `order.order_items[].cart_item.cartItemFabrics` by logging or via Apollo DevTools. If the data is on the backend but not in the admin query, that is a separate admin-side issue outside this plan's scope — document it and hand off.

- [ ] **Step 5: Smoke-test a single-product order**

Repeat Step 2 with a non-advanced product (no configurator). Expected: order places, admin shows no fabric section (or the existing single-product treatment), and the mutation payload has `advanced_product_data: undefined` — confirming the helper's gate on `product_container.advanced_product`.

- [ ] **Step 6: Final commit (only if any fixes were needed during verification)**

If Steps 3–5 required tweaks, amend the relevant commits from Tasks 1–3 or add a follow-up commit with a clear message. Otherwise nothing to do here.

---

## Self-Review

**Spec coverage**

| Requirement | Where |
|---|---|
| B2B portal sends fabric IDs with order | Task 3 Step 1 `buildAdvancedProductData` |
| B2B portal sends sofa-form JSON with order | Task 3 Step 1 (`selected_sofa_combinations`) |
| B2B portal sends additional components with order | Task 3 Step 1 (`additional_components`) |
| Cart query provides the needed IDs | Tasks 1 + 2 |
| Single-product orders unaffected | Task 3 (gate on `product_container.advanced_product`) + Task 4 Step 5 |
| Admin shows fabrics for new orders | Task 4 Step 4 |

**Type consistency**

- `FurnisystemsCartItem.fabric` / `.fabric_group` → `{ id: number } | null` (Task 2) matches `item.fabric?.id` accessor in helper (Task 3).
- `fabricCombination: { id, image? } | null` (Task 2) matches `item.fabricCombination?.id` (Task 3).
- `cartItemFabrics[].combination_option: { id, ... }` (Task 2) matches `f.combination_option?.id` (Task 3).
- `AdditionalComponentiNOrderCustomInput` takes `{ id: Float }` (`Order.ts:169-183`) — `additional_components.map((c) => ({ id: c.id }))` satisfies that.
- `FabricCombinationFabricCustomInput` requires non-null `fabricId`, `fabric_groupId`, `optionId` as `Int` (`Order.ts:124-131`) — the filter in Task 3 Step 1 enforces all three before mapping.

**Placeholder scan:** No TBDs, all code blocks contain final code.
