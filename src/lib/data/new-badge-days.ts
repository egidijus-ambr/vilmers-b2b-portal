import { unstable_cache } from "next/cache"
import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

// Dedicated tiny query (deliberately NOT part of APP_SHOP_SETTINGS) so the
// portal can be deployed before the backend exposes the field: a failing
// query here only costs us the badges, never the shop settings.
const GET_NEW_BADGE_DAYS = gql`
  query GET_NEW_BADGE_DAYS {
    findFirstShopSetting {
      id
      new_badge_days
    }
  }
`

const NEW_BADGE_DAYS_TTL_SECONDS = 60

async function fetchNewBadgeDays(): Promise<number> {
  try {
    const apolloClient = sdk.getApolloClient()
    const { data } = await apolloClient.query<{
      findFirstShopSetting: { id: number; new_badge_days: number | null } | null
    }>({
      query: GET_NEW_BADGE_DAYS,
      fetchPolicy: "no-cache", // unstable_cache handles caching
    })
    const days = data.findFirstShopSetting?.new_badge_days
    return typeof days === "number" && Number.isFinite(days) && days > 0
      ? days
      : 0
  } catch (error) {
    console.error("Error fetching new badge days:", error)
    return 0
  }
}

export const getNewBadgeDays = unstable_cache(
  fetchNewBadgeDays,
  ["new-badge-days"],
  { revalidate: NEW_BADGE_DAYS_TTL_SECONDS, tags: ["new-badge-days"] }
)
