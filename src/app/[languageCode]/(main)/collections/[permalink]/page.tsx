import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByPermalink } from "@lib/data/collection"
import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import { getServerT } from "@lib/i18n/server-translations"
import CollectionPageTemplate from "@modules/collections/templates"

type Props = {
  params: Promise<{ permalink: string; languageCode: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const permalink = params.permalink
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"

  try {
    const collection = await getCollectionByPermalink(permalink, validLanguage)

    if (!collection) {
      return {}
    }

    const t = await getServerT("account", validLanguage)
    const profile = collection.collection_profiles?.[0]
    const metaTitle =
      profile?.meta_information?.meta_title || profile?.name || t("collection")
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

export default async function CollectionPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const permalink = params.permalink
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)

  const collection = await getCollectionByPermalink(permalink, validLanguage)

  if (!collection) {
    notFound()
  }

  return (
    <CollectionPageTemplate
      collection={collection}
      language={validLanguage}
      page={page}
    />
  )
}
