"use server"

import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

// The stock callout messages come from the UI translations
// (account namespace: fabric-palettes.stock-low-message / stock-plenty-message).
// Only the numeric threshold is stored as a Setting.
export type FabricCalloutSettings = {
  threshold: number
}

const DEFAULT_THRESHOLD = 50

const FABRIC_CALLOUT_SETTINGS_QUERY = gql`
  query FabricCalloutSettings {
    findManySetting(where: { name: { equals: "fabric_low_stock_threshold" } }) {
      id
      name
      value
    }
  }
`

interface RawSetting {
  id: string
  name: string
  value: string | null
}

interface FabricCalloutSettingsResponse {
  findManySetting: RawSetting[]
}

function parseThreshold(value: string | null | undefined): number {
  if (!value) return DEFAULT_THRESHOLD
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? DEFAULT_THRESHOLD : parsed
}

export async function getFabricCalloutSettings(): Promise<FabricCalloutSettings> {
  try {
    const client = sdk.getApolloClient()
    const result = await client.query<FabricCalloutSettingsResponse>({
      query: FABRIC_CALLOUT_SETTINGS_QUERY,
      fetchPolicy: "no-cache",
    })
    const thresholdRaw = (result.data?.findManySetting ?? []).find(
      (s) => s.name === "fabric_low_stock_threshold"
    )
    return { threshold: parseThreshold(thresholdRaw?.value) }
  } catch (error) {
    console.error("[getFabricCalloutSettings] Error:", error)
    return { threshold: DEFAULT_THRESHOLD }
  }
}
