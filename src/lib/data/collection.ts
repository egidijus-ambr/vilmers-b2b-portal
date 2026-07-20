import { sdk } from "@lib/config"
import { CollectionData } from "@lib/furnisystems-sdk"

export const getCollectionByPermalink = async (
  permalink: string,
  language?: string
): Promise<CollectionData | null> => {
  try {
    return await sdk.collections.getCollectionByPermalink(permalink, language)
  } catch (error) {
    console.error(
      `Error fetching collection by permalink "${permalink}":`,
      error
    )
    return null
  }
}
