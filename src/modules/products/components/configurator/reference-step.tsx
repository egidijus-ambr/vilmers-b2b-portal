"use client"

import React from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { useTranslations } from "@lib/i18n"
import SearchInput from "@modules/common/components/search-input"

export default function ReferenceStep() {
  const { state, dispatch } = useConfigurator()
  const { t } = useTranslations("account")

  return (
    <div className="flex flex-col gap-3 p-4 max-w-md">
      <p className="text-sm text-dark-blue-70">
        {t("reference-step-description")}
      </p>
      <SearchInput
        value={state.referenceText}
        onChange={(value) =>
          dispatch({ type: "SET_REFERENCE_TEXT", payload: value })
        }
        placeholder={t("reference-placeholder")}
        showSearchIcon={false}
      />
      <p className="text-xs text-dark-blue-50">
        {t("reference-optional-hint")}
      </p>
    </div>
  )
}
