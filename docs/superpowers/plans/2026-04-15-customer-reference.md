# Customer Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer reference support to the B2B portal configurator and cart — users must provide a reference for every cart item, can enter it in the stepper or via a mandatory modal, and can edit it inline in the cart.

**Architecture:** Backend gets a new `reference` field on CartItem + two mutation changes. B2B SDK passes `customerReference` through to GraphQL. Configurator adds a reference step and missing-reference modal. Cart gets inline editing via a toggle-mode component.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, GraphQL (Apollo), Prisma

---

### Task 1: Backend — Add `reference` field to CartItem model

**Files:**
- Modify: `furnisystems-backend/prisma/schema.prisma` (CartItem model, ~line 1978)

- [ ] **Step 1: Add reference field to CartItem model**

In `furnisystems-backend/prisma/schema.prisma`, add the `reference` field to the `CartItem` model after the `volume` field (around line 1990):

```prisma
  volume             Float?
  reference          String?
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd furnisystems-backend && npx prisma migrate dev --name add-reference-to-cart-item
```

Expected: Migration creates successfully, adds `reference` column to `CartItem` table.

- [ ] **Step 3: Commit**

```bash
cd furnisystems-backend && git add prisma/schema.prisma prisma/migrations/ && git commit -m "feat: add reference field to CartItem model"
```

---

### Task 2: Backend — Add `customerReference` to addItemToCart mutation

**Files:**
- Modify: `furnisystems-backend/src/types-modified/Cart.ts` (~lines 123-244, addItemToCart mutation)

- [ ] **Step 1: Add customerReference argument to addItemToCart**

In `furnisystems-backend/src/types-modified/Cart.ts`, find the `addItemToCart` mutation's `args` block (around line 129). Add `customerReference` after the existing arguments:

```typescript
customerReference: nullable(stringArg()),
```

Import `stringArg` if not already imported (it should be available from nexus).

- [ ] **Step 2: Pass customerReference to CartItem creation**

In the same file, find the `prisma.cartItem.create` call inside the `addItemToCart` resolver (around line 146). Add `reference` to the `data` object:

```typescript
reference: args.customerReference ?? undefined,
```

- [ ] **Step 3: Verify the server starts**

```bash
cd furnisystems-backend && pnpm dev
```

Expected: Server starts without errors, GraphQL schema regenerates with the new `customerReference` argument on `addItemToCart`.

- [ ] **Step 4: Commit**

```bash
cd furnisystems-backend && git add src/types-modified/Cart.ts && git commit -m "feat: add customerReference param to addItemToCart mutation"
```

---

### Task 3: Backend — Add updateCartItemReference mutation

**Files:**
- Modify: `furnisystems-backend/src/types-modified/Cart.ts` (add new mutation after updateCartItemQuantity, ~line 275)

- [ ] **Step 1: Add the updateCartItemReference mutation**

In `furnisystems-backend/src/types-modified/Cart.ts`, add a new mutation after `updateCartItemQuantity` (around line 275):

```typescript
export const updateCartItemReference = mutationField(
  "updateCartItemReference",
  {
    type: CartType,
    args: {
      cartItemId: nonNull(intArg()),
      reference: nonNull(stringArg()),
    },
    resolve: async (_root, args, ctx) => {
      const cartItem = await ctx.prisma.cartItem.update({
        where: { id: args.cartItemId },
        data: { reference: args.reference },
      })

      // Return the parent cart with all items
      const cart = await ctx.prisma.cart.findUnique({
        where: { id: cartItem.cartId! },
        include: {
          items: {
            include: {
              product_container: {
                include: {
                  single_product: {
                    include: {
                      images: true,
                      product_profiles: { include: { language: true } },
                    },
                  },
                  advanced_product: {
                    include: {
                      images: true,
                      advanced_product_profiles: {
                        include: { language: true },
                      },
                    },
                  },
                },
              },
              additional_components: true,
              cartItemFabrics: {
                include: {
                  fabric: true,
                  fabric_group: true,
                  combination_option: true,
                },
              },
              sofa_forms: true,
              fabricCombination: {
                include: { combination_options: true },
              },
            },
          },
        },
      })

      return cart
    },
  }
)
```

Note: This returns the full `Cart` (same as `addItemToCart`) so the client cache updates properly.

- [ ] **Step 2: Verify the server starts and schema regenerates**

```bash
cd furnisystems-backend && pnpm dev
```

