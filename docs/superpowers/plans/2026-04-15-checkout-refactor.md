# Checkout Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-step Medusa SDK checkout with a single-step GraphQL-backed checkout using the furnisystems backend.

**Architecture:** Refactor the existing `(checkout)` route group in-place. Delete all Medusa checkout components. Build a new single-step checkout with address selection from saved customer addresses (via `GET_ADDITIONAL_ADDRESS` query) and order placement (via `CREATE_ORDER` mutation). The FurnisystemsSDK already wraps Apollo Client — use its `query()` and `mutate()` methods.

**Tech Stack:** Next.js App Router, FurnisystemsSDK (Apollo Client wrapper), react-hook-form, existing shared UI components (Button, Input, NativeSelect)

---

### Task 1: Add checkout GraphQL operations

**Files:**
- Create: `src/modules/checkout/queries/checkout-queries.ts`

- [ ] **Step 1: Create the checkout queries file**

Create a new file with the `GET_ADDITIONAL_ADDRESS` query and `CREATE_ORDER` mutation, matching the storefront's GraphQL operations:

```typescript
import { gql } from "@apollo/client"

export const GET_ADDITIONAL_ADDRESS = gql`
  query GetAdditionalAddress($customerId: Int) {
    getAddresses(customerId: $customerId) {
      id
      customer_accounts {
        id
        name
        email
      }
      addresses {
        id
        address_1
        address_2
        city
        postal_code
        country
        state_region
        roles
        description
      }
    }
  }
`

export const CREATE_ORDER = gql`
  mutation CreateOrder(
    $paymentMethodID: Int
    $phoneNumber: String!
    $shipping_country: String!
    $billing_country: String!
    $shipping_address_1: String!
    $billing_address_1: String!
    $shipping_address_2: String!
    $billing_address_2: String!
    $shipping_city: String!
    $billing_city: String!
    $shipping_postal_code: String!
    $billing_postal_code: String!
    $shipping_state_region: String!
    $discount_applied: Float!
    $sub_total_price: Float!
    $total_shipping_price: Float!
    $total_price_without_VAT: Float!
    $total_price: Float!
    $email: String
    $account_code: String
    $name: String
    $surname: String
    $order_items: [OrderItemCustomInput!]!
    $company_name: String
    $company_code: String
    $vat_code: String
    $buying_as_company: Boolean
    $zero_vat: Boolean
    $coupon_code: String
    $order_locale: Language!
    $shopId: Int
    $hostname: String!
    $price_multiplier: Int!
    $b2b_customer_discount: Int
    $metadata: Json
    $cookie: String
    $createdBy: String
    $order_type: String
    $preferred_delivery_date: DateTime
    $customer_accountId: String
  ) {
    createNewOrder(
      paymentMethodID: $paymentMethodID
      phoneNumber: $phoneNumber
      shipping_country: $shipping_country
      billing_country: $billing_country
      shipping_address_1: $shipping_address_1
      billing_address_1: $billing_address_1
      shipping_address_2: $shipping_address_2
      billing_address_2: $billing_address_2
      shipping_city: $shipping_city
      billing_city: $billing_city
      shipping_postal_code: $shipping_postal_code
      billing_postal_code: $billing_postal_code
      shipping_state_region: $shipping_state_region
      discount_applied: $discount_applied
      sub_total_price: $sub_total_price
      total_shipping_price: $total_shipping_price
      total_price_without_VAT: $total_price_without_VAT
      total_price: $total_price
      email: $email
      account_code: $account_code
      name: $name
      surname: $surname
      order_items: $order_items
      company_name: $company_name
      company_code: $company_code
      vat_code: $vat_code
      buying_as_company: $buying_as_company
      zero_vat: $zero_vat
      coupon_code: $coupon_code
      order_locale: $order_locale
      shopId: $shopId
      hostname: $hostname
      price_multiplier: $price_multiplier
      b2b_customer_discount: $b2b_customer_discount
      metadata: $metadata
      cookie: $cookie
      createdBy: $createdBy
      order_type: $order_type
      preferred_delivery_date: $preferred_delivery_date
      customer_accountId: $customer_accountId
    ) {
      id
      project_id
    }
  }
