import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import {
  CategoryData,
  FindManyCategoryResponse,
  FindFirstCategoryResponse,
} from "./types"

const FIND_MENU_CATEGORIES = gql`
  query FIND_MENU_CATEGORIES($language: Language) {
    findManyCategory(
      where: {
        show_in_menu: { equals: true }
        parent_categoryId: { equals: null }
      }
      orderBy: { menu_order: asc }
    ) {
      id
      show_in_menu
      is_root_category
      parent_categoryId
      menu_order
      image {
        id
        src
      }
      image_icon {
        id
        src
      }
      category_profiles(
        where: { language: { equals: $language } }
      ) {
        id
        name
        description
        language
        meta_information {
          id
          permalink
          meta_title
          meta_description
        }
      }
      child_categories(orderBy: { menu_order: asc }) {
        id
        show_in_menu
        parent_categoryId
        menu_order
        category_profiles(
          where: { language: { equals: $language } }
        ) {
          id
          name
          description
          language
          meta_information {
            id
            permalink
            meta_title
            meta_description
          }
        }
        child_categories(orderBy: { menu_order: asc }) {
          id
          show_in_menu
          parent_categoryId
          menu_order
          category_profiles(
            where: { language: { equals: $language } }
          ) {
            id
            name
            description
            language
            meta_information {
              id
              permalink
              meta_title
              meta_description
            }
          }
          child_categories(orderBy: { menu_order: asc }) {
            id
            show_in_menu
            parent_categoryId
            menu_order
            category_profiles(
              where: { language: { equals: $language } }
            ) {
              id
              name
              description
              language
              meta_information {
                id
                permalink
                meta_title
                meta_description
              }
            }
          }
        }
      }
    }
  }
`

const FIND_CATEGORY_BY_PERMALINK = gql`
  query FIND_CATEGORY_BY_PERMALINK($permalink: String!, $language: Language) {
    findFirstCategory(
      where: {
        category_profiles: {
          some: {
            meta_information: {
              is: { permalink: { equals: $permalink } }
            }
          }
        }
      }
    ) {
      id
      show_in_menu
      is_root_category
      parent_categoryId
      menu_order
      image {
        id
        src
      }
      image_icon {
        id
        src
      }
      content_blocks(orderBy: { arrangement: asc }) {
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
      category_profiles(
        where: { language: { equals: $language } }
      ) {
        id
        name
        description
        language
        meta_information {
          id
          permalink
          meta_title
          meta_description
        }
      }
      parent_category {
        id
        category_profiles(
          where: { language: { equals: $language } }
        ) {
          id
          name
          language
          meta_information {
            id
            permalink
            meta_title
            meta_description
          }
        }
        parent_category {
          id
          category_profiles(
            where: { language: { equals: $language } }
          ) {
            id
            name
            language
            meta_information {
              id
              permalink
              meta_title
              meta_description
            }
          }
        }
      }
      child_categories {
        id
        show_in_menu
        menu_order
        image {
          id
          src
        }
        image_icon {
          id
          src
        }
        category_profiles(
          where: { language: { equals: $language } }
        ) {
          id
          name
          description
          language
          meta_information {
            id
            permalink
            meta_title
            meta_description
          }
        }
      }
    }
  }
`

const FIND_CATEGORIES_BY_IDS = gql`
  query FIND_CATEGORIES_BY_IDS($ids: [Int!]!, $language: Language) {
    findManyCategory(where: { id: { in: $ids } }) {
      id
      image {
        id
        src
      }
      banners {
        id
        src
      }
      category_profiles(
        where: { language: { equals: $language } }
      ) {
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

export class CategoriesModule {
  constructor(private client: GraphQLClient) {}

  async getMenuCategories(language?: string): Promise<CategoryData[]> {
    try {
      const response = await this.client.query<FindManyCategoryResponse>(
        FIND_MENU_CATEGORIES,
        {
          variables: {
            ...(language ? { language: language.toLowerCase() } : {}),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )
      return response.findManyCategory ?? []
    } catch (error) {
      console.error("Error fetching menu categories:", error)
      return []
    }
  }

  async getCategoriesByIds(
    ids: number[],
    language?: string
  ): Promise<CategoryData[]> {
    if (ids.length === 0) return []

    try {
      const response = await this.client.query<FindManyCategoryResponse>(
        FIND_CATEGORIES_BY_IDS,
        {
          variables: {
            ids,
            ...(language ? { language: language.toLowerCase() } : {}),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )
      return response.findManyCategory ?? []
    } catch (error) {
      console.error("Error fetching categories by IDs:", error)
      return []
    }
  }

  async getCategoryByPermalink(
    permalink: string,
    language?: string
  ): Promise<CategoryData | null> {
    try {
      const response = await this.client.query<FindFirstCategoryResponse>(
        FIND_CATEGORY_BY_PERMALINK,
        {
          variables: {
            permalink,
            ...(language ? { language: language.toLowerCase() } : {}),
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )
      return response.findFirstCategory ?? null
    } catch (error) {
      console.error(
        `Error fetching category with permalink "${permalink}":`,
        error
      )
      return null
    }
  }
}

export * from "./types"
