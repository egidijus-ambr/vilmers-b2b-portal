"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getCustomerFilterData } from "./customer"
import { getRegion, retrieveRegion } from "./regions"
import { ContentBlock, ProductContainer } from "@lib/furnisystems-sdk"

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = (_pageParam === 1) ? 0 : (_pageParam - 1) * limit;

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}

export async function enrichContentBlocksWithProducts(
  blocks: ContentBlock[],
  language: string
): Promise<ContentBlock[]> {
  if (!blocks.some((block) => block.type === "product_grid")) {
    return blocks
  }

  // Build filter based on customer tags and price lists so home-page grids
  // only show products the logged-in customer is allowed to see (mirrors the
  // category / search filtering applied elsewhere).
  const { customerTagIds, priceListIds } = await getCustomerFilterData()
  const where = sdk.products.buildWhereFilter(
    language,
    customerTagIds,
    priceListIds
  )

  // Process each product_grid block
  const enrichedBlocks = await Promise.all(
    blocks.map(async (block) => {
      if (block.type !== "product_grid") {
        return block
      }

      const config = block.config as {
        mode?: string
        max_products?: number
      } | null
      const mode = config?.mode || "newest"
      const maxProducts = config?.max_products || 8

      let products: ProductContainer[] = []

      if (mode === "newest") {
        products = await sdk.products.getNewestProducts(
          maxProducts,
          language,
          where
        )
      } else if (mode === "manual") {
        const productIds = (block.product_containers ?? []).map(
          (pc) => pc.id
        )
        if (productIds.length > 0) {
          products = await sdk.products.getProductsByIds(
            productIds,
            language,
            where
          )
        }
      }

      return {
        ...block,
        products,
      }
    })
  )

  return enrichedBlocks
}
