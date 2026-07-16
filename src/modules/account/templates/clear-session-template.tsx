"use client"

import { useState } from "react"
import {
  clearAllSessionData,
  clearSessionAndRedirect,
  clearSessionAndReload,
} from "../../../lib/util/session-cleanup"
import { Button } from "@medusajs/ui"

export default function ClearSessionTemplate() {
  const [isClearing, setIsClearing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClearSession = async () => {
    setIsClearing(true)
    setError(null)

    try {
      await clearAllSessionData()
      setIsSuccess(true)

      // Show success message for 2 seconds before redirecting
      setTimeout(() => {
        window.location.href = "/"
      }, 2000)
    } catch (err) {
      setError("Failed to clear session data. Please try again.")
      console.error("Session cleanup error:", err)
    } finally {
      setIsClearing(false)
    }
  }

  const handleClearAndRedirect = async () => {
    setIsClearing(true)
    setError(null)

    try {
      await clearSessionAndRedirect("/")
    } catch (err) {
      setError("Failed to clear session data. Please try again.")
      console.error("Session cleanup error:", err)
      setIsClearing(false)
    }
  }

  const handleClearAndReload = async () => {
    setIsClearing(true)
    setError(null)

    try {
      await clearSessionAndReload()
    } catch (err) {
      setError("Failed to clear session data. Please try again.")
      console.error("Session cleanup error:", err)
      setIsClearing(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Session Cleared Successfully
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            All session data has been cleared. Redirecting to home page...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-bold text-gray-900 mb-2">
            Clear Session Data
          </h1>
          <p className="text-gray-600">
            This will clear all stored data including login sessions, cart data,
            and preferences. Use this if you're experiencing issues with stuck
            sessions.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              What will be cleared:
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• All login sessions and authentication tokens</li>
              <li>• Shopping cart data</li>
              <li>• Local storage and session storage</li>
              <li>• All browser cookies</li>
              <li>• Cached application data</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleClearSession}
              disabled={isClearing}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isClearing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Clearing...
                </div>
              ) : (
                "Clear Session Data"
              )}
            </Button>

            <Button
              onClick={handleClearAndReload}
              disabled={isClearing}
              variant="secondary"
              className="w-full"
            >
              Clear and Reload Page
            </Button>

            <Button
              onClick={handleClearAndRedirect}
              disabled={isClearing}
              variant="secondary"
              className="w-full"
            >
              Clear and Go to Home
            </Button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              You will need to log in again after clearing session data
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
