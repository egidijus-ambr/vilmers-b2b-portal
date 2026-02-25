import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { CategoryFilterFacetsResponse } from "./types"

const GET_CATEGORY_FILTER_FACETS = gql`
  query GetCategoryFilterFacets(
    $categoryPermalink: String!
    $language: String!
    $selectedAttributeIds: [Int!]
    $where: ProductContainerWhereInput
  ) {
    categoryFilterFacets(
      categoryPermalink: $categoryPermalink
      language: $language
      selectedAttributeIds: $selectedAttributeIds
      where: $where
    ) {
      attributeGroups {
        id
        name
        attributes {
          id
          name
          count
        }
      }
      totalCount
    }
  }
`

export class FiltersModule {
  constructor(private client: GraphQLClient) {}

  async getCategoryFilterFacets(params: {
    categoryPermalink: string
    language: string
    selectedAttributeIds?: number[]
    where?: any
  }) {
    const { categoryPermalink, language, selectedAttributeIds, where } = params
    try {
      const response = await this.client.query<CategoryFilterFacetsResponse>(
        GET_CATEGORY_FILTER_FACETS,
        {
          variables: {
            categoryPermalink,
            language,
            selectedAttributeIds: selectedAttributeIds?.length
              ? selectedAttributeIds
              : null,
            where,
          },
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        }
      )
      return response.categoryFilterFacets
    } catch (error) {
      console.error("Error fetching category filter facets:", error)
      return { attributeGroups: [], totalCount: 0 }
    }
  }
}

export * from "./types"
