"use client"

import React from "react"
import { useTranslations } from "../provider"
import { LanguageSwitcher } from "./language-switcher"

export function TranslationDemo() {
  const { t, language, isReady } = useTranslations()

  if (!isReady) {
    return <div>Loading translations...</div>
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Translation Demo</h2>
        <LanguageSwitcher />
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">
              Common Translations
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Loading:</strong> {t("common:loading")}
              </li>
              <li>
                <strong>Save:</strong> {t("common:save")}
              </li>
              <li>
                <strong>Cancel:</strong> {t("common:cancel")}
              </li>
              <li>
                <strong>Email:</strong> {t("common:email")}
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">Navigation</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Home:</strong> {t("navigation:home")}
              </li>
              <li>
                <strong>Products:</strong> {t("navigation:products")}
              </li>
              <li>
                <strong>Cart:</strong> {t("navigation:cart")}
              </li>
              <li>
                <strong>Account:</strong> {t("navigation:account")}
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">Product</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Add to Cart:</strong> {t("product:addToCart")}
              </li>
              <li>
                <strong>In Stock:</strong> {t("product:inStock")}
              </li>
              <li>
                <strong>Out of Stock:</strong> {t("product:outOfStock")}
              </li>
              <li>
                <strong>Price:</strong> {t("product:price")}
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-700 mb-2">Cart</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Title:</strong> {t("cart:title")}
              </li>
              <li>
                <strong>Empty:</strong> {t("cart:empty")}
              </li>
              <li>
                <strong>Checkout:</strong> {t("cart:proceedToCheckout")}
              </li>
              <li>
                <strong>Total:</strong> {t("cart:total")}
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold text-blue-700 mb-2">
            Interpolation Example
          </h3>
          <p className="text-sm">
            <strong>Free Shipping Threshold:</strong>{" "}
            {t("cart:freeShippingThreshold", { amount: "$50" })}
          </p>
          <p className="text-sm">
            <strong>Limited Stock:</strong>{" "}
            {t("cart:limitedStock", { count: 3 })}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h3 className="font-semibold text-green-700 mb-2">
            Current Language
          </h3>
          <p className="text-sm">
            <strong>Language Code:</strong> {language}
          </p>
          <p className="text-sm">
            <strong>Ready:</strong> {isReady ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </div>
  )
}
