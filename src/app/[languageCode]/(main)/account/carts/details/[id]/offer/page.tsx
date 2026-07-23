"use client"

import { useCustomer } from "@lib/context/customer-context"
import { useShopSettings } from "@lib/context/shop-settings-context"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState, type ReactElement } from "react"
import { getCartOffer } from "@lib/data/offer-pdf"
import {
  CartOfferData,
  OfferComponentSpec,
  OfferContext,
  OfferItem,
} from "@lib/furnisystems-sdk/modules/offer-pdf/types"
import { generateOfferPdf } from "@modules/offer/lib/generate-offer-pdf"
import Button from "@modules/common/components/button"
import OfferSofaDiagram from "@modules/offer/components/offer-sofa-diagram"
import EmailOfferModal from "@modules/offer/components/email-offer-modal"
import useToggleState from "@lib/hooks/use-toggle-state"
import { useTranslations } from "@lib/i18n"

// Section labels: small, bold, uppercase, letter-spaced, near-black.
const LABEL_CLS =
  "text-[0.525rem]/[0.7rem] font-bold uppercase tracking-wider text-dark-blue"

// Additional-component groups suppressed from the "Selected additional
// components" grid (thread-color "0" placeholders, market/direction/shooting
// metadata groups). Keep in sync with EXCLUDED_GROUP_CODES in
// src/modules/products/components/configurator/configuration-summary.tsx.
// "logos" is an offer/PDF-only exclusion and is intentionally NOT mirrored
// in the configurator summary array.
const EXCLUDED_COMPONENT_GROUP_CODES = [
  "shooting",
  "threads-type",
  "market",
  "direction",
  "logos",
]

// Backend `type` is a raw enum (e.g. "WOVEN_FABRIC"); lower-case it, swap
// underscores for spaces, then capitalize only the first letter of the
// whole string ("Woven fabric", not "Woven Fabric").
function formatFabricType(type?: string): string {
  if (!type) return ""
  const lower = type.toLowerCase().replace(/_/g, " ")
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

// Footer rendered at the bottom of every offer PDF page: company name on the
// left, the manufacturer wordmark on the right. Values come from
// `shopSettings.default_manufacturer` (falls back to the local
// `/images/logo.svg` wordmark, public/, when no logo is configured — a
// same-origin static asset, so html2canvas-pro can capture it with no CORS
// proxy needed). `mt-auto` relies on the parent `.offer-page` being a flex
// column so the footer sits pinned to the page bottom.
function OfferFooter({
  companyName,
  logoSrc,
}: {
  companyName: string
  logoSrc: string
}) {
  return (
    <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
      <span className="text-[0.6125rem] text-dark-blue-70">{companyName}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoSrc} alt={companyName} className="h-5 w-auto" />
    </div>
  )
}

