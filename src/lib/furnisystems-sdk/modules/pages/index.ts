import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { Page, FindPageByCodeResponse, FindFirstPageResponse, FindPageByPathResponse } from "./types"
import type { GridPage } from "@modules/home/components/content-block/types"
import { isSupportedLanguage } from "../../../i18n/config"

// Shared field selection for content blocks. FIND_PAGE_BY_CODE,
// FIND_PAGE_BY_SLUG, and FIND_PAGE_BY_PATH all render the same content block
// list, so the field list is extracted here to avoid drift between the three
// queries. Requires the enclosing operation to declare `$language: Language!`
// (used by `link_page.ancestors` / `cta_link_page.ancestors`).
const CONTENT_BLOCK_FIELDS = gql`
  fragment ContentBlockFields on ContentBlock {
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
      cta_label
      cta_link
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
      parentId # required: backend 'ancestors' resolver reads root.parentId; without it ancestors returns [] and nested page links lose their parent path
      page_profiles {
        slug
        language
      }
      ancestors(language: $language) {
        page_profiles { slug language }
      }
    }
    cta_new_tab
    cta_link_page {
      id
      parentId # required: backend 'ancestors' resolver reads root.parentId; without it ancestors returns [] and nested page links lose their parent path
      page_profiles {
        slug
        language
      }
      ancestors(language: $language) {
        page_profiles { slug language }
      }
    }
    cta_link_type
    cta_link_category {
      category_profiles {
        language
        meta_information {
          permalink
        }
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

// Shared Page-level hero CTA field selection (page_profiles incl. cta_label /
// cta_link, plus cta_new_tab / cta_link_page for the internal-link case).
// Requires the enclosing operation to declare `$language: Language!`.
const PAGE_HERO_CTA_FIELDS = gql`
  fragment PageHeroCtaFields on Page {
    page_profiles {
      id
      language
      slug
      title
      subtitle
      meta_description
      cta_label
      cta_link
    }
    cta_new_tab
    cta_link_page {
      id
      parentId # required: backend 'ancestors' resolver reads root.parentId; without it ancestors returns [] and nested page links lose their parent path
      page_profiles {
        slug
        language
      }
      ancestors(language: $language) {
        page_profiles { slug language }
      }
    }
    cta_link_type
    cta_link_category {
      category_profiles {
        language
        meta_information {
          permalink
        }
      }
    }
  }
`

export const FIND_PAGE_BY_CODE = gql`
  query FIND_PAGE_BY_CODE($code: String!, $language: Language!) {
    findUniquePage(where: { code: $code }) {
      id
      code
      published
      hero_image {
        id
        src
      }
      hero_display
      hero_height_value
      hero_height_unit
      hero_video_link
      ...PageHeroCtaFields
      content_blocks(
        where: {
          content_block_profiles: {
            some: { language: { equals: $language } }
          }
        }
        orderBy: { arrangement: asc }
      ) {
        ...ContentBlockFields
      }
    }
  }
  ${PAGE_HERO_CTA_FIELDS}
  ${CONTENT_BLOCK_FIELDS}
`

export const FIND_PAGE_BY_SLUG = gql`
  query FIND_PAGE_BY_SLUG($slug: String!, $language: Language!) {
    findFirstPage(
      where: {
        published: { equals: true }
        page_profiles: {
          some: {
            slug: { equals: $slug }
            language: { equals: $language }
          }
        }
      }
    ) {
      id
      code
      published
      hero_image {
        id
        src
      }
      hero_display
      hero_height_value
      hero_height_unit
      ...PageHeroCtaFields
      content_blocks(
        where: {
          content_block_profiles: {
            some: { language: { equals: $language } }
          }
        }
        orderBy: { arrangement: asc }
      ) {
        ...ContentBlockFields
      }
    }
  }
  ${PAGE_HERO_CTA_FIELDS}
  ${CONTENT_BLOCK_FIELDS}
`

export const FIND_PAGE_BY_PATH = gql`
  query FIND_PAGE_BY_PATH($path: String!, $language: Language!) {
    findPageByPath(path: $path, language: $language) {
      id
      code
      published
      chromeless
      parentId
      hero_image {
        id
        src
      }
      hero_display
      hero_height_value
      hero_height_unit
      ...PageHeroCtaFields
      ancestors(language: $language) {
        id
        page_profiles { language slug title }
      }
      content_blocks(
        where: {
          content_block_profiles: {
            some: { language: { equals: $language } }
          }
        }
        orderBy: { arrangement: asc }
      ) {
        ...ContentBlockFields
      }
    }
  }
  ${PAGE_HERO_CTA_FIELDS}
  ${CONTENT_BLOCK_FIELDS}
