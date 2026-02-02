"use client"

import React, { useState } from "react"
import {
  OrderDetail,
  OrderDetailAddress,
  OrderDetailItem,
  AdditionalComponentDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"
import {
  TableHeader,
  TableHeaderCell,
} from "@modules/common/components/table-header"
import { useTranslations, useI18n } from "@lib/i18n"
import SofaConfigurationDetail from "@modules/account/components/sofa-configuration"

interface OrderDetailsProps {
  order: OrderDetail
}

const localeMap: Record<string, string> = {
  en: "en-GB",
  de: "de-DE",
  fr: "fr-FR",
  lt: "lt-LT",
  da: "da-DK",
}

const isAdvancedItem = (item: OrderDetailItem): boolean => {
  if (!item.cart_item?.advanced_product_type) return false
  const hasFabrics = (item.cart_item?.cartItemFabrics?.length ?? 0) > 0
  const hasComponents = (item.cart_item?.additional_components?.length ?? 0) > 0
  const hasConfigurations =
    Array.isArray(item.metadata?.configurations) &&
    item.metadata.configurations.length > 0
  return hasFabrics || hasComponents || hasConfigurations
}

const OrderDetailsTemplate = ({ order }: OrderDetailsProps) => {
  const { t } = useTranslations("account")
  const { language } = useI18n()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItemExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      localeMap[language] || "en-GB",
      {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }
    )
  }

  const getPaymentMethodName = (): string => {
    if (!order.payment_method?.payment_method_profiles?.length) return "-"
    const profile = order.payment_method.payment_method_profiles.find(
      (p) => p.language.toLowerCase() === language
    )
    return (
      profile?.title ||
      order.payment_method.payment_method_profiles[0]?.title ||
      "-"
    )
  }

  const getCarrierName = (): string => {
    if (!order.order_items_detail?.length) return "-"
    const firstItem = order.order_items_detail[0]
    if (!firstItem?.shipping_method?.shipping_method_profiles?.length)
      return "-"
    const profile = firstItem.shipping_method.shipping_method_profiles.find(
      (p) => p.language.toLowerCase() === language
    )
    return (
      profile?.title ||
      firstItem.shipping_method.shipping_method_profiles[0]?.title ||
      "-"
    )
  }

  const getItemProductName = (item: OrderDetailItem): string => {
    const container = item.cart_item?.product_container
    if (container?.single_product?.product_profiles?.length) {
      const profile = container.single_product.product_profiles.find(
        (p) => p.language.toLowerCase() === language
      )
      return (
        profile?.name ||
        container.single_product.product_profiles[0]?.name ||
        "-"
      )
    }
    if (container?.advanced_product?.advanced_product_profiles?.length) {
      const profile = container.advanced_product.advanced_product_profiles.find(
        (p) => p.language.toLowerCase() === language
      )
      return (
        profile?.name ||
        container.advanced_product.advanced_product_profiles[0]?.name ||
        "-"
      )
    }
    return "-"
  }

  const getItemImage = (item: OrderDetailItem): string | null => {
    const container = item.cart_item?.product_container
    const images =
      container?.single_product?.images || container?.advanced_product?.images
    if (!images?.length) return null
    return images[0].src_xs || images[0].src_thumbnail || images[0].src
  }

  const getComponentName = (
    component: AdditionalComponentDetail
  ): string => {
    const profile = component.additional_component_profiles?.find(
      (p) => p.language.toLowerCase() === language
    )
    return (
      profile?.name ||
      component.additional_component_profiles?.[0]?.name ||
      "-"
    )
  }

  const getComponentGroupName = (
    component: AdditionalComponentDetail
  ): string => {
    const profile =
      component.additional_component_group?.additional_component_group_profiles?.find(
        (p) => p.language.toLowerCase() === language
      )
    return (
      profile?.name ||
      component.additional_component_group
        ?.additional_component_group_profiles?.[0]?.name ||
      ""
    )
  }

  const getVisibleComponents = (
    item: OrderDetailItem
  ): AdditionalComponentDetail[] => {
    const components = item.cart_item?.additional_components
    if (!components?.length) return []
    const excludedCodes = [
      "shooting",
      "threads-type",
      "market",
      "direction",
    ]
    return components.filter((c) => {
      const groupCode = c.additional_component_group?.code
      if (groupCode && excludedCodes.includes(groupCode)) return false
      return true
    })
  }

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const showPvm = process.env.NEXT_PUBLIC_SHOW_PVM === "true"
  const showShipping =
    process.env.NEXT_PUBLIC_SHOW_DELIVERY_SHIPPING_INFORMATION === "true"
  const showVolume = process.env.NEXT_PUBLIC_SHOW_VOLUME === "true"

  const orderItems = order.order_items_detail || []
  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const shippingTotal = showShipping
    ? orderItems.reduce((sum, item) => sum + (item.shipping_price || 0), 0)
    : 0
  const vatRate = 0.21
  const totalBeforeVat = subtotal + shippingTotal
  const vatAmount = showPvm ? totalBeforeVat * vatRate : 0
  const grandTotal = order.total_price || totalBeforeVat + vatAmount

  const renderAddressCard = (title: string, address?: OrderDetailAddress) => {
    return (
      <div className="bg-white p-4 sm:p-6">
        <h3 className="text-lg font-medium text-dark-blue mb-4">{title}</h3>
        {!address ? (
          <p className="text-sm text-gray-500">-</p>
        ) : (
          <div className="space-y-3">
            {address.address_1 && (
              <div className="flex gap-4">
                <span className="text-sm text-dark-blue-70 min-w-[100px]">
                  {t("address")}
                </span>
                <span className="text-sm text-dark-blue font-medium">
                  {address.address_1}
                  {address.address_2 ? `, ${address.address_2}` : ""}
                  {address.city ? `, ${address.city}` : ""}
                  {address.state_region ? `, ${address.state_region}` : ""}
                </span>
              </div>
            )}
            {address.postal_code && (
              <div className="flex gap-4">
                <span className="text-sm text-dark-blue-70 min-w-[100px]">
                  {t("zip-code")}
                </span>
                <span className="text-sm text-dark-blue font-medium">
                  {address.postal_code}
                </span>
              </div>
            )}
            {address.country && (
              <div className="flex gap-4">
                <span className="text-sm text-dark-blue-70 min-w-[100px]">
                  {t("country")}
                </span>
                <span className="text-sm text-dark-blue font-medium">
                  {address.country}
                </span>
              </div>
            )}
            {address.phone_number && (
              <div className="flex gap-4">
                <span className="text-sm text-dark-blue-70 min-w-[100px]">
                  {t("phone")}
                </span>
                <span className="text-sm text-dark-blue font-medium">
                  {address.phone_number}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6" data-testid="order-details-content">
      {/* Page Title */}
      <h1 className="text-2xl sm:text-3xl font-medium text-dark-blue">
        {t("order-details")}
      </h1>

      {/* Order Header Card */}
      <div className="bg-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-medium text-dark-blue">
              #{order.display_id}
            </h2>
            <p className="text-sm text-dark-blue-70 mt-1">
              {t("date-placed")} {formatDate(order.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* General Info Card */}
      <div className="bg-white p-4 sm:p-6">
        <h3 className="text-lg font-medium text-dark-blue mb-4">
          {t("general-info")}
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-4">
            <span className="text-dark-blue-70 min-w-[140px]">
              {t("carrier")}
            </span>
            <span className="text-dark-blue font-medium">
              {getCarrierName()}
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-dark-blue-70 min-w-[140px]">
              {t("payment-method")}
            </span>
            <span className="text-dark-blue font-medium">
              {getPaymentMethodName()}
            </span>
          </div>
          {order.order_type && (
            <div className="flex gap-4">
              <span className="text-dark-blue-70 min-w-[140px]">
                {t("type")}
              </span>
              <span className="text-dark-blue font-medium">
                {order.order_type}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Follow Your Order Card */}
      <div className="bg-white p-4 sm:p-6">
        <h3 className="text-lg font-medium text-dark-blue mb-6">
          {t("follow-your-order")}
        </h3>
        {(() => {
          const steps = [
            {
              key: "submitted",
              statuses: ["AWAITING_SINCHRONIZATION", "ERROR"],
            },
            {
              key: "waiting-for-confirmation",
              statuses: [
                "AWAITING_CONFIRMATION",
                "AWAITING_PAYMENT",
                "PAYMENT_COMPLETED",
              ],
            },
            { key: "manufacturing", statuses: ["MANUFACTURING"] },
            {
              key: "dispatched",
              statuses: ["COMPLETED", "PARTIALLY_DELIVERED"],
            },
          ]

          const currentStatus = order.order_status || "AWAITING_SINCHRONIZATION"
          let activeStepIndex = steps.findIndex((step) =>
            step.statuses.includes(currentStatus)
          )
          if (activeStepIndex === -1) activeStepIndex = 0

          return (
            <div className="px-2 sm:px-4 pb-4">
              <div className="relative flex items-center justify-between">
                {/* Background line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-gray-200" />
                {/* Active line */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-gold transition-all"
                  style={{
                    width: `${(activeStepIndex / (steps.length - 1)) * 100}%`,
                  }}
                />
                {/* Step dots */}
                {steps.map((step, index) => {
                  const isCompleted = index < activeStepIndex
                  const isActive = index === activeStepIndex
                  return (
                    <div
                      key={step.key}
                      className="relative z-10 flex flex-col items-center"
                    >
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M3 7L6 10L11 4"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 rounded-full bg-gold" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300" />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Labels */}
              <div className="flex justify-between mt-3">
                {steps.map((step, index) => {
                  const isCompleted = index < activeStepIndex
                  const isActive = index === activeStepIndex
                  return (
                    <span
                      key={step.key}
                      className={`text-xs sm:text-sm ${
                        isCompleted || isActive
                          ? "text-dark-blue font-medium"
                          : "text-gray-400"
                      } ${
                        index === 0
                          ? "text-left"
                          : index === steps.length - 1
                          ? "text-right"
                          : "text-center"
                      }`}
                    >
                      {t(step.key)}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Order Items Table */}
      {orderItems.length > 0 && (
        <div className="bg-white p-4 sm:p-6">
          <h3 className="text-lg font-medium text-dark-blue mb-4">
            {t("order-items")}
          </h3>
          {/* Mobile: card layout */}
          <div className="small:hidden divide-y divide-gray-100">
            {orderItems.map((item) => {
              const imageSrc = getItemImage(item)
              const productName = getItemProductName(item)
              const lineTotal = item.price * item.quantity
              const hasAdvancedConfig = isAdvancedItem(item)
              const isExpanded = expandedItems.has(item.id)
              return (
                <React.Fragment key={item.id}>
                  <div className="flex gap-4 py-4">
                    <div className="w-[100px] h-[100px] flex-shrink-0 bg-gray-100 overflow-hidden">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={productName}
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          {t("no-image")}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col text-sm min-w-0">
                      <p className="text-dark-blue font-medium">
                        {productName}
                      </p>
                      {item.reference && (
                        <p className="text-dark-blue-70 text-xs mt-0.5">
                          {t("customer-reference")}: {item.reference}
                        </p>
                      )}
                      <p className="text-dark-blue-70 mt-1">
                        {t("quantity-short")}: {item.quantity}
                      </p>
                      <p className="text-dark-blue font-medium mt-1">
                        {formatPrice(lineTotal)}
                      </p>
                      {!hasAdvancedConfig &&
                        getVisibleComponents(item).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {getVisibleComponents(item).map((comp) => {
                              const groupName = getComponentGroupName(comp)
                              const compName = getComponentName(comp)
                              return (
                                <div
                                  key={comp.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {comp.image?.src_thumbnail ? (
                                    <img
                                      src={comp.image.src_thumbnail}
                                      alt={compName}
                                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                                    />
                                  ) : comp.color?.hex ? (
                                    <span
                                      className="w-6 h-6 rounded flex-shrink-0 border border-gray-200"
                                      style={{
                                        backgroundColor: comp.color.hex,
                                      }}
                                    />
                                  ) : null}
                                  <span className="text-dark-blue-70">
                                    {groupName ? `${groupName}: ` : ""}
                                    <span className="text-dark-blue font-medium">
                                      {compName}
                                    </span>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      {hasAdvancedConfig && (
                        <button
                          type="button"
                          onClick={() => toggleItemExpand(item.id)}
                          className="mt-2 text-xs text-dark-blue-70 hover:text-dark-blue underline underline-offset-2 transition-colors self-start"
                        >
                          {isExpanded
                            ? t("hide-configuration")
                            : t("show-configuration")}
                        </button>
                      )}
                    </div>
                  </div>
                  {hasAdvancedConfig && isExpanded && (
                    <SofaConfigurationDetail item={item} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden small:block overflow-x-auto">
            <table className="w-full text-sm">
              <TableHeader>
                <TableHeaderCell>{t("order-items")}</TableHeaderCell>
                <TableHeaderCell>{t("unit-price")}</TableHeaderCell>
                <TableHeaderCell>{t("quantity-short")}</TableHeaderCell>
                {showVolume && <TableHeaderCell>{t("volume")}</TableHeaderCell>}
                <TableHeaderCell align="right">{t("total")}</TableHeaderCell>
              </TableHeader>
              <tbody className="divide-y divide-gray-100">
                {orderItems.map((item) => {
                  const imageSrc = getItemImage(item)
                  const productName = getItemProductName(item)
                  const lineTotal = item.price * item.quantity
                  const hasAdvancedConfig = isAdvancedItem(item)
                  const isExpanded = expandedItems.has(item.id)
                  const colCount = 4 + (showVolume ? 1 : 0)
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="align-top">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-[150px] h-[150px] flex-shrink-0 bg-gray-100 overflow-hidden">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={productName}
                                  width={150}
                                  height={150}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  {t("no-image")}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-dark-blue font-medium">
                                {productName}
                              </p>
                              {item.reference && (
                                <p className="text-dark-blue-70 text-xs mt-0.5">
                                  {t("customer-reference")}: {item.reference}
                                </p>
                              )}
                              {!hasAdvancedConfig &&
                                getVisibleComponents(item).length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {getVisibleComponents(item).map(
                                      (comp) => {
                                        const groupName =
                                          getComponentGroupName(comp)
                                        const compName =
                                          getComponentName(comp)
                                        return (
                                          <div
                                            key={comp.id}
                                            className="flex items-center gap-2 text-xs"
                                          >
                                            {comp.image?.src_thumbnail ? (
                                              <img
                                                src={
                                                  comp.image.src_thumbnail
                                                }
                                                alt={compName}
                                                className="w-6 h-6 rounded object-cover flex-shrink-0"
                                              />
                                            ) : comp.color?.hex ? (
                                              <span
                                                className="w-6 h-6 rounded flex-shrink-0 border border-gray-200"
                                                style={{
                                                  backgroundColor:
                                                    comp.color.hex,
                                                }}
                                              />
                                            ) : null}
                                            <span className="text-dark-blue-70">
                                              {groupName
                                                ? `${groupName}: `
                                                : ""}
                                              <span className="text-dark-blue font-medium">
                                                {compName}
                                              </span>
                                            </span>
                                          </div>
                                        )
                                      }
                                    )}
                                  </div>
                                )}
                              {hasAdvancedConfig && (
                                <button
                                  type="button"
                                  onClick={() => toggleItemExpand(item.id)}
                                  className="mt-2 text-xs text-dark-blue-70 hover:text-dark-blue underline underline-offset-2 transition-colors"
                                >
                                  {isExpanded
                                    ? t("hide-configuration")
                                    : t("show-configuration")}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-900">
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-4 py-4 text-gray-900">
                          {item.quantity}
                        </td>
                        {showVolume && (
                          <td className="px-4 py-4 text-gray-900">
                            {item.volume != null
                              ? `${item.volume.toFixed(2)} m³`
                              : "-"}
                          </td>
                        )}
                        <td className="px-4 py-4 text-right text-gray-900 font-medium">
                          {formatPrice(lineTotal)}
                        </td>
                      </tr>
                      {hasAdvancedConfig && isExpanded && (
                        <tr>
                          <td colSpan={colCount} className="p-0">
                            <SofaConfigurationDetail item={item} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className=" mt-2 pt-4">
            <div className="flex flex-col items-end gap-2 text-sm">
              {showVolume && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-dark-blue-70">
                    {t("volume")}
                  </span>
                  <span className="text-dark-blue font-medium">
                    {orderItems
                      .reduce((sum, item) => sum + (item.volume || 0), 0)
                      .toFixed(2)}{" "}
                    m³
                  </span>
                </div>
              )}
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-dark-blue-70">
                  {t("subtotal")} ({orderItems.length}{" "}
                  {t("items").toLowerCase()})
                </span>
                <span className="text-dark-blue font-medium">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {showShipping && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-dark-blue-70">
                    {t("shipping-cost")}
                  </span>
                  <span className="text-dark-blue font-medium">
                    {formatPrice(shippingTotal)}
                  </span>
                </div>
              )}
              {showPvm && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-dark-blue-70">{t("vat")} 21%</span>
                  <span className="text-dark-blue font-medium">
                    {formatPrice(vatAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between w-full max-w-xs border-t border-gray-200 pt-2 mt-1">
                <span className="text-dark-blue font-semibold">
                  {showPvm ? t("total-incl-tax") : t("total").toUpperCase()}
                </span>
                <span className="text-dark-blue font-semibold">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Address + Invoice Address */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderAddressCard(t("delivery-address"), order.shipping_address)}
        {renderAddressCard(t("invoice-address"), order.billing_address)}
      </div>
    </div>
  )
}

export default OrderDetailsTemplate
