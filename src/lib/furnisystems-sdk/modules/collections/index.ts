import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { CollectionData, FindFirstCollectionResponse } from "./types"

// NOTE: `collection_profiles` has no server-side language filter argument
// (unlike `category_profiles`), so this fetches ALL profiles and the
// resolver below reorders them so the active-language profile is first.
const FIND_COLLECTION_BY_PERMALINK = gql`
  query FIND_COLLECTION_BY_PERMALINK($permalink: String!) {
    findFirstCollection(
      where: {
        collection_profiles: {
          some: {
            meta_information: { is: { permalink: { equals: $permalink } } }
          }
        }
      }
    ) {
      id
      collection_profiles {
        name
        description
        language
        meta_information {
          permalink
          meta_title
          meta_description
        }
      }
      main_image {
        src
      }
      content_blocks {
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
      }
    }
  }
`

export class CollectionsModule {
  constructor(private client: GraphQLClient) {}

  async getCollectionByPermalink(
    permalink: string,
    language?: string
  ): Promise<CollectionData | null> {
    try {
      const response = await this.client.query<FindFirstCollectionResponse>(
        FIND_COLLECTION_BY_PERMALINK,
        {
          variables: {
            permalink,
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )

      const collection = response.findFirstCollection
      if (!collection) return null

      // Move the active-language profile to the front (fallback: leave
      // order as-is) so downstream consumers can safely read
      // `collection_profiles[0]` for the requested language, mirroring how
      // the category query's server-side `where: { language }` filter
      // guarantees `category_profiles[0]` is already language-correct.
      const lang = language?.toLowerCase()
      const profiles = collection.collection_profiles ?? []
      const matchedIndex = lang
        ? profiles.findIndex((p) => p.language === lang)
        : -1

      const orderedProfiles =
        matchedIndex > 0
          ? [
              profiles[matchedIndex],
              ...profiles.slice(0, matchedIndex),
              ...profiles.slice(matchedIndex + 1),
            ]
          : profiles

      return {
        ...collection,
        collection_profiles: orderedProfiles,
      }
    } catch (error) {
      console.error(
        `Error fetching collection with permalink "${permalink}":`,
        error
      )
      return null
    }
  }
}

export * from "./types"
