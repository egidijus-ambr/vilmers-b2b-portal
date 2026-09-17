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
  PricelistExportProduct,
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

// Bulk query backing the per-customer pricelist XLSX export (see
// ProductsModule.getSofaPricelistExportProducts). Selects only the fields
// the export needs: the advanced product's name for the export language,
// the category photo (only `src_facebook` — the other Image sizes are WEBP,
// which ExcelJS cannot embed; src_facebook is uniformly JPEG), plus every
// enabled sofa module's dimensions, packaging volume, price row, and cached
// blueprint thumbnail for the effective pricelist. `blueprint` selects the
// full object (not the flat `blueprint_thumbnail_url` scalar) specifically
// to get `thumb_width`/`thumb_height` alongside the URL for free — see
// pricelist-workbook.ts's per-sheet proportional-scaling doc comment for why
// those pixel dimensions matter as much as the URL itself.
//
// `sofa_forms` mirrors GET_CONFIGURATOR_DATA's `enabled: { equals: true }`
// filter (src/configurator/queries/configurator-queries.ts) so the export
// never lists a module the customer couldn't actually add in the
// configurator, and additionally requires a priced row in this pricelist so
// modules with no price for this customer don't show up as all-blank rows.
// `form_price_fabric_category` is filtered to the same pricelist so the
// response doesn't carry every other pricelist's rows too.
//
// `advanced_product_type` plus everything from
// `advanced_product_price_fabric_category` down to `additional_component`'s
// nested selection ALSO covers OTHER_WITH_FABRICS and OTHER products
// (chairs/armchairs/simple products priced as a base + additional
// components rather than sofa modules — see pricelist-workbook.ts's
// buildComponentRows and this module's getSofaPricelistExportProducts
// admission-where doc comment). `enabled` mirrors GET_CONFIGURATOR_DATA's
// own component filter for the same reason as `sofa_forms`'s; unlike
// `sofa_forms`, price filtering for components happens client-side in
// pricelist-workbook.ts (a product has ~50+ components across ~10 groups
// and most carry no price at all — they're configuration metadata, not
// priced items — so a server-side "has ANY price" filter here would still
// leave the unpriced majority in the response). `additional_component_profiles`/
// `additional_component_group_profiles` are filtered by `$language` the
// same way `advanced_product_profiles` is above — neither AdditionalComponent
// nor AdditionalComponentGroup has a bare `name` scalar.
//
// `additional_component_group_to_advanced_product` (filtered to `enabled`)
// is the group-level counterpart of `additional_component_to_advanced_product`'s
// own `enabled` filter above: GET_CONFIGURATOR_DATA (configurator-queries.ts)
// requests this exact same relation+filter, and its CONSUMER
// (use-configurator-data.ts's `groupAssociations.length > 0` gate) is what
// actually decides visibility from it — an empty result dispatches NO
// component groups to the customer at all, not "show everything
// unfiltered." A group can also be linked-but-disabled here while its
// individual component associations are still `enabled: true` (verified
// against local data: a stale disabled `model` group on OTHER products
// still carries enabled, priced component associations).
// pricelist-workbook.ts's resolveEnabledGroupIds/buildComponentRows mirror
// both of those exactly, rather than trusting
// `additional_component_to_advanced_product.enabled` alone.
const GET_SOFA_PRICELIST_EXPORT_PRODUCTS = gql`
  query GetSofaPricelistExportProducts(
    $where: ProductContainerWhereInput
    $language: Language!
    $priceListId: Int!
  ) {
    findManyProductContainer(where: $where) {
      id
      # Category-grouping support (see pricelist-workbook.ts's "Category
      # grouping" section, groupProductsByCategory / ProductsModule
      # types.ts's PricelistExportCategoryRef). category_profiles is
      # deliberately UNFILTERED by language on both this field and
      # categories below - the top-level "branch" categories (Soft
      # Furniture/Hard Furniture/Other) carry only an en CategoryProfile
      # today, so a server-side language filter would blank their
      # heading in de/fr instead of falling back (see
      # pricelist-workbook.ts's resolveCategoryName).
      primary_category {
        id
        menu_order
        parent_categoryId
        is_root_category
        category_profiles {
          language
          name
        }
        parent_category {
          id
          menu_order
          is_root_category
          category_profiles {
            language
            name
          }
        }
      }
      # m2m fallback used when primary_category is unset or itself
      # root-level (e.g. the "All Products" root - real, visible products
      # are assigned that as their PRIMARY category today) - see
      # resolveCandidateCategory's doc comment.
      categories {
        id
        menu_order
        parent_categoryId
        is_root_category
        category_profiles {
          language
          name
        }
        parent_category {
          id
          menu_order
          is_root_category
          category_profiles {
            language
            name
          }
        }
      }
      advanced_product {
        id
        advanced_product_type
        advanced_product_profiles(where: { language: { equals: $language } }) {
          name
        }
        # Header photo (see pricelist-workbook.ts's CATEGORY_HEADER_PHOTO_BOX
        # and pricelist-photos.ts's resolveCategoryPhotoUrl): src_lg is the
        # ORIGINAL-aspect-ratio WEBP (preferred — src_facebook below is a
        # square crop that cuts a wide sofa photo), src is a mixed png/jpg
        # fallback, src_facebook is the last-resort guaranteed-JPEG square.
        category_photo {
          src_lg
          src
          src_facebook
        }
        sofa_forms(
          where: {
            enabled: { equals: true }
            form_price_fabric_category: {
              some: { price_listId: { equals: $priceListId } }
            }
          }
        ) {
          id
          name
          code
          dimensions {
            width
            height
            length
          }
          package_dimensions {
            volume
          }
          form_price_fabric_category(
            where: { price_listId: { equals: $priceListId } }
          ) {
            price
            fabrice_price_category {
              group_number
            }
          }
          blueprint {
            status
            thumbnail_url
            thumb_width
            thumb_height
          }
        }
        advanced_product_price_fabric_category(
          where: { price_listId: { equals: $priceListId } }
        ) {
          price
          fabrice_price_category {
            group_number
          }
        }
        additional_component_to_advanced_product(
          where: { enabled: { equals: true } }
        ) {
          extra_price
          extra_prices(where: { price_listId: { equals: $priceListId } }) {
            price
          }
          price_fabric_category(
            where: { price_listId: { equals: $priceListId } }
          ) {
            price
            fabrice_price_category {
              group_number
            }
          }
          additional_component {
            id
            code
            component_sku
            # Component's own photo (see pricelist-component-photos.ts's
            # fetch pool and pricelist-workbook.ts's writeComponentDataRow
            # embed) — src_facebook mirrors category_photo's uniformly-JPEG
            # 1080x1080 crop above, so the same embed machinery applies.
            image {
              src_facebook
            }
            additional_component_profiles(
              where: { language: { equals: $language } }
            ) {
              name
            }
            dimensions {
              width
              height
              length
            }
            package_dimensions {
              volume
            }
            additional_component_group {
              id
              code
              order
              use_fabric_prices_for_components
              additional_component_group_profiles(
                where: { language: { equals: $language } }
              ) {
                name
              }
            }
          }
        }
        additional_component_group_to_advanced_product(
          where: { enabled: { equals: true } }
        ) {
          additional_component_group {
            id
          }
        }
      }
    }
  }
`