`

// Shared field selection for grid pages (manual + children modes). Both
// GET_PAGES_BY_IDS and GET_CHILD_PAGES render the same GridPage cards, so the
// field list is extracted here to avoid drift between the two queries.
const GRID_PAGE_FIELDS = gql`
  fragment GridPageFields on Page {
    id
    published
    parentId # required: backend 'ancestors' resolver reads parentId; without it ancestors returns [] and child page links lose their parent path
    page_profiles {
      slug
      title
      language
    }
    hero_image {
      src
    }
    ancestors(language: $language) {
      page_profiles {
        slug
        language
      }
    }
    tags {
      id
      slug
      page_tag_profiles {
        name
        language
      }
    }
  }
`

export const GET_PAGES_BY_IDS = gql`
  query GET_PAGES_BY_IDS($ids: [String!], $language: Language!) {
    findManyPage(where: { id: { in: $ids }, published: { equals: true } }) {
      ...GridPageFields
    }
  }
  ${GRID_PAGE_FIELDS}
`

export const GET_CHILD_PAGES = gql`
  query GET_CHILD_PAGES($parentId: String!, $language: Language!, $take: Int) {
    findUniquePage(where: { id: $parentId }) {
      id
      children(
        where: { published: { equals: true } }
        orderBy: { arrangement: asc }
        take: $take
      ) {
        ...GridPageFields
      }
    }
  }
  ${GRID_PAGE_FIELDS}
`

export class PagesModule {
  constructor(private client: GraphQLClient) {}

  async getPageByCode(
    code: string,
    language?: string
  ): Promise<Page | null> {
    if (!isSupportedLanguage(language)) return null
    try {
      const response = await this.client.query<FindPageByCodeResponse>(
        FIND_PAGE_BY_CODE,
        {
          variables: {
            code,
            language: language.toLowerCase(),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )

      return response.findUniquePage ?? null
    } catch (error) {
      console.error(`Error fetching page with code "${code}":`, error)
      return null
    }
  }

  async getPageBySlug(
    slug: string,
    language?: string
  ): Promise<Page | null> {
    if (!isSupportedLanguage(language)) return null
    try {
      const response = await this.client.query<FindFirstPageResponse>(
        FIND_PAGE_BY_SLUG,
        {
          variables: {
            slug,
            language: language.toLowerCase(),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )

      return response.findFirstPage ?? null
    } catch (error) {
      console.error(`Error fetching page with slug "${slug}":`, error)
      return null
    }
  }

  async getPageByPath(
    path: string,
    language: string
  ): Promise<Page | null> {
    if (!isSupportedLanguage(language)) return null
    try {
      const response = await this.client.query<FindPageByPathResponse>(
        FIND_PAGE_BY_PATH,
        {
          variables: {
            path,
            language: language.toLowerCase(),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )

      return response.findPageByPath ?? null
    } catch (error) {
      console.error(`Error fetching page with path "${path}":`, error)
      return null
    }
  }

  async getPagesByIds(
    ids: string[],
    language?: string
  ): Promise<GridPage[]> {
    if (ids.length === 0) return []
    if (!isSupportedLanguage(language)) return []
    try {
      const response = await this.client.query<{
        findManyPage: GridPage[]
      }>(GET_PAGES_BY_IDS, {
        variables: {
          ids,
          language: (language ?? "lt").toLowerCase(),
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      return response?.findManyPage ?? []
    } catch (error) {
      console.error("Error fetching pages by IDs:", error)
      return []
    }
  }

  async getChildPages(
    parentId: string,
    language?: string,
    take = 8
  ): Promise<GridPage[]> {
    if (!isSupportedLanguage(language)) return []
    try {
      const response = await this.client.query<{
        findUniquePage: { children: GridPage[] } | null
      }>(GET_CHILD_PAGES, {
        variables: {
          parentId,
          take,
          language: (language ?? "lt").toLowerCase(),
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      return response?.findUniquePage?.children ?? []
    } catch (error) {
      console.error(`Error fetching child pages for "${parentId}":`, error)
      return []
    }
  }
}

export * from "./types"
