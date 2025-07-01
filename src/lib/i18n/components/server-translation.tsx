import { getServerTranslation } from "../server-config"
import { SupportedLanguage, defaultLanguage } from "../index"

interface ServerTranslationProps {
  translationKey: string
  namespace?: string
  fallback?: string
  language: SupportedLanguage
}

export async function ServerTranslation({
  translationKey,
  namespace = "common",
  fallback,
  language,
}: ServerTranslationProps) {
  const translation = await getServerTranslation(
    language,
    translationKey,
    namespace
  )

  return <>{translation || fallback || translationKey}</>
}

// Helper function to create a translation function for a specific language
export function createServerT(language: SupportedLanguage) {
  return async function serverT(
    translationKey: string,
    namespace: string = "common",
    fallback?: string
  ): Promise<string> {
    const translation = await getServerTranslation(
      language,
      translationKey,
      namespace
    )
    return translation || fallback || translationKey
  }
}
