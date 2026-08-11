"use client"

import { HttpTypes } from "@medusajs/types"
import { useTranslations } from "@lib/i18n"
import { getClaimsLink } from "@lib/data/customer"
import { useParams, useRouter } from "next/navigation"
import { useCustomer } from "@lib/context/customer-context"
import { isInternalDomain } from "@lib/utils/internal-domains"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"
import ActionCard from "../action-card"
import ManagerProfileCard from "../manager-profile-card"
import OrdersTable from "../orders-table"
import CustomerFilesCard from "../customer-files-card"
import {
  Order,
  CustomerManager,
} from "@lib/furnisystems-sdk/modules/customer/types"

type OverviewProps = {}

const Overview = (): JSX.Element => {
  const { customer } = useCustomer()
  const { t } = useTranslations("account")
  const params = useParams()
  const router = useRouter()
  const languageCode = params.languageCode as string

  const handleClaimsClick = async () => {
    try {
      // Call the server action to get the claims link with language parameter
      const claimsUrl = await getClaimsLink(languageCode || "en")
      window.location.href = claimsUrl
    } catch (error) {
      console.error("Error getting claims link:", error)
      // Could add user-friendly error handling here
    }
  }

  // Function to detect if running as PWA desktop app
  const isPWADesktop = () => {
    // Check if running in standalone mode (PWA desktop app)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches

    // Additional check for iOS PWA
    const isIOSStandalone = (window.navigator as any).standalone === true

    // Check if running in a WebView (another PWA indicator)
    const isInWebView = window.matchMedia("(display-mode: fullscreen)").matches

    return isStandalone || isIOSStandalone || isInWebView
  }

  // Function to detect operating system
  const isMac = () => {
    return (
      navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
      navigator.userAgent.toUpperCase().indexOf("MAC") >= 0
    )
  }

  const handleExpositionRulesClick = async () => {
    const runningAsPWA = isPWADesktop()
    const isMacOS = isMac()

    // Strategy: Try to open PDF directly first (works well on Mac PWA)
    // Only use download approach as fallback for specific cases
    try {
      // First attempt: Direct opening (works for both browser and Mac PWA)
      const opened = window.open("/Exposition rules.pdf", "_blank")

      // If direct opening failed or we're in a PWA that needs download behavior
      if (!opened && runningAsPWA && !isMacOS) {
        // Fallback: Download approach for non-Mac PWA environments
        const response = await fetch("/Exposition rules.pdf")

        if (!response.ok) {
          throw new Error("Failed to fetch PDF")
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        // Create a temporary download link
        const link = document.createElement("a")
        link.href = url
        link.download = "Exposition rules.pdf"
        link.style.display = "none"

        // Add to DOM, click, and remove
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the object URL
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error handling PDF:", error)

      // Final fallback: try direct opening again
      window.open("/Exposition rules.pdf", "_blank")
    }
  }

  const actionCards = [
    ...(customer?.is_configurator_enabled
      ? [
          {
            title: t("place-an-order.title"),
            description: t("place-an-order.description"),
            onClick: () => router.push(`/${languageCode}/store`),
          },
        ]
      : []),
    ...(customer?.is_claims_enabled
      ? [
          {
            title: t("claims.title"),
            description: t("claims.description"),
            onClick: handleClaimsClick,
          },
        ]
      : []),
    {
      title: t("product-photos.title"),
      description: t("product-photos.description"),
      onClick: () => router.push(`/${languageCode}/account/product-photos`),
    },

    {
      title: t("exposition-rules.title"),
      description: t("exposition-rules.description"),
      onClick: handleExpositionRulesClick,
    },
  ]

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <>
      <PageHeader
        title={customer?.full_name || customer?.name || "User"}
        level="h2"
      />
      <PageContent>
        <div
          data-testid="overview-page-wrapper"
          className="flex flex-col gap-10"
        >
        {/* Action Cards and Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Action Cards Grid - First on mobile, left side on large screens */}
          <div className="order-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {actionCards.map((card, index) => (
              <ActionCard
                key={index}
                title={card.title}
                description={card.description}
                onClick={card.onClick}
                buttonText={t("check")}
              />
            ))}
          </div>

          {/* Manager Profile Card - After action cards on mobile, right side on large screens */}
          <div className="order-2 lg:col-span-1 w-full h-fit">
            {customer?.managers && customer.managers.length > 0 ? (
              (() => {
                const managerData = customer.managers.find(
                  (m) => m.manager.role === "manager"
                )?.manager
                return managerData ? (
                  <ManagerProfileCard manager={managerData} />
                ) : (
                  <div className="h-[484px] bg-white rounded-lg p-6 flex items-center justify-center">
                    <p className="text-gray-500">{t("no-manager-assigned")}</p>
                  </div>
                )
              })()
            ) : (
              <div className="h-[484px] bg-white rounded-lg p-6 flex items-center justify-center">
                <p className="text-gray-500">{t("no-manager-assigned")}</p>
              </div>
            )}
          </div>
        </div>
        {/* Fabric Palettes Card */}
        <div className="space-y-4">
          <div className="bg-white">
            <ActionCard
              key="fabric_palettes_index"
              title={t("fabric-palettes.title")}
              description={t("fabric-palettes.description")}
              onClick={() => router.push(`/${languageCode}/account/fabric-palettes`)}
              buttonText={t("check")}
              height="auto"
            />
          </div>
        </div>

        {/* Customer Files Card — renders nothing when the company has no files */}
        <div className="space-y-4">
          <div className="bg-white">
            <CustomerFilesCard />
          </div>
        </div>

        {/* Orders Section */}
        <div className="space-y-10">
          <OrdersTable pageSize={10} />
        </div>
        </div>
      </PageContent>
    </>
  )
}

export default Overview
