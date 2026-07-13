import { redirect, notFound } from "next/navigation"
import { getProductByPermalink } from "@lib/data/furnisystems-products"
import { listMenuCategories } from "@lib/data/categories"
import { getCustomerFilterData } from "@lib/data/customer"
import { getShowAllProductsActive } from "@lib/data/show-all-products"
import Breadcrumb, { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import ConfiguratorPageClient from "./configurator-page-client"
import { features } from "@lib/features"

type Props = {
  params: Promise<{ handle: string; languageCode: string }>
}

export default async function ConfiguratorPage({ params }: Props) {
  const { handle, languageCode } = await params

  if (!features.configurator) {
    redirect(`/${languageCode}/products/${handle}`)
  }

  const [{ priceListIds }, showAllProducts, menuCategories] = await Promise.all([
    getCustomerFilterData(),
    getShowAllProductsActive(),
    listMenuCategories(languageCode),
  ])

  const product = await getProductByPermalink(handle, languageCode, priceListIds)

  if (!product) {
    notFound()
  }

  const isAdvancedProduct = product.type === "ADVANCED_PRODUCT" || !!product.advanced_product

  if (!isAdvancedProduct) {
    redirect(`/${languageCode}/products/${handle}`)
  }

  // Build breadcrumbs: Home → category chain → Product (clickable) → Configurator (unclickable)
  const isAdvanced = isAdvancedProduct
  const profiles = isAdvanced
    ? product.advanced_product?.advanced_product_profiles ?? []
    : product.single_product?.product_profiles ?? []
  const profile = profiles[0]
  const productTitle = profile?.name ?? "Product"

  const rootCategory = menuCategories.find((c) => c.is_root_category)

  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }]

  if (product.primary_category) {
    const chain: typeof product.primary_category[] = []
    let current: typeof product.primary_category | null = product.primary_category
    while (current) {
      chain.push(current)
      current = current.parent_category ?? null
    }
    chain.reverse()

    const hasRoot =
      rootCategory && chain.some((c) => c.id === rootCategory.id)

    if (!hasRoot && rootCategory) {
      const rootProfile = rootCategory.category_profiles?.[0]
      if (rootProfile) {
        const permalink = rootProfile.meta_information?.permalink
        breadcrumbs.push({
          label: rootProfile.name,
          href: permalink ? `/categories/${permalink}` : null,
        })
      }
    }

    for (const cat of chain) {
      const catProfile = cat.category_profiles?.[0]
      if (catProfile) {
        const permalink = catProfile.meta_information?.permalink
        breadcrumbs.push({
          label: catProfile.name,
          href: permalink ? `/categories/${permalink}` : null,
        })
      }
    }
  }

  // Product crumb is clickable (links back to PDP); Configurator is the unclickable current page
  breadcrumbs.push({ label: productTitle, href: `/products/${handle}` })
  // TODO: i18n — add "configurator" key to locale files when translations are available
  breadcrumbs.push({ label: "Configurator", href: null })

  return (
    <>
      <div className="bg-page-background w-full px-6 large:px-0">
        <div className="content-container py-4">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>
      <div className="content-container px-6 large:px-0">
        <ConfiguratorPageClient
          productContainerId={product.id}
          languageCode={languageCode}
          priceListId={1}
          showAllProducts={showAllProducts}
          handle={handle}
        />
      </div>
    </>
  )
}
