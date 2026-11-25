import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import { getServerT } from "@lib/i18n/server-translations"
import { acceptTransferRequest } from "@lib/data/orders"
import { Heading, Text } from "@medusajs/ui"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { languageCode: string; id: string; token: string }
}) {
  const { id, token } = params
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const t = await getServerT("account", validLanguage)

  const { success, error } = await acceptTransferRequest(id, token)

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        {success && (
          <>
            <Heading level="h1" className="text-[2.5rem] small:text-[3.5rem] leading-tight text-zinc-900">
              {t("order-transferred-title")}
            </Heading>
            <Text className="text-zinc-600">
              {t("order-transferred-body", { id })}
            </Text>
          </>
        )}
        {!success && (
          <>
            <Text className="text-zinc-600">
              {t("order-transfer-accept-error")}
            </Text>
            {error && (
              <Text className="text-red-500">{t("transfer-error-message", { message: error })}</Text>
            )}
          </>
        )}
      </div>
    </div>
  )
}
