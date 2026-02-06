import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { Page, FindPageByCodeResponse } from "./types"

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
        gallery_images {
          id
          src
        }
        content_block_profiles {
          id
          name
          description
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
        extra_css
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
          fetchPolicy: "network-only",
          errorPolicy: "all",
        }
      )

      return response.findUniquePage ?? null
    } catch (error) {
      console.error(`Error fetching page with code "${code}":`, error)
      return null
    }
  }
}

export * from "./types"
