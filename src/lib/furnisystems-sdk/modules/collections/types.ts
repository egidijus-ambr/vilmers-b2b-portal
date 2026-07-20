export interface CollectionMetaInformation {
  permalink: string
  meta_title: string | null
  meta_description: string | null
}

export interface CollectionProfileData {
  name: string
  description: string | null
  language: string
  meta_information: CollectionMetaInformation
}

export interface CollectionImage {
  src: string
}

export interface CollectionData {
  id: number
  collection_profiles: CollectionProfileData[]
  main_image: CollectionImage | null
}

export interface FindFirstCollectionResponse {
  findFirstCollection: CollectionData | null
}
