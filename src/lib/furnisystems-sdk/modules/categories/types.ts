import { ContentBlock } from "../shop-settings/types"

export interface CategoryImage {
  id: number
  src: string
}

export interface CategoryMetaInformation {
  id: number
  permalink: string
  meta_title: string | null
  meta_description: string | null
}

export interface CategoryProfileData {
  id: number
  name: string
  description: string | null
  language: string
  meta_information: CategoryMetaInformation
}

export interface CategoryData {
  id: number
  show_in_menu: boolean
  parent_categoryId: number | null
  menu_order: number
  image: CategoryImage | null
  image_icon: CategoryImage | null
  category_profiles: CategoryProfileData[]
  child_categories: CategoryData[]
  parent_category: CategoryData | null
  content_blocks?: ContentBlock[]
}

export interface FindManyCategoryResponse {
  findManyCategory: CategoryData[]
}

export interface FindFirstCategoryResponse {
  findFirstCategory: CategoryData | null
}
