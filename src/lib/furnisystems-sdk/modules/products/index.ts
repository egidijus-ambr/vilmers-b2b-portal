import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import {
  CategoryProductsResponse,
  SortedByCategoryPositionResponse,
} from "./types"

const PRODUCT_CARD_FRAGMENT = gql`
  fragment ProductCardFields on ProductContainer {
    id
    type
    discount {
      id
      discount
      active
      startDate
      expiryDate
    }
    single_product {
      id
      price
      images {
        id
        src
        src_md
        src_xs
        src_thumbnail
        display_order
      }
      product_profiles {
        id
        name
        language
      }
    }
    advanced_product {
      id
      price_from
      base_prices {
        price_from
        price
        price_listId
      }
      images {
        id
        src
        src_md
        src_xs
        src_thumbnail
        display_order
      }
      advanced_product_profiles {
        id
        name
        language
      }
    }
  }
`

const GET_CATEGORY_PRODUCTS = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query GetCategoryProducts(
    $categoryPermalink: String!
    $page: Int!
    $take: Int!
    $where: ProductContainerWhereInput
  ) {
    sortedByCategoryPositionProductContainers(
      categoryPermalink: $categoryPermalink
      page: $page
      take: $take
      where: $where
    ) {
      numberOfPages
      productsCount
      sortedProductContainers {
        ...ProductCardFields
      }
    }
  }
`

export class ProductsModule {
  constructor(private client: GraphQLClient) {}

  buildWhereFilter(language: string, customerTagIds?: number[]) {
    const where: any = {
      OR: [
        {
          single_product: {
            is: {
              product_profiles: {
                some: { language: { equals: language } },
              },
            },
          },
        },
        {
          advanced_product: {
            is: {
              advanced_product_profiles: {
                some: { language: { equals: language } },
              },
            },
          },
        },
      ],
    }

    if (customerTagIds && customerTagIds.length > 0) {
      where.tags = {
        some: {
          id: { in: customerTagIds },
        },
      }
    }

    return where
  }

  async getCategoryProducts(params: {
    permalink: string
    page: number
    perPage?: number
    where?: any
  }): Promise<CategoryProductsResponse> {
    const { permalink, page, perPage = 28, where } = params

    try {
      const response =
        await this.client.query<SortedByCategoryPositionResponse>(
          GET_CATEGORY_PRODUCTS,
          {
            variables: {
              categoryPermalink: permalink,
              page,
              take: perPage,
              where,
            },
            fetchPolicy: "no-cache",
            errorPolicy: "all",
          }
        )

      return response.sortedByCategoryPositionProductContainers
    } catch (error) {
      console.error(
        `Error fetching category products for "${permalink}":`,
        error
      )
      return {
        numberOfPages: 0,
        productsCount: 0,
        sortedProductContainers: [],
      }
    }
  }
}

export * from "./types"
