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
/** Add-to-cart refused: the acting customer / active cart changed (e.g. in another tab). Mirrors addCartItemAction. */
export const CART_CHANGED = "CART_CHANGED"

/** Serialisable error payload returned by server actions (thrown errors are redacted in production). */
export type ActionError = {
  message: string
  code?: string
  items?: PaletteErrorItem[]
}

/** v1: fabric group of the line is disabled (422). */
export const FABRIC_GROUP_DISABLED = "FABRIC_GROUP_DISABLED"

/**
 * Generic messages for v1 problems that carry no `detail` of their own.
 * (A `detail` is always a message written by the backend, never user input:
 * e.g. 409 "Cannot delete a cart whose items belong to an order", the same
 * text the GraphQL resolvers threw.)
 */
const V1_STATUS_MESSAGES: Record<number, string> = {
  401: "Authentication required",
  403: "You are not allowed to do this",
  404: "Not found",
  429: "Too many requests. Please try again later.",
  503: "Service temporarily unavailable. Please try again later.",
}

/**
 * A REST v1 V1ProblemError (src/lib/furnisystems-sdk/client/v1-data.ts),
 * recognised by its name: this module is imported by client components, so
 * it must not import the server-only v1 client.
 */
function isV1Problem(err: any): boolean {
  return err?.name === "V1ProblemError" && typeof err?.status === "number"
}

function fromV1Problem(err: any, fallback: string): ActionError {
  const code: string | undefined =
    typeof err.code === "string" && err.code ? err.code : undefined
  const detail: string | undefined =
    typeof err.detail === "string" && err.detail ? err.detail : undefined
  const items: PaletteErrorItem[] | undefined =
    code === FABRIC_NOT_IN_PALETTE && Array.isArray(err.items)
      ? err.items.map((i: any) => ({
          index: i.index,
          combinationIndex: i.combinationIndex ?? null,
          fabricId: i.fabricId ?? null,
          fabricCode: i.fabricCode ?? null,
          fabricGroupId: i.fabricGroupId ?? null,
          reason: i.reason,
        }))
      : undefined
  // Never the Error message itself ("v1 request failed: 409 CONFLICT").
  const message =
    detail ??
    (err.status >= 500 && err.status !== 503
      ? fallback
      : V1_STATUS_MESSAGES[err.status as number]) ??
    fallback
  return { message, code, ...(items ? { items } : {}) }
}

/**
 * Extract {message, code, items} from an error thrown on the server: an SDK /
 * Apollo (GraphQL) error, or a REST v1 problem (code + detail + items).
 */
export function toActionError(err: any, fallback: string): ActionError {
  if (isV1Problem(err)) return fromV1Problem(err, fallback)
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
