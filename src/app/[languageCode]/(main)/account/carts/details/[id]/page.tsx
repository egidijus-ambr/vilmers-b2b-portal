"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getCartDetail } from "@lib/data/carts"
import { FurnisystemsCart } from "@lib/furnisystems-sdk/modules/cart/types"
import { useCart } from "@lib/context/cart-context"
import CartTemplate from "@modules/cart/templates"
import PageContent from "@modules/common/components/page-content"
import PageHeader from "@modules/common/components/page-header"
import Button from "@modules/common/components/button"
import { useTranslations } from "@lib/i18n"

export default function CartDetailsPage() {
  const { customer } = useCustomer()
  const router = useRouter()
  const params = useParams()
  const { t } = useTranslations("account")
  const { cart: activeCart, switchActiveCart } = useCart()

  const [detailCart, setDetailCart] = useState<FurnisystemsCart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  const cartId = params?.id as string
  const languageCode = params?.languageCode as string

  useEffect(() => {
    if (!customer) {
      router.push(`/${languageCode}/account`)
      return
    }

    if (!cartId) {
      router.push(`/${languageCode}/account/carts`)
      return
    }

    const fetchCart = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getCartDetail(Number(cartId))
        if (!data) {
          setError(t("cart-not-found"))
          return
        }
        setDetailCart(data)
      } catch (err) {
        console.error("Error loading cart:", err)
        setError(t("cart-load-error"))
        setDetailCart(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, router, cartId, languageCode])

  const isActiveCart =
    !!detailCart &&
    (detailCart.isActive || detailCart.id === activeCart?.id)

  const handleUseCart = async () => {
    if (!detailCart) return
    if (isActiveCart) {
      router.push(`/${languageCode}/cart`)
      return
    }
    setSwitching(true)
    const res = await switchActiveCart(detailCart.id)
    setSwitching(false)
    if (res.ok) {
      router.push(`/${languageCode}/cart`)
    } else {
      setError(res.error ?? null)
    }
  }

  if (!customer) {
    return null
  }

  if (loading) {
    return (
      <PageContent className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dark-blue" />
      </PageContent>
    )
  }

  if (error || !detailCart) {
    return (
      <PageContent>
        <div
          data-testid="cart-details-error"
          className="mb-8 flex flex-col gap-y-4"
        >
          <h1 className="page-title">{t("cart-details")}</h1>
          <p className="text-sm text-red-600">{error || t("cart-not-found")}</p>
          <button
            onClick={() => router.push(`/${languageCode}/account/carts`)}
            className="w-fit px-4 py-2 bg-dark-blue text-white hover:opacity-90 transition-opacity"
          >
            {t("back-to-carts")}
          </button>
        </div>
      </PageContent>
    )
  }

  const title = detailCart.name || t("untitled-cart")

  const breadcrumbItems = [
    { label: t("breadcrumb-home"), href: "/" },
    { label: t("breadcrumb-my-profile"), href: "/account" },
    { label: t("breadcrumb-carts"), href: "/account/carts" },
    { label: title, href: null },
  ]

  return (
    <>
      <PageHeader title={title} breadcrumbItems={breadcrumbItems} />
      <PageContent>
        <CartTemplate items={detailCart.items} readOnly summaryTitle={t("cart-summary")}>
          <Button
            className="w-full"
            onClick={handleUseCart}
            disabled={switching}
            data-testid="cart-detail-use-button"
          >
            {t("use-this-cart")}
          </Button>
        </CartTemplate>
      </PageContent>
    </>
  )
}
