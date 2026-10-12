export type PaletteRejectReason =
  | "GROUP_NOT_IN_PALETTE"
  | "COLOR_NOT_IN_PALETTE"
  | "FABRIC_GROUP_MISMATCH"
  | "FABRIC_NOT_FOUND"

export type PaletteErrorItem = {
  index: number
  combinationIndex?: number | null
  fabricId?: number | null
  fabricCode?: string | null
  fabricGroupId?: number | null
  reason: PaletteRejectReason | string
}

export const FABRIC_NOT_IN_PALETTE = "FABRIC_NOT_IN_PALETTE"
/** Order rejected because the buyer is missing/unauthorised (e.g. reason NO_ACCOUNT_CODE). */
export const ORDER_BUYER_NOT_AUTHORIZED = "ORDER_BUYER_NOT_AUTHORIZED"

/** Serialisable error payload returned by server actions (thrown errors are redacted in production). */
export type ActionError = {
  message: string
  code?: string
  items?: PaletteErrorItem[]
}

/** Extract {message, code, items} from an SDK / Apollo error thrown on the server. */
export function toActionError(err: any, fallback: string): ActionError {
  const ext =
    err?.details?.extensions ??
    err?.graphQLErrors?.find?.((e: any) => e?.extensions?.code)?.extensions ??
    err?.networkError?.result?.errors?.[0]?.extensions
  const msg =
    err?.graphQLErrors?.[0]?.message ?? err?.message ?? fallback
  return {
    message: msg || fallback,
    code: ext?.code ?? err?.code,
    items: Array.isArray(ext?.items) ? ext.items : undefined,
  }
}

/** Unique, non-empty colour codes of the offending items, in order. */
export function offendingColourCodes(items?: PaletteErrorItem[]): string[] {
  return Array.from(
    new Set((items ?? []).map((i) => i.fabricCode).filter((c): c is string => !!c))
  )
}

/** Error carrying the structured palette rejection across the server-action boundary. */
export class PaletteActionError extends Error {
  code?: string
  items?: PaletteErrorItem[]
  constructor(e: ActionError) {
    super(e.message)
    this.name = "PaletteActionError"
    this.code = e.code
    this.items = e.items
  }
}
