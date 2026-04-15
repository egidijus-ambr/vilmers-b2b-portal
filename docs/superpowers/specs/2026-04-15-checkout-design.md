# B2B Portal Checkout — Design Spec

## Overview

Refactor the B2B portal checkout from multi-step Medusa SDK-based flow to a single-step GraphQL-backed checkout. The checkout connects to the furnisystems backend using the same GraphQL mutations/queries as the storefront.

## Approach

Refactor the existing `(checkout)` route group in-place. Keep the layout shell and 2-column structure, replace all Medusa internals with GraphQL operations.

## Page Structure

**Route**: `/[languageCode]/checkout`  
**Layout**: Existing `(checkout)/layout.tsx` (header with "Back to cart" link)

Two-column grid:
- **Left column**: Delivery address section + "Place Order" button
- **Right column**: Checkout summary (cart items + totals)

The page is a client component (needs GraphQL queries and form state).

## Address Selection

### Saved Addresses
- Dropdown populated from `GET_ADDITIONAL_ADDRESS` GraphQL query
- **No pre-selection** — starts empty with placeholder "Select an address"
- When user selects an address, form fields auto-fill with that address's data
- Each address in dropdown shows: address_1, city, postal_code, country

### Add New Address
- Link/button below the dropdown: "Add new address"
- When clicked:
  - Dropdown hides
  - Empty form fields appear inline
  - `address_name` field appears (to label the new address)
  - "Cancel" link returns to address selection mode

### Form Fields
| Field | Required | Maps to |
|-------|----------|---------|
| Address line 1 | Yes | `address_1` / `shipping_address_1` |
| Address line 2 | No | `address_2` / `shipping_address_2` |
| City | Yes | `city` / `shipping_city` |
| Postal code | Yes | `postal_code` / `shipping_postal_code` |
| Country | Yes | `country` / `shipping_country` |
| State/Region | No | `state_region` / `shipping_state_region` |
| Address name | Yes (new only) | `address_name` (stored in description) |

### Billing Address
Same as shipping address — no separate billing form. Can be extended later.

## GraphQL Operations

### GET_ADDITIONAL_ADDRESS Query
Fetches saved customer addresses. Same query as storefront:
```graphql
query GetAdditionalAddress($customerId: Int) {
  getAdditionalAddress(customerId: $customerId) {
    id
    customer_accounts { id, name, email }
    addresses {
      id, address_1, address_2, city, postal_code,
      country, state_region, roles, description
    }
  }
}
```

### CREATE_ORDER Mutation
Places the order. Same mutation as storefront with these fields populated:
- **Address fields**: shipping_address_1, shipping_address_2, shipping_city, shipping_postal_code, shipping_country, shipping_state_region (billing = shipping)
- **Cart items**: `order_items` array mapped from cart
- **Customer info**: name, surname, email, company_name, company_code, vat_code, customer_accountId
- **Pricing**: sub_total_price, total_price, total_price_without_VAT, total_shipping_price, discount_applied
- **Context**: order_locale (from language), hostname, order_type ("b2b"), price_multiplier
- **Optional**: coupon_code, preferred_delivery_date, metadata, b2b_customer_discount

## Place Order Flow

1. User selects address from dropdown (or fills new address form)
2. "Place Order" button becomes enabled
3. On click → call `CREATE_ORDER` mutation
4. **On success** → redirect to `/order/[id]/confirmed`
5. **On error** → show error message above the button

## Order Confirmation

Existing `/order/[id]/confirmed` page — update to fetch order from GraphQL backend instead of Medusa SDK.

## What Gets Deleted

### Remove (Medusa checkout components)
- `src/modules/checkout/components/addresses/`
- `src/modules/checkout/components/shipping-address/`
- `src/modules/checkout/components/billing_address/`
- `src/modules/checkout/components/address-select/`
- `src/modules/checkout/components/shipping/`
- `src/modules/checkout/components/payment/`
- `src/modules/checkout/components/review/`
- `src/modules/checkout/templates/checkout-form/`
- Medusa SDK cart operations in `src/lib/data/cart.ts` (setAddresses, setShippingMethod, initiatePaymentSession, placeOrder)

### Keep & Refactor
- `(checkout)/layout.tsx` — layout shell (remove Medusa imports)
- `src/modules/checkout/templates/checkout-summary/` — refactor to use GraphQL cart data
- All shared UI components (Button, Input, NativeSelect, etc.)

## Tech Stack
- **Apollo Client** — already configured in the project (used for configurator)
- **react-hook-form** — for address form state management
- **Existing UI components** — Button, Input, NativeSelect from `src/modules/common/components/`
