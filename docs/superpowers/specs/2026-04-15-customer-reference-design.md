# Customer Reference in B2B Portal — Design Spec

## Overview

Add customer reference support to the B2B portal configurator and cart. Users must provide a reference string for every cart item. They can enter it during configuration (optional stepper step) or at add-to-cart time (mandatory modal). The reference is editable inline in the cart.

## Context

- The storefront already has a customer reference flow (reactive variable + modal on add-to-cart)
- The backend `OrderItem` model has a `reference` field, but `CartItem` does not
- The B2B portal has partial plumbing: `ConfiguratorContext.referenceText` exists, cart table display code for `item.reference` exists, translation keys exist — but nothing is wired up

## Requirements

1. **Configurator stepper**: Add a "Reference" step as the last step. Text input for customer reference. Optional at this step.
2. **Mandatory modal**: If reference is blank when user clicks "Add to Cart", show a modal requiring reference entry. "Add to Cart" button disabled until non-empty. Cancel returns to configurator.
3. **Cart display**: Show customer reference in cart item rows (display code already exists, needs data wiring).
4. **Cart inline edit**: Click reference text or pencil icon to toggle edit mode. Input + checkmark (save) + X (cancel) buttons. Enter saves, Escape cancels. Cannot save empty value.
5. **Reference is mandatory**: Every cart item must have a non-empty reference.

## Architecture

### Backend Changes (furnisystems-backend)

1. **Prisma schema**: Add `reference String?` to `CartItem` model (nullable at DB level to support existing cart items without reference; the B2B portal UI enforces non-empty on creation and edit)
2. **Migration**: Run `prisma migrate dev` to add column
3. **addItemToCart mutation**: Add `customerReference: String` parameter, store in `CartItem.reference`
4. **New mutation**: `updateCartItemReference(cartItemId: Int!, reference: String!): CartItem!` — updates reference on existing cart item
5. **Cart-to-order flow**: When cart converts to order, copy `CartItem.reference` to `OrderItem.reference` (OrderItem.reference already exists)

### B2B Portal SDK Changes (src/lib/furnisystems-sdk/modules/cart/)

1. **CART_ITEM_FRAGMENT**: Add `reference` field to GraphQL fragment
2. **ADD_ITEM_TO_CART mutation**: Add `$customerReference: String` variable, pass to mutation
3. **CartModule.addItem()**: Add `customerReference?: string` to input type, pass to mutation variables
4. **New method**: `CartModule.updateCartItemReference(cartItemId: number, reference: string)` with corresponding GraphQL mutation
5. **Mapper**: `furnisystemsCartItemToProductItemRow()` — populate `reference: item.reference`

### B2B Portal UI Changes

#### 1. Reference Step Component

**File**: `src/modules/products/components/configurator/reference-step.tsx`

- Label: "Customer Reference"
- Description: "Enter your order or project reference number. You can also add this later when adding to cart."
- Text input with placeholder (e.g. "PO-2024-0847")
- Helper text: "Optional at this step — required before adding to cart"
- Reads/writes `ConfiguratorContext.referenceText` via existing `SET_REFERENCE_TEXT` action

**Integration**: Added as the last step in the stepper in `configurator-content.tsx`

#### 2. Missing Reference Modal

**File**: `src/modules/products/components/configurator/missing-reference-modal.tsx`

- Title: "Customer Reference Required"
- Description: "Please enter a reference number to add this item to your cart."
- Text input with placeholder
- Cancel button: closes modal, returns to configurator
- "Add to Cart" button: disabled until input is non-empty, on confirm sets referenceText and triggers addItem flow
- Triggered from `PriceFooter` component when user clicks "Add to Cart" with empty `referenceText`

#### 3. Cart Inline Reference Edit

**File**: `src/modules/common/components/product-items-table/inline-reference-edit.tsx`

- **Display mode**: Reference text with dashed underline + pencil icon
- **Edit mode** (toggled by clicking text or icon): Input field + ✓ button (save) + ✕ button (cancel)
- Save: click ✓ or press Enter — calls `CartModule.updateCartItemReference()`
- Cancel: click ✕ or press Escape — reverts to display mode
- Validation: cannot save empty value
- Used in `table-row.tsx` and `mobile-card.tsx`, replacing the current static `{item.reference}` display

### Data Flow

```
Configurator Reference Step (optional input)
  → ConfiguratorContext.referenceText

PriceFooter "Add to Cart" click
  → referenceText filled? → SDK addItem(customerReference: referenceText)
  → referenceText empty? → show MissingReferenceModal
    → user enters reference → SDK addItem(customerReference: reference)
    → user cancels → return to configurator

SDK addItem() → ADD_ITEM_TO_CART mutation (with customerReference) → Backend stores on CartItem

Cart page loads → CART_ITEM_FRAGMENT includes reference → mapper populates item.reference → table displays it

Cart inline edit → user modifies → SDK updateCartItemReference() → Backend updates CartItem.reference
```

## Translation Keys

Existing keys to reuse:
- `"customer-reference"` in account.json

New keys needed:
- Reference step description text
- Modal title and description
- Validation messages

## Files Modified

| File | Change |
|------|--------|
| `furnisystems-backend/prisma/schema.prisma` | Add `reference` to CartItem |
| `furnisystems-backend/src/types-modified/Cart.ts` | Add `customerReference` param to addItemToCart, add updateCartItemReference mutation |
| `src/lib/furnisystems-sdk/modules/cart/index.ts` | Add reference to fragment, mutations, methods |
| `src/lib/furnisystems-sdk/modules/cart/types.ts` | Add customerReference to AddCartItemInput |
| `src/modules/products/components/configurator/configurator-content.tsx` | Add Reference step, wire modal trigger |
| `src/modules/common/components/product-items-table/table-row.tsx` | Use InlineReferenceEdit component |
| `src/modules/common/components/product-items-table/mobile-card.tsx` | Use InlineReferenceEdit component |
| `src/lib/i18n/locales/*/account.json` | Add new translation keys |

## Files Created

| File | Purpose |
|------|---------|
| `src/modules/products/components/configurator/reference-step.tsx` | Stepper reference step |
| `src/modules/products/components/configurator/missing-reference-modal.tsx` | Mandatory reference modal |
| `src/modules/common/components/product-items-table/inline-reference-edit.tsx` | Cart inline edit component |
