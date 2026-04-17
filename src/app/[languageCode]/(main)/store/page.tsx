import { redirect } from "next/navigation"

import { listMenuCategories } from "@lib/data/categories"
import { supportedLanguages, defaultLanguage } from "@lib/i18n/config"

type Params = {
  params: Promise<{
    languageCode: string
  }>
}

export default async function StorePage(props: Params) {
  const { languageCode } = await props.params
  const validLanguage = supportedLanguages.includes(languageCode)
    ? languageCode
    : defaultLanguage

  const menuCategories = await listMenuCategories(validLanguage)
  const rootCategory = menuCategories?.find((c) => c.is_root_category)
  const permalink =
    rootCategory?.category_profiles?.[0]?.meta_information?.permalink

  if (permalink) {
    redirect(`/${validLanguage}/categories/${permalink}`)
  }

  // Fallback: redirect to home if no root category found
  redirect(`/${validLanguage}`)
}
