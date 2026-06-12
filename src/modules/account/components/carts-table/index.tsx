"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Heading } from "@medusajs/ui"
import { useTranslations } from "@lib/i18n"
import { useCustomer } from "@lib/context/customer-context"
import { useCart } from "@lib/context/cart-context"
import { CartSummary } from "@lib/furnisystems-sdk/modules/cart/types"
import { listCarts, renameCartAction, deleteCartAction } from "@lib/data/carts"
import {
  TableHeader,
  TableHeaderCell,
} from "@modules/common/components/table-header"
import Modal from "@modules/common/components/modal"
import SearchInput from "@modules/common/components/search-input"
import Button from "@modules/common/components/button"

type CartsTableProps = {
  /** When true, hides the internal "Carts" h2 title (PageHeader already shows it). */
  hideTitle?: boolean
}

const CartsTable = ({ hideTitle = false }: CartsTableProps) => {
  const { customer } = useCustomer()
  const { t } = useTranslations("account")
  const router = useRouter()
  const params = useParams()
  const languageCode = params?.languageCode as string

  const { cart: activeCart, saveActiveCart, switchActiveCart } = useCart()

  const [carts, setCarts] = useState<CartSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  // Rename dialog state
  const [renameTarget, setRenameTarget] = useState<CartSummary | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CartSummary | null>(null)

  // Prompt-to-save dialog state
  const [promptTargetId, setPromptTargetId] = useState<number | null>(null)
  const [promptName, setPromptName] = useState("")

  const [pending, setPending] = useState(false)

  const fetchCarts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listCarts()
      setCarts(result)
    } catch (error) {
      console.error("Error loading carts:", error)
      setCarts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!customer) return
    fetchCarts()
  }, [customer, fetchCarts])

  if (!customer) {
    return null
  }

  const goToDetails = (id: number) => {
    router.push(`/${languageCode}/account/carts/details/${id}`)
  }

  // --- Switch flow with prompt-to-save -------------------------------------
  const handleUseCart = async (id: number) => {
    setActionError(null)
    const working = activeCart
    const needsPrompt =
      !!working &&
      !working.name &&
      (working.items?.length ?? 0) > 0 &&
      working.id !== id
    if (needsPrompt) {
      setPromptName("")
      setPromptTargetId(id)
      return
    }
    setPending(true)
    const res = await switchActiveCart(id)
    setPending(false)
    if (res.ok) {
      await fetchCarts()
    } else {
      setActionError(res.error ?? null)
    }
  }

  const handleSaveAndSwitch = async () => {
    if (promptTargetId == null) return
    const trimmed = promptName.trim()
    if (!trimmed) {
      setActionError(t("cart-name") + " *")
      return
    }
    setActionError(null)
    setPending(true)
    const saved = await saveActiveCart(trimmed)
    if (!saved.ok) {
      setPending(false)
      setActionError(saved.error ?? null)
      return
    }
    // The working cart now has a name, so the "Discard & switch" path must be
    // unreachable: close the prompt before attempting the switch. If the switch
    // fails we surface the error via the top-level banner, but never re-offer
    // discarding the cart we just saved.
    const targetId = promptTargetId
    setPromptTargetId(null)
    const switched = await switchActiveCart(targetId)
    setPending(false)
    if (switched.ok) {
      await fetchCarts()
    } else {
      setActionError(switched.error ?? null)
    }
  }

  const handleDiscardAndSwitch = async () => {
    if (promptTargetId == null || !activeCart) return
    setActionError(null)
    setPending(true)
    const discarded = await deleteCartAction(activeCart.id)
    if (!discarded.ok) {
      setPending(false)
      setActionError(discarded.error ?? null)
      return
    }
    const switched = await switchActiveCart(promptTargetId)
    setPending(false)
    if (switched.ok) {
      setPromptTargetId(null)
      await fetchCarts()
    } else {
      setActionError(switched.error ?? null)
    }
  }

  // --- Rename --------------------------------------------------------------
  const openRename = (cart: CartSummary) => {
    setActionError(null)
    setRenameValue(cart.name ?? "")
    setRenameTarget(cart)
  }

  const handleRename = async () => {
    if (!renameTarget) return
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setActionError(t("cart-name") + " *")
      return
    }
    setActionError(null)
    setPending(true)
    const res = await renameCartAction(renameTarget.id, trimmed)
    setPending(false)
    if (res.ok) {
      setRenameTarget(null)
      await fetchCarts()
    } else {
      setActionError(res.error ?? null)
    }
  }

  // --- Delete --------------------------------------------------------------
  const openDelete = (cart: CartSummary) => {
    setActionError(null)
    setDeleteTarget(cart)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionError(null)
    setPending(true)
    const res = await deleteCartAction(deleteTarget.id)
    setPending(false)
    if (res.ok) {
      setDeleteTarget(null)
      await fetchCarts()
    } else {
      setActionError(res.error ?? null)
    }
  }

  const formatDate = (value: string) => new Date(value).toLocaleDateString()

  const cartName = (cart: CartSummary) =>
    cart.name ? (
      <span className="font-medium text-dark-blue">{cart.name}</span>
    ) : (
      <span className="italic text-gray-500">{t("untitled-cart")}</span>
    )

  const ActiveBadge = () => (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide bg-status-completed text-white">
      {t("active")}
    </span>
  )

  return (
    <div className="bg-white pb-6 pt-6">
      {/* Header */}
      {!hideTitle && (
        <div className="p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-medium text-gray-900">
            {t("carts")}
          </h2>
          <p className="text-gray-600 mt-2 max-w-md text-sm md:text-base">
            {t("carts-description")}
          </p>
        </div>
      )}

      {actionError && (
        <p
          className="mx-4 md:mx-6 mb-3 text-sm text-red-600"
          data-testid="carts-action-error"
        >
          {actionError}
        </p>
      )}

      {/* Mobile card list — visible below xsmall (512px) */}
      <div className="xsmall:hidden mx-4 flex flex-col gap-3 pt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dark-blue" />
          </div>
        ) : carts && carts.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">
            {t("no-carts")}
          </p>
        ) : (
          (carts ?? []).map((cart) => (
            <div
              key={cart.id}
              className="border border-zinc-300 bg-white overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-200 flex items-start justify-between bg-gold-20">
                <div className="min-w-0">
                  <div className="text-sm truncate">{cartName(cart)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDate(cart.updatedAt)}
                  </div>
                </div>
                {cart.isActive && <ActiveBadge />}
              </div>
              <div className="divide-y divide-zinc-100">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-500">{t("items")}</span>
                  <span className="text-sm text-dark-blue font-medium">
                    {cart.itemCount}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                <button
                  className="text-sm text-dark-blue underline"
                  onClick={() => goToDetails(cart.id)}
                  data-testid="cart-view-details-button"
                >
                  {t("view-details")}
                </button>
                <button
                  className="text-sm text-dark-blue underline disabled:opacity-40 disabled:no-underline"
                  onClick={() => handleUseCart(cart.id)}
                  disabled={cart.isActive || pending}
                  data-testid="cart-use-button"
                >
                  {t("use-this-cart")}
                </button>
                <button
                  className="text-sm text-dark-blue underline"
                  onClick={() => openRename(cart)}
                  data-testid="cart-rename-button"
                >
                  {t("rename")}
                </button>
                <button
                  className="text-sm text-red-600 underline disabled:opacity-40 disabled:no-underline"
                  onClick={() => openDelete(cart)}
                  disabled={cart.isActive || pending}
                  data-testid="cart-delete-button"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table — visible at xsmall+ */}
      <div className="hidden xsmall:block overflow-x-auto mx-4 md:mx-6 border border-zinc-300">
        <table className="min-w-full divide-y divide-gray-200">
          <TableHeader>
            <TableHeaderCell className="px-3 md:px-6">
              {t("cart-name")}
            </TableHeaderCell>
            <TableHeaderCell>{t("items")}</TableHeaderCell>
            <TableHeaderCell className="hidden sm:table-cell">
              {t("updated")}
            </TableHeaderCell>
            <TableHeaderCell align="right">{t("status")}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dark-blue mx-auto" />
                </td>
              </tr>
            ) : carts && carts.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  {t("no-carts")}
                </td>
              </tr>
            ) : (
              (carts ?? []).map((cart) => (
                <tr key={cart.id} className="transition-colors">
                  <td className="td-cell">
                    <div className="flex items-center gap-2">
                      {cartName(cart)}
                      {cart.isActive && <ActiveBadge />}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <button
                        className="text-xs text-dark-blue underline"
                        onClick={() => goToDetails(cart.id)}
                        data-testid="cart-view-details-button"
                      >
                        {t("view-details")}
                      </button>
                      <button
                        className="text-xs text-dark-blue underline disabled:opacity-40 disabled:no-underline"
                        onClick={() => handleUseCart(cart.id)}
                        disabled={cart.isActive || pending}
                        data-testid="cart-use-button"
                      >
                        {t("use-this-cart")}
                      </button>
                      <button
                        className="text-xs text-dark-blue underline"
                        onClick={() => openRename(cart)}
                        data-testid="cart-rename-button"
                      >
                        {t("rename")}
                      </button>
                      <button
                        className="text-xs text-red-600 underline disabled:opacity-40 disabled:no-underline"
                        onClick={() => openDelete(cart)}
                        disabled={cart.isActive || pending}
                        data-testid="cart-delete-button"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    {cart.itemCount}
                  </td>
                  <td className="hidden sm:table-cell px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    {formatDate(cart.updatedAt)}
                  </td>
                  <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap text-right">
                    {cart.isActive ? <ActiveBadge /> : <span>-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rename dialog */}
      <Modal
        isOpen={renameTarget !== null}
        close={() => setRenameTarget(null)}
        size="small"
        data-testid="cart-rename-modal"
      >
        <Modal.Title>
          <Heading className="mb-2">{t("rename")}</Heading>
        </Modal.Title>
        <Modal.Body>
          <div className="w-full flex flex-col gap-y-4">
            <SearchInput
              label={t("cart-name")}
              placeholder={t("cart-name")}
              showSearchIcon={false}
              value={renameValue}
              onChange={setRenameValue}
              autoFocus
              data-testid="cart-rename-input"
            />
            {actionError && (
              <div className="text-rose-500 text-small-regular">
                {actionError}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setRenameTarget(null)}
                data-testid="cart-rename-cancel-button"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleRename}
                disabled={pending}
                data-testid="cart-rename-save-button"
              >
                {t("save")}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Delete confirmation dialog */}
      <Modal
        isOpen={deleteTarget !== null}
        close={() => setDeleteTarget(null)}
        size="small"
        data-testid="cart-delete-modal"
      >
        <Modal.Title>
          <Heading className="mb-2">{t("delete")}</Heading>
        </Modal.Title>
        <Modal.Body>
          <div className="w-full flex flex-col gap-y-4">
            <p className="text-small-regular text-dark-blue">
              {t("delete-cart-confirm")}
            </p>
            {actionError && (
              <div className="text-rose-500 text-small-regular">
                {actionError}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                data-testid="cart-delete-cancel-button"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={pending}
                className="border-red-600 bg-red-600 text-white hover:bg-red-700"
                data-testid="cart-delete-confirm-button"
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Prompt-to-save dialog */}
      <Modal
        isOpen={promptTargetId !== null}
        close={() => setPromptTargetId(null)}
        size="small"
        data-testid="cart-prompt-save-modal"
      >
        <Modal.Title>
          <Heading className="mb-2">{t("prompt-save-title")}</Heading>
        </Modal.Title>
        <Modal.Body>
          <div className="w-full flex flex-col gap-y-4">
            <p className="text-small-regular text-dark-blue">
              {t("prompt-save-body")}
            </p>
            <SearchInput
              label={t("cart-name")}
              placeholder={t("cart-name")}
              showSearchIcon={false}
              value={promptName}
              onChange={setPromptName}
              autoFocus
              data-testid="cart-prompt-name-input"
            />
            {actionError && (
              <div className="text-rose-500 text-small-regular">
                {actionError}
              </div>
            )}
            <div className="flex flex-col gap-3 mt-2">
              <Button
                onClick={handleSaveAndSwitch}
                disabled={pending}
                className="w-full"
                data-testid="cart-prompt-save-switch-button"
              >
                {t("save-and-switch")}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDiscardAndSwitch}
                disabled={pending}
                className="w-full"
                data-testid="cart-prompt-discard-switch-button"
              >
                {t("discard-and-switch")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPromptTargetId(null)}
                className="w-full"
                data-testid="cart-prompt-cancel-button"
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default CartsTable
