import { ContentBlock } from "../shop-settings/types"

export interface PageProfile {
  id: string
  language: string
  slug: string | null
  title: string | null
  meta_description: string | null
}

export interface Page {
  id: string
  code: string | null
  published: boolean | null
  content_blocks: ContentBlock[]
  page_profiles: PageProfile[]
}

export interface FindPageByCodeResponse {
  findUniquePage: Page | null
}

export interface FindFirstPageResponse {
  findFirstPage: Page | null
}
