import {
  FABRIC_NOT_IN_PALETTE,
  ORDER_BUYER_NOT_AUTHORIZED,
  offendingColourCodes,
  type PaletteErrorItem,
} from "./palette-error"

type T = (key: string, options?: Record<string, any>) => string

/**
 * Translated message for a FABRIC_NOT_IN_PALETTE rejection, listing the
 * offending colour codes. `t` must be bound to the "common" namespace.
 * Returns null when the code is something else.
 */
export function paletteErrorMessage(
  t: T,
  code: string | undefined,
  items?: PaletteErrorItem[]
): string | null {
  if (code === ORDER_BUYER_NOT_AUTHORIZED) return t("order-buyer-not-authorized")
  if (code !== FABRIC_NOT_IN_PALETTE) return null
  const codes = offendingColourCodes(items)
  return codes.length
    ? t("fabric-not-in-palette", { codes: codes.join(", ") })
    : t("fabric-not-in-palette-generic")
}
