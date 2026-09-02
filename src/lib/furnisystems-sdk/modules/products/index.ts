import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import {
  CategoryProductNamesResponse,
  CategoryProductsResponse,
  SortedByCategoryPositionResponse,
  SortedByCollectionPositionResponse,
  SearchProductsResponse,
  FurnisystemsProductDetail,
  ProductContainer,
} from "./types"
import type { ContentBlock } from "../shop-settings/types"

const PRODUCT_CARD_FRAGMENT = gql`
  fragment ProductCardFields on ProductContainer {
    id
    type
    reference
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
      category_photo {
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
      category_photo {
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
    primary_category {
      id
      category_profiles {
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

// Collections have no sortBy/orderBy/selectedCategoryIds args — ordering is
// fixed server-side by collection position. `$lang` is declared as the
// `Language` enum (not `String`) because it is referenced directly inside
// the query document (inline `equals: $lang`), which requires the
// declared variable type to match the schema's enum type exactly.
const GET_COLLECTION_PRODUCTS = gql`
  ${PRODUCT_CARD_FRAGMENT}
  query GetCollectionProducts(
    $permalink: String!
    $page: Int!
    $take: Int!
    $where: ProductContainerWhereInput
    $lang: Language!
  ) {
    sortedByCollectionPositionProductContainers(
      collectionPermalink: $permalink
      page: $page
      take: $take
      where: {
        AND: [
          $where
          {
            OR: [
              {
                single_product: {
                  is: {
                    product_profiles: { some: { language: { equals: $lang } } }
                  }
                }
              }
              {
                advanced_product: {
                  is: {
                    advanced_product_profiles: {
                      some: { language: { equals: $lang } }
                    }
                  }
                }
              }
            ]
          }
        ]
      }
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

// Mirrors the pages module's CONTENT_BLOCK_FIELDS for the fields that feed
// grid-type block hydration (enrichContentBlocksWithProducts /
// enrichContentBlocksWithTileCategories / enrichContentBlocksWithPages, all
// in src/lib/data/). Those hydration functions read only `config` (mode,
// max_products, tag_ids, category_ids, page_ids, parent_id, ...) and, for
// product_grid's manual mode, `product_containers { id }` — page_grid and
// category_tiles need no extra selection beyond `config`, since their
// `grid_pages`/`grid_tags`/`categories` are populated by a post-query
// hydration step, not selected directly here (same as the pages fragment).
// Deliberately NOT mirroring cta_link_page/cta_link_category/`ancestors`:
// those require the enclosing operation to declare `$language: Language!`
// (see pages/index.ts's CONTENT_BLOCK_FIELDS comment), but
// GetProductByPermalink below declares `$language: Language` (nullable,
// sometimes omitted) — adding an `ancestors(language: $language)` selection
// here would fail GraphQL variable-usage validation server-side.
const PRODUCT_CONTENT_BLOCK_FRAGMENT = gql`
  fragment ProductContentBlockFields on ContentBlock {
    id
    type
    style
    video_link
    video_type
    video_autoplay
    video_loop
    arrangement
    main_image {
      id
      src
    }
    gallery_images(orderBy: { display_order: asc }) {
      id
      src
      display_order
    }
    content_block_profiles {
      id
      name
      description
      description_format
      link
      language
    }
    default_margins
    max_height
    max_width
    min_height
    min_width
    top_margin
    bottom_margin
    left_margin
    right_margin
    background_color
    text_color
    media_max_height
    media_max_width
    media_min_height
    media_min_width
    object_fit_cover
    link_new_tab
    link_page {
      id
      page_profiles {
        slug
        language
      }
    }
    extra_css
    linked_items {
      id
      title
      link
      arrangement
      image {
        id
        src
      }
    }
    config
    product_containers {
      id
    }
  }
`

const GET_PRODUCT_BY_PERMALINK = gql`
  ${PRODUCT_CARD_FRAGMENT}
  ${PRODUCT_CONTENT_BLOCK_FRAGMENT}
  query GetProductByPermalink(
    $where: ProductContainerWhereInput!
    $language: Language
  ) {
    findFirstProductContainer(where: $where) {
      id
      type
      reference
      content_blocks(orderBy: { arrangement: asc }) {
        ...ProductContentBlockFields
      }
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
        category_photo {
          id
          src
          src_md
          src_xs
          src_thumbnail
          display_order
        }
        gallery_photos {
          id
          src
          src_md
          src_xs
          src_thumbnail
          display_order
        }
      }
      advanced_product {
        id
        advanced_product_type
        advanced_product_profiles(where: { language: { equals: $language } }) {
          name
          description
          language
          meta_information {
            permalink
          }
        }
        category_photo {
          id
          src
          src_md
          src_xs
          src_thumbnail
          display_order
        }
        gallery_photos {
          id
          src
          src_md
          src_xs
          src_thumbnail
          display_order
        }
        additional_component_to_advanced_product(
          where: { enabled: { equals: true } }
        ) {
          additional_component {
            id
            is_wrapper
            code
            additional_component_group {
              id
              code
              additional_component_group_profiles(
                where: { language: { equals: $language } }
              ) {
                name
                language
              }
            }
            additional_component_profiles(
              where: { language: { equals: $language } }
            ) {
              name
              description
              language
            }
            image {
              src
              src_md
              src_xs
            }
            linked_components_source(orderBy: { display_order: asc }) {
              id
              link_type
              display_order
              target_component {
                id
                code
                additional_component_group {
                  code
                  additional_component_group_profiles(
                    where: { language: { equals: $language } }
                  ) {
                    name
                    language
                  }
                }
                additional_component_profiles(
                  where: { language: { equals: $language } }
                ) {
                  name
                  description
                  language
                }
                image {
                  src
                  src_md
                  src_xs
                }
              }
            }
          }
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
      linked_products_as_source(orderBy: [{ display_order: asc }]) {
        link_type
        display_order
        target_product {
          ...ProductCardFields
        }
      }
    }
  }
`

const GET_CATEGORY_PRODUCT_NAMES = gql`
  query GetCategoryProductNames(
    $categoryPermalink: String!
    $where: ProductContainerWhereInput
    $language: String!
    $selectedCategoryIds: [Int!]
  ) {
    categoryProductNames(
      categoryPermalink: $categoryPermalink
      where: $where
      language: $language
      selectedCategoryIds: $selectedCategoryIds
    ) {
      names
      totalCount
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
    const {
      permalink,
      page,
      perPage = 28,
      where,
      sortBy,
      language,
      selectedCategoryIds,
    } = params

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
              selectedCategoryIds: selectedCategoryIds?.length
                ? selectedCategoryIds
                : null,
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

  async getCollectionProducts(params: {
    permalink: string
    page: number
    perPage?: number
    where?: any
    language: string
  }): Promise<CategoryProductsResponse> {
    const { permalink, page, perPage = 28, where, language } = params

    try {
      const response =
        await this.client.query<SortedByCollectionPositionResponse>(
          GET_COLLECTION_PRODUCTS,
          {
            variables: {
              permalink,
              page,
              take: perPage,
              where: where ?? {},
              lang: language.toLowerCase(),
            },
            fetchPolicy: "no-cache",
            errorPolicy: "all",
          }
        )
      return response.sortedByCollectionPositionProductContainers
    } catch (error) {
      console.error(
        `Error fetching collection products for "${permalink}":`,
        error
      )
      return {
        numberOfPages: 0,
        productsCount: 0,
        sortedProductContainers: [],
      }
    }
  }

  async getCategoryProductNames(params: {
    permalink: string
    where?: any
    language: string
    selectedCategoryIds?: number[]
  }): Promise<CategoryProductNamesResponse> {
    const { permalink, where, language, selectedCategoryIds } = params

    try {
      const response = await this.client.query<{
        categoryProductNames: CategoryProductNamesResponse
      }>(GET_CATEGORY_PRODUCT_NAMES, {
        variables: {
          categoryPermalink: permalink,
          where,
          language,
          selectedCategoryIds: selectedCategoryIds?.length
            ? selectedCategoryIds
            : null,
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })
      return response.categoryProductNames
    } catch (error) {
      console.error(
        `Error fetching category product names for "${permalink}":`,
        error
      )
      return {
        names: [],
        totalCount: 0,
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
    language: string,
    where?: any
  ): Promise<ProductContainer[]> {
    try {
      const response = await this.client.query<{
        findManyProductContainer: ProductContainer[]
      }>(
        gql`
          ${PRODUCT_CARD_FRAGMENT}
          query GetNewestProducts(
            $take: Int!
            $language: Language
            $where: ProductContainerWhereInput
          ) {
            findManyProductContainer(
              take: $take
              orderBy: { createdAt: desc }
              where: {
                AND: [
                  { visible: { equals: true } }
                  {
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
                  $where
                ]
              }
            ) {
              ...ProductCardFields
            }
          }
        `,
        {
          variables: { take, language, where },
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
    language: string,
    where?: any
  ): Promise<ProductContainer[]> {
    if (ids.length === 0) return []
    try {
      const response = await this.client.query<{
        findManyProductContainer: ProductContainer[]
      }>(
        gql`
          ${PRODUCT_CARD_FRAGMENT}
          query GetProductsByIds(
            $ids: [Int!]!
            $language: Language
            $where: ProductContainerWhereInput
          ) {
            findManyProductContainer(
              where: {
                AND: [
                  { id: { in: $ids } }
                  { visible: { equals: true } }
                  {
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
                  $where
                ]
              }
            ) {
              ...ProductCardFields
            }
          }
        `,
        {
          variables: { ids, language, where },
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
    language?: string,
    priceListIds?: number[]
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
        reference?: string | null
        content_blocks?: ContentBlock[] | null
        single_product: {
          id: number
          product_profiles: RawProfile[]
          category_photo: {
            id: number
            src: string
            src_md: string | null
            src_xs: string | null
            src_thumbnail: string | null
            display_order: number
          } | null
          gallery_photos: {
            id: number
            src: string
            src_md: string | null
            src_xs: string | null
            src_thumbnail: string | null
            display_order: number
          }[]
        } | null
        advanced_product: {
          id: number
          advanced_product_type: string | null
          advanced_product_profiles: RawProfile[]
          category_photo: {
            id: number
            src: string
            src_md: string | null
            src_xs: string | null
            src_thumbnail: string | null
            display_order: number
          } | null
          gallery_photos: {
            id: number
            src: string
            src_md: string | null
            src_xs: string | null
            src_thumbnail: string | null
            display_order: number
          }[]
          additional_component_to_advanced_product:
            | {
                additional_component: {
                  id: number
                  is_wrapper: boolean
                  code: string | null
                  additional_component_group: {
                    id: number
                    code: string | null
                    additional_component_group_profiles: {
                      name: string
                      language: string
                    }[]
                  }
                  additional_component_profiles: {
                    name: string
                    description: string | null
                    language: string
                  }[]
                  image: {
                    src: string
                    src_md: string | null
                    src_xs: string | null
                  } | null
                  linked_components_source:
                    | {
                        id: number
                        link_type: string
                        display_order: number
                        target_component: {
                          id: number
                          code: string | null
                          additional_component_group: {
                            code: string | null
                            additional_component_group_profiles: {
                              name: string
                              language: string
                            }[]
                          }
                          additional_component_profiles: {
                            name: string
                            description: string | null
                            language: string
                          }[]
                          image: {
                            src: string
                            src_md: string | null
                            src_xs: string | null
                          } | null
                        }
                      }[]
                    | null
                }
              }[]
            | null
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
        product_features:
          | {
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
            }[]
          | null
        linked_products_as_source:
          | {
              link_type: string
              display_order: number
              target_product: ProductContainer
            }[]
          | null
      } | null
    }

    const lang = language?.toLowerCase()
    const profileSome = {
      meta_information: { is: { permalink: { equals: permalink } } },
      ...(lang ? { language: { equals: lang } } : {}),
    }
    const permalinkFilter = {
      OR: [
        { single_product: { is: { product_profiles: { some: profileSome } } } },
        {
          advanced_product: {
            is: { advanced_product_profiles: { some: profileSome } },
          },
        },
      ],
    }

    let where: Record<string, unknown> = permalinkFilter

    if (priceListIds && priceListIds.length > 0) {
      const priceListSelect = { price_listId: { in: priceListIds } }
      const priceListFilter = {
        OR: [
          // Single products always pass through
          { single_product: { isNot: null } },
          // Advanced products must have pricing matching customer's price lists
          {
            advanced_product: {
              is: {
                OR: [
                  { base_prices: { some: priceListSelect } },
                  {
                    sofa_forms: {
                      some: {
                        form_price_fabric_category: { some: priceListSelect },
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
                        price_fabric_category: { some: priceListSelect },
                      },
                    },
                  },
                  {
                    additional_component_to_advanced_product: {
                      some: { extra_prices: { some: priceListSelect } },
                    },
                  },
                ],
              },
            },
          },
        ],
      }
      where = { AND: [permalinkFilter, priceListFilter] }
    }

    console.log("=========>")
    console.dir(where, { depth: 0 })

    try {
      const response = await this.client.query<RawResponse>(
        GET_PRODUCT_BY_PERMALINK,
        {
          variables: {
            where,
            ...(lang ? { language: lang } : {}),
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

  /**
   * Fetch all configurator data for an advanced product.
   * Used on-demand when the configurator modal opens.
   */
  async getConfiguratorData(
    productContainerId: number,
    priceListId: number,
    language?: string,
    paletteIds?: number[]
  ): Promise<any | null> {
    const { GET_CONFIGURATOR_DATA } = await import(
      "@configurator/queries/configurator-queries"
    )

    const fabricWhere = {
      fabric_palettes: {
        some: {
          fabric_palette: {
            is: {
              id: { in: paletteIds ?? [] },
            },
          },
        },
      },
    }

    try {
      const response = await this.client.query<{
        findUniqueProductContainer: any
      }>(GET_CONFIGURATOR_DATA, {
        variables: {
          productContainerId,
          priceListId,
          ...(language ? { language: language.toLowerCase() } : {}),
          fabricWhere,
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      return response.findUniqueProductContainer ?? null
    } catch (error) {
      console.error(
        `Error fetching configurator data for product ${productContainerId}:`,
        error
      )
      return null
    }
  }
}

export * from "./types"
