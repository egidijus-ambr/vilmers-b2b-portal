"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import AddressSelect, { Address } from "@modules/checkout/components/address-select"
import SearchInput from "@modules/common/components/search-input"
import CountrySelect from "@modules/common/components/country-select"
import Button from "@modules/common/components/button"
import { useTranslations } from "@lib/i18n"

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
  /** True once the user has tried to place the order. */
  showErrors?: boolean
  /** Incremented on every blocked place-order attempt; triggers validation of all fields. */
  submitAttempt?: number
}

export default function DeliveryAddressForm({
  addresses,
  onAddressReady,
  showErrors = false,
  submitAttempt = 0,
}: DeliveryAddressFormProps) {
  const { language } = useTranslations("account")
  const { t: tc } = useTranslations("common")
  const [mode, setMode] = useState<"select" | "new">("select")
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

  const {
    register,
    setValue,
    watch,
    trigger,
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

  // Register validation rules (without spreading onto inputs — SearchInput uses controlled props)
  useEffect(() => {
    register("address_name", { required: true })
    register("address_1", { required: true })
    register("address_2")
    register("city", { required: true })
    register("postal_code", { required: true })
    register("country", { required: true })
    register("state_region")
  }, [register])

  // Use a ref to call onAddressReady without causing infinite loops
  const onAddressReadyRef = useRef(onAddressReady)
  onAddressReadyRef.current = onAddressReady

  useEffect(() => {
    const subscription = watch((formValues) => {
      onAddressReadyRef.current(
        formValues as AddressFormData,
        mode === "select" ? selectedAddressId !== null : isValid
      )
    })
    return () => subscription.unsubscribe()
  }, [watch, mode, selectedAddressId, isValid])

  // Also notify on mode/selection changes
  useEffect(() => {
    const currentValues = watch() as unknown as AddressFormData
    onAddressReadyRef.current(
      currentValues,
      mode === "select" ? selectedAddressId !== null : isValid
    )
  }, [mode, selectedAddressId, isValid])

  // On a blocked place-order attempt, validate every field so each missing one shows its own error
  useEffect(() => {
    if (submitAttempt > 0 && mode === "new") {
      trigger()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitAttempt])

  const fieldLabels: Record<string, string> = {
    address_name: tc("checkout-field-address-name"),
    address_1: tc("checkout-field-address-1"),
    city: tc("checkout-field-city"),
    postal_code: tc("checkout-field-postal-code"),
    country: tc("checkout-field-country"),
  }
  const values = watch()
  const missingFields =
    mode === "new"
      ? Object.keys(fieldLabels)
          .filter((k) => !values[k as keyof AddressFormData])
          .map((k) => fieldLabels[k])
      : []
  const fieldError = (name: keyof typeof fieldLabels) => (
    <p className="text-sm text-red-500 mt-1">
      {tc("checkout-field-required", { field: fieldLabels[name] })}
    </p>
  )

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
      <h3 className="font-medium text-gray-900">
        Delivery Address
      </h3>

      {mode === "select" && (
        <>
          <AddressSelect
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelect={handleSelectAddress}
            label="Delivery address"
          />
          <Button
            variant="outline"
            onClick={handleSwitchToNew}
            className="self-start"
          >
            + Add new address
          </Button>
        </>
      )}

      {mode === "new" && (
        <>
          <Button
            variant="outline"
            onClick={handleCancelNew}
            className="self-start"
          >
            ← Back to address selection
          </Button>
          <div>
            <SearchInput
              label={fieldLabels.address_name}
              error={!!errors.address_name}
              value={watch("address_name")}
              onChange={(val) => setValue("address_name", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder={fieldLabels.address_name}
              autoFocus
            />
            {errors.address_name && fieldError("address_name")}
          </div>
        </>
      )}

      {/* Show form fields when an address is selected OR in new address mode */}
      {(selectedAddressId !== null || mode === "new") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <SearchInput
              label={fieldLabels.address_1}
              error={!!errors.address_1}
              value={watch("address_1")}
              onChange={(val) => setValue("address_1", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder={fieldLabels.address_1}
            />
            {errors.address_1 && fieldError("address_1")}
          </div>
          <div>
            <SearchInput
              label={tc("checkout-field-address-2")}
              value={watch("address_2")}
              onChange={(val) => setValue("address_2", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder={tc("checkout-field-address-2")}
            />
          </div>
          <div>
            <SearchInput
              label={fieldLabels.city}
              error={!!errors.city}
              value={watch("city")}
              onChange={(val) => setValue("city", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder={fieldLabels.city}
            />
            {errors.city && fieldError("city")}
          </div>
          <div>
            <SearchInput
              label={fieldLabels.postal_code}
              error={!!errors.postal_code}
              value={watch("postal_code")}
              onChange={(val) => setValue("postal_code", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder={fieldLabels.postal_code}
            />
            {errors.postal_code && fieldError("postal_code")}
          </div>
          <div>
            <CountrySelect
              label={fieldLabels.country}
              error={!!errors.country}
              placeholder={tc("country-placeholder")}
              value={watch("country")}
              onChange={(code) => setValue("country", code, { shouldValidate: true })}
              language={language}
            />
            {errors.country && fieldError("country")}
          </div>
          <div>
            <SearchInput
              label={`${tc("checkout-field-state-region")} ${tc("checkout-field-optional")}`}
              value={watch("state_region")}
              onChange={(val) => setValue("state_region", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder={tc("checkout-field-state-region")}
            />
          </div>
        </div>
      )}

      {showErrors &&
        (mode === "select" ? selectedAddressId === null : missingFields.length > 0) && (
          <p data-checkout-error className="text-sm text-red-500">
            {mode === "select"
              ? tc("checkout-field-select-address")
              : tc("checkout-field-fill-in", { fields: missingFields.join(", ") })}
          </p>
        )}
    </div>
  )
}