`
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/checkout/queries/checkout-queries.ts
git commit -m "feat(checkout): add GraphQL operations for checkout"
```

---

### Task 2: Delete old Medusa checkout components

**Files:**
- Delete: `src/modules/checkout/components/addresses/`
- Delete: `src/modules/checkout/components/shipping-address/`
- Delete: `src/modules/checkout/components/billing_address/`
- Delete: `src/modules/checkout/components/address-select/`
- Delete: `src/modules/checkout/components/shipping/`
- Delete: `src/modules/checkout/components/payment/`
- Delete: `src/modules/checkout/components/payment-button/`
- Delete: `src/modules/checkout/components/payment-container/`
- Delete: `src/modules/checkout/components/payment-test/`
- Delete: `src/modules/checkout/components/payment-wrapper/`
- Delete: `src/modules/checkout/components/review/`
- Delete: `src/modules/checkout/components/submit-button/`
- Delete: `src/modules/checkout/components/country-select/`
- Delete: `src/modules/checkout/templates/checkout-form/`
- Keep: `src/modules/checkout/components/discount-code/` (may reuse later)
- Keep: `src/modules/checkout/components/error-message/` (reuse for errors)
- Keep: `src/modules/checkout/templates/checkout-summary/` (refactor in Task 5)

- [ ] **Step 1: Delete all Medusa checkout components**

```bash
rm -rf src/modules/checkout/components/addresses
rm -rf src/modules/checkout/components/shipping-address
rm -rf src/modules/checkout/components/billing_address
rm -rf src/modules/checkout/components/address-select
rm -rf src/modules/checkout/components/shipping
rm -rf src/modules/checkout/components/payment
rm -rf src/modules/checkout/components/payment-button
rm -rf src/modules/checkout/components/payment-container
rm -rf src/modules/checkout/components/payment-test
rm -rf src/modules/checkout/components/payment-wrapper
rm -rf src/modules/checkout/components/review
rm -rf src/modules/checkout/components/submit-button
rm -rf src/modules/checkout/components/country-select
rm -rf src/modules/checkout/templates/checkout-form
```

- [ ] **Step 2: Commit**

```bash
git add -A src/modules/checkout/components src/modules/checkout/templates/checkout-form
git commit -m "refactor(checkout): delete Medusa checkout components"
```

---

### Task 3: Create AddressSelect component

**Files:**
- Create: `src/modules/checkout/components/address-select/index.tsx`

- [ ] **Step 1: Create the address select dropdown**

This component shows a dropdown of saved customer addresses. When the user picks one, it calls `onSelect` with the address data.

