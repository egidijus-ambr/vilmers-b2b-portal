"use server"

import { gql } from "@apollo/client"
import { sdk } from "@lib/config"

export type LocaleMap = Partial<
  Record<"en" | "da" | "de" | "fr" | "lt", string>
>

export type FabricCalloutSettings = {
  plentyMessage: LocaleMap | null
  lowMessage: LocaleMap | null
  threshold: number
}

const FABRIC_CALLOUT_SETTINGS_QUERY = gql`
  query FabricCalloutSettings {
    findManySetting(
      where: {
        name: {
          in: [
            "fabric_stock_plenty_message"
            "fabric_stock_low_message"
            "fabric_low_stock_threshold"
          ]
        }
      }
    ) {
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

function parseLocaleMap(value: string | null | undefined): LocaleMap | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LocaleMap
    }
    return null
  } catch {
    return null
  }
}

function parseThreshold(value: string | null | undefined): number {
  if (!value) return 50
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? 50 : parsed
}

export async function getFabricCalloutSettings(): Promise<FabricCalloutSettings> {
  try {
    const client = sdk.getApolloClient()
    const result = await client.query<FabricCalloutSettingsResponse>({
      query: FABRIC_CALLOUT_SETTINGS_QUERY,
      fetchPolicy: "no-cache",
    })

    console.log("[getFabricCalloutSettings] Query result:", {
      data: result.data,
      errors: result.errors,
    })
    const settings = result.data?.findManySetting ?? []

    const plentyRaw = settings.find(
      (s) => s.name === "fabric_stock_plenty_message"
    )
    const lowRaw = settings.find((s) => s.name === "fabric_stock_low_message")
    const thresholdRaw = settings.find(
      (s) => s.name === "fabric_low_stock_threshold"
    )

    return {
      plentyMessage: parseLocaleMap(plentyRaw?.value),
      lowMessage: parseLocaleMap(lowRaw?.value),
      threshold: parseThreshold(thresholdRaw?.value),
    }
  } catch (error) {
    console.error("[getFabricCalloutSettings] Error:", error)
    return {
      plentyMessage: null,
      lowMessage: null,
      threshold: 50,
    }
  }
}
