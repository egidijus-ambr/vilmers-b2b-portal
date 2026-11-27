import "server-only"

/**
 * Where the price-list export's data comes from, per request
 * (src/lib/data/v1-transport-rule.ts, via src/lib/data/me-v1.ts
 * runIdentityCall):
 *
 *   v1 (a usable v1 token)  -> GET /me/pricelist-export
 *                              (./pricelist-export-v1.ts): products, price
 *                              list name, and the customer / price list /
 *                              tags the SERVER chose. The combo (and so the
 *                              file cache key) is built from that answer.
 *   graphql (legacy-only sessions, and a v1 401 for this one call)
 *                           -> the combo from the locally derived price list
 *                              and tags (./pricelist-export-context.ts);
 *                              startExport then makes the unchanged GraphQL
 *                              reads (getSofaPricelistExportProducts +
 *                              getPriceListName).
 *   any other v1 failure    -> ExportProblemError (fail closed; never the
 *                              GraphQL path, never another identity).
 *
 * TEMPORARY GraphQL arm: delete it with the rest of the GraphQL path
 * (v1-transport-rule.ts step 8).
 */
import { actingCustomerIdForV1 } from "@lib/data/v1-acting"
import { describeV1Error, runIdentityCall, v1GetAuthSession } from "@lib/data/me-v1"
import { isV1ProblemError } from "@lib/furnisystems-sdk/client/v1-data"
import type { ExportContext } from "./pricelist-export-context"
import type { ExportCombo, PrefetchedExportData } from "./pricelist-export-jobs"
import {
  ExportProblemError,
  createExportAnswerMemo,
  exportAnswerMemoKey,
  exportCallerKey,
  exportComboFromV1,
  exportErrorFromV1,
  fetchPricelistExportV1,
  type ExportAnswerMemo,
  type V1PricelistExport,
} from "./pricelist-export-v1"

export interface ExportSource {
  combo: ExportCombo
  /** v1 only: the answer's data; startExport makes no GraphQL read then. */
  prefetched?: PrefetchedExportData
}

const deps = () => ({ restApiUrl: process.env.NEXT_PUBLIC_BACKEND_REST_API || "" })

/**
 * v1 answer memo (15 min, 50 entries, single-flight), so a repeat download
 * does not re-run the server's product query; the GraphQL arm has its own
 * fingerprint memo in ./pricelist-export-jobs.ts. Process-wide on
 * globalThis (route modules do not reliably share module scope; dev HMR).
 * ACCEPTED TRADE-OFF (as on GraphQL): a price / data / price-list change can
 * take up to the TTL to appear in an export.
 */
const globalForMemo = globalThis as unknown as {
  __pricelistExportAnswerMemo?: ExportAnswerMemo
}
const answerMemo: ExportAnswerMemo = (globalForMemo.__pricelistExportAnswerMemo ??=
  createExportAnswerMemo())

/**
 * The v1 answer, through the memo keyed on the real caller (GET
 * /auth/session principal), the acting id sent and the language. A 401 from
 * /auth/session is thrown (runIdentityCall falls back to GraphQL); any other
 * /auth/session failure skips the memo (direct call, nothing stored).
 */
async function v1Answer(bearer: string, language: string): Promise<V1PricelistExport> {
  const actingCustomerId = await actingCustomerIdForV1()
  const load = () =>
    fetchPricelistExportV1(deps(), { bearer, actingCustomerId, language })
  let callerKey: string
  try {
    callerKey = exportCallerKey((await v1GetAuthSession(bearer)).principal)
  } catch (error) {
    if (isV1ProblemError(error) && error.status === 401) throw error
    console.warn(
      "[pricelist-export] auth/session failed, answer not memoised:",
      describeV1Error(error)
    )
    return load()
  }
  return answerMemo.get(
    exportAnswerMemoKey({ callerKey, actingCustomerId, language }),
    load
  )
}

function graphqlSource(context: ExportContext, language: string): ExportSource {
  // Never fall back to a default pricelist: it would export wrong prices.
  if (context.localPriceListId == null) {
    throw new ExportProblemError("no_pricelist", 409)
  }
  return {
    combo: {
      customerId: context.customerId,
      priceListId: context.localPriceListId,
      tagIds: context.localTagIds,
      language,
      coverLines: context.coverLines,
    },
  }
}

/** Throws ExportProblemError for every classified failure. */
export async function resolveExportSource(
  context: ExportContext,
  language: string
): Promise<ExportSource> {
  return runIdentityCall<ExportSource>("pricelistExport", {
    v1: async (bearer) => {
      // A memo hit still goes through exportComboFromV1 (customer check)
      // and, at download, the file route's jobBelongsTo.
      const answer = await v1Answer(bearer, language)
      return {
        combo: exportComboFromV1(answer, {
          language,
          coverLines: context.coverLines,
          customerId: context.customerId,
        }),
        prefetched: {
          products: Array.isArray(answer.data) ? answer.data : [],
          priceListName: answer.priceListName,
        },
      }
    },
    graphql: async () => graphqlSource(context, language),
    // Unreachable behind validateSession; the legacy behaviour.
    guest: () => graphqlSource(context, language),
    onError: (error) => {
      // exportComboFromV1's own mismatch error is already classified.
      if (error instanceof ExportProblemError) throw error
      // 401 never gets here (runIdentityCall re-routed it to `graphql`).
      throw exportErrorFromV1(error) ?? new ExportProblemError("fetch_failed", 502)
    },
  })
}