Expected: Server starts, `updateCartItemReference` mutation appears in the generated schema.

- [ ] **Step 3: Commit**

```bash
cd furnisystems-backend && git add src/types-modified/Cart.ts && git commit -m "feat: add updateCartItemReference mutation"
```

---

### Task 4: B2B SDK — Add reference to types, fragment, and mutations

**Files:**
- Modify: `src/lib/furnisystems-sdk/modules/cart/types.ts` (AddCartItemInput, ~line 73)
- Modify: `src/lib/furnisystems-sdk/modules/cart/index.ts` (fragment, mutations, CartModule)

- [ ] **Step 1: Add customerReference to AddCartItemInput type**

In `src/lib/furnisystems-sdk/modules/cart/types.ts`, add `customerReference` to the `AddCartItemInput` interface (after `cartItemFabrics`, around line 87):

```typescript
  cartItemFabrics?: { fabricId?: number; fabric_groupId?: number; combination_optionId?: number }[]
  customerReference?: string
}
```

- [ ] **Step 2: Add reference to CART_ITEM_FRAGMENT**

In `src/lib/furnisystems-sdk/modules/cart/index.ts`, add `reference` to the `CART_ITEM_FRAGMENT`. Find the fragment fields (around line 10) and add `reference` after the existing scalar fields like `volume`:

```graphql
  volume
  reference
```

- [ ] **Step 3: Add customerReference variable to ADD_ITEM_TO_CART mutation**

In the same file, find the `ADD_ITEM_TO_CART` mutation (around line 155). Add `$customerReference: String` to the mutation variables and pass it through:

In the mutation signature line, add the new variable:
```graphql
$customerReference: String
```

In the `addItemToCart(...)` call arguments, add:
```graphql
customerReference: $customerReference
```

- [ ] **Step 4: Pass customerReference in CartModule.addItem()**

In the `CartModule.addItem()` method (around line 228), add `customerReference` to the variables object:

```typescript
customerReference: input.customerReference,
```

- [ ] **Step 5: Add UPDATE_CART_ITEM_REFERENCE mutation and method**

Add the new GraphQL mutation after `REMOVE_CART_ITEM` (around line 211):

```typescript
const UPDATE_CART_ITEM_REFERENCE = gql`
  mutation UpdateCartItemReference($cartItemId: Int!, $reference: String!) {
    updateCartItemReference(cartItemId: $cartItemId, reference: $reference) {
      id
      items {
        ...CartItemFields
      }
    }
  }
  ${CART_ITEM_FRAGMENT}
`
```

Add the new method to `CartModule` class (after `removeItem`, around line 275):

```typescript
  async updateItemReference(cartItemId: number, reference: string): Promise<FurnisystemsCart> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_CART_ITEM_REFERENCE,
      variables: { cartItemId, reference },
    })
    return data.updateCartItemReference
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/furnisystems-sdk/modules/cart/types.ts src/lib/furnisystems-sdk/modules/cart/index.ts && git commit -m "feat: add customerReference to SDK cart types, fragment, and mutations"
```

---

### Task 5: B2B SDK — Update mapper and cart context

**Files:**
- Modify: `src/modules/common/components/product-items-table/mappers.ts` (~line 64, furnisystemsCartItemToProductItemRow)
- Modify: `src/lib/context/cart-context.tsx` (CartContextValue, CartProvider)

- [ ] **Step 1: Add reference to the cart item mapper**

In `src/modules/common/components/product-items-table/mappers.ts`, find the `furnisystemsCartItemToProductItemRow` function's return statement (around line 100). Add `reference`:

```typescript
  return {
    id: String(item.id),
    name,
    reference: item.reference ?? undefined,
    image,
```

- [ ] **Step 2: Add updateItemReference to cart context**

In `src/lib/context/cart-context.tsx`, add `updateItemReference` to the `CartContextValue` interface (around line 8):

```typescript
interface CartContextValue {
  cart: FurnisystemsCart | null
  items: FurnisystemsCartItem[]
  isLoading: boolean
  addItem: (input: AddCartItemInput) => Promise<void>
  updateItemQuantity: (cartItemId: number, quantity: number) => Promise<void>
  updateItemReference: (cartItemId: number, reference: string) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  refreshCart: () => Promise<void>
}
```

Then in the `CartProvider` component, implement the method. Follow the same pattern as `updateItemQuantity` — call the SDK method and refresh the cart state:

