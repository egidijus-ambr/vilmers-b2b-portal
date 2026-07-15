import { ContentBlock } from "../shop-settings/types"
import type { LinkPageAncestor } from "../shop-settings/types"

export interface PageProfile {
  id: string
  language: string
  slug: string | null
  title: string | null
  subtitle: string | null
  meta_description: string | null
  cta_label: string | null
  cta_link: string | null
}

/** Flat ancestor node returned by the backend `ancestors(language)` field (root-first). */
export interface PageAncestor {
  id: string
  page_profiles: { language: string; slug: string | null; title: string | null }[]
}

export interface Page {
  id: string
  code: string | null
  published: boolean | null
  hero_image: { id: number; src: string } | null
  hero_display?: 'full_width' | 'content_width' | 'none' | null
  hero_height_value: number | null
  hero_height_unit: 'px' | 'vh' | null
  hero_video_link: string | null
  content_blocks: ContentBlock[]
  page_profiles: PageProfile[]
  /** Present on pages fetched via getPageByPath */
  parentId?: string | null
  /** Flat, root-first ancestor chain (published only) from getPageByPath */
  ancestors?: PageAncestor[] | null
  cta_new_tab: boolean | null
  /** Not currently selected by any query below; declared for forward compatibility. */
  cta_link_page_id?: string | null
  cta_link_page?: {
    id: string
    page_profiles: { slug: string; language: string }[]
    ancestors?: LinkPageAncestor[] | null
  } | null
  /** Discriminator for the CTA's internal target; see `resolveCtaHref`. */
  cta_link_type?: "cms_page" | "category" | "store" | null
  cta_link_category?: {
    category_profiles?:
      | {
          language: string
          meta_information?: { permalink?: string | null } | null
        }[]
      | null
  } | null
}

export interface FindPageByCodeResponse {
  findUniquePage: Page | null
}

export interface FindFirstPageResponse {
  findFirstPage: Page | null
}

export interface FindPageByPathResponse {
  findPageByPath: Page | null
}
