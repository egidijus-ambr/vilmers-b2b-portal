import { unstable_cache } from "next/cache"
import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

const GET_DEFAULT_PRICELIST = gql`
  query GET_DEFAULT_PRICELIST {
    defaultPriceList {
      id
    }
  }
`

const DEFAULT_PRICELIST_TTL_SECONDS = 300

async function fetchDefaultPriceListId(): Promise<number> {
  const apolloClient = sdk.getApolloClient()
  const { data } = await apolloClient.query<{
    defaultPriceList: { id: number }
  }>({
    query: GET_DEFAULT_PRICELIST,
    fetchPolicy: "no-cache", // unstable_cache handles caching; don't double-cache
  })
  return data.defaultPriceList.id
}

export const getDefaultPriceListId = unstable_cache(
  fetchDefaultPriceListId,
  ["default-pricelist-id"],
  { revalidate: DEFAULT_PRICELIST_TTL_SECONDS, tags: ["default-pricelist"] }
)
