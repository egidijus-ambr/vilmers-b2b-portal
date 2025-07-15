import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  ApolloLink,
  DocumentNode,
  OperationVariables,
  QueryOptions,
  MutationOptions,
} from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import { onError } from "@apollo/client/link/error"
import {
  FurnisystemsError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "./errors"
import { ClientConfig, AuthHeaders } from "./types"

export class ApolloGraphQLClient {
  private client: ApolloClient<any>
  private config: ClientConfig
  private authHeaders: AuthHeaders = {}

  constructor(config: ClientConfig) {
    this.config = config
    this.client = this.createApolloClient()
  }

  setAuthHeaders(headers: AuthHeaders) {
    this.authHeaders = headers
  }

  clearAuthHeaders() {
    this.authHeaders = {}
  }

  private createApolloClient(): ApolloClient<any> {
    // HTTP Link with proper fetch configuration matching the curl request
    const httpLink = createHttpLink({
      uri: this.config.graphqlEndpoint,
      credentials: "include", // Changed from "same-origin" to "include" for cross-site requests
      fetch: globalThis.fetch,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    console.log(
      `[Furnisystems SDK] Using GraphQL endpoint: ${this.config.graphqlEndpoint}`
    )

    // Auth Link
    const authLink = setContext((_, { headers }) => {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...this.config.defaultHeaders,
        ...this.authHeaders,
      }

      if (this.config.publishableKey) {
        authHeaders["x-publishable-api-key"] = this.config.publishableKey
      }

      return {
        headers: {
          ...headers,
          ...authHeaders,
        },
      }
    })

    // Error Link - Don't throw errors here, let them be handled in query/mutate methods
    const errorLink = onError(
      ({ graphQLErrors, networkError, operation, forward }) => {
        if (graphQLErrors) {
          graphQLErrors.forEach((error) => {
            if (this.config.debug) {
              console.error(`[Furnisystems SDK] GraphQL error:`, error)
            }
            // Don't throw here - let the query/mutate methods handle errors
          })
        }

        if (networkError) {
          if (this.config.debug) {
            console.error(`[Furnisystems SDK] Network error:`, networkError)
          }
          // Don't throw here - let the query/mutate methods handle errors
        }
      }
    )

    // Debug Link
    const debugLink = new ApolloLink((operation, forward) => {
      if (this.config.debug) {
        console.log(`[Furnisystems SDK] GraphQL Operation:`, {
          operationName: operation.operationName,
          variables: operation.variables,
          query: operation.query,
        })
      }

      return forward(operation).map((response) => {
        if (this.config.debug) {
          console.log(`[Furnisystems SDK] GraphQL Response:`, response)
        }
        return response
      })
    })

    // Product containers merge function (from provided script)
    const productContainersMerge = (
      existing: any[],
      incoming: any[],
      readField: any,
      mergeObjects: any
    ) => {
      const merged: any[] = existing ? existing.slice(0) : []
      const productToIndex: Record<number, number> = Object.create(null)

      if (existing) {
        existing.forEach((product, index) => {
          const id = readField("id", product)
          if (id !== undefined) {
            productToIndex[id] = index
          }
        })
      }

      incoming.forEach((product) => {
        const productID = readField("id", product)
        if (productID !== undefined) {
          const index = productToIndex[productID]
          if (typeof index === "number") {
            merged[index] = mergeObjects(merged[index], product)
          } else {
            productToIndex[productID] = merged.length
            merged.push(product)
          }
        }
      })
      return merged
    }

    return new ApolloClient({
      ssrMode: typeof window === "undefined",
      link: from([debugLink, errorLink, authLink, httpLink]),
      cache: new InMemoryCache({
        typePolicies: {
          ProductContainer: {
            fields: {
              advanced_product: {
                merge(existing, incoming) {
                  return incoming
                },
              },
            },
          },
          Query: {
            fields: {
              sortedProductContainersData: {
                keyArgs: [
                  "where",
                  "orderBy",
                  "cursor",
                  "first",
                  "loadMore",
                  "orderByName",
                ],
                merge(existing, incoming, { mergeObjects, readField, args }) {
                  const products = productContainersMerge(
                    existing?.sortedProductContainers,
                    incoming.sortedProductContainers,
                    readField,
                    mergeObjects
                  )

                  return {
                    lastProductId: incoming.lastProductId,
                    hasNextPage: incoming.hasNextPage,
                    sortedProductContainers: products,
                  }
                },
                read(existing, { args }) {
                  if (existing) {
                    return existing
                  }
                },
              },
              findManyProductContainerExtendedSorting: {
                keyArgs: ["where", "orderBy", "orderByName"],
                merge(
                  existing: any[],
                  incoming: any[],
                  { readField, mergeObjects, args }
                ) {
                  const merged: any[] = existing ? existing.slice(0) : []
                  const productToIndex: Record<number, number> =
                    Object.create(null)

                  if (existing) {
                    existing.forEach((product, index) => {
                      const id = readField<number>("id", product)
                      if (id !== undefined) {
                        productToIndex[id] = index
                      }
                    })
                  }

                  incoming.forEach((product) => {
                    const productID = readField<number>("id", product)
                    if (productID !== undefined) {
                      const index = productToIndex[productID]
                      if (typeof index === "number") {
                        merged[index] = mergeObjects(merged[index], product)
                      } else {
                        productToIndex[productID] = merged.length
                        merged.push(product)
                      }
                    }
                  })
                  return merged
                },
              },
              // Disable caching for customer orders to ensure fresh data
              getCustomerOrders: {
                keyArgs: false,
                merge(existing, incoming) {
                  // Always return incoming data, never merge with existing
                  return incoming
                },
                read(existing, { args }) {
                  // Always return undefined to force a fresh fetch
                  return undefined
                },
              },
              cartItems: {
                keyArgs: false,
                merge(existing, incoming) {
                  return incoming
                },
              },
              wishlistItems: {
                keyArgs: false,
                merge(existing, incoming) {
                  return incoming
                },
              },
              recentlyViewed: {
                keyArgs: false,
                merge(existing, incoming) {
                  return incoming
                },
              },
            },
          },
        },
      }),
    })
  }

  private handleGraphQLError(error: any): never {
    const message = error.message

    // Check for common error types based on message or extensions
    if (
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("authentication")
    ) {
      throw new AuthenticationError(message)
    }

    if (
      message.toLowerCase().includes("forbidden") ||
      message.toLowerCase().includes("access denied")
    ) {
      throw new AuthorizationError(message)
    }

    if (message.toLowerCase().includes("not found")) {
      throw new NotFoundError(message)
    }

    if (
      message.toLowerCase().includes("validation") ||
      message.toLowerCase().includes("invalid")
    ) {
      throw new ValidationError(message, error.extensions)
    }

    // Generic GraphQL error
    throw new FurnisystemsError(message, "GRAPHQL_ERROR", undefined, {
      extensions: error.extensions,
    })
  }

  async query<
    T = any,
    TVariables extends OperationVariables = OperationVariables
  >(
    query: DocumentNode,
    options?: Omit<QueryOptions<TVariables, T>, "query">
  ): Promise<T> {
    try {
      const result = await this.client.query<T, TVariables>({
        query,
        ...options,
      })

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error) => this.handleGraphQLError(error))
      }

      return result.data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Query failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  async mutate<
    T = any,
    TVariables extends OperationVariables = OperationVariables
  >(
    mutation: DocumentNode,
    options?: Omit<MutationOptions<T, TVariables>, "mutation">
  ): Promise<T> {
    try {
      const result = await this.client.mutate<T, TVariables>({
        mutation,
        ...options,
      })

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error) => this.handleGraphQLError(error))
      }

      if (!result.data) {
        throw new FurnisystemsError("No data returned from mutation")
      }

      return result.data
    } catch (error) {
      if (error instanceof FurnisystemsError) {
        throw error
      }
      throw new NetworkError(
        `Mutation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  // Expose the Apollo Client instance for advanced usage
  getClient(): ApolloClient<any> {
    return this.client
  }

  // Clear cache
  clearCache(): void {
    this.client.clearStore()
  }

  // Reset cache
  resetCache(): void {
    this.client.resetStore()
  }
}

// Export both the new Apollo client and keep the old name for compatibility
export { ApolloGraphQLClient as GraphQLClient }
