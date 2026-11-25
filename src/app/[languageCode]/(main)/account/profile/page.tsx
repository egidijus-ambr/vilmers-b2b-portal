"use client"

import { useTranslations } from "@lib/i18n"
import { useCustomer } from "@lib/context/customer-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import ProfilePhone from "@modules/account/components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import { listRegions } from "@lib/data/regions"

export default function ProfilePage() {
  const { customer } = useCustomer()
  const { t } = useTranslations("account")
  const router = useRouter()
  const [regions, setRegions] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customer) {
      router.push("/account")
      return
    }

    const fetchRegions = async () => {
      try {
        setLoading(true)
        const regionData = await listRegions()
        setRegions(regionData || [])
      } catch (error) {
        console.error("Error loading regions:", error)
        setRegions([])
      } finally {
        setLoading(false)
      }
    }

    fetchRegions()
  }, [customer, router])

  if (!customer) {
    return null // Will redirect
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1>{t("profile")}</h1>
        <p className="text-base-regular">
          {t("profile-description")}
        </p>
      </div>
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        <ProfileBillingAddress customer={customer} regions={regions || []} />
      </div>
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
