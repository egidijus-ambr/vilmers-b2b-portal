import { ApiError } from "../types/common"

export class FurnisystemsError extends Error {
  public code?: string
  public status?: number
  public details?: Record<string, any>

  constructor(
    message: string,
    code?: string,
    status?: number,
    details?: Record<string, any>
  ) {
    super(message)
    this.name = "FurnisystemsError"
    this.code = code
    this.status = status
    this.details = details
  }

  static fromApiError(error: ApiError): FurnisystemsError {
    return new FurnisystemsError(
      error.message,
      error.code,
      error.status,
      error.details
    )
  }

  static fromResponse(response: Response, data?: any): FurnisystemsError {
    const message =
      data?.message || `HTTP ${response.status}: ${response.statusText}`
    return new FurnisystemsError(message, data?.code, response.status, data)
  }
}

export class AuthenticationError extends FurnisystemsError {
  constructor(message: string = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401)
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends FurnisystemsError {
  constructor(message: string = "Access denied") {
    super(message, "AUTHORIZATION_ERROR", 403)
    this.name = "AuthorizationError"
  }
}

export class ValidationError extends FurnisystemsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
  }
}

export class NotFoundError extends FurnisystemsError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND_ERROR", 404)
    this.name = "NotFoundError"
  }
}

export class NetworkError extends FurnisystemsError {
  constructor(message: string = "Network request failed") {
    super(message, "NETWORK_ERROR")
    this.name = "NetworkError"
  }
}
