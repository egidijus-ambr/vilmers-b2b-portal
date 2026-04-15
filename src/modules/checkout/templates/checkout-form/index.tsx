"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { fetchCustomerAddresses, placeOrder } from "@lib/data/checkout"
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
  const { items } = useCart()
  const { customer } = useCustomer()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressData, setAddressData] = useState<AddressFormData | null>(null)
  const [isAddressValid, setIsAddressValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer?.id) return
    fetchCustomerAddresses(Number(customer.id)).then(setAddresses)
  }, [customer?.id])

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
      product_container_id: item.productContainerId,
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
      name: getItemName(item, languageCode),
      sku: item.fabric_code || "",
      metadata: null,
    }))

    try {
      const result = await placeOrder({
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
        name: customer?.name || "",
        surname: customer?.surname || "",
        order_items: orderItems,
        company_name: customer?.b2b_company_name || "",
        buying_as_company: true,
        order_locale: languageCode.toUpperCase(),
        hostname: window.location.hostname,
        price_multiplier: 1,
        order_type: "b2b",
        customer_accountId: customer?.id ? String(customer.id) : undefined,
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