// Code of the AdditionalComponentGroup holding a product's "main"
// size/model variant — the analogue of a sofa module for
// OTHER_WITH_FABRICS/OTHER/etc. products (e.g. a bed's frame, as opposed to
// its mattress) — keyed by advanced_product_type: OTHER products' main
// group is "model-other"; every other type's is "model". The type check
// (not just the code) is required: some OTHER products (e.g. COF-QUADRO,
// advanced product 1818) carry stale ENABLED, PRICED
// additional_component_to_advanced_product rows sitting in group "model"
// with NO AdditionalComponentGroupToAdvancedProduct link — a bare
// `code in ["model", "model-other"]` check would let those stale rows
// admit the product even though its real, group-linked main group
// ("model-other") is unpriced on that list. Verified against the running
// backend (2026-09-17): no visible product's advanced_product_type/main
// group pairing contradicts this mapping. Mirrors
// src/configurator/lib/vilmers.ts's `MODEL_CODE`/`MODEL_CODE_OTHER` and
// src/lib/util/pricelist-workbook.ts's `MODEL_GROUP_CODE`/
// `MODEL_GROUP_CODE_OTHER`/`modelGroupCodeFor` — re-declared here (not
// imported) for the same reason as those: importing
// configurator/lib/vilmers.ts would drag the Konva-based configurator
// context into this server-side SDK module.
const MAIN_GROUP_CODE_FOR_OTHER = "model-other"
const MAIN_GROUP_CODE_DEFAULT = "model"

// One entry per advanced_product_type bucket this file distinguishes for
// main-group admission: OTHER products vs every other type. Shared by both
// the main-group-priced branch and the fallback's "has no main-group
// component" check in buildWhereFilter, so the two branches can't drift
// out of sync with each other.
const MAIN_GROUP_BY_TYPE = [
  {
    typeFilter: { advanced_product_type: { equals: "OTHER" } },
    groupCode: MAIN_GROUP_CODE_FOR_OTHER,
  },
  {
    typeFilter: { advanced_product_type: { not: { equals: "OTHER" } } },
    groupCode: MAIN_GROUP_CODE_DEFAULT,
  },
]

