"use client"

import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslations } from "@lib/i18n"

const SignInPrompt = () => {
  const { t: tc } = useTranslations("common")
  return (
    <div className="bg-white flex items-center justify-between">
      <div>
        <Heading level="h3" className="text-[1.5rem] leading-tight font-normal">
          {tc("sign-in-prompt-question")}
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-2">
          {tc("sign-in-prompt-text")}
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button variant="secondary" className="h-10" data-testid="sign-in-button">
            {tc("sign-in")}
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