```typescript
const updateItemReference = useCallback(async (cartItemId: number, reference: string) => {
  const updatedCart = await sdk.cart.updateItemReference(cartItemId, reference)
  setCart(updatedCart)
}, [sdk])
```

Pass `updateItemReference` into the context value object.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/common/components/product-items-table/mappers.ts src/lib/context/cart-context.tsx && git commit -m "feat: wire reference through cart mapper and context"
```

---

### Task 6: UI — Create Reference Step component

**Files:**
- Create: `src/modules/products/components/configurator/reference-step.tsx`

- [ ] **Step 1: Create the reference step component**

Create `src/modules/products/components/configurator/reference-step.tsx`:

```tsx
"use client"

import { useConfigurator } from "@/configurator/context/configurator-context"
import { useTranslation } from "@/lib/i18n/useTranslation"

export function ReferenceStep() {
  const { state, dispatch } = useConfigurator()
  const t = useTranslation("account")

  return (
    <div className="flex flex-col gap-3 p-4 max-w-md">
      <label className="text-sm font-medium text-dark-blue">
        {t["customer-reference"]}
      </label>
      <p className="text-sm text-dark-blue-70">
        {t["reference-step-description"]}
      </p>
      <input
        type="text"
        value={state.referenceText}
        onChange={(e) =>
          dispatch({ type: "SET_REFERENCE_TEXT", payload: e.target.value })
        }
        placeholder={t["reference-placeholder"]}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue"
      />
      <p className="text-xs text-dark-blue-50">
        {t["reference-optional-hint"]}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/products/components/configurator/reference-step.tsx && git commit -m "feat: create ReferenceStep component for configurator"
```

---

### Task 7: UI — Create Missing Reference Modal component

**Files:**
- Create: `src/modules/products/components/configurator/missing-reference-modal.tsx`

- [ ] **Step 1: Create the missing reference modal component**

Create `src/modules/products/components/configurator/missing-reference-modal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/i18n/useTranslation"

interface MissingReferenceModalProps {
  isOpen: boolean
  onConfirm: (reference: string) => void
  onCancel: () => void
}

export function MissingReferenceModal({
  isOpen,
  onConfirm,
  onCancel,
}: MissingReferenceModalProps) {
  const [reference, setReference] = useState("")
  const t = useTranslation("account")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-7 w-[380px] shadow-xl">
        <h3 className="text-lg font-semibold text-dark-blue mb-1">
          {t["reference-required-title"]}
        </h3>
        <p className="text-sm text-dark-blue-70 mb-5">
          {t["reference-required-description"]}
        </p>

        <label className="block text-sm font-medium text-dark-blue mb-1.5">
          {t["customer-reference"]}
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={t["reference-placeholder"]}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue mb-5"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && reference.trim()) {
              onConfirm(reference.trim())
            }
          }}
        />

        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-dark-blue-70 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
          >
            {t["cancel"]}
          </button>
          <button
            onClick={() => onConfirm(reference.trim())}
            disabled={!reference.trim()}
            className="px-4 py-2 text-sm text-white bg-dark-blue rounded-md hover:bg-dark-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t["add-to-cart"]}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/products/components/configurator/missing-reference-modal.tsx && git commit -m "feat: create MissingReferenceModal component"
