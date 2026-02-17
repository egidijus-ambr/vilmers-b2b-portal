import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { Page, FindPageByCodeResponse, FindFirstPageResponse } from "./types"

export const FIND_PAGE_BY_CODE = gql`
  query FIND_PAGE_BY_CODE($code: String!, $language: Language) {
    findUniquePage(where: { code: $code }) {
      id
      code
      published
      page_profiles {
        id
        language
        slug
        title
        meta_description
      }
      content_blocks(
        where: {
          content_block_profiles: {
            some: { language: { equals: $language } }
          }
        }
        orderBy: { arrangement: asc }
      ) {
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
        category_tile_items {
          id
          image {
            id
            src
          }
          category_profiles {
            id
            name
            language
            meta_information {
              permalink
            }
          }
        }
      }
    }
  }
`

export const FIND_PAGE_BY_SLUG = gql`
  query FIND_PAGE_BY_SLUG($slug: String!, $language: Language) {
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
      page_profiles {
        id
        language
        slug
        title
        meta_description
      }
      content_blocks(
        where: {
          content_block_profiles: {
            some: { language: { equals: $language } }
          }
        }
        orderBy: { arrangement: asc }
      ) {
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
        category_tile_items {
          id
          image {
            id
            src
          }
          category_profiles {
            id
            name
            language
            meta_information {
              permalink
            }
          }
        }
      }
    }
  }
`

export class PagesModule {
  constructor(private client: GraphQLClient) {}

  async getPageByCode(
    code: string,
    language?: string
  ): Promise<Page | null> {
    try {
      const response = await this.client.query<FindPageByCodeResponse>(
        FIND_PAGE_BY_CODE,
        {
          variables: {
            code,
            ...(language ? { language: language.toLowerCase() } : {}),
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
    try {
      const response = await this.client.query<FindFirstPageResponse>(
        FIND_PAGE_BY_SLUG,
        {
          variables: {
            slug,
            ...(language ? { language: language.toLowerCase() } : {}),
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
}

export * from "./types"
