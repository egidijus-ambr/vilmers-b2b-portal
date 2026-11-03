"use client"

import { useTranslations } from "@lib/i18n"
import Modal from "@modules/common/components/modal"
import Button from "@modules/common/components/button"
import type { UnpricedModule } from "@configurator/lib/price-utils"
import { ModulePreview } from "./sofa-modules-drawer"

interface NoPriceModalProps {
  isOpen: boolean
  /** Nothing on the configuration contributes a price. */
  wholeProductUnpriced: boolean
  /** The selected main-group option has no price for the selected fabric. */
  mainComponentMissing: boolean
  unpricedModules: UnpricedModule[]
  onContinue: () => void
  onGoBack: () => void
}

/**
 * "All products" confirmation shown before adding an unpriced (or partially
 * priced) configuration to the cart.
 */
export function NoPriceModal({
  isOpen,
  wholeProductUnpriced,
  mainComponentMissing,
  unpricedModules,
  onContinue,
  onGoBack,
}: NoPriceModalProps) {
  const { t } = useTranslations("account")
  const showModules = !wholeProductUnpriced && unpricedModules.length > 0

  return (
    <Modal isOpen={isOpen} close={onGoBack} size={showModules ? "medium" : "small"}>
      <Modal.Title>{t("no-price-modal-title")}</Modal.Title>
      <Modal.Description>
        {wholeProductUnpriced
          ? t("no-price-modal-none")
          : showModules
            ? t("no-price-modal-modules")
            : t("no-price-modal-main")}
      </Modal.Description>
      <Modal.Body>
        {showModules && (
          <ul className="flex flex-col gap-3">
            {unpricedModules.map(({ sofaForm, count }) => (
              <li
                key={sofaForm.id ?? sofaForm.code}
                className="flex items-center gap-4 border border-gray-200 p-2"
              >
                <div className="flex-shrink-0 max-w-[200px] overflow-hidden">
                  <ModulePreview sofaForm={sofaForm} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 leading-tight">
                    {sofaForm.name}
                    <span className="ml-2 font-medium text-gray-600">×{count}</span>
                  </p>
                  {sofaForm.code && (
                    <p className="text-xs text-gray-500 font-mono">{sofaForm.code}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {showModules && mainComponentMissing && (
          <p className="mt-3 text-sm text-gray-700">{t("no-price-modal-main")}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onGoBack}>
            {t("no-price-modal-go-back")}
          </Button>
          <Button onClick={onContinue}>{t("no-price-modal-continue")}</Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
