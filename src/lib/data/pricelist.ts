import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

const GET_PRICE_LIST_NAME = gql`
  query GetPriceListName($id: Int!) {
    findFirstPriceList(where: { id: { equals: $id } }) {
      id
      name
    }
  }
`

/**
 * Fetches a pricelist's display name, for the pricelist XLSX export's Info
 * sheet (see src/app/api/pricelist/export/route.ts). Deliberately not
 * cached like getDefaultPriceListId — this is keyed per pricelist ID rather
 * than a single global value, and the export is already a synchronous,
 * infrequent, one-shot request.
 */
export async function getPriceListName(priceListId: number): Promise<string> {
  const apolloClient = sdk.getApolloClient()
  const { data } = await apolloClient.query<{
    findFirstPriceList: { id: number; name: string } | null
  }>({
    query: GET_PRICE_LIST_NAME,
    variables: { id: priceListId },
    fetchPolicy: "no-cache",
  })
  return data.findFirstPriceList?.name ?? `Pricelist ${priceListId}`
}