```tsx
"use client"

import { useState, useRef, useEffect } from "react"

export interface Address {
  id: number
  address_1: string
  address_2: string | null
  city: string
  postal_code: string
  country: string
  state_region: string | null
  roles: string | null
  description: string | null
}

interface AddressSelectProps {
  addresses: Address[]
  selectedAddressId: number | null
  onSelect: (address: Address) => void
  placeholder?: string
}

function formatAddress(addr: Address): string {
  const parts = [addr.address_1, addr.address_2, addr.city, addr.postal_code, addr.country].filter(Boolean)
  return parts.join(", ")
}

export default function AddressSelect({
  addresses,
  selectedAddressId,
  onSelect,
  placeholder = "Select an address",
}: AddressSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = addresses.find((a) => a.id === selectedAddressId)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 border border-ui-border-base rounded-md bg-ui-bg-field text-left text-base-regular hover:bg-ui-bg-field-hover"
      >
        <span className={selected ? "text-ui-fg-base" : "text-ui-fg-muted"}>
          {selected ? formatAddress(selected) : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && addresses.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-ui-border-base rounded-md shadow-lg max-h-60 overflow-auto">
          {addresses.map((addr) => (
            <li key={addr.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(addr)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 hover:bg-ui-bg-field-hover ${
                  addr.id === selectedAddressId ? "bg-ui-bg-field" : ""
                }`}
              >
                <div className="text-sm font-medium text-ui-fg-base">
                  {addr.description || addr.address_1}
                </div>
                <div className="text-sm text-ui-fg-subtle">
                  {formatAddress(addr)}
                </div>
                {addr.roles && (
                  <div className="flex gap-1 mt-1">
                    {addr.roles.split(";").map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-gray-100 px-2 py-0.5 rounded text-ui-fg-subtle"
                      >
                        {role.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/checkout/components/address-select/index.tsx
git commit -m "feat(checkout): add AddressSelect dropdown component"
```

---

### Task 4: Create DeliveryAddressForm component

**Files:**
- Create: `src/modules/checkout/components/delivery-address-form/index.tsx`

- [ ] **Step 1: Create the delivery address form**

This component combines address selection from saved addresses with an inline "add new address" form. It uses `react-hook-form` for form state.

```tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import AddressSelect, { Address } from "@modules/checkout/components/address-select"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"

export interface AddressFormData {
  address_name: string
  address_1: string
  address_2: string
  city: string
  postal_code: string
  country: string
  state_region: string
}

interface DeliveryAddressFormProps {
  addresses: Address[]
  onAddressReady: (data: AddressFormData, isValid: boolean) => void
}

export default function DeliveryAddressForm({
  addresses,
  onAddressReady,
}: DeliveryAddressFormProps) {
  const [mode, setMode] = useState<"select" | "new">("select")
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  const {
    register,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<AddressFormData>({
    mode: "onChange",
    defaultValues: {
      address_name: "",
      address_1: "",
      address_2: "",
      city: "",
      postal_code: "",
      country: "",
      state_region: "",
    },
  })

  const formValues = watch()

  useEffect(() => {
    onAddressReady(formValues, mode === "select" ? selectedAddressId !== null : isValid)
  }, [formValues, isValid, selectedAddressId, mode])

  function handleSelectAddress(addr: Address) {
    setSelectedAddressId(addr.id)
    setValue("address_1", addr.address_1 || "", { shouldValidate: true })
    setValue("address_2", addr.address_2 || "", { shouldValidate: true })
    setValue("city", addr.city || "", { shouldValidate: true })
    setValue("postal_code", addr.postal_code || "", { shouldValidate: true })
    setValue("country", addr.country || "", { shouldValidate: true })
    setValue("state_region", addr.state_region || "", { shouldValidate: true })
    setValue("address_name", addr.description || "", { shouldValidate: true })
  }

  function handleSwitchToNew() {
    setMode("new")
    setSelectedAddressId(null)
    setValue("address_1", "")
    setValue("address_2", "")
    setValue("city", "")
    setValue("postal_code", "")
    setValue("country", "")
    setValue("state_region", "")
    setValue("address_name", "")
  }

  function handleCancelNew() {
    setMode("select")
    setSelectedAddressId(null)
    setValue("address_1", "")
    setValue("address_2", "")
    setValue("city", "")
    setValue("postal_code", "")
    setValue("country", "")
    setValue("state_region", "")
    setValue("address_name", "")
  }

  return (
    <div className="flex flex-col gap-y-6">
      <h2 className="text-[1.75rem] font-light text-dark-blue">
        Delivery Address
      </h2>

      {mode === "select" && (
        <>
          <AddressSelect
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelect={handleSelectAddress}
          />
          <button
            type="button"
            onClick={handleSwitchToNew}
            className="text-sm text-dark-blue underline self-start"
          >
            + Add new address
          </button>
        </>
      )}

      {mode === "new" && (
        <>
          <button
            type="button"
            onClick={handleCancelNew}
            className="text-sm text-ui-fg-subtle underline self-start"
          >
            ← Back to address selection
          </button>
          <Input
            label="Address name"
            {...register("address_name", { required: "Address name is required" })}
            errors={errors}
            autoFocus
          />
        </>
      )}

      {/* Show form fields when an address is selected OR in new address mode */}
      {(selectedAddressId !== null || mode === "new") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Address line 1"
            {...register("address_1", { required: "Address is required" })}
            errors={errors}
          />
          <Input
            label="Address line 2"
            {...register("address_2")}
            errors={errors}
          />
          <Input
            label="City"
            {...register("city", { required: "City is required" })}
            errors={errors}
          />
          <Input
            label="Postal code"
            {...register("postal_code", { required: "Postal code is required" })}
            errors={errors}
          />
          <Input
            label="Country"
            {...register("country", { required: "Country is required" })}
            errors={errors}
          />
          <Input
            label="State / Region"
            {...register("state_region")}
            errors={errors}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/checkout/components/delivery-address-form/index.tsx
git commit -m "feat(checkout): add DeliveryAddressForm with address select and inline new form"
```

---

### Task 5: Refactor CheckoutSummary to use cart context

**Files:**
- Modify: `src/modules/checkout/templates/checkout-summary/index.tsx`

- [ ] **Step 1: Replace Medusa-based summary with cart-context-based summary**

Rewrite to use the same cart context and styling as `CartSummary`:

```tsx
"use client"

import { useCart } from "@lib/context/cart-context"
import { useTranslations } from "@lib/i18n"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"

const localeMap: Record<string, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  lt: "lt-LT",
  da: "da-DK",
}

function getItemName(item: FurnisystemsCartItem, language: string): string {
  const container = item.product_container
  const singleProduct = container?.single_product
  const advancedProduct = container?.advanced_product
  const profiles =
    singleProduct?.product_profiles ||
    advancedProduct?.advanced_product_profiles ||
    []
  const localProfile =
    profiles.find((p) => p.language.toLowerCase() === language) || profiles[0]
  return localProfile?.name || "-"
}

function getItemImage(item: FurnisystemsCartItem): string | undefined {
  const container = item.product_container
  const images =
    container?.single_product?.images || container?.advanced_product?.images
  return (
    images?.[0]?.src_thumbnail ||
    images?.[0]?.src_xs ||
    images?.[0]?.src ||
    undefined
  )
}

export default function CheckoutSummary() {
  const { t, language } = useTranslations("account")
  const { items } = useCart()

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  )

  return (
    <div className="sticky top-[120px]">
      <div className="bg-white p-6">
        <h2 className="text-[1.75rem] font-light text-dark-blue mb-6">
          {t("order-summary")}
        </h2>

        <div className="flex flex-col gap-y-4 mb-6">
          {items.map((item) => {
            const name = getItemName(item, language)
            const image = getItemImage(item)
            const quantity = item.quantity ?? 1
            const price = (item.price ?? 0) * quantity

            return (
              <div key={item.id} className="flex gap-x-4">
                <div className="w-[80px] h-[80px] flex-shrink-0 bg-gold-10 rounded">
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      className="w-[80px] h-[80px] object-contain mix-blend-multiply"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      {t("no-image")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-start min-w-0">
                  <span className="text-sm font-normal text-dark-blue">{name}</span>
                  <span className="text-xs font-light text-gray-500 mt-1">
                    Qty: {quantity}
                  </span>
                  <span className="text-sm font-medium text-dark-blue mt-2">
                    {formatPrice(price)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-[18px] font-semibold text-dark-blue">TOTAL</span>
            <span className="text-[18px] font-semibold text-dark-blue">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/checkout/templates/checkout-summary/index.tsx
git commit -m "refactor(checkout): replace Medusa summary with cart-context summary"
```

---

### Task 6: Create new CheckoutForm component

**Files:**
- Create: `src/modules/checkout/templates/checkout-form/index.tsx`

- [ ] **Step 1: Create the single-step checkout form**

This component fetches addresses, renders the delivery address form, and handles order placement via `CREATE_ORDER` mutation.

```tsx
"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useFurnisystemsSDK } from "@lib/context/furnisystems-sdk-context"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { GET_ADDITIONAL_ADDRESS, CREATE_ORDER } from "@modules/checkout/queries/checkout-queries"
import DeliveryAddressForm, { AddressFormData } from "@modules/checkout/components/delivery-address-form"
import { Address } from "@modules/checkout/components/address-select"
import Button from "@modules/common/components/button"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"

function getItemName(item: FurnisystemsCartItem, language: string): string {
  const container = item.product_container
  const singleProduct = container?.single_product
  const advancedProduct = container?.advanced_product
  const profiles =
    singleProduct?.product_profiles ||
    advancedProduct?.advanced_product_profiles ||
    []
  const localProfile =
    profiles.find((p) => p.language.toLowerCase() === language) || profiles[0]
  return localProfile?.name || "-"
}

export default function CheckoutForm() {
  const router = useRouter()
  const params = useParams()
  const languageCode = params.languageCode as string
  const sdk = useFurnisystemsSDK()
  const { items } = useCart()
  const { customer } = useCustomer()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressData, setAddressData] = useState<AddressFormData | null>(null)
  const [isAddressValid, setIsAddressValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer?.id) return
    sdk.getApolloClient()
      .query({
        query: GET_ADDITIONAL_ADDRESS,
        variables: { customerId: Number(customer.id) },
        fetchPolicy: "network-only",
      })
      .then((result: any) => {
        const data = result.data?.getAddresses
        if (data?.addresses) {
          setAddresses(data.addresses)
        }
      })
      .catch((err: any) => {
        console.error("Failed to fetch addresses:", err)
      })
  }, [customer?.id, sdk])

  const handleAddressReady = useCallback(
    (data: AddressFormData, isValid: boolean) => {
      setAddressData(data)
      setIsAddressValid(isValid)
    },
    []
  )

  async function handlePlaceOrder() {
    if (!addressData || !isAddressValid) return

    setIsSubmitting(true)
    setError(null)

    const totalPrice = items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    )

    const orderItems = items.map((item) => ({
      product_container_id: item.product_container?.id,
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
      name: getItemName(item, languageCode),
      sku: item.sku || "",
      metadata: item.metadata || null,
    }))

    try {
      const result = await sdk.getApolloClient().mutate({
        mutation: CREATE_ORDER,
        variables: {
          phoneNumber: customer?.phone || "",
          shipping_country: addressData.country,
          billing_country: addressData.country,
          shipping_address_1: addressData.address_1,
          billing_address_1: addressData.address_1,
          shipping_address_2: addressData.address_2 || "",
          billing_address_2: addressData.address_2 || "",
          shipping_city: addressData.city,
          billing_city: addressData.city,
          shipping_postal_code: addressData.postal_code,
          billing_postal_code: addressData.postal_code,
          shipping_state_region: addressData.state_region || "",
          discount_applied: 0,
          sub_total_price: totalPrice,
          total_shipping_price: 0,
          total_price_without_VAT: totalPrice,
          total_price: totalPrice,
          email: customer?.email || "",
          name: customer?.first_name || "",
          surname: customer?.last_name || "",
          order_items: orderItems,
          company_name: customer?.company_name || "",
          buying_as_company: true,
          order_locale: languageCode.toUpperCase(),
          hostname: window.location.hostname,
          price_multiplier: 1,
          order_type: "b2b",
          customer_accountId: customer?.id ? String(customer.id) : undefined,
        },
      })

      const orderId = result.data?.createNewOrder?.id
      if (orderId) {
        router.push(`/${languageCode}/order/${orderId}/confirmed`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-8">
      <DeliveryAddressForm
        addresses={addresses}
        onAddressReady={handleAddressReady}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handlePlaceOrder}
        disabled={!isAddressValid || isSubmitting}
      >
        {isSubmitting ? "Placing order..." : "Place Order"}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/checkout/templates/checkout-form/index.tsx
git commit -m "feat(checkout): add single-step CheckoutForm with address selection and order placement"
```

---

### Task 7: Refactor checkout page and layout

**Files:**
- Modify: `src/app/[languageCode]/(checkout)/checkout/page.tsx`
- Modify: `src/app/[languageCode]/(checkout)/layout.tsx`

- [ ] **Step 1: Rewrite the checkout page as a client component**

Replace the Medusa server-component page with a client component that uses the cart context:

```tsx
"use client"

import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { useParams, redirect } from "next/navigation"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"

export default function Checkout() {
  const { items, isLoading } = useCart()
  const { customer } = useCustomer()
  const params = useParams()
  const languageCode = params.languageCode as string

  if (!isLoading && items.length === 0) {
    redirect(`/${languageCode}/store`)
  }

  if (!customer) {
    redirect(`/${languageCode}/account`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-ui-fg-subtle">Loading...</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <CheckoutForm />
      <CheckoutSummary />
    </div>
  )
}
```

- [ ] **Step 2: Clean up the checkout layout**

Remove Medusa references from the layout. Replace "Medusa Store" with the actual store name and remove the MedusaCTA footer:

```tsx
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"

interface CheckoutLayoutProps {
  children: React.ReactNode
  params: Promise<{ languageCode: string }>
}

export default async function CheckoutLayout({
  children,
  params,
}: CheckoutLayoutProps) {
  return (
    <div className="w-full bg-white relative small:min-h-screen">
      <div className="h-16 bg-white border-b">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
              Back to shopping cart
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
              Back
            </span>
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[languageCode]/(checkout)/checkout/page.tsx src/app/[languageCode]/(checkout)/layout.tsx
git commit -m "refactor(checkout): replace Medusa checkout page with single-step GraphQL checkout"
```

---

### Task 8: Add "Proceed to checkout" button to cart page

**Files:**
- Modify: `src/modules/cart/components/cart-summary/index.tsx`

- [ ] **Step 1: Add checkout button to CartSummary**

Add a `LocalizedClientLink` button at the bottom of the cart summary that navigates to `/checkout`:

After the TOTAL section in the `CartSummary` component, add:

```tsx
// Add this import at the top
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Button from "@modules/common/components/button"

// Add this after the closing </div> of the totals section (after the TOTAL row), 
// before the final closing </div> of the bg-white container:
<div className="mt-6">
  <LocalizedClientLink href="/checkout" className="block">
    <Button className="w-full">
      Proceed to checkout
    </Button>
  </LocalizedClientLink>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/cart/components/cart-summary/index.tsx
git commit -m "feat(cart): add proceed to checkout button"
```

---

### Task 9: Update order confirmation page

**Files:**
- Modify: `src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx`

- [ ] **Step 1: Replace Medusa order fetch with a simple confirmation**

For now, replace the Medusa `retrieveOrder` call with a simple confirmation page. The full order details page can be enhanced later when order fetching is wired to the GraphQL backend:

```tsx
import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your order was placed successfully",
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] py-12">
      <div className="bg-white max-w-lg w-full p-10 text-center">
        <h1 className="text-[2rem] font-light text-dark-blue mb-4">
          Thank you!
        </h1>
        <p className="text-base text-ui-fg-subtle mb-2">
          Your order was placed successfully.
        </p>
        <p className="text-sm text-ui-fg-muted mb-8">
          Order ID: {id}
        </p>
        <LocalizedClientLink
          href="/store"
          className="text-sm text-dark-blue underline"
        >
          Continue shopping
        </LocalizedClientLink>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx
git commit -m "refactor(order): replace Medusa order confirmation with simple confirmation page"
```

---

### Task 10: Verify the full flow

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal && pnpm dev
```

- [ ] **Step 2: Test the flow in browser**

1. Navigate to the cart page with items
2. Verify "Proceed to checkout" button appears in cart summary
3. Click it — should navigate to `/checkout`
4. Verify address dropdown loads with customer addresses
5. Select an address — form fields should populate
6. Click "Add new address" — form should appear with empty fields
7. Click "Cancel" — should return to address selection
8. Select an address and click "Place Order"
9. Verify redirect to order confirmation page

- [ ] **Step 3: Fix any issues found during testing**

- [ ] **Step 4: Final commit if any fixes were needed**
