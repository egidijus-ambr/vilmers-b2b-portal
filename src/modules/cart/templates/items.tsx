"use client"

import { useState } from "react"
import { useTranslations } from "@lib/i18n"
import { useCart } from "@lib/context/cart-context"
import { FurnisystemsCartItem } from "@lib/furnisystems-sdk/modules/cart/types"
import SofaConfigurationDetail from "@modules/common/components/sofa-configuration"
import { InlineReferenceEdit } from "@modules/common/components/product-items-table/inline-reference-edit"
import Spinner from "@modules/common/icons/spinner"
import { getItemName, localeMap } from "@lib/util/cart-item-display"
import { useCanSeePrices } from "@lib/context/customer-context"

// NOTE: this copy differs from the shared getItemName helper in
// `@lib/util/cart-item-display` — it prefers `src_xs` before `src_thumbnail`.
// Kept local (not consolidated) to preserve that existing behavior.
function getItemImage(item: FurnisystemsCartItem): string | undefined {
  const container = item.product_container
  const categoryPhoto =
    container?.single_product?.category_photo ||
    container?.advanced_product?.category_photo
  if (categoryPhoto) {
    return categoryPhoto.src_xs || categoryPhoto.src_thumbnail || categoryPhoto.src || undefined
  }
  const images =
    container?.single_product?.images || container?.advanced_product?.images
  return (
    images?.[0]?.src_xs ||
    images?.[0]?.src_thumbnail ||
    images?.[0]?.src ||
    undefined
  )
}

function getItemColour(
  item: FurnisystemsCartItem,
  language: string
): string | null {
  const fabric = item.cartItemFabrics?.[0]?.fabric
  if (fabric?.color_name) return fabric.color_name

  const groupProfiles =
    item.cartItemFabrics?.[0]?.fabric_group?.fabric_group_profiles
  if (groupProfiles) {
    const local = groupProfiles.find(
      (p) => p.language.toLowerCase() === language
    )
    if (local?.name) return local.name
    if (groupProfiles[0]?.name) return groupProfiles[0].name
  }

  if (item.fabric_group_name) return item.fabric_group_name
  return null
}

function getItemCode(item: FurnisystemsCartItem): string | null {
  return item.fabric_code || item.cartItemFabrics?.[0]?.fabric?.code || null
}

function isAdvancedItem(item: FurnisystemsCartItem): boolean {
  const hasFabrics = (item.cartItemFabrics?.length ?? 0) > 0
  const hasComponents = (item.additional_components?.length ?? 0) > 0
  const hasSofaCombinations = !!item.selected_sofa_combinations
  return (
    !!item.advanced_product_type &&
    (hasFabrics || hasComponents || hasSofaCombinations)
  )
}

function buildOrderDetailItem(item: FurnisystemsCartItem): any {
  let configurations: any[] | undefined
  if (item.selected_sofa_combinations) {
    try {
      const combos = JSON.parse(item.selected_sofa_combinations)
      if (Array.isArray(combos)) {
        configurations = combos.map(() => [])
      }
    } catch {}
  }

  return {
    cart_item: {
      advanced_product_type: item.advanced_product_type,
      selected_sofa_combinations: item.selected_sofa_combinations,
      fabric_code: item.fabric_code,
      fabric_group_name: item.fabric_group_name,
      cartItemFabrics: item.cartItemFabrics,
      product_container: item.product_container,
      additional_components: item.additional_components,
      fabricCombination: item.fabricCombination,
      sofa_forms: item.sofa_forms,
    },
    metadata: configurations ? { configurations } : {},
  }
}

