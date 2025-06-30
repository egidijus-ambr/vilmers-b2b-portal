export interface GraphQLRequestConfig {
  headers?: Record<string, string>
  variables?: Record<string, any>
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

export interface ClientConfig {
  graphqlEndpoint: string
  apiKey?: string
  publishableKey?: string
  debug?: boolean
  timeout?: number
  defaultHeaders?: Record<string, string>
}

export interface AuthHeaders {
  authorization?: string
  "x-publishable-api-key"?: string
}

export interface CacheOptions {
  tags?: string[]
  revalidate?: number | false
}

// Next.js specific types
export interface NextFetchRequestConfig {
  revalidate?: number | false
  tags?: string[]
}

export interface GraphQLResponse<T = any> {
  data?: T
  errors?: GraphQLError[]
}

export interface GraphQLError {
  message: string
  locations?: Array<{
    line: number
    column: number
  }>
  path?: Array<string | number>
  extensions?: Record<string, any>
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, any>
  operationName?: string
}
