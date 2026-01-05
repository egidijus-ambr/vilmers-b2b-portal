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

export interface ShopSetting {
  id: string
  currency: string
  enabled_languages: EnabledLanguage[]
}

export interface ShopSettingsResponse {
  findFirstShopSetting: ShopSetting
}
