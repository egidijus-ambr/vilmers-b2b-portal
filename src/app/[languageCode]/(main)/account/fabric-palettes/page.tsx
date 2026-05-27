"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useCustomer } from "@lib/context/customer-context"
import { useActingCustomer } from "@lib/context/acting-customer-context"
import { useRouter, useParams } from "next/navigation"
import PageContent from "@modules/common/components/page-content"
import PageHeader from "@modules/common/components/page-header"
import { useTranslations, getBackendLanguageCode } from "@lib/i18n"
import { getFabricPalettes } from "@lib/data/fabric-palettes"
import SearchInput from "@modules/common/components/search-input"
import TablePagination from "@modules/common/components/table-pagination"
import SortSelect from "@modules/common/components/sort-select"
import FabricFeatureFilterModal from "@modules/fabric-palettes/components/fabric-feature-filter-modal"
import {
  FabricPaletteDetail,
  FabricGroupDetail,
} from "@lib/furnisystems-sdk/modules/customer/types"
import FabricGroupInfoModal from "@modules/fabric-palettes/components/fabric-group-info-modal"
import FabricImageModal from "@modules/fabric-palettes/components/fabric-image-modal"
import { groupSelectedFeatures, matchesFeatureSelection, buildFeatureToGroupMap } from "@modules/fabric-palettes/utils/feature-filter-logic"
import { getFabricCalloutSettings } from "@lib/data/fabric-callout-settings"
import type { FabricCalloutSettings } from "@lib/data/fabric-callout-settings"
import { Info } from 'lucide-react'

