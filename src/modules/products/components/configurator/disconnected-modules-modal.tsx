"use client"

import { useTranslations } from "@lib/i18n"
import Modal from "@modules/common/components/modal"
import Button from "@modules/common/components/button"

interface DisconnectedModulesModalProps {
  isOpen: boolean
  onContinue: () => void
  onGoBack: () => void
}

export function DisconnectedModulesModal({
  isOpen,
  onContinue,
  onGoBack,
}: DisconnectedModulesModalProps) {
  const { t } = useTranslations("account")

  return (
    <Modal isOpen={isOpen} close={onGoBack} size="small">
      <Modal.Title>{t("disconnected-modules-title")}</Modal.Title>
      <Modal.Description>{t("disconnected-modules-description")}</Modal.Description>
      <Modal.Body>
        <img
          src="/sofa-example.gif"
          alt={t("disconnected-modules-title")}
          className="w-[220px] lg:w-[320px] mx-auto"
        />
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onGoBack}>
            {t("disconnected-modules-go-back")}
          </Button>
          <Button onClick={onContinue}>
            {t("disconnected-modules-continue")}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
