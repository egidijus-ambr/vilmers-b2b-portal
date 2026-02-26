export interface FilterFacetAttribute {
  id: number
  name: string
  count: number
}

export interface FilterFacetGroup {
  id: number
  name: string
  attributes: FilterFacetAttribute[]
}

export interface FilterFacetCategory {
  id: number
  name: string
  count: number
}

export interface CategoryFilterFacetsResponse {
  categoryFilterFacets: {
    attributeGroups: FilterFacetGroup[]
    childCategories: FilterFacetCategory[]
    totalCount: number
  }
}
