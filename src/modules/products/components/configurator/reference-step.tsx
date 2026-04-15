"use client"

import React from "react"
import { useConfigurator } from "@configurator/context/configurator-context"
import { useTranslations } from "@lib/i18n"

export default function ReferenceStep() {
  const { state, dispatch } = useConfigurator()
  const { t } = useTranslations("account")

  return (
    <div className="flex flex-col gap-3 p-4 max-w-md">
      <label className="text-sm font-medium text-dark-blue">
        {t("customer-reference")}
      </label>
      <p className="text-sm text-dark-blue-70">
        {t("reference-step-description")}
      </p>
      <input
        type="text"
        value={state.referenceText}
        onChange={(e) =>
          dispatch({ type: "SET_REFERENCE_TEXT", payload: e.target.value })
        }
        placeholder={t("reference-placeholder")}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm text-dark-blue focus:outline-none focus:ring-2 focus:ring-dark-blue/20 focus:border-dark-blue"
      />
      <p className="text-xs text-dark-blue-50">
        {t("reference-optional-hint")}
      </p>
    </div>
  )
}