function CartOfferContent() {
  const { customer } = useCustomer()
  const { shopSettings } = useShopSettings()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useTranslations("account")

  // Offer PDF footer values (company name + logo) — sourced from
  // shopSettings.default_manufacturer, same field the nav logo uses.
  const companyName =
    shopSettings?.default_manufacturer?.company_name || "Vilmers"
  const rawLogoSrc = shopSettings?.default_manufacturer?.logo_image?.src
  // Remote manufacturer logo must go through the same-origin proxy so
  // html2canvas-pro can capture it (see the fabric/component image comments
  // below); the local fallback wordmark is already same-origin.
  const footerLogoSrc = rawLogoSrc
    ? `/api/offer-image?url=${encodeURIComponent(rawLogoSrc)}`
    : "/images/logo.svg"

  const [data, setData] = useState<CartOfferData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  // Client-side only — hides all price info from the on-page preview. Since
  // Save-as-PDF/Email-offer both rasterize this same live DOM, toggling this
  // off automatically excludes prices from both exports too.
  const [showPrices, setShowPrices] = useState(true)
  const {
    state: emailModalOpen,
    open: openEmailModal,
    close: closeEmailModal,
  } = useToggleState(false)

  const cartId = params?.id as string
  const languageCode = params?.languageCode as string
  const printMode = searchParams.get("print") === "1"

  // Headless/print mode: hide the site chrome on screen too.
  useEffect(() => {
    if (!printMode) return
    document.body.classList.add("offer-print-mode")
    return () => document.body.classList.remove("offer-print-mode")
  }, [printMode])

  useEffect(() => {
    if (!customer) {
      router.push(`/${languageCode}/account`)
      return
    }
    if (!cartId) {
      router.push(`/${languageCode}/account/carts`)
      return
    }

    const fetchOffer = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getCartOffer(Number(cartId), languageCode)
        if (!result || result.items.length === 0) {
          setError(t("pdf-error"))
          return
        }
        setData(result)
      } catch (err) {
        console.error("Error loading offer:", err)
        setError(t("pdf-error"))
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOffer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, router, cartId, languageCode])

  if (!customer) {
    return null
  }

  const eur = (n: number) => `€${n.toFixed(2)}`
  const dim = (v: number | null) => (v != null ? `${v} cm` : "—")

  const handleDownload = async () => {
    if (downloading) return
    try {
      setDownloading(true)
      const { blob } = await generateOfferPdf()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `cart-offer-${cartId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to generate offer PDF:", err)
    } finally {
      setDownloading(false)
    }
  }

  const renderItem = (item: OfferItem, context: OfferContext, idx: number) => {
    const vatRate = context.vatRate
    // Market comes as a single string (e.g. "Lithuania / STD"); if it splits
    // cleanly, spread the parts like the mockup ("Lithuania    STD").
    const marketParts = item.market ? item.market.split(" / ") : []

    // Suppress the same additional-component noise the configurator hides
    // (thread color "0" placeholders and metadata-only groups).
    const fabricSpecs = item.fabricSpecs ?? []

    // Beds carry a "model"-group component (e.g. SIZE "180L") that supplies
    // the module/combination name and general dimensions when the sofa-
    // combination-derived fields are empty. It's metadata for the left
    // column, not a selectable component, so it's excluded from the cards.
    const modelSpec = (item.componentSpecs ?? []).find((comp) =>
      comp.groupCode?.toLowerCase().startsWith("model")
    )

    const visibleComponentSpecs = (item.componentSpecs ?? []).filter((comp) => {
      if (comp.code === "0") return false
      if (comp.groupCode?.toLowerCase().startsWith("model")) return false
      if (
        comp.groupCode &&
        EXCLUDED_COMPONENT_GROUP_CODES.includes(comp.groupCode)
      ) {
        return false
      }
      return true
    })

    // Components with dimensions (e.g. armrests, chaises) are more visually
    // informative, so surface them before dimensionless ones (e.g. legs,
    // finishes) — each group keeps its original backend order.
    const hasDims = (comp: OfferComponentSpec) =>
      comp.widthCm != null || comp.depthCm != null || comp.heightCm != null
    const orderedComponentSpecs = [
      ...visibleComponentSpecs.filter(hasDims),
      ...visibleComponentSpecs.filter((comp) => !hasDims(comp)),
    ]

    const hasAdditionalComponents =
      fabricSpecs.length > 0 || orderedComponentSpecs.length > 0

    // MATERIAL cards (one per fabric spec), built up-front so they can be
    // combined with the component cards below and chunked across pages.
    const fabricCards = fabricSpecs.map((fabric, fIdx) => {
      const colorValue = fabric.code
        ? `${fabric.code}${fabric.colorName ? ` - ${fabric.colorName}` : ""}`
        : "—"

      return (
        <div
          key={`f-${fIdx}`}
          className="flex flex-col border-t border-line pt-2"
        >
          <p className={LABEL_CLS}>{t("material")}</p>
          <div className="mt-2 grid w-fit grid-cols-[auto_auto] gap-x-10 gap-y-1 text-[0.7rem]/[1.05rem]">
            {[
              {
                label: t("collection"),
                value: fabric.collection || "—",
              },
              { label: t("color"), value: colorValue },
              {
                label: t("fabric-type"),
                value: formatFabricType(fabric.type) || "—",
              },
            ].flatMap((row) => [
              <span key={`${row.label}-l`} className="text-dark-blue-70">
                {row.label}
              </span>,
              <span key={`${row.label}-v`} className="text-right font-medium">
                {row.value}
              </span>,
            ])}
          </div>
          {fabric.imageUrl && (
            // Route through the same-origin proxy so html2canvas-pro can
            // read the bytes (upstream S3/GCS hosts send no CORS header).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/offer-image?url=${encodeURIComponent(
                fabric.imageUrl
              )}`}
              alt={fabric.code || ""}
              className="mt-3 aspect-[3/2] w-4/5 self-start object-contain object-left"
            />
          )}
        </div>
      )
    })

    // Component spec cards (filtered + ordered above).
    const componentCards = orderedComponentSpecs.map((comp, cIdx) => {
      return (
        <div
          key={`c-${cIdx}`}
          className="flex flex-col border-t border-line pt-2"
        >
          <p className={LABEL_CLS}>{comp.groupName || "—"}</p>
          {/* min-h reserves exactly 2 lines (2 × 1.225rem line-height) so
              image position stays aligned across 1-line vs 2-line titles.
              Rasterized via html2canvas-pro (see generate-offer-pdf.ts), which
              may not reliably support the `lh` unit, so the height is
              computed explicitly from the title's own line-height rather than
              using `min-h-[2lh]`. Not a fixed height / line-clamp — 3+ line
              titles still grow and render in full. */}
          <p className="mt-2 min-h-[2.45rem] text-[0.7875rem]/[1.225rem]">
            {comp.name || "—"}
          </p>

          {hasDims(comp) && (
            <div className="mt-4">
              <p className={LABEL_CLS}>{t("general-dimensions")}</p>
              <div className="mt-2 grid w-fit grid-cols-[auto_auto] gap-x-10 gap-y-1 text-[0.7rem]/[1.05rem]">
                {[
                  {
                    label: t("width"),
                    value: dim(comp.widthCm ?? null),
                  },
                  {
                    label: t("depth"),
                    value: dim(comp.depthCm ?? null),
                  },
                  {
                    label: t("height"),
                    value: dim(comp.heightCm ?? null),
                  },
                ].flatMap((row) => [
                  <span key={`${row.label}-l`} className="text-dark-blue-70">
                    {row.label}
                  </span>,
                  <span
                    key={`${row.label}-v`}
                    className="text-right font-medium"
                  >
                    {row.value}
                  </span>,
                ])}
              </div>
            </div>
          )}

          {comp.imageUrl ? (
            // Route through the same-origin proxy so html2canvas-pro can
            // read the bytes (upstream S3/GCS hosts send no CORS header).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/offer-image?url=${encodeURIComponent(comp.imageUrl)}`}
              alt={comp.name || ""}
              className="mt-3 aspect-[3/2] w-4/5 self-start object-contain object-left"
            />
          ) : comp.colorHex ? (
            <div
              className="mt-3 aspect-[3/2] w-4/5 self-start"
              style={{ backgroundColor: comp.colorHex }}
            />
          ) : null}
        </div>
      )
    })

    // Combine into one ordered list (fabric cards first, then components)
    // and chunk into pages of 6. Page 1 renders on this item's main page;
    // any further pages become continuation `.offer-page` sections so
    // overflow components get their own PDF page(s).
    const allCards = [...fabricCards, ...componentCards]
    const CARDS_PER_PAGE = 6
    const cardPages: ReactElement[][] = []
    for (let i = 0; i < allCards.length; i += CARDS_PER_PAGE) {
      cardPages.push(allCards.slice(i, i + CARDS_PER_PAGE))
    }

    // Shared with the continuation sections below so every page of this
    // item is captured as an identically-sized `.offer-page` PDF page.
    const offerPageClassName =
      "offer-page bg-white text-dark-blue mx-auto my-8 flex w-full max-w-[820px] min-h-[1160px] flex-col p-12 pb-8 border border-line rounded-base shadow-sm"

    // Returning a plain array (rather than a Fragment) lets the outer
    // `data.items.map(...)` call flatten this item's pages as siblings
    // without needing a key on the array itself — only the leaf `<section>`
    // elements need keys (already set below), since a shorthand `<>...</>`
    // used as a direct list item would need (but can't take) its own key.
    return [
      <section key={item.cartItemId ?? idx} className={offerPageClassName}>
        {/* HEADER — image (cols 1–2) + offer summary (col 3).
            Uses the SAME base `grid-cols-3 gap-8` as the bottom row so the
            column boundaries line up exactly (and survive the fixed-width
            html2canvas capture). */}
        <div className="grid grid-cols-3 gap-8">
          {/* Image + disclaimer: spans cols 1–2 (true 2/3 width) */}
          <div className="col-span-2">
            {item.imageUrl ? (
              // Route through the same-origin proxy so html2canvas-pro can read
              // the bytes (upstream S3/GCS hosts send no CORS header).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/offer-image?url=${encodeURIComponent(
                  item.imageUrl
                )}`}
                alt={item.name}
                className="aspect-[3/2] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[3/2] w-full items-center justify-center border border-dashed border-line text-[0.525rem]/[0.7rem] text-dark-blue-70">
                {t("no-image")}
              </div>
            )}
            <p className="mt-3 text-[7.7px] leading-snug text-dark-blue-70">
              {t("offer-image-disclaimer")}
            </p>
          </div>

          {/* Offer summary: 3rd column (col 3) */}
          <div className="col-span-1 flex flex-col">
            <p className="text-[0.525rem]/[0.7rem] font-normal uppercase tracking-wider text-dark-blue">
              {t("offer-label")}
            </p>
            <h2 className="mt-2 text-[1.575rem] font-bold leading-tight text-dark-blue">
              {item.name}
            </h2>
            {item.reference && (
              <p className="mt-1 text-[0.6125rem]/[0.875rem] text-dark-blue-70">
                {item.reference}
              </p>
            )}

            <div className="mt-8">
              <p className={LABEL_CLS}>{t("quantity")}</p>
              <p className="mt-1 text-[0.7875rem]/[1.225rem]">
                {item.quantity}
              </p>
            </div>

            {context.showVolume && item.volumeM3 != null && (
              <div className="mt-5">
                <p className={LABEL_CLS}>{t("volume")}</p>
                <p className="mt-1 text-[0.7875rem]/[1.225rem]">
                  {(item.volumeM3 * item.quantity).toFixed(3)} m³
                </p>
              </div>
            )}

            {showPrices && (
              <div className="mt-auto">
                <div className="flex items-baseline gap-4">
                  <span className="text-lg font-bold uppercase">
                    {t("total")}
                  </span>
                  <span className="text-lg font-bold">
                    {eur(item.totalNet)}
                  </span>
                </div>
                {context.showPvm && (
                  <div className="mt-2 space-y-0.5 text-[0.525rem]/[0.7rem] text-dark-blue-70">
                    <p>
                      {t("vat")} ({(vatRate * 100).toFixed(0)}%):{" "}
                      {eur(item.totalNet * vatRate)}
                    </p>
                    <p>
                      {t("total-incl-tax")}:{" "}
                      {eur(item.totalNet * (1 + vatRate))}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full-width divider */}
        <div className="my-4 border-t border-line" />

        {/* BOTTOM — three equal columns. Base grid-cols-3 (no responsive prefix)
            so the row survives the fixed-width PDF capture. */}
        <div className="grid grid-cols-3 gap-8">
          {/* COL 1: module / combination + general dimensions */}
          <div className="flex flex-col gap-8">
            <div>
              <p className={LABEL_CLS}>{t("module-combination")}</p>
              <p className="mt-2 text-[0.7875rem]/[1.225rem]">
                {item.moduleCombination || modelSpec?.name || "—"}
              </p>
            </div>

            <div>
              <p className={LABEL_CLS}>{t("general-dimensions")}</p>
              <div className="mt-2 grid w-fit grid-cols-[auto_auto] gap-x-10 gap-y-1 text-[0.7rem]/[1.05rem]">
                {[
                  {
                    label: t("width"),
                    value: dim(item.widthCm ?? modelSpec?.widthCm ?? null),
                  },
                  {
                    label: t("depth"),
                    value: dim(item.depthCm ?? modelSpec?.depthCm ?? null),
                  },
                  {
                    label: t("height"),
                    value: dim(item.heightCm ?? modelSpec?.heightCm ?? null),
                  },
                ].flatMap((row) => [
                  <span key={`${row.label}-l`} className="text-dark-blue-70">
                    {row.label}
                  </span>,
                  <span
                    key={`${row.label}-v`}
                    className="text-right font-medium"
                  >
                    {row.value}
                  </span>,
                ])}
              </div>
            </div>
          </div>

          {/* COL 2: real top-view Konva drawing (with dimension arrows) */}
          <div className="flex items-center justify-center">
            <div className="w-full">
              <OfferSofaDiagram
                rawSofaCombinations={item.rawSofaCombinations}
                height={190}
              />
            </div>
          </div>

          {/* COL 3: manufacturer / bottoms / market, thin dividers between */}
          <div className="flex flex-col">
            <div className="pb-4">
              <p className={LABEL_CLS}>{t("manufacturer")}</p>
              <p className="mt-2 text-[0.7875rem]/[1.225rem]">
                {item.manufacturer || "—"}
              </p>
            </div>
            <div className="border-t border-line py-2">
              <p className={LABEL_CLS}>{t("bottoms")}</p>
              <p className="mt-2 text-[0.7875rem]/[1.225rem]">
                {item.bottoms || "—"}
              </p>
            </div>
            <div className="border-t border-line pt-4">
              <p className={LABEL_CLS}>{t("market")}</p>
              {!item.market ? (
                <p className="mt-2 text-[0.7875rem]/[1.225rem]">—</p>
              ) : marketParts.length === 2 ? (
                <p className="mt-2 flex justify-between gap-4 text-[0.7875rem]/[1.225rem]">
                  <span>{marketParts[0]}</span>
                  <span>{marketParts[1]}</span>
                </p>
              ) : (
                <p className="mt-2 text-[0.7875rem]/[1.225rem]">
                  {item.market}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SELECTED ADDITIONAL COMPONENTS — material swatch card(s) followed
            by the (filtered) component spec cards, in backend array order.
            Only the first page (6 cards) renders here; the rest overflow
            onto continuation `.offer-page` sections below. */}
        {allCards.length > 0 && (
          <>
            <div>
              <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-2">
                {cardPages[0]}
              </div>
            </div>
          </>
        )}

        <OfferFooter companyName={companyName} logoSrc={footerLogoSrc} />
      </section>,

      ...cardPages.slice(1).map((chunk, pageIndex) => (
        <section
          key={`${item.cartItemId ?? idx}-cont-${pageIndex}`}
          className={offerPageClassName}
        >
          <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-2">{chunk}</div>

          <OfferFooter companyName={companyName} logoSrc={footerLogoSrc} />
        </section>
      )),
    ]
  }

  const renderOverview = (offerData: CartOfferData) => {
    const { items, context } = offerData
    const vatRate = context.vatRate
    const subtotal = items.reduce((sum, item) => sum + item.totalNet, 0)
    const vat = context.showPvm ? subtotal * vatRate : 0
    const total = subtotal + vat
    // Intl resolves the bare "en" subtag to en-US (month-first, "July 8,
    // 2026"); force en-GB so English renders day-first ("8 July 2026"),
    // matching the target format. Other languages format correctly as-is.
    const dateLocale = languageCode === "en" ? "en-GB" : languageCode
    const offerDate = new Date().toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    // Split the overview table across multiple `.offer-page` sections so no
    // single page carries more than 5 rows. Each page repeats the header
    // (title + date) and the table-header row; only the LAST page renders
    // the grand-totals block (computed from ALL items above, not just the
    // items on that page).
    const ITEMS_PER_PAGE = 5
    const overviewPages: OfferItem[][] = []
    for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
      overviewPages.push(items.slice(i, i + ITEMS_PER_PAGE))
    }

    return overviewPages.map((pageItems, pageIdx) => {
      const isLastPage = pageIdx === overviewPages.length - 1

      return (
        <section
          key={`overview-${pageIdx}`}
          className="offer-page bg-white text-dark-blue mx-auto my-6 flex w-full max-w-[820px] min-h-[1160px] flex-col p-12 pb-8 border border-line rounded-base shadow-sm"
        >
          {/* Header row — title left, date right */}
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold uppercase leading-tight text-dark-blue">
              {t("offer-overview")}
            </h3>
            <p className="text-[0.7875rem] text-dark-blue-70">{offerDate}</p>
          </div>

          {/* Table header */}
          <div className="mt-10 grid grid-cols-[1fr_96px_96px_110px] items-center gap-6 border-b border-line pb-3">
            <span />
            <span className={`${LABEL_CLS} text-right`}>{t("price")}</span>
            <span className={`${LABEL_CLS} text-right`}>{t("quantity")}</span>
            <span className={`${LABEL_CLS} text-right`}>{t("subtotal")}</span>
          </div>

          {/* Table rows */}
          {pageItems.map((item, idx) => {
            const unitPrice =
              item.quantity > 0 ? item.totalNet / item.quantity : item.totalNet

            return (
              <div
                key={item.cartItemId ?? idx}
                className="grid grid-cols-[1fr_96px_96px_110px] items-start gap-6 border-b border-line py-3"
              >
                <div className="flex items-start gap-4">
                  {item.imageUrl ? (
                    // Route through the same-origin proxy so html2canvas-pro can
                    // read the bytes (upstream S3/GCS hosts send no CORS header).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/offer-image?url=${encodeURIComponent(
                        item.imageUrl
                      )}`}
                      alt={item.name}
                      className="h-44 w-64 object-conver"
                    />
                  ) : (
                    <div className="flex h-44 w-64 items-center justify-center border border-dashed border-line text-[0.525rem]/[0.7rem] text-dark-blue-70">
                      {t("no-image")}
                    </div>
                  )}
                  <div>
                    <p className="text-[0.875rem] font-bold leading-tight">
                      {item.name}
                    </p>
                    {item.moduleCombination && (
                      <p className="mt-1 text-[0.7rem] text-dark-blue-70">
                        {item.moduleCombination}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-right text-[0.7875rem]">
                  {eur(unitPrice)}
                </span>
                <span className="text-right text-[0.7875rem]">
                  {item.quantity}
                </span>
                <span className="text-right text-[0.7875rem] font-medium">
                  {eur(item.totalNet)}
                </span>
              </div>
            )
          })}

          {/* Totals — right-aligned, below the table. Only on the last
              overview page, and always the grand totals of ALL items. */}
          {isLastPage && (
            <div className="ml-auto mt-4 w-full max-w-xs space-y-2">
              <div className="flex items-baseline justify-between">
                <span className={LABEL_CLS}>{t("subtotal")}</span>
                <span className="text-[0.875rem]">{eur(subtotal)}</span>
              </div>
              {context.showPvm && (
                <div className="flex items-baseline justify-between">
                  <span className={LABEL_CLS}>
                    {t("vat")} ({(vatRate * 100).toFixed(0)}%)
                  </span>
                  <span className="text-[0.875rem]">{eur(vat)}</span>
                </div>
              )}
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                <span className={LABEL_CLS}>{t("total")}</span>
                <span className="text-lg font-bold">{eur(total)}</span>
              </div>
            </div>
          )}

          <OfferFooter companyName={companyName} logoSrc={footerLogoSrc} />
        </section>
      )
    })
  }

  return (
    <>
      {!printMode && (
        <div className="print-hidden mx-auto w-full max-w-[820px] flex flex-col items-stretch gap-3 pt-6 sm:flex-row sm:items-center sm:justify-start">
          <Button
            variant="outline"
            className="print-hidden"
            onClick={handleDownload}
            disabled={loading || !data || downloading}
            data-testid="offer-save-pdf-button"
          >
            {downloading ? t("generating") : t("save-as-pdf")}
          </Button>
          <Button
            variant="outline"
            className="print-hidden"
            onClick={openEmailModal}
            disabled={loading || !data}
            data-testid="offer-email-button"
          >
            {t("email-offer")}
          </Button>
          <label className="inline-flex items-center gap-2 text-sm text-dark-blue cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPrices}
              onChange={(e) => setShowPrices(e.target.checked)}
              className="h-4 w-4 accent-dark-blue cursor-pointer"
              data-testid="offer-show-prices-toggle"
            />
            <span>{t("show-prices")}</span>
          </label>
        </div>
      )}

      {!printMode && (
        <EmailOfferModal
          isOpen={emailModalOpen}
          close={closeEmailModal}
          cartId={Number(cartId)}
          defaultEmail={customer.email ?? ""}
        />
      )}

      {loading ? (
        <div className="content-container flex flex-col items-center justify-center gap-y-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-dark-blue" />
          <p className="text-sm text-gray-500">{t("generating-pdf")}</p>
        </div>
      ) : error || !data ? (
        <div className="content-container py-8" data-testid="offer-error">
          <p className="text-sm text-red-600">{error || t("pdf-error")}</p>
        </div>
      ) : (
        <div className="offer-pages">
          {data.items.map((item, idx) => renderItem(item, data.context, idx))}
          {showPrices && renderOverview(data)}
        </div>
      )}
    </>
  )
}

export default function CartOfferPage() {
  return (
    <Suspense fallback={null}>
      <CartOfferContent />
    </Suspense>
  )
}
