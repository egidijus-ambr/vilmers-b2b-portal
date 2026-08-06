import { unstable_cache } from "next/cache"
import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

const GET_ANONYMOUS_PRODUCT_TAGS = gql`
  query GET_ANONYMOUS_PRODUCT_TAGS {
    findFirstShopSetting {
      id
      anonymous_product_tag_ids
    }
  }
`

// Kept short: admins save this setting through the generated
// `updateOneShopSetting` mutation, which (unlike the custom Navigation/Footer
// mutations) never calls `revalidateB2BPortalPages`. There's no push-based
// invalidation, so a short TTL is what keeps "I saved it and nothing
// happened" reports from piling up. For an immediate refresh without waiting
// out the TTL, hit `/api/revalidate?secret=...&tag=anonymous-product-tags`
// (see src/app/api/revalidate/route.ts) — the `tags` entry below is kept
// specifically so that route can target this cache entry.
const ANONYMOUS_PRODUCT_TAGS_TTL_SECONDS = 60

async function fetchAnonymousProductTagIds(): Promise<number[]> {
  try {
    const apolloClient = sdk.getApolloClient()
    const { data } = await apolloClient.query<{
      findFirstShopSetting: {
        id: number
        anonymous_product_tag_ids: number[]
      } | null
    }>({
      query: GET_ANONYMOUS_PRODUCT_TAGS,
      fetchPolicy: "no-cache", // unstable_cache handles caching; don't double-cache
    })
    const ids = data.findFirstShopSetting?.anonymous_product_tag_ids
    return Array.isArray(ids) ? ids : []
  } catch (error) {
    // Unlike getDefaultPriceListId (required data, lets errors propagate),
    // this filter is opt-in: a failed read must never hide the whole
    // catalogue from anonymous visitors, so fall back to "no tag filter".
    console.error("Error fetching anonymous product tags:", error)
    return []
  }
}

export const getAnonymousProductTagIds = unstable_cache(
  fetchAnonymousProductTagIds,
  ["anonymous-product-tag-ids"],
  { revalidate: ANONYMOUS_PRODUCT_TAGS_TTL_SECONDS, tags: ["anonymous-product-tags"] }
)
