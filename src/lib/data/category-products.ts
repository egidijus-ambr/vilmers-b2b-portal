import { sdk } from "@lib/config"
import { retrieveCustomer } from "./customer"
import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"

function filterByPricelist(
  containers: ProductContainer[],
  priceListId?: string
): ProductContainer[] {
  if (!priceListId) return containers

  return containers.filter((container) => {
    // Single products always pass through
    if (container.type === "SingleProduct" || container.single_product) {
      return true
    }

    // Advanced products must have a base_price entry matching the customer's priceListId
    if (container.advanced_product) {
      return container.advanced_product.base_prices.some(
        (bp) => bp.price_listId === parseInt(priceListId)
      )
    }

    return true
  })
}

export async function getCategoryProducts(
  categoryPermalink: string,
  language: string,
  page: number = 1
) {
  // Get customer data for filtering (null if not authenticated)
  let customer = null
  try {
    customer = await retrieveCustomer()
  } catch {
    // Not authenticated — show all products
  }

  // Build filter based on customer tags
  const customerTagIds = customer?.tags?.map((t) => t.id)
  const where = sdk.products.buildWhereFilter(language, customerTagIds)

  // Fetch products
  const result = await sdk.products.getCategoryProducts({
    permalink: categoryPermalink,
    page,
    perPage: 28,
    where,
  })

  // Filter advanced products by customer's pricelist
  const filteredProducts = filterByPricelist(
    result.sortedProductContainers,
    customer?.price_listId
  )

  return {
    products: filteredProducts,
    totalPages: result.numberOfPages,
    totalCount: result.productsCount,
    currentPage: page,
  }
}
