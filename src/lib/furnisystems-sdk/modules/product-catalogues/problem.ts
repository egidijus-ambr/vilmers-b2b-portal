/**
 * User-facing message from a /api/v1 problem+json body. Pure and
 * dependency-free so it can be tested in isolation.
 *
 * Service-level failures (no catalogues found, per-mode cap) carry `detail`;
 * VALIDATION_FAILED carries `errors: [{ path, message }]` and no `detail`
 * (furnisystems-backend src/api/v1/problems.ts). Returns `detail` if present,
 * else the first `errors[]` message, else undefined (caller shows a generic
 * message). Always plain text.
 */
export function problemMessage(problem: unknown): string | undefined {
  if (!problem || typeof problem !== "object") return undefined
  const { detail, errors } = problem as { detail?: unknown; errors?: unknown }

  const fromDetail = toPlainText(detail)
  if (fromDetail) return fromDetail

  if (Array.isArray(errors)) {
    for (const item of errors) {
      const message =
        item && typeof item === "object"
          ? toPlainText((item as { message?: unknown }).message)
          : undefined
      if (message) return message
    }
  }
  return undefined
}

function toPlainText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > 0 ? text : undefined
}
