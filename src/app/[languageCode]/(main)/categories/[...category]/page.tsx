import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByPermalink, enrichContentBlocksWithTileCategories } from "@lib/data/categories"
import { CategorySortOption, SORT_OPTION_TO_GRAPHQL } from "@lib/furnisystems-sdk/modules/products/types"
import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import CategoryPageTemplate from "@modules/categories/templates"

const VALID_SORT_OPTIONS = Object.keys(SORT_OPTION_TO_GRAPHQL) as CategorySortOption[]

type Props = {
  params: Promise<{ category: string[]; languageCode: string }>
  searchParams: Promise<{ page?: string; sort?: string; attrs?: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const permalink = params.category[params.category.length - 1]
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"

  try {
    const category = await getCategoryByPermalink(permalink, validLanguage)

    if (!category) {
      return {}
    }

    const profile = category.category_profiles?.[0]
    const metaTitle =
      profile?.meta_information?.meta_title || profile?.name || "Category"
    const metaDescription =
      profile?.meta_information?.meta_description || profile?.description || ""

    return {
      title: metaTitle,
      description: metaDescription,
    }
  } catch (error) {
    return {}
  }
}

export default async function CategoryPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const permalink = params.category[params.category.length - 1]
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)
  const sortBy = VALID_SORT_OPTIONS.includes(searchParams.sort as CategorySortOption)
    ? (searchParams.sort as CategorySortOption)
    : undefined

  const category = await getCategoryByPermalink(permalink, validLanguage)

  if (!category) {
    notFound()
  }

  const enrichedContentBlocks = category.content_blocks
    ? await enrichContentBlocksWithTileCategories(
        category.content_blocks,
        validLanguage
      )
    : category.content_blocks

  return (
    <CategoryPageTemplate
      category={{ ...category, content_blocks: enrichedContentBlocks }}
      language={validLanguage}
      page={page}
      sortBy={sortBy}
      attrs={searchParams.attrs}
    />
  )
}
