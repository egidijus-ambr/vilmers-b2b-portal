"use client"

import { useShopSettings } from "@lib/context/shop-settings-context"

const ShopSettingsTest = () => {
  const { shopSettings, isLoading, error } = useShopSettings()

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-100 border border-blue-300 rounded">
        Loading shop settings...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded text-red-700">
        Error: {error}
      </div>
    )
  }

  if (!shopSettings) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-700">
        No shop settings found
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <h3 className="font-semibold text-green-800 mb-2">
        Shop Settings Loaded
      </h3>
      <div className="space-y-2 text-sm text-green-700">
        <p>
          <strong>ID:</strong> {shopSettings.id}
        </p>
        <p>
          <strong>Currency:</strong> {shopSettings.currency}
        </p>
        <p>
          <strong>Enabled Languages:</strong>{" "}
          {shopSettings.enabled_languages.length}
        </p>
        {shopSettings.enabled_languages.map((lang) => (
          <div key={lang.id} className="ml-4 p-2 bg-green-50 rounded">
            <p>
              <strong>Language:</strong> {lang.language}
            </p>
            <p>
              <strong>Default:</strong> {lang.default_language ? "Yes" : "No"}
            </p>
            <p>
              <strong>Web Address:</strong> {lang.web_address}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShopSettingsTest
