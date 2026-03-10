import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductByPermalink } from "@lib/data/furnisystems-products"
import { listMenuCategories } from "@lib/data/categories"
import { FurnisystemsProductDetail } from "@lib/furnisystems-sdk/modules/products/types"
import type { LinkedProductType, ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import type { CategoryData } from "@lib/furnisystems-sdk"
import ProductTemplate, { ProductPageData } from "@modules/products/templates"
import { BreadcrumbItem } from "@modules/common/components/breadcrumb"
import type { ProductPageFeature } from "@modules/products/components/product-features-display"

export type LinkedProductGroup = {
  type: LinkedProductType
  products: ProductContainer[]
}

type Props = {
  params: Promise<{ handle: string; languageCode: string }>
}

function mapFurnisystemsProduct(
  container: FurnisystemsProductDetail,
  languageCode: string,
  rootCategory?: CategoryData
): ProductPageData {
  const isAdvanced = container.type === "ADVANCED_PRODUCT" || !!container.advanced_product

  const profiles = isAdvanced
    ? container.advanced_product?.advanced_product_profiles ?? []
    : container.single_product?.product_profiles ?? []

  const profile = profiles[0]

  const images = isAdvanced
    ? container.advanced_product?.images ?? []
    : container.single_product?.images ?? []

  const sortedImages = [...images].sort(
    (a, b) => a.display_order - b.display_order
  )

  // Build breadcrumbs (hrefs without language prefix — LocalizedClientLink adds it)
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }]

  if (container.primary_category) {
    // Walk up the parent chain, collect ancestors
    const chain: typeof container.primary_category[] = []
    let current: typeof container.primary_category | null = container.primary_category
    while (current) {
      chain.push(current)
      current = current.parent_category ?? null
    }
    // Reverse so it goes root → ... → primary_category
    chain.reverse()

    // Check if root is already in the chain
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

  breadcrumbs.push({ label: profile?.name ?? "Product", href: null })

  // Map product features (select correct language profile)
  const features: ProductPageFeature[] = (container.product_features ?? [])
    .map(f => {
      const featureProfile = f.product_feature.product_feature_profiles.find(
        p => p.language.toLowerCase() === languageCode.toLowerCase()
      ) ?? f.product_feature.product_feature_profiles[0]

      if (!featureProfile) return null

      return {
        name: featureProfile.name,
        description: featureProfile.description ?? null,
        imageUrl: f.product_feature.photo?.src_xs ?? f.product_feature.photo?.src ?? null,
      }
    })
    .filter((f): f is ProductPageFeature => f !== null)

  // Group linked products by type
  const linkedProductGroups: LinkedProductGroup[] = []
  if (container.linked_products_as_source) {
    const groupMap = new Map<LinkedProductType, ProductContainer[]>()
    for (const lp of container.linked_products_as_source) {
      const type = lp.link_type as LinkedProductType
      if (!groupMap.has(type)) groupMap.set(type, [])
      groupMap.get(type)!.push(lp.target_product)
    }
    Array.from(groupMap.entries()).forEach(([type, products]) => {
      linkedProductGroups.push({ type, products })
    })
  }

  return {
    id: String(container.id),
    title: profile?.name ?? "Product",
    description: profile?.description ?? null,
    images: sortedImages,
    productName: profile?.name?.split(' ')[0] ?? null,
    breadcrumbs,
    features,
    linkedProductGroups,
    languageCode,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, languageCode } = await params
  const product = await getProductByPermalink(handle, languageCode)

  if (!product) {
    return { title: "Product Not Found" }
  }

  const isAdvanced = product.type === "ADVANCED_PRODUCT" || !!product.advanced_product
  const profile = isAdvanced
    ? product.advanced_product?.advanced_product_profiles?.[0]
    : product.single_product?.product_profiles?.[0]

  const shortDesc = !isAdvanced
    ? (product.single_product?.product_profiles?.[0]?.short_description ?? null)
    : null

  const images = isAdvanced
    ? product.advanced_product?.images ?? []
    : product.single_product?.images ?? []

  const firstImage = [...images].sort(
    (a, b) => a.display_order - b.display_order
  )[0]

  const productTitle = profile?.name ?? "Product"

  const ogImages = firstImage?.src
    ? [
        {
          url: firstImage.src,
          width: 1200,
          height: 630,
          alt: `${productTitle} - Vilmers`,
        },
      ]
    : undefined

  return {
    title: productTitle,
    description: shortDesc ?? profile?.description ?? "",
    ...(ogImages && {
      openGraph: {
        images: ogImages,
      },
      twitter: {
        card: "summary_large_image",
        images: [firstImage.src],
      },
    }),
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle, languageCode } = await params
  const [product, menuCategories] = await Promise.all([
    getProductByPermalink(handle, languageCode),
    listMenuCategories(languageCode),
  ])

  if (!product) {
    notFound()
  }

  const rootCategory = menuCategories.find((c) => c.is_root_category)
  const productData = mapFurnisystemsProduct(product, languageCode, rootCategory)

  return <ProductTemplate product={productData} />
}
