import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductByPermalink } from "@lib/data/furnisystems-products"
import { FurnisystemsProductDetail } from "@lib/furnisystems-sdk/modules/products/types"
import ProductTemplate, { ProductPageData } from "@modules/products/templates"
import { BreadcrumbItem } from "@modules/common/components/breadcrumb"

type Props = {
  params: Promise<{ handle: string; languageCode: string }>
}

function mapFurnisystemsProduct(
  container: FurnisystemsProductDetail,
  languageCode: string
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
  const mainImage = sortedImages[0]
  const imageUrl = mainImage ? mainImage.src_md || mainImage.src : null

  // Build breadcrumbs (hrefs without language prefix — LocalizedClientLink adds it)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
  ]

  if (container.primary_category) {
    const catProfile = container.primary_category.category_profiles[0]
    if (catProfile) {
      const catPermalink = catProfile.meta_information?.permalink
      breadcrumbs.push({
        label: catProfile.name,
        href: catPermalink ? `/categories/${catPermalink}` : "/",
      })
    }
  }

  breadcrumbs.push({
    label: profile?.name ?? "Product",
    href: null,
  })

  return {
    id: String(container.id),
    title: profile?.name ?? "Product",
    description: profile?.description ?? null,
    imageUrl,
    breadcrumbs,
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

  return {
    title: profile?.name ?? "Product",
    description: shortDesc ?? profile?.description ?? "",
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle, languageCode } = await params
  const product = await getProductByPermalink(handle, languageCode)

  if (!product) {
    notFound()
  }

  const productData = mapFurnisystemsProduct(product, languageCode)

  return <ProductTemplate product={productData} />
}