// A join row's component sits in `groupCode` — see
// MAIN_GROUP_CODE_FOR_OTHER/MAIN_GROUP_CODE_DEFAULT/MAIN_GROUP_BY_TYPE.
function inComponentGroup(groupCode: string) {
  return {
    additional_component: {
      is: {
        additional_component_group: { is: { code: { equals: groupCode } } },
      },
    },
  }
}

/**
 * Builds a component-priced admission branch (OTHER_WITH_FABRICS or OTHER)
 * for ProductsModule.getSofaPricelistExportProducts's admission `where`:
 * by itself, admits a product of `advancedProductType` if it has at least
 * one ENABLED additional component actually priced in THIS pricelist
 * (mirrors sofaModulePricedClause's purpose for the sofa branch) —
 * regardless of which AdditionalComponentGroup that component sits in.
 * Shared by both `otherWithFabricsBranch` and `otherBranch` since they're
 * otherwise identical in shape.
 *
 * This is NOT the sole admission gate for the export, though: the branch
 * built here is ANDed with `productWhere` (buildWhereFilter's output) at
 * the call site, which — since the type-aware main-group fix — additionally
 * requires that the product's actual main-group component (see
 * MAIN_GROUP_CODE_FOR_OTHER/MAIN_GROUP_CODE_DEFAULT) be enabled and priced
 * on this list, or that the product have no main-group component at all.
 * So the export's real admission is stricter than "any enabled priced
 * component" — a product whose only priced component sits in the wrong
 * group for its type (see COF-QUADRO's stale rows, advanced product 1818)
 * is excluded even though this branch alone would admit it.
 */
