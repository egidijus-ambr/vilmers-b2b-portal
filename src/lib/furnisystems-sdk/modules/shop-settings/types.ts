export interface EnabledLanguage {
  id: string
  language: string
  web_address_enabled: boolean
  default_language: boolean
  web_address: string
  shop_phone_number?: string
  google_analytics?: string
  google_tag_manager?: string
  facebook_pixel?: string
  facebook_page_id?: string
  hotjar?: string
  enable_language_switcher: boolean
  price_multiplier?: number
}

export interface ContentBlockProfile {
  id: string
  name: string | null
  description: string | null
  language: string
}

export interface ContentBlockImage {
  id: string
  src: string
}

export interface ContentBlock {
  id: string
  type: "text_and_image" | "text_and_video" | "only_text" | "only_image" | "only_video" | "gallery"
  style: string | null
  video_link: string | null
  video_type: "uploaded" | "youtube" | "vimeo" | null
  video_autoplay: boolean | null
  video_loop: boolean | null
  arrangement: number | null
  main_image: ContentBlockImage | null
  gallery_images?: ContentBlockImage[]
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
  extra_css: Record<string, unknown> | string | null
}

export interface ShopSetting {
  id: string
  currency: string
  enabled_languages: EnabledLanguage[]
  homepage_content_blocks?: ContentBlock[]
}

export interface ShopSettingsResponse {
  findFirstShopSetting: ShopSetting
}