```

---

### Task 8: UI — Wire reference step and modal into configurator

**Files:**
- Modify: `src/modules/products/components/configurator/configurator-content.tsx` (~lines 83-95 steps, ~lines 315-346 step content, ~lines 401-442 PriceFooter)

- [ ] **Step 1: Import new components and add state for modal**

At the top of `configurator-content.tsx`, add imports:

```typescript
import { ReferenceStep } from "./reference-step"
import { MissingReferenceModal } from "./missing-reference-modal"
```

Inside the component function, add modal state (near other state declarations):

```typescript
const [showReferenceModal, setShowReferenceModal] = useState(false)
```

- [ ] **Step 2: Add Reference step to the stepper**

Find where steps are computed (around line 83, the `getStepsForProduct` call). After the steps are computed, append the reference step. The steps array is used to render the stepper. Add the reference step as the last element:

```typescript
const productSteps = getStepsForProduct(...)
const steps = [...productSteps, { id: "reference" as any, label: t["customer-reference"], groups: [] }]
```

- [ ] **Step 3: Render ReferenceStep content when reference step is active**

In the step content rendering section (around line 315), add a case for the reference step. After the existing step content conditionals, add:

```tsx
{currentStepDef?.id === "reference" && <ReferenceStep />}
```

- [ ] **Step 4: Wire modal into PriceFooter's onAddToCart**

Modify the `onAddToCart` callback in PriceFooter (around line 405). Wrap the existing logic to check for reference first:

```tsx
onAddToCart={async () => {
  if (!state.referenceText.trim()) {
    setShowReferenceModal(true)
    return
  }
  await handleAddToCart(state.referenceText.trim())
}}
```

Extract the existing add-to-cart logic into a `handleAddToCart` function defined inside the component:

```typescript
const handleAddToCart = async (reference: string) => {
  if (!productData?.id) return
  try {
    await addItem({
      productContainerId: productData.id,
      product_type: productData.product_type || "SIMPLE_PRODUCT",
      advanced_product_type: productData.advanced_product?.advanced_product_type,
      quantity: state.quantity,
      price: state.totalPrice ?? undefined,
      volume: totalVolume ?? undefined,
      fabricId: state.selectedFabric.fabricObject?.id,
      fabric_groupId: state.selectedFabric.fabricGroupObject?.id,
      fabricCombinationId: state.selectedFabricCombination?.fabricCombination?.id,
      fabric_code: state.selectedFabric.fabricObject?.code,
      fabric_group_name: state.selectedFabric.fabricGroupObject?.name,
      selected_sofa_combinations: state.sofaCombinations.length > 0
        ? JSON.stringify(state.sofaCombinations)
        : undefined,
      additionalComponentIds: state.selectedAdditionalComponents
        .filter((c) => c.id != null)
        .map((c) => c.id),
      cartItemFabrics: state.selectedFabric.combinationFabrics
        ? Object.values(state.selectedFabric.combinationFabrics).map(...)
        : undefined,
      customerReference: reference,
    })
    setToast({ message: "Item added to cart", type: "success" })
  } catch (error) {
    setToast({ message: "Failed to add item to cart", type: "error" })
  }
}
```

- [ ] **Step 5: Render the MissingReferenceModal**

Add the modal render at the end of the component's JSX return, before the closing fragment/wrapper:

```tsx
<MissingReferenceModal
  isOpen={showReferenceModal}
  onConfirm={async (reference) => {
    setShowReferenceModal(false)
    dispatch({ type: "SET_REFERENCE_TEXT", payload: reference })
    await handleAddToCart(reference)
  }}
  onCancel={() => setShowReferenceModal(false)}
/>
```

- [ ] **Step 6: Verify it compiles**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/products/components/configurator/configurator-content.tsx && git commit -m "feat: wire reference step and modal into configurator"
```

---

### Task 9: UI — Create InlineReferenceEdit component

**Files:**
- Create: `src/modules/common/components/product-items-table/inline-reference-edit.tsx`

- [ ] **Step 1: Create the inline reference edit component**

Create `src/modules/common/components/product-items-table/inline-reference-edit.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect } from "react"

interface InlineReferenceEditProps {
  reference: string
  label: string
  onSave: (newReference: string) => Promise<void>
}

export function InlineReferenceEdit({
  reference,
  label,
  onSave,
}: InlineReferenceEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(reference)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === reference) {
      handleCancel()
      return
    }
    setIsSaving(true)
    try {
      await onSave(trimmed)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(reference)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <p className="text-dark-blue-70 text-xs mt-0.5 flex items-center gap-1.5">
        <span>{label}:</span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-dark-blue border-b border-dashed border-dark-blue-40 hover:border-dark-blue cursor-pointer pb-px"
        >
          {reference}
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="text-dark-blue-40 hover:text-dark-blue"
          aria-label="Edit reference"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1 mt-0.5">
      <span className="text-dark-blue-70 text-xs">{label}:</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") handleCancel()
        }}
        disabled={isSaving}
        className="border border-dark-blue rounded px-1.5 py-0.5 text-xs text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue/20 w-44"
      />
      <button
        onClick={handleSave}
        disabled={!value.trim() || isSaving}
        className="flex items-center justify-center w-6 h-6 bg-dark-blue text-white rounded text-sm disabled:opacity-50"
        aria-label="Save"
      >
        ✓
      </button>
      <button
        onClick={handleCancel}
        disabled={isSaving}
        className="flex items-center justify-center w-6 h-6 bg-gray-100 text-dark-blue-70 border border-gray-200 rounded text-sm"
        aria-label="Cancel"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/common/components/product-items-table/inline-reference-edit.tsx && git commit -m "feat: create InlineReferenceEdit component"
```

