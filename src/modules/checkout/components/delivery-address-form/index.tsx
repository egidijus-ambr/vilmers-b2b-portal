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
