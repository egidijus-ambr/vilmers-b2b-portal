"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import AddressSelect, { Address } from "@modules/checkout/components/address-select"
import SearchInput from "@modules/common/components/search-input"
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

  // Register validation rules (without spreading onto inputs — SearchInput uses controlled props)
  useEffect(() => {
    register("address_name", { required: "Address name is required" })
    register("address_1", { required: "Address is required" })
    register("address_2")
    register("city", { required: "City is required" })
    register("postal_code", { required: "Postal code is required" })
    register("country", { required: "Country is required" })
    register("state_region")
  }, [register])

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
          <div>
            <SearchInput
              label="Address name"
              value={watch("address_name")}
              onChange={(val) => setValue("address_name", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="Address name"
              autoFocus
            />
            {errors.address_name && (
              <p className="text-sm text-red-500 mt-1">{errors.address_name.message}</p>
            )}
          </div>
        </>
      )}

      {/* Show form fields when an address is selected OR in new address mode */}
      {(selectedAddressId !== null || mode === "new") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <SearchInput
              label="Address line 1"
              value={watch("address_1")}
              onChange={(val) => setValue("address_1", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="Address line 1"
            />
            {errors.address_1 && (
              <p className="text-sm text-red-500 mt-1">{errors.address_1.message}</p>
            )}
          </div>
          <div>
            <SearchInput
              label="Address line 2"
              value={watch("address_2")}
              onChange={(val) => setValue("address_2", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="Address line 2"
            />
          </div>
          <div>
            <SearchInput
              label="City"
              value={watch("city")}
              onChange={(val) => setValue("city", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="City"
            />
            {errors.city && (
              <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
            )}
          </div>
          <div>
            <SearchInput
              label="Postal code"
              value={watch("postal_code")}
              onChange={(val) => setValue("postal_code", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="Postal code"
            />
            {errors.postal_code && (
              <p className="text-sm text-red-500 mt-1">{errors.postal_code.message}</p>
            )}
          </div>
          <div>
            <SearchInput
              label="Country"
              value={watch("country")}
              onChange={(val) => setValue("country", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="Country"
            />
            {errors.country && (
              <p className="text-sm text-red-500 mt-1">{errors.country.message}</p>
            )}
          </div>
          <div>
            <SearchInput
              label="State / Region"
              value={watch("state_region")}
              onChange={(val) => setValue("state_region", val, { shouldValidate: true })}
              showSearchIcon={false}
              placeholder="State / Region"
            />
          </div>
        </div>
      )}
    </div>
  )
}
