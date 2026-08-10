"use client"

import {
  OrderDetail,
  OrderDetailAddress,
} from "@lib/furnisystems-sdk/modules/customer/types"
import { useTranslations, useI18n } from "@lib/i18n"
import ProductItemsTable from "@modules/common/components/product-items-table"
import { orderDetailItemToProductItemRow } from "@modules/common/components/product-items-table/mappers"
import InfoRow from "@modules/common/components/info-row"
import { useCustomer, useCanSeePrices } from "@lib/context/customer-context"
import { isAgentOrAdmin } from "@lib/util/roles"
import { BuildingStorefront } from "@medusajs/icons"
import { features } from "@lib/features"

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

const OrderDetailsTemplate = ({ order }: OrderDetailsProps) => {
  const canSeePrices = useCanSeePrices()
  const { t } = useTranslations("account")
  const { language } = useI18n()
  const { customer } = useCustomer()

  // Check if user is an agent or admin
  const isAgent = isAgentOrAdmin(customer)

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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat(localeMap[language] || "en-GB", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const showPvm = features.showPvm
  const showShipping = features.showDeliveryShippingInfo
  const showVolume = features.showVolume

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
      <div className="card">
        <h3 className="section-title">{title}</h3>
        {!address ? (
          <p className="text-sm text-gray-500">-</p>
        ) : (
          <div className="space-y-3">
            {address.address_1 && (
              <InfoRow
                label={t("address")}
                value={
                  <>
                    {address.address_1}
                    {address.address_2 ? `, ${address.address_2}` : ""}
                    {address.city ? `, ${address.city}` : ""}
                    {address.state_region ? `, ${address.state_region}` : ""}
                  </>
                }
              />
            )}
            {address.postal_code && (
              <InfoRow label={t("zip-code")} value={address.postal_code} />
            )}
            {address.country && (
              <InfoRow label={t("country")} value={address.country} />
            )}
            {address.phone_number && (
              <InfoRow label={t("phone")} value={address.phone_number} />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6" data-testid="order-details-content">
      {/* Order Header Card */}
      <div className="card">
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
      <div className="card">
        <h3 className="section-title">
          {t("general-info")}
        </h3>
        <div className="space-y-3 text-sm">
          <InfoRow label={t("carrier")} value={getCarrierName()} />
          {/* Customer row - only for agents/admins */}
          {isAgent && (
            <InfoRow label={t("customer")} value={order.purchased_by?.name || "-"} />
          )}
          {/* Shop (Location) row - for all users when purchased_subAccount exists */}
          {order.purchased_subAccount?.name && (
            <InfoRow
              label={t("shop_location")}
              value={
                <span className="flex items-center gap-1">
                  <BuildingStorefront className="w-4 h-4" />
                  {order.purchased_subAccount.name}
                </span>
              }
            />
          )}
          {order.order_type && (
            <InfoRow label={t("type")} value={order.order_type} />
          )}
          <InfoRow
            label={t("preferred-delivery-date")}
            value={
              order.preferred_delivery_date
                ? formatDate(order.preferred_delivery_date)
                : "-"
            }
          />
          <InfoRow
            label={t("confirmed-delivery-date")}
            value={
              order.confirmed_delivery_date
                ? formatDate(order.confirmed_delivery_date)
                : "-"
            }
          />
          {order.invoice_pdf_url && (
            <InfoRow
              label={t("invoice")}
              value={
                <a
                  href={`/api/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-dark-blue underline hover:no-underline"
                >
                  {order.invoice_code
                    ? `${order.invoice_code}.pdf`
                    : t("invoice")}
                </a>
              }
            />
          )}
        </div>
      </div>

      {/* Follow Your Order Card */}
      <div className="card">
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
            <>
              {/* Horizontal layout — visible at xsmall (512px) and up */}
              <div className="hidden xsmall:block px-2 sm:px-4 pb-4">
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

              {/* Vertical layout — visible below xsmall (< 512px) */}
              <div className="flex flex-col xsmall:hidden px-2 pb-4">
                {steps.map((step, index) => {
                  const isCompleted = index < activeStepIndex
                  const isActive = index === activeStepIndex
                  const isLast = index === steps.length - 1
                  return (
                    <div key={step.key} className="flex items-stretch">
                      {/* Circle column with vertical connector */}
                      <div className="flex flex-col items-center w-6 shrink-0">
                        {/* Circle */}
                        <div className="flex items-center justify-center w-6 h-6">
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
                        {/* Vertical connector line below the circle (except for last step) */}
                        {!isLast && (
                          <div
                            className={`w-[3px] flex-1 min-h-[24px] ${
                              isCompleted ? "bg-gold" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      {/* Label to the right */}
                      <span
                        className={`ml-3 text-sm pb-6 ${
                          isLast ? "pb-0" : ""
                        } ${
                          isCompleted || isActive
                            ? "text-dark-blue font-medium"
                            : "text-gray-400"
                        }`}
                      >
                        {t(step.key)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}
      </div>

      {/* Order Items Table */}
      {orderItems.length > 0 && (
        <>
          <ProductItemsTable
            items={orderItems.map((item) =>
              orderDetailItemToProductItemRow(item, language)
            )}
            formatPrice={formatPrice}
            showVolume={showVolume}
            translations={{
              orderItems: t("order-items"),
              unitPrice: t("unit-price"),
              quantity: t("quantity-short"),
              volume: t("volume"),
              total: t("total"),
              noImage: t("no-image"),
              customerReference: t("customer-reference"),
              showConfiguration: t("show-configuration"),
              hideConfiguration: t("hide-configuration"),
            }}
          />

          {/* Summary */}
          <div className="bg-white px-4 py-4 border-t border-gray-200">
            <div className="flex flex-col items-end gap-2 text-sm">
              {showVolume && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-dark-blue-70">{t("volume")}</span>
                  <span className="text-dark-blue font-medium">
                    {orderItems
                      .reduce((sum, item) => sum + (item.volume || 0), 0)
                      .toFixed(2)}{" "}
                    m³
                  </span>
                </div>
              )}
              {canSeePrices && (
              <>
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-dark-blue-70">
                  {t("subtotal")} ({orderItems.length}{" "}
                  {t("items").toLowerCase()})
                </span>
                <span className="text-dark-blue font-medium">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {order.total_price_confirmed != null && (
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-dark-blue-70">
                    {t("confirmed-price")}
                  </span>
                  <span className="text-dark-blue font-medium">
                    {formatPrice(order.total_price_confirmed)}
                  </span>
                </div>
              )}
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
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    order.total_price_confirmed != null
                      ? "text-green-700"
                      : "text-dark-blue"
                  }`}
                >
                  {order.total_price_confirmed != null && (
                    <svg
                      className="h-4 w-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {formatPrice(order.total_price_confirmed ?? grandTotal)}
                </span>
              </div>
              </>
              )}
            </div>
          </div>
        </>
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
