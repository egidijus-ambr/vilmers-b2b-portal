import { ProductContainer } from "@lib/furnisystems-sdk/modules/products/types"
import type { LinkPageAncestor } from "@lib/furnisystems-sdk/modules/shop-settings/types"

export type { LinkPageAncestor }

export type ContentBlockType =
  | "text_and_image"
  | "text_and_video"
  | "only_text"
  | "only_image"
  | "only_video"
  | "gallery"
  | "button"
  | "photo_links"
  | "category_tiles"
  | "product_grid"
  | "page_grid"

export type ContentBlockStyle =
  | "1_column_title_top"
  | "2_columns_title_top_center"
  | "3_columns_title_left"
  | "side_by_side"
  | "text_on_image"
  | "image_left"
  | "outline"
  | "filled"

export type VideoType = "uploaded" | "youtube" | "vimeo"

export interface ContentBlockProfile {
  id: string
  name: string | null
  description: string | null
  description_format?: "plain" | "markdown" | null
  link: string | null
  language: string
}

export interface ContentBlockImage {
  id: string
  src: string
  display_order: number
}

export interface ContentBlockLinkedItem {
  id: string
  title: string
  link: string
  arrangement: number
  image: ContentBlockImage | null
}

export interface CategoryTileItem {
  id: number
  image: ContentBlockImage | null
  banners: ContentBlockImage[]
  category_profiles: {
    id: number
    name: string
    language: string
    meta_information: {
      permalink: string
    }
  }[]
}

export interface GridPage {
  id: string
  page_profiles: { slug: string; title: string; language: string }[]
  hero_image: { src: string } | null
  ancestors?: LinkPageAncestor[] | null
}

export interface ContentBlockData {
  id: string
  type: ContentBlockType
  style: string | null
  video_link: string | null
  video_type: VideoType | null
  video_autoplay: boolean | null
  video_loop: boolean | null
  arrangement: number | null
  main_image: ContentBlockImage | null
  gallery_images: ContentBlockImage[]
  content_block_profiles: ContentBlockProfile[]
  default_margins: boolean | null
  max_height: number | null
  max_width: number | null
  min_height: number | null
  min_width: number | null
  top_margin: string | null
  bottom_margin: string | null
  left_margin: string | null
  right_margin: string | null
  background_color: string | null
  text_color: string | null
  media_max_height: number | null
  media_max_width: number | null
  media_min_height: number | null
  media_min_width: number | null
  object_fit_cover: boolean | null
  link_new_tab: boolean | null
  link_page: {
    id: string
    page_profiles: { slug: string; language: string }[]
    ancestors?: LinkPageAncestor[] | null
  } | null
  extra_css: Record<string, unknown> | string | null
  linked_items?: ContentBlockLinkedItem[]
  config?: Record<string, unknown> | null
  categories?: CategoryTileItem[]
  products?: ProductContainer[]
  grid_pages?: GridPage[]
}

export interface ContentBlockProps {
  data: ContentBlockData
  index: number
  languageCode: string
}

export interface VideoPlayerProps {
  videoType: VideoType | null
  videoLink: string | null
  videoAutoplay: boolean | null
  videoLoop: boolean | null
  objectFitCover: boolean | null
}
