import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import { getServerT } from "@lib/i18n/server-translations"
import { Heading, Text } from "@medusajs/ui"
import TransferActions from "@modules/order/components/transfer-actions"
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

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-[2.5rem] small:text-[3.5rem] leading-tight text-zinc-900">
          {t("order-transfer-request-title", { id })}
        </Heading>
        <Text className="text-zinc-600">
          {t("order-transfer-request-body", { id })}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <Text className="text-zinc-600">
          {t("order-transfer-accept-note")}
        </Text>
        <Text className="text-zinc-600">
          {t("order-transfer-ignore-note")}
        </Text>
        <div className="w-full h-px bg-zinc-200" />
        <TransferActions id={id} token={token} />
      </div>
    </div>
  )
}