---

### Task 10: UI — Wire inline edit into cart table rows

**Files:**
- Modify: `src/modules/common/components/product-items-table/table-row.tsx` (~lines 71-75)
- Modify: `src/modules/common/components/product-items-table/mobile-card.tsx` (~lines 61-64)
- Modify: `src/modules/common/components/product-items-table/types.ts` (~line 25, ProductItemsTableProps)

- [ ] **Step 1: Add onReferenceChange callback to ProductItemsTableProps**

In `src/modules/common/components/product-items-table/types.ts`, add an optional callback to `ProductItemsTableProps` (around line 25):

```typescript
export interface ProductItemsTableProps {
  items: ProductItemRow[]
  renderActions?: (item: ProductItemRow) => React.ReactNode
  formatPrice: (price: number) => string
  translations: {
    noImage: string
    customerReference: string
    unitPrice: string
    quantity: string
    total: string
    volume: string
    showConfiguration: string
    hideConfiguration: string
  }
  showVolume?: boolean
  onReferenceChange?: (itemId: string, newReference: string) => Promise<void>
}
```

- [ ] **Step 2: Update TableRow props to accept onReferenceChange**

In `src/modules/common/components/product-items-table/table-row.tsx`, add `onReferenceChange` to the `TableRowProps` interface:

```typescript
interface TableRowProps {
  item: ProductItemRow
  index: number
  showVolume: boolean
  formatPrice: (price: number) => string
  translations: {
    noImage: string
    customerReference: string
    showConfiguration: string
    hideConfiguration: string
  }
  renderActions?: (item: ProductItemRow) => React.ReactNode
  onReferenceChange?: (itemId: string, newReference: string) => Promise<void>
}
```

- [ ] **Step 3: Replace static reference display with InlineReferenceEdit in TableRow**

Import the component at the top of `table-row.tsx`:

```typescript
import { InlineReferenceEdit } from "./inline-reference-edit"
```

Replace the existing reference display (lines 71-75):

```tsx
{item.reference && (
  <p className="text-dark-blue-70 text-xs mt-0.5">
    {t.customerReference}: {item.reference}
  </p>
)}
```

With:

```tsx
{item.reference && onReferenceChange ? (
  <InlineReferenceEdit
    reference={item.reference}
    label={t.customerReference}
    onSave={(newRef) => onReferenceChange(item.id, newRef)}
  />
) : item.reference ? (
  <p className="text-dark-blue-70 text-xs mt-0.5">
    {t.customerReference}: {item.reference}
  </p>
) : null}
```

This preserves the static display for contexts where editing isn't supported (e.g., order history).

- [ ] **Step 4: Do the same for MobileCard**

In `src/modules/common/components/product-items-table/mobile-card.tsx`, add `onReferenceChange` to `MobileCardProps`:

```typescript
onReferenceChange?: (itemId: string, newReference: string) => Promise<void>
```

Import `InlineReferenceEdit` and replace the reference display (lines 61-64) with the same conditional pattern as TableRow.

- [ ] **Step 5: Pass onReferenceChange through the parent table component**

Find the parent component that renders `TableRow` and `MobileCard` (likely `src/modules/common/components/product-items-table/index.tsx` or similar). Pass `onReferenceChange` prop through to each row/card.

- [ ] **Step 6: Wire onReferenceChange in the cart page**

In the cart page where `ProductItemsTable` is used, pass the `onReferenceChange` callback that calls `updateItemReference` from the cart context:

```tsx
onReferenceChange={async (itemId, newReference) => {
  await updateItemReference(Number(itemId), newReference)
}}
```

