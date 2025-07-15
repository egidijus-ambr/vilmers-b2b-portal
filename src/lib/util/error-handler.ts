import {
  FurnisystemsError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "@lib/furnisystems-sdk/client/errors"

/**
 * Global error handler that converts technical errors into user-friendly messages
 * @param error - The error object to handle
 * @param context - Optional context for more specific error messages
 * @returns User-friendly error message
 */
export function handleError(error: any, context?: string): string {
  console.error(`Error in ${context || "application"}:`, error)

  // Handle network and service unavailability errors
  if (
    error instanceof NetworkError ||
    error.name === "NetworkError" ||
    error.message?.includes("Gateway Time-out") ||
    error.message?.includes("504") ||
    error.message?.includes("503") ||
    error.message?.includes("502") ||
    error.message?.includes("timeout") ||
    error.message?.includes("ECONNREFUSED") ||
    error.message?.includes("ENOTFOUND") ||
    error.message?.includes("Network request failed") ||
    error.status === 504 ||
    error.status === 503 ||
    error.status === 502
  ) {
    return "The service is currently unavailable. Please try again later."
  }

  // Handle authentication errors
  if (
    error instanceof AuthenticationError ||
    error.name === "AuthenticationError" ||
    error.status === 401
  ) {
    return "Authentication failed. Please check your credentials and try again."
  }

  // Handle authorization errors
  if (
    error instanceof AuthorizationError ||
    error.name === "AuthorizationError" ||
    error.status === 403
  ) {
    return "Access denied. Please contact support if you believe this is an error."
  }

  // Handle validation errors
  if (
    error instanceof ValidationError ||
    error.name === "ValidationError" ||
    error.status === 400
  ) {
    return "Invalid input provided. Please check your information and try again."
  }

  // Handle not found errors
  if (
    error instanceof NotFoundError ||
    error.name === "NotFoundError" ||
    error.status === 404
  ) {
    return "The requested resource was not found. Please contact support."
  }

  // Handle rate limiting
  if (error.status === 429) {
    return "Too many requests. Please wait a moment and try again."
  }

  // Handle server errors
  if (error.status >= 500 && error.status < 600) {
    return "A server error occurred. Please try again later."
  }

  // Handle client errors
  if (error.status >= 400 && error.status < 500) {
    return "There was an issue with your request. Please check your information and try again."
  }

  // Handle Furnisystems SDK errors
  if (error instanceof FurnisystemsError) {
    // Return a generic message for SDK errors to avoid exposing technical details
    return "An error occurred while processing your request. Please try again later."
  }

  // Handle generic JavaScript errors
  if (error instanceof Error) {
    // Don't expose technical error messages to users
    return "An unexpected error occurred. Please try again later."
  }

  // Fallback for unknown error types
  return "An unexpected error occurred. Please try again later."
}

/**
 * Context-specific error handlers for common operations
 */
export const ErrorHandlers = {
  /**
   * Handle errors specific to magic link requests
   */
  magicLink: (error: any): string => {
    // Use the global handler for magic link errors
    return handleError(error, "magic link request")
  },

  /**
   * Handle errors specific to login operations
   */
  login: (error: any): string => {
    if (
      error.status === 401 ||
      error.message?.includes("invalid credentials")
    ) {
      return "Invalid email or password. Please try again."
    }

    return handleError(error, "login")
  },

  /**
   * Handle errors specific to data fetching operations
   */
  dataFetch: (error: any): string => {
    return handleError(error, "data fetch")
  },

  /**
   * Handle errors specific to form submissions
   */
  formSubmission: (error: any): string => {
    return handleError(error, "form submission")
  },
}