export default function FabricPalettesPage() {
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()
  const router = useRouter()
  const params = useParams()
  const { t } = useTranslations("account")
  const { t: tc } = useTranslations("common")

  const languageCode = params?.languageCode as string
  const backendLang = getBackendLanguageCode(languageCode as any)

  const [palettes, setPalettes] = useState<FabricPaletteDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingCode, setDownloadingCode] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(
    new Set()
  )
  const [selectedPriceCategories, setSelectedPriceCategories] = useState<Set<number>>(new Set())

  const featureToGroupMap = useMemo(() => {
    return buildFeatureToGroupMap(palettes)
  }, [palettes])

  const [infoGroup, setInfoGroup] = useState<{
    name: string
    data: FabricGroupDetail
  } | null>(null)
  const [selectedFabric, setSelectedFabric] = useState<{
    name: string
    imageSrc: string
    groupData: FabricGroupDetail
    itemId?: string
    configId?: string
  } | null>(null)
  const [calloutSettings, setCalloutSettings] =
    useState<FabricCalloutSettings | null>(null)
  const PAGE_SIZE = 12

  const loadPalettes = useCallback(async () => {
    try {
      const data = await getFabricPalettes()
      console.log("[palette-pdf-debug] page loadPalettes result", { total: data.length, withCode: data.filter((p: any) => !!p?.code).length, withoutCode: data.filter((p: any) => !p?.code).length, firstItemKeys: data[0] ? Object.keys(data[0]) : [], firstItemCode: (data[0] as any)?.code ?? null })
      setPalettes(data)
    } catch (error) {
      console.error("[FabricPalettesPage] Error loading palettes:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getFabricCalloutSettings()
      .then((settings) => setCalloutSettings(settings))
      .catch(() => {
        // leave calloutSettings as null — modal falls back to i18n keys
      })
  }, [])

  const actingCustomerId = actingCustomer?.id ?? null
  useEffect(() => {
    if (!customer) {
      return
    }
    loadPalettes()
  }, [customer, actingCustomerId, loadPalettes])

  if (!customer) {
    router.push("/account")
    return null
  }

  const breadcrumbItems = [
    { label: t("breadcrumb-home"), href: "/" },
    { label: t("breadcrumb-my-profile"), href: "/account" },
    { label: t("breadcrumb-fabric-palettes"), href: null },
  ]

  const resolveGroupName = (
    entry: FabricPaletteDetail["fabric_groups"][number]
  ): string => {
    const profileMatch = entry.fabric_group.fabric_group_profiles.find(
      (p) => p.language === backendLang
    )
    if (profileMatch?.name) return profileMatch.name
    if (entry.name) return entry.name
    return `Group ${entry.id}`
  }

  const filteredPalettes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return palettes

    return palettes
      .map((palette) => {
        const filteredGroups = palette.fabric_groups.reduce<
          typeof palette.fabric_groups
        >((acc, entry) => {
          const groupName = resolveGroupName(entry).toLowerCase()
          const groupNameMatches = groupName.includes(query)

          if (groupNameMatches) {
            acc.push(entry)
            return acc
          }

          const matchingFabrics = entry.fabric_group.fabrics.filter(
            (fabric) =>
              (fabric.color_name?.toLowerCase() ?? "").includes(query) ||
              (fabric.code?.toLowerCase() ?? "").includes(query)
          )

          if (matchingFabrics.length > 0) {
            acc.push({
              ...entry,
              fabric_group: {
                ...entry.fabric_group,
                fabrics: matchingFabrics,
              },
            })
          }

          return acc
        }, [])

        return { ...palette, fabric_groups: filteredGroups }
      })
      .filter((palette) => palette.fabric_groups.length > 0)
  }, [palettes, searchQuery, resolveGroupName])

  const featureFilteredPalettes = useMemo(() => {
    if (selectedFeatures.size === 0 && selectedPriceCategories.size === 0)
      return filteredPalettes

    const grouped = groupSelectedFeatures(selectedFeatures, featureToGroupMap)

    return filteredPalettes
      .map((palette) => ({
        ...palette,
        fabric_groups: palette.fabric_groups.filter((entry) => {
          // Feature filter (OR within group, AND across groups)
          if (selectedFeatures.size > 0) {
            const groupFeatureIds = new Set(
              (entry.fabric_group.fabric_features ?? []).map(
                (ff) => ff.fabric_feature.id
              )
            )
            if (!matchesFeatureSelection(groupFeatureIds, grouped)) return false
          }
          // Price category filter (OR logic) - unchanged
          if (selectedPriceCategories.size > 0) {
            const groupPriceCats = new Set(
              (entry.fabric_group.fabric_price_category ?? []).map(
                (pc) => pc.group_number
              )
            )
            if (
              !Array.from(selectedPriceCategories).some((gn) =>
                groupPriceCats.has(gn)
              )
            )
              return false
          }
          return true
        }),
      }))
      .filter((palette) => palette.fabric_groups.length > 0)
  }, [filteredPalettes, selectedFeatures, selectedPriceCategories, featureToGroupMap])

  const allFilteredGroups = useMemo(
    () =>
      featureFilteredPalettes.flatMap((palette) =>
        palette.fabric_groups.map((entry) => ({
          entry,
          groupName: resolveGroupName(entry),
        }))
      ),
    [featureFilteredPalettes, resolveGroupName]
  )

  const sortedGroups = useMemo(
    () =>
      [...allFilteredGroups].sort((a, b) =>
        sortOrder === "asc"
          ? a.groupName.localeCompare(b.groupName)
          : b.groupName.localeCompare(a.groupName)
      ),
    [allFilteredGroups, sortOrder]
  )

  const totalGroups = sortedGroups.length
  const totalPages = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const paginatedGroups = sortedGroups.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )
  const from = totalGroups === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, totalGroups)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortOrder, selectedFeatures, selectedPriceCategories])

  const hasContent =
    palettes.length > 0 && palettes.some((p) => p.fabric_groups.length > 0)

  console.log("[palette-pdf-debug] page render gate", { loading, totalPalettes: palettes.length, withCode: palettes.filter((p: any) => !!p?.code).length, hasContent, totalGroups, buttonsWouldRender: !loading && hasContent && totalGroups !== 0 && palettes.filter((p: any) => !!p?.code).length > 0 })

  return (
    <>
      <PageHeader
        title={t("fabric-palettes.title")}
        description={t("fabric-palettes.description")}
        breadcrumbItems={breadcrumbItems}
      />
      <PageContent>
        <div
          data-testid="fabric-palettes-page-wrapper"
          className="flex flex-col gap-y-8"
        >
          {hasContent && (
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("fabric-palettes.search-placeholder")}
            />
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800" />
            </div>
          ) : !hasContent ? (
            <p className="text-gray-500">{t("fabric-palettes.empty")}</p>
          ) : totalGroups === 0 ? (
            <p className="text-gray-500">{t("fabric-palettes.no-results")}</p>
          ) : (
            <>
              <div className="hidden md:flex items-center justify-between gap-4">
                {totalGroups > 0 && (
                  <p className="text-sm text-gray-600">
                    {t("fabric-palettes.showing-groups", {
                      from,
                      to,
                      total: totalGroups,
                    })}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {palettes
                    .filter((p) => p.code)
                    .map((p) => (
                      <button
                        key={p.id}
                        disabled={downloadingCode === p.code}
                        onClick={async () => {
                          setDownloadingCode(p.code)
                          try {
                            const response = await fetch(
                              `/api/download-palette/${p.code}`
                            )
                            const blob = await response.blob()
                            const url = URL.createObjectURL(blob)
                            const anchor = document.createElement("a")
                            anchor.href = url
                            anchor.download = `${p.code}.pdf`
                            anchor.click()
                            URL.revokeObjectURL(url)
                          } finally {
                            setDownloadingCode(null)
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gold hover:text-gold/80 transition-colors${downloadingCode === p.code ? " opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {downloadingCode === p.code ? (
                          <svg
                            className="animate-spin flex-shrink-0 w-[18px] h-[18px]"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="flex-shrink-0 w-[18px] h-[18px]"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        )}
                        <span>PDF</span>
                      </button>
                    ))}
                  <FabricFeatureFilterModal
                    palettes={palettes}
                    selectedFeatures={selectedFeatures}
                    selectedPriceCategories={selectedPriceCategories}
                    onApply={(features, priceCategories) => {
                      setSelectedFeatures(features)
                      setSelectedPriceCategories(priceCategories)
                    }}
                    language={backendLang}
                    labels={{
                      filter: tc("filter"),
                      clearAll: tc("clear-filters"),
                      showResults: tc("show-results"),
                      priceCategory: tc("price-category"),
                    }}
                  />
                  <SortSelect
                    options={[
                      {
                        value: "asc",
                        label: t("fabric-palettes.sort-name-asc"),
                      },
                      {
                        value: "desc",
                        label: t("fabric-palettes.sort-name-desc"),
                      },
                    ]}
                    value={sortOrder}
                    onChange={(value) => setSortOrder(value as "asc" | "desc")}
                  />
                </div>
              </div>

              <div>
                {paginatedGroups.map(({ entry, groupName }) => {
                  const sortedFabrics = [...entry.fabric_group.fabrics].sort(
                    (a, b) => a.order - b.order
                  )

                  return (
                    <div key={entry.id}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">{groupName}</h2>
                        <button
                          onClick={() =>
                            setInfoGroup({
                              name: groupName,
                              data: entry.fabric_group,
                            })
                          }
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-gold hover:bg-gold/90 text-white transition-colors flex-shrink-0"
                          aria-label="Group info"
                        >
                          <Info className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                        {sortedFabrics.map((fabric) => (
                          <div key={fabric.id} className="flex flex-col gap-2">
                            <div
                              className={`relative aspect-[2/1] overflow-hidden bg-gold-20 ${fabric.image ? "cursor-zoom-in group" : ""}`}
                              onClick={() => {
                                if (fabric.image) {
                                  setSelectedFabric({
                                    name: fabric.color_name || fabric.code,
                                    imageSrc: fabric.image.src || fabric.image.src_md || fabric.image.src_thumbnail || '',
                                    groupData: entry.fabric_group,
                                    itemId: entry.fabric_group.code,
                                    configId: fabric.code,
                                  })
                                }
                              }}
                            >
                              {fabric.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={
                                    fabric.image.src_md ||
                                    fabric.image.src ||
                                    fabric.image.src_thumbnail
                                  }
                                  alt={fabric.color_name || fabric.code}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              )}
                              {fabric.image && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              )}
                            </div>
                            <p className="text-sm text-gray-700 truncate">
                              {fabric.color_name || fabric.code}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <TablePagination
                currentPage={safePage}
                totalPages={totalPages}
                totalCount={totalGroups}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </PageContent>

      {infoGroup && (
        <FabricGroupInfoModal
          isOpen={!!infoGroup}
          onClose={() => setInfoGroup(null)}
          groupName={infoGroup.name}
          groupData={infoGroup.data}
          languageCode={languageCode}
        />
      )}
      {selectedFabric && (
        <FabricImageModal
          isOpen={!!selectedFabric}
          onClose={() => setSelectedFabric(null)}
          fabricName={selectedFabric.name}
          imageSrc={selectedFabric.imageSrc}
          groupData={selectedFabric.groupData}
          languageCode={backendLang}
          itemId={selectedFabric.itemId}
          configId={selectedFabric.configId}
          calloutSettings={calloutSettings}
        />
      )}
    </>
  )
}
