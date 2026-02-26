import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import {
  CategoryProductsResponse,
  SortedByCategoryPositionResponse,
  SearchProductsResponse,
  FurnisystemsProductDetail,
  ProductContainer,
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
        meta_information {
          permalink
        }
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
        meta_information {
          permalink
        }
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
    $sortBy: CategoryProductSortBy
    $language: String
    $selectedCategoryIds: [Int!]
  ) {
    sortedByCategoryPositionProductContainers(
      categoryPermalink: $categoryPermalink
      page: $page
      take: $take
      where: $where
      sortBy: $sortBy
      language: $language
      selectedCategoryIds: $selectedCategoryIds
    ) {
      numberOfPages
      productsCount
      sortedProductContainers {
        ...ProductCardFields
      }
    }
  }
`

const SEARCH_PRODUCTS = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query SearchProducts(
    $searchTerm: String!
    $language: Language!
    $take: Int!
    $page: Int!
    $where: ProductContainerWhereInput
  ) {
    sortedBySearchTermPositionProductContainers(
      searchTerm: $searchTerm
      language: $language
      take: $take
      page: $page
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

const GET_PRODUCT_BY_PERMALINK = gql`
  query GetProductByPermalink($permalink: String!, $language: Language) {
    findFirstProductContainer(
      where: {
        OR: [
          {
            single_product: {
              is: {
                product_profiles: {
                  some: {
                    meta_information: {
                      is: { permalink: { equals: $permalink } }
                    }
                    language: { equals: $language }
                  }
                }
              }
            }
          }
          {
            advanced_product: {
              is: {
                advanced_product_profiles: {
                  some: {
                    meta_information: {
                      is: { permalink: { equals: $permalink } }
                    }
                    language: { equals: $language }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      id
      type
      single_product {
        id
        product_profiles(where: { language: { equals: $language } }) {
          name
          description
          short_description
          language
          meta_information {
            permalink
          }
        }
        images {
          id
          src
          src_md
          display_order
        }
      }
      advanced_product {
        id
        advanced_product_profiles(where: { language: { equals: $language } }) {
          name
          description
          language
          meta_information {
            permalink
          }
        }
        images {
          id
          src
          src_md
          display_order
        }
      }
      primary_category {
        id
        is_root_category
        category_profiles(where: { language: { equals: $language } }) {
          name
          language
          meta_information {
            permalink
          }
        }
        parent_category {
          id
          is_root_category
          category_profiles(where: { language: { equals: $language } }) {
            name
            language
            meta_information {
              permalink
            }
          }
          parent_category {
            id
            is_root_category
            category_profiles(where: { language: { equals: $language } }) {
              name
              language
              meta_information {
                permalink
              }
            }
          }
        }
      }
      product_features(orderBy: [{ display_order: asc }]) {
        product_feature {
          photo {
            src_xs
            src
          }
          product_feature_profiles {
            name
            description
            language
          }
        }
      }
    }
  }
`

export class ProductsModule {
  constructor(private client: GraphQLClient) {}

  buildWhereFilter(
    language: string,
    customerTagIds?: number[],
    priceListIds?: number[]
  ) {
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

    where.AND = []

    if (customerTagIds && customerTagIds.length > 0) {
      where.AND.push({
        tags: {
          some: {
            id: { in: customerTagIds },
          },
        },
      })
    }

    if (priceListIds && priceListIds.length > 0) {
      const priceListSelect = {
        price_listId: {
          in: priceListIds,
        },
      }

      const priceFilter = {
        OR: [
          // Single products always pass through
          {
            single_product: {
              isNot: null,
            },
          },
          // Advanced products must have pricing matching customer's price lists
          {
            advanced_product: {
              is: {
                OR: [
                  {
                    base_prices: {
                      some: priceListSelect,
                    },
                  },
                  {
                    sofa_forms: {
                      some: {
                        form_price_fabric_category: {
                          some: priceListSelect,
                        },
                      },
                    },
                  },
                  {
                    advanced_product_price_fabric_category: {
                      some: priceListSelect,
                    },
                  },
                  {
                    additional_component_to_advanced_product: {
                      some: {
                        price_fabric_category: {
                          some: priceListSelect,
                        },
                      },
                    },
                  },
                  {
                    additional_component_to_advanced_product: {
                      some: {
                        extra_prices: {
                          some: priceListSelect,
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      }

      where.AND.push(priceFilter)
    }

    return where
  }

  async getCategoryProducts(params: {
    permalink: string
    page: number
    perPage?: number
    where?: any
    sortBy?: string
    language?: string
    selectedCategoryIds?: number[]
  }): Promise<CategoryProductsResponse> {
    const { permalink, page, perPage = 28, where, sortBy, language, selectedCategoryIds } = params

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
              sortBy,
              language,
              selectedCategoryIds: selectedCategoryIds?.length ? selectedCategoryIds : null,
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

  async searchProducts(
    searchTerm: string,
    language: string,
    take?: number,
    page?: number,
    where?: any
  ): Promise<CategoryProductsResponse> {
    console.log("Searching products with:", {
      searchTerm,
      language,
      take,
      page,
      where,
    })
    try {
      const response = await this.client.query<SearchProductsResponse>(
        SEARCH_PRODUCTS,
        {
          variables: {
            searchTerm,
            language,
            take,
            page,
            where,
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )

      return response.sortedBySearchTermPositionProductContainers
    } catch (error) {
      console.error(`Error searching products for "${searchTerm}":`, error)
      return {
        numberOfPages: 0,
        productsCount: 0,
        sortedProductContainers: [],
      }
    }
  }

  async getNewestProducts(
    take: number,
    language: string
  ): Promise<ProductContainer[]> {
    try {
      const response = await this.client.query<{
        findManyProductContainer: ProductContainer[]
      }>(
        gql`
          ${PRODUCT_CARD_FRAGMENT}
          query GetNewestProducts($take: Int!, $language: Language) {
            findManyProductContainer(
              take: $take
              orderBy: { createdAt: desc }
              where: {
                visible: { equals: true }
                OR: [
                  {
                    single_product: {
                      is: {
                        product_profiles: {
                          some: { language: { equals: $language } }
                        }
                      }
                    }
                  }
                  {
                    advanced_product: {
                      is: {
                        advanced_product_profiles: {
                          some: { language: { equals: $language } }
                        }
                      }
                    }
                  }
                ]
              }
            ) {
              ...ProductCardFields
            }
          }
        `,
        {
          variables: { take, language },
          fetchPolicy: "no-cache",
        }
      )
      return response?.findManyProductContainer ?? []
    } catch (error) {
      console.error("Error fetching newest products:", error)
      return []
    }
  }

  async getProductsByIds(
    ids: number[],
    language: string
  ): Promise<ProductContainer[]> {
    if (ids.length === 0) return []
    try {
      const response = await this.client.query<{
        findManyProductContainer: ProductContainer[]
      }>(
        gql`
          ${PRODUCT_CARD_FRAGMENT}
          query GetProductsByIds($ids: [Int!]!, $language: Language) {
            findManyProductContainer(
              where: {
                id: { in: $ids }
                visible: { equals: true }
                OR: [
                  {
                    single_product: {
                      is: {
                        product_profiles: {
                          some: { language: { equals: $language } }
                        }
                      }
                    }
                  }
                  {
                    advanced_product: {
                      is: {
                        advanced_product_profiles: {
                          some: { language: { equals: $language } }
                        }
                      }
                    }
                  }
                ]
              }
            ) {
              ...ProductCardFields
            }
          }
        `,
        {
          variables: { ids, language },
          fetchPolicy: "no-cache",
        }
      )
      return response?.findManyProductContainer ?? []
    } catch (error) {
      console.error("Error fetching products by IDs:", error)
      return []
    }
  }

  async getProductByPermalink(
    permalink: string,
    language?: string
  ): Promise<FurnisystemsProductDetail | null> {
    // Raw GraphQL response type (permalink nested under meta_information)
    type RawProfile = {
      name: string
      description: string | null
      short_description: string | null
      language: string
      meta_information: { permalink: string } | null
    }
    type RawResponse = {
      findFirstProductContainer: {
        id: number
        type: string
        single_product: {
          id: number
          product_profiles: RawProfile[]
          images: {
            id: number
            src: string
            src_md: string | null
            display_order: number
          }[]
        } | null
        advanced_product: {
          id: number
          advanced_product_profiles: RawProfile[]
          images: {
            id: number
            src: string
            src_md: string | null
            display_order: number
          }[]
        } | null
        primary_category: {
          id: number
          is_root_category?: boolean
          category_profiles: {
            name: string
            language: string
            meta_information: { permalink: string } | null
          }[]
          parent_category?: {
            id: number
            is_root_category?: boolean
            category_profiles: {
              name: string
              language: string
              meta_information: { permalink: string } | null
            }[]
            parent_category?: {
              id: number
              is_root_category?: boolean
              category_profiles: {
                name: string
                language: string
                meta_information: { permalink: string } | null
              }[]
            } | null
          } | null
        } | null
        product_features: {
          product_feature: {
            photo: {
              src_xs: string | null
              src: string
            } | null
            product_feature_profiles: {
              name: string
              description: string | null
              language: string
            }[]
          }
        }[] | null
      } | null
    }

    try {
      const response = await this.client.query<RawResponse>(
        GET_PRODUCT_BY_PERMALINK,
        {
          variables: {
            permalink,
            ...(language ? { language: language.toLowerCase() } : {}),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )

      const container = response.findFirstProductContainer
      if (!container) return null

      // Flatten meta_information.permalink to permalink on profiles
      const flattenProfiles = (profiles: RawProfile[]) =>
        profiles.map((p) => ({
          name: p.name,
          description: p.description,
          short_description: p.short_description,
          language: p.language,
          permalink: p.meta_information?.permalink ?? "",
        }))

      return {
        ...container,
        single_product: container.single_product
          ? {
              ...container.single_product,
              product_profiles: flattenProfiles(
                container.single_product.product_profiles
              ),
            }
          : null,
        advanced_product: container.advanced_product
          ? {
              ...container.advanced_product,
              advanced_product_profiles: flattenProfiles(
                container.advanced_product.advanced_product_profiles
              ),
            }
          : null,
      }
    } catch (error) {
      console.error(
        `Error fetching product with permalink "${permalink}":`,
        error
      )
      return null
    }
  }
}

export * from "./types"
