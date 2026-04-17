"use client"

import { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { fetchCustomerAddresses, placeOrder, fetchDefaultPaymentMethod } from "@lib/data/checkout"
import DeliveryAddressForm, { AddressFormData } from "@modules/checkout/components/delivery-address-form"
import ShippingDetails from "@modules/checkout/components/shipping-details"
import { Address } from "@modules/checkout/components/address-select"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"

export interface CheckoutFormHandle {
  placeOrder: () => Promise<void>
}

export interface CheckoutFormState {
  isSubmitting: boolean
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

interface CheckoutFormProps {
  onStateChange?: (state: CheckoutFormState) => void
}

const CheckoutForm = forwardRef<CheckoutFormHandle, CheckoutFormProps>(function CheckoutForm({ onStateChange }, ref) {
  const router = useRouter()
  const params = useParams()
  const languageCode = params.languageCode as string
  const { items } = useCart()
  const { customer } = useCustomer()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressData, setAddressData] = useState<AddressFormData | null>(null)
  const [isAddressValid, setIsAddressValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderType, setOrderType] = useState("")
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null)

  useEffect(() => {
    onStateChange?.({ isSubmitting })
  }, [isSubmitting, onStateChange])

  useImperativeHandle(ref, () => ({
    placeOrder: handlePlaceOrder,
  }))

  useEffect(() => {
    if (!customer?.id) return
    fetchCustomerAddresses(Number(customer.id)).then(setAddresses)
  }, [customer?.id])

  useEffect(() => {
    fetchDefaultPaymentMethod().then(setPaymentMethodId)
  }, [])

  const handleAddressReady = useCallback(
    (data: AddressFormData, isValid: boolean) => {
      setAddressData(data)
      setIsAddressValid(isValid)
    },
    []
  )

  async function handlePlaceOrder() {
    if (!isAddressValid || !orderType) {
      setShowErrors(true)
      // Scroll to first error
      const firstError = document.querySelector("[data-checkout-error]")
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    if (!paymentMethodId) {
      setError("No payment method available. Please contact support.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const totalPrice = items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    )

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

    try {
      const result = await placeOrder({
        shipping_address: {
          phone_number: customer?.phone || "",
          country: addressData.country,
          city: addressData.city,
          postal_code: addressData.postal_code,
          state_region: addressData.state_region || "",
          address_1: addressData.address_1,
          address_2: addressData.address_2 || "",
        },
        billing_address: {
          phone_number: customer?.phone || "",
          country: addressData.country,
          city: addressData.city,
          postal_code: addressData.postal_code,
          state_region: addressData.state_region || "",
          address_1: addressData.address_1,
          address_2: addressData.address_2 || "",
        },
        payment_method: { id: paymentMethodId },
        purchased_by: {
          name: customer?.name || "",
          surname: customer?.surname || "",
          email: customer?.email || "",
          account_code: customer?.account_code || undefined,
          buying_as_company: true,
          customer_accountId: customer?.id ? String(customer.id) : undefined,
          default_phone_number: customer?.phone || "",
        },
        discount_applied: 0,
        sub_total_price: totalPrice,
        total_shipping_price: 0,
        total_price_without_VAT: totalPrice,
        total_price: totalPrice,
        order_items: orderItems,
        company_name: customer?.b2b_company_name || "",
        order_locale: languageCode.toLowerCase(),
        hostname: window.location.hostname,
        price_multiplier: 1,
        order_type: orderType,
        preferred_delivery_date: deliveryDate?.toISOString() || undefined,
        shopId: { id: 1 },
      })

      if (result.success && result.orderId) {
        router.push(`/${languageCode}/order/${result.orderId}/confirmed`)
      } else {
        setError(result.error || "Failed to place order. Please try again.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-6">
      {/* Customer information */}
      <div className="bg-white pb-6 p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-medium text-gray-900 mb-6">
          Customer information
        </h2>
        <div className="flex flex-col gap-y-3">
          <div className="flex">
            <span className="w-32 text-sm text-gray-500 flex-shrink-0">Name</span>
            <span className="text-sm text-dark-blue">{customer?.b2b_company_name || [customer?.name, customer?.surname].filter(Boolean).join(" ") || "—"}</span>
          </div>
          {customer?.phone && (
            <div className="flex">
              <span className="w-32 text-sm text-gray-500 flex-shrink-0">Phone</span>
              <span className="text-sm text-dark-blue">{customer.phone}</span>
            </div>
          )}
          {customer?.email && (
            <div className="flex">
              <span className="w-32 text-sm text-gray-500 flex-shrink-0">Email</span>
              <span className="text-sm text-dark-blue">{customer.email}</span>
            </div>
          )}
          {customer?.account_code && (
            <div className="flex">
              <span className="w-32 text-sm text-gray-500 flex-shrink-0">Customer code</span>
              <span className="text-sm text-dark-blue">{customer.account_code}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white pb-6 p-4 md:p-6">
        <DeliveryAddressForm
          addresses={addresses}
          onAddressReady={handleAddressReady}
        />
      </div>
      {showErrors && !isAddressValid && (
        <p data-checkout-error className="text-sm text-red-500 -mt-4">Please select or enter a delivery address</p>
      )}

      <div className="bg-white pb-6 p-4 md:p-6">
        <ShippingDetails
          onShippingChange={(type, date) => {
            setOrderType(type)
            setDeliveryDate(date)
          }}
          language={languageCode}
        />
      </div>
      {showErrors && !orderType && (
        <p data-checkout-error className="text-sm text-red-500 -mt-4">Please select an order type</p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
})

export default CheckoutForm