function buildComponentPricedBranch(
  advancedProductType: "OTHER_WITH_FABRICS" | "OTHER",
  priceListId: number
) {
  return {
    advanced_product: {
      is: {
        advanced_product_type: { equals: advancedProductType },
        additional_component_to_advanced_product: {
          some: {
            enabled: { equals: true },
            OR: [
              {
                price_fabric_category: {
                  some: { price_listId: { equals: priceListId } },
                },
              },
              {
                extra_prices: {
                  some: { price_listId: { equals: priceListId } },
                },
              },
            ],
          },
        },
      },
    },
  }
}

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

      // A join row is "priced on the customer's lists" if it has a matching
      // price_fabric_category OR extra_prices row.
      const pricedOnListsOr = [
        {
          price_fabric_category: {
            some: priceListSelect,
          },
        },
        {
          extra_prices: {
            some: priceListSelect,
          },
        },
      ]

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
                  // Main-group branch, one OR entry per MAIN_GROUP_BY_TYPE
                  // pair: a product of this advanced_product_type that HAS
                  // a component in ITS type's main group is only admitted
                  // through a main-group row that is itself enabled, in
                  // that main group, AND priced on the customer's lists.
                  // `enabled`, the group-code check, and the priced check
                  // are all asserted on the SAME
                  // additional_component_to_advanced_product row inside one
                  // `some` — that's what matters here, not the number of
                  // `some` blocks in general (a plain OR of independent
                  // `some` checks, like price_fabric_category/extra_prices
                  // below, is harmless: "some row is priced list A OR some
                  // row is priced list B" is equivalent to "some row is
                  // priced A-or-B"). But splitting `enabled`,
                  // group-membership, and "priced" into separate `some`
                  // blocks would let an unrelated enabled row satisfy
                  // "enabled", an unrelated main-group row satisfy "main
                  // group", and an unrelated priced row (e.g. a mattress)
                  // satisfy "priced" — independently of each other — which
                  // is not the same claim as "this one row is an enabled,
                  // priced, main-group component".
                  ...MAIN_GROUP_BY_TYPE.map(({ typeFilter, groupCode }) => ({
                    ...typeFilter,
                    additional_component_to_advanced_product: {
                      some: {
                        enabled: { equals: true },
                        ...inComponentGroup(groupCode),
                        OR: pricedOnListsOr,
                      },
                    },
                  })),
                  // Fallback branch: products with NO component in THEIR
                  // type's main group (e.g. sofas, which don't use
                  // "model"/"model-other" groups here) keep the
                  // pre-existing behaviour — admitted by ANY priced join
                  // row, regardless of group or enabled.
                  {
                    AND: [
                      {
                        OR: MAIN_GROUP_BY_TYPE.map(
                          ({ typeFilter, groupCode }) => ({
                            ...typeFilter,
                            additional_component_to_advanced_product: {
                              none: inComponentGroup(groupCode),
                            },
                          })
                        ),
                      },
                      {
                        additional_component_to_advanced_product: {
                          some: {
                            OR: pricedOnListsOr,
                          },
                        },
                      },
                    ],
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

  /**
   * Fetch every sofa, OTHER_WITH_FABRICS, and OTHER product (and its priced
   * modules / additional components) for a single pricelist, for the
   * per-customer pricelist XLSX export. Despite the name (kept for
   * call-site stability — see route.ts), this now admits three disjoint
   * product-type branches; see the `sofaBranch`/`otherWithFabricsBranch`/
   * `otherBranch` doc comments below. Deliberately does NOT admit TABLE,
   * BED, LIGHTS, or CHAIR_ARMCHAIR — the local DB has zero real products of
   * those types, and pricelist-workbook.ts has no rendering path for them.
   *
   * Unlike every other method in this module, failures are NOT swallowed to
   * an empty array — an export that silently renders "you have no products"
   * on a transient GraphQL error is worse than a failed download. Callers
   * must catch and surface the error themselves. `errorPolicy` is left at
   * its default ("none") for the same reason: a partial result must not
   * quietly become a wrong/incomplete pricelist.
   *
   * `priceListId` must be the customer's single EFFECTIVE pricelist
   * (`getPrimaryPriceListId` from `@/configurator/lib/pricelist`), not the
   * own+group union — passing the union would admit products priced only in
   * the non-effective list and their price cells would all resolve blank.
   */
  async getSofaPricelistExportProducts(params: {
    priceListId: number
    language: string
    customerTagIds?: number[]
  }): Promise<PricelistExportProduct[]> {
    const { priceListId, language, customerTagIds } = params

    const productWhere = this.buildWhereFilter(language, customerTagIds, [
      priceListId,
    ])

    // The canonical "is this a sofa" discriminant is advanced_product_type
    // (SOFA | BED | CHAIR_ARMCHAIR | TABLE | OTHER_WITH_FABRICS | OTHER |
    // LIGHTS — see src/configurator/lib/vilmers.ts:405 and callers), NOT the
    // presence of sofa_forms rows: that relation exists on AdvancedProduct
    // generally, so a BED or CHAIR_ARMCHAIR could in principle carry
    // sofa_forms rows and would be wrongly admitted without this filter.
    const isSofaClause = {
      advanced_product: {
        is: { advanced_product_type: { equals: "SOFA" } },
      },
    }

    // Narrows admission to products that actually have a sofa module priced
    // in this pricelist. `buildWhereFilter`'s priceListIds filter alone also
    // admits products priced only via base_prices/advanced_product_price_fabric_category/
    // additional components, none of which feed the module price columns —
    // this clause (together with isSofaClause above) is what makes the
    // sofa branch admit only products that will actually render sofa module
    // rows, not an all-blank sheet.
    const sofaModulePricedClause = {
      advanced_product: {
        is: {
          sofa_forms: {
            some: {
              form_price_fabric_category: {
                some: { price_listId: { equals: priceListId } },
              },
            },
          },
        },
      },
    }
    const sofaBranch = { AND: [isSofaClause, sofaModulePricedClause] }

    // Second and third admission branches, added alongside the sofa one
    // above rather than replacing it: OTHER_WITH_FABRICS products
    // (chairs/armchairs etc.) and OTHER products (coffee tables, tops,
    // etc.) are both priced as a base + additional components, not sofa
    // modules — see pricelist-workbook.ts's buildComponentRows for how
    // their sheet rows are built. The two types differ in which
    // AdditionalComponentGroup carries their size/variant list ("model" vs
    // "model-other" — see pricelist-workbook.ts's modelGroupCodeFor), so
    // both branches share this same shape via `buildComponentPricedBranch`
    // — but which group is which is NOT purely a rendering concern: since
    // buildWhereFilter's main-group fix, it's also an admission gate (see
    // buildComponentPricedBranch's doc comment above), so a product whose
    // only priced component sits in the wrong group for its type is
    // excluded from the export even though it satisfies this branch alone.
    const otherWithFabricsBranch = buildComponentPricedBranch(
      "OTHER_WITH_FABRICS",
      priceListId
    )
    const otherBranch = buildComponentPricedBranch("OTHER", priceListId)

    // `visible: { equals: true }` is added explicitly because
    // findManyProductContainer does NOT force it server-side (only the
    // category-listing resolvers do) — mirrors getProductsByIds/
    // getNewestProducts above, which add the same clause for the same
    // reason: without it, products hidden from category pages would still
    // appear in the export. `productWhere` (language/tag filtering) and the
    // visibility clause apply to all three branches; only the
    // sofa-vs-component-vs-component admission logic differs between them.
    const where = {
      AND: [
        productWhere,
        { OR: [sofaBranch, otherWithFabricsBranch, otherBranch] },
        { visible: { equals: true } },
      ],
    }

    const response = await this.client.query<{
      findManyProductContainer: PricelistExportProduct[]
    }>(GET_SOFA_PRICELIST_EXPORT_PRODUCTS, {
      variables: {
        where,
        language: language.toLowerCase(),
        priceListId,
      },
      fetchPolicy: "no-cache",
    })

    return response?.findManyProductContainer ?? []
  }
}

export * from "./types"