function CartItemCard({
  item,
  readOnly = false,
}: {
  item: FurnisystemsCartItem
  readOnly?: boolean
}) {
  const { t, language } = useTranslations("account")
  const canSeePrices = useCanSeePrices()
  const { updateItemQuantity, updateItemReference, removeItem } = useCart()
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const isAdvanced = isAdvancedItem(item)

  const name = getItemName(item, language)
  const image = getItemImage(item)
  const colour = getItemColour(item, language)
  const code = getItemCode(item)
  const quantity = item.quantity ?? 1
  const price = (item.price ?? 0) * quantity

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const handleQuantityChange = async (newQuantity: number) => {
    setUpdating(true)
    try {
      await updateItemQuantity(item.id, newQuantity)
    } catch {
      // error handled silently
    } finally {
      setUpdating(false)
    }
  }

  const handleRemove = async () => {
    setDeleting(true)
    try {
      await removeItem(item.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white ">
      {/* Mobile layout — below small: breakpoint only */}
      <div className="small:hidden p-4">
        {/* Top row: image + text details */}
        <div className="flex gap-x-4">
          <div className="w-[120px] h-[120px] flex-shrink-0 bg-product-card-background rounded">
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-[120px] h-[120px] object-contain mix-blend-multiply"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                {t("no-image")}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-normal text-dark-blue">{name}</span>
            {item.reference ? (
              readOnly ? (
                <span className="text-sm font-light text-gray-500 mt-1 block">
                  {t("customer-reference")}: {item.reference}
                </span>
              ) : (
                <InlineReferenceEdit
                  reference={item.reference}
                  label={t("customer-reference")}
                  onSave={async (newRef) => {
                    await updateItemReference(item.id, newRef)
                  }}
                />
              )
            ) : null}
            {item.volume != null && item.volume > 0 && (
              <span className="text-sm text-gray-500 mt-1 block">
                {t("volume")}: {((item.volume ?? 0) * quantity).toFixed(3)}{" "}
                m&sup3;
              </span>
            )}
          </div>
        </div>

        {/* Quantity + Price row */}
        <div className="flex items-center justify-between mt-4">
          {readOnly ? (
            <span className="text-sm font-light text-gray-500">
              {t("quantity")}: {quantity}
            </span>
          ) : (
            <div>
              <div className="flex items-center border rounded border-gray-300">
                <button
                  className="w-10 h-10 flex items-center justify-center text-dark-blue hover:bg-gray-50 disabled:opacity-40"
                  onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || updating}
                >
                  &mdash;
                </button>
                <span className="w-10 h-10 flex items-center justify-center text-sm font-medium text-dark-blue border-x border-gray-300">
                  {quantity}
                </span>
                <button
                  className="w-10 h-10 flex items-center justify-center text-dark-blue hover:bg-gray-50 disabled:opacity-40"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={updating}
                >
                  +
                </button>
              </div>
              {updating && <Spinner className="mt-1" />}
            </div>
          )}
          {canSeePrices && (
            <span className="text-lg font-medium text-dark-blue">
              {formatPrice(price)}
            </span>
          )}
        </div>

        {/* Actions row */}
        {(isAdvanced || !readOnly) && (
        <div className="flex border-t border-gray-200 mt-4">
          {isAdvanced && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-dark-blue hover:bg-gray-50 transition-colors border-r border-gray-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {isExpanded ? t("hide-configuration") : t("show-configuration")}
            </button>
          )}
          {!readOnly && (
          <button
            onClick={handleRemove}
            disabled={deleting}
            aria-label={t("remove")}
            className="shrink-0 w-12 flex items-center justify-center py-3 text-sm text-dark-blue hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Spinner />
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            )}
          </button>
          )}
        </div>
        )}
      </div>

      {/* Desktop layout — small: and up, unchanged */}
      <div className="hidden small:flex">
        {/* Image */}
        <div className="w-[280px] flex-shrink-0 p-6">
          <div className="w-full h-full bg-product-card-background rounded flex items-center justify-center p-4">
            {image ? (
              <img
                src={image}
                alt={name}
                className="max-w-full max-h-full object-contain mix-blend-multiply"
              />
            ) : (
              <div className="w-full h-[200px] flex items-center justify-center text-sm text-gray-400">
                {t("no-image")}
              </div>
            )}
          </div>
        </div>

        {/* Details + Actions */}
        <div className="flex-1 flex flex-col border-l border-gray-200">
          {/* Details */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-medium text-dark-blue">{name}</h3>
              {item.reference ? (
                readOnly ? (
                  <span className="text-sm font-light text-gray-500 mt-1 block">
                    {t("customer-reference")}: {item.reference}
                  </span>
                ) : (
                  <InlineReferenceEdit
                    reference={item.reference}
                    label={t("customer-reference")}
                    onSave={async (newRef) => {
                      await updateItemReference(item.id, newRef)
                    }}
                  />
                )
              ) : null}
              {item.volume != null && item.volume > 0 && (
                <span className="text-sm text-gray-500 mt-1 block">
                  {t("volume")}: {((item.volume ?? 0) * quantity).toFixed(3)}{" "}
                  m&sup3;
                </span>
              )}
            </div>

            <div className="flex items-end justify-between mt-4">
              <div>
                <span className="text-sm text-gray-500 block mb-2">
                  {t("quantity")}
                </span>
                {readOnly ? (
                  <span className="text-lg font-medium text-dark-blue">
                    {quantity}
                  </span>
                ) : (
                  <>
                    <div className="flex items-center border rounded border-gray-300">
                      <button
                        className="w-10 h-10 flex items-center justify-center text-dark-blue hover:bg-gray-50 disabled:opacity-40"
                        onClick={() =>
                          handleQuantityChange(Math.max(1, quantity - 1))
                        }
                        disabled={quantity <= 1 || updating}
                      >
                        &mdash;
                      </button>
                      <span className="w-10 h-10 flex items-center justify-center text-sm font-medium text-dark-blue border-x border-gray-300">
                        {quantity}
                      </span>
                      <button
                        className="w-10 h-10 flex items-center justify-center text-dark-blue hover:bg-gray-50 disabled:opacity-40"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={updating}
                      >
                        +
                      </button>
                    </div>
                    {updating && <Spinner className="mt-1" />}
                  </>
                )}
              </div>
              {canSeePrices && (
                <span className="text-lg font-medium text-dark-blue">
                  {formatPrice(price)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {(isAdvanced || !readOnly) && (
          <div className="flex border-t border-gray-200">
            {isAdvanced && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-dark-blue hover:bg-gray-50 transition-colors border-r border-gray-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {isExpanded ? t("hide-configuration") : t("show-configuration")}
              </button>
            )}
            {!readOnly && (
            <button
              onClick={handleRemove}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-dark-blue hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Spinner />
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              )}
              {t("remove")}
            </button>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Configuration detail (expanded) - full width below card */}
      {isAdvanced && isExpanded && (
        <div className="border-t border-gray-200 p-6">
          <SofaConfigurationDetail item={buildOrderDetailItem(item)} />
        </div>
      )}
    </div>
  )
}

const ItemsTemplate = ({
  items: itemsProp,
  readOnly = false,
}: {
  items?: FurnisystemsCartItem[]
  readOnly?: boolean
} = {}) => {
  const ctx = useCart()
  const items = itemsProp ?? ctx.items
  const isLoading = itemsProp ? false : ctx.isLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      {items
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .map((item) => (
          <CartItemCard key={item.id} item={item} readOnly={readOnly} />
        ))}
    </div>
  )
}

export default ItemsTemplate
