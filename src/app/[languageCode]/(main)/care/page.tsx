import { Metadata } from "next"

import { supportedLanguages, SupportedLanguage } from "@lib/i18n"
import { getServerT } from "@lib/i18n/server-translations"
import PageHeader from "@modules/common/components/page-header"
import PageContent from "@modules/common/components/page-content"

type Props = {
  params: Promise<{ languageCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const t = await getServerT("common", validLanguage)

  return {
    title: t("care-page-title", "Product Care"),
  }
}

export default async function CarePage(props: Props) {
  const params = await props.params
  const language = params.languageCode as SupportedLanguage
  const validLanguage = supportedLanguages.includes(language) ? language : "en"
  const t = await getServerT("common", validLanguage)

  return (
    <>
      <PageHeader
        title={t("care-page-title", "Product Care")}
        breadcrumbItems={[
          { label: "Home", href: "/" },
          { label: t("care-page-title", "Product Care"), href: null },
        ]}
        level="h2"
      />

      <PageContent>
        <div className="py-8">
          <p className="text-base-regular text-gray-600">
            {t(
              "care-page-placeholder",
              "Care instructions for your furniture are coming soon. In the meantime, avoid direct sunlight and harsh cleaning agents, and wipe up spills promptly to keep your products looking their best."
            )}
          </p>
        </div>
      </PageContent>
    </>
  )
}
