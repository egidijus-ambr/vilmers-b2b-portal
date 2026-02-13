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
      child_categories {
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
        child_categories {
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
          child_categories {
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