- [ ] **Step 7: Verify it compiles**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/modules/common/components/product-items-table/ && git commit -m "feat: wire InlineReferenceEdit into cart table rows"
```

---

### Task 11: Translations — Add new translation keys

**Files:**
- Modify: `src/lib/i18n/locales/en/account.json`
- Modify: `src/lib/i18n/locales/da/account.json`
- Modify: `src/lib/i18n/locales/de/account.json`
- Modify: `src/lib/i18n/locales/fr/account.json`
- Modify: `src/lib/i18n/locales/lt/account.json`

- [ ] **Step 1: Add translation keys to all locale files**

Add these keys to each locale's `account.json`:

**English (`en/account.json`):**
```json
"reference-step-description": "Enter your order or project reference number. You can also add this later when adding to cart.",
"reference-placeholder": "e.g. PO-2024-0847",
"reference-optional-hint": "Optional at this step — required before adding to cart",
"reference-required-title": "Customer Reference Required",
"reference-required-description": "Please enter a reference number to add this item to your cart.",
"add-to-cart": "Add to Cart",
"cancel": "Cancel"
```

**Danish (`da/account.json`):**
```json
"reference-step-description": "Indtast dit ordre- eller projektreferencenummer. Du kan også tilføje dette senere, når du lægger i kurven.",
"reference-placeholder": "f.eks. PO-2024-0847",
"reference-optional-hint": "Valgfrit i dette trin — påkrævet før tilføjelse til kurv",
"reference-required-title": "Kundereference påkrævet",
"reference-required-description": "Indtast venligst et referencenummer for at tilføje denne vare til din kurv.",
"add-to-cart": "Læg i kurv",
"cancel": "Annuller"
```

**German (`de/account.json`):**
```json
"reference-step-description": "Geben Sie Ihre Bestell- oder Projektreferenznummer ein. Sie können diese auch später beim Hinzufügen zum Warenkorb angeben.",
"reference-placeholder": "z.B. PO-2024-0847",
"reference-optional-hint": "Optional in diesem Schritt — erforderlich vor dem Hinzufügen zum Warenkorb",
"reference-required-title": "Kundenreferenz erforderlich",
"reference-required-description": "Bitte geben Sie eine Referenznummer ein, um diesen Artikel in Ihren Warenkorb zu legen.",
"add-to-cart": "In den Warenkorb",
"cancel": "Abbrechen"
```

**French (`fr/account.json`):**
```json
"reference-step-description": "Entrez votre numéro de référence de commande ou de projet. Vous pouvez également l'ajouter plus tard lors de l'ajout au panier.",
"reference-placeholder": "ex. PO-2024-0847",
"reference-optional-hint": "Facultatif à cette étape — requis avant l'ajout au panier",
"reference-required-title": "Référence client requise",
"reference-required-description": "Veuillez entrer un numéro de référence pour ajouter cet article à votre panier.",
"add-to-cart": "Ajouter au panier",
"cancel": "Annuler"
```

**Lithuanian (`lt/account.json`):**
```json
"reference-step-description": "Įveskite savo užsakymo arba projekto nuorodos numerį. Tai galite pridėti ir vėliau, kai dėsite į krepšelį.",
"reference-placeholder": "pvz. PO-2024-0847",
"reference-optional-hint": "Neprivaloma šiame žingsnyje — reikalinga prieš įdedant į krepšelį",
"reference-required-title": "Reikalinga kliento nuoroda",
"reference-required-description": "Prašome įvesti nuorodos numerį, kad pridėtumėte šią prekę į savo krepšelį.",
"add-to-cart": "Į krepšelį",
"cancel": "Atšaukti"
```

- [ ] **Step 2: Verify no JSON syntax errors**

```bash
for f in src/lib/i18n/locales/*/account.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f OK"; done
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/locales/ && git commit -m "feat: add customer reference translation keys for all locales"
```

---

### Task 12: Manual Verification

- [ ] **Step 1: Start backend and B2B portal**

```bash
cd furnisystems-backend && pnpm dev &
cd vilmers-b2b-portal && pnpm dev
```

- [ ] **Step 2: Test configurator reference step**

Open a product configurator. Verify:
- Reference step appears as the last step in the stepper
- Can enter a reference in the text input
- Can proceed without entering a reference (step is optional)

- [ ] **Step 3: Test mandatory modal**

Leave reference blank and click "Add to Cart". Verify:
- Modal appears with reference input
- "Add to Cart" button is disabled until reference is entered
- Cancel returns to configurator
- Entering reference and confirming adds item to cart

- [ ] **Step 4: Test reference in cart display**

Go to cart page. Verify:
- Added item shows customer reference in the row
- Reference appears with pencil edit icon

- [ ] **Step 5: Test inline edit**

Click on the reference text or pencil icon. Verify:
- Switches to edit mode with input + save/cancel buttons
- Enter saves, Escape cancels
- Cannot save empty value
- Saved value persists after page refresh

- [ ] **Step 6: Test with reference entered in stepper**

Open configurator, enter reference in the stepper step, click "Add to Cart". Verify:
- Item is added directly without modal appearing
- Reference appears correctly in cart
