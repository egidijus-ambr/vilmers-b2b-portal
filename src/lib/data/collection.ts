import "server-only"

import { sdk } from "@lib/config"
import { CollectionData } from "@lib/furnisystems-sdk"
import { mapV1Collection } from "@lib/furnisystems-sdk/modules/pages/v1-adapter"
import { normalizeLanguage } from "@lib/i18n/config"
import { runCmsCall, seg, v1Lang, v1SessionGet } from "./cms-v1"

/**
 * Collection page header (slice 4): GET /catalog/collections/by-permalink/
 * :permalink with the session's bearer (content-block links to private CMS
 * pages are null for a guest), per request, never cached. GraphQL for
 * legacy-only sessions / a v1 401; 404 or any other failure -> null
 * (not-found page), as a GraphQL error gave.
 */
export const getCollectionByPermalink = async (
  permalink: string,
  language?: string
): Promise<CollectionData | null> =>
  runCmsCall<CollectionData | null>(`collection ${permalink}`, {
    v1: async (bearer) =>
      mapV1Collection(
        await v1SessionGet(
          bearer,
          `/catalog/collections/by-permalink/${seg(permalink)}`,
          { language: v1Lang(normalizeLanguage(language)) }
        )
      ),
    graphql: () => getCollectionByPermalinkGraphql(permalink, language),
    onError: () => null,
  })

/** GraphQL path (fallback until v1 impersonation; see v1-transport-rule.ts). */
async function getCollectionByPermalinkGraphql(
  permalink: string,
  language?: string
): Promise<CollectionData | null> {
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
