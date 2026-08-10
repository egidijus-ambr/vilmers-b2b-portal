import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { GraphQLRequestConfig } from "../../client/types"
import {
  Customer,
  Order,
  OrderDetail,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateAddressInput,
  UpdateAddressInput,
  AuthCredentials,
  RegisterInput,
  OrdersQueryOptions,
  OrdersQueryResult,
  FabricPaletteDetail,
  SearchCustomerArgs,
  SearchCustomerResult,
} from "./types"
import { useMutation } from "@apollo/client"

// Helper function to safely access cookies in server context only
async function setCookieIfAvailable(
  name: string,
  value: string,
  options?: any
): Promise<void> {
  if (typeof window !== "undefined") {
    return // Client-side, no cookie setting
  }

  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    cookieStore.set(name, value, options)
  } catch (error) {
    console.warn("Could not set cookie:", error)
  }
}

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    authenticateB2BCustomer(email: $email, password: $password)
  }
`

const LOGIN_TO_STORE_WITH_TOKEN_MUTATION = gql`
  mutation LoginToStoreWithToken {
    loginToStoreWithToken
  }
`

const GET_ME_QUERY = gql`
  query GetMe {
    getMe {
      id
      name
      email
      b2b_company_name
      account_code
      price_listId
      b2b_customer_discount
      tags {
        id
      }
      fabric_palettes {
        id
      }
      customer_group {
        price_listId
        fabric_palettes {
          id
        }
      }
      is_configurator_enabled
      is_claims_enabled
      role
      customer_accounts {
        id
        name
        email
        is_prices_enabled
        customerSubAccount {
          name
        }
      }
      b2b_company_address {
        country
      }
      managers {
        id
        manager {
          name
          role
          surname
          spoken_languages
          email
          default_phone_number
          image {
            src_md
            src
          }
        }
      }
      additional_components {
        additionalComponent {
          id
          code
          additional_component_group {
            code
          }
        }
      }
    }
  }
`

const GET_CUSTOMER_ORDERS_QUERY = gql`
  query GetCustomerOrdersWithSearch(
    $searchText: String
    $take: Int
    $skip: Int
  ) {
    getCustomerOrders(searchText: $searchText, take: $take, skip: $skip) {
      totalCount
      currentPage
      totalPages
      pageSize
      hasNextPage
      hasPreviousPage

      orders {
        id
        createdAt
        order_status
        confirmed_delivery_date
        total_price_confirmed
        metadata
        total_price
        order_code
        order_number
        invoice_code
        order_type

        purchased_customerAccount {
          customerSubAccount {
            name
          }
        }
        purchased_subAccount {
          name
        }
        purchased_by {
          name
          account_code
        }
        order_external_code

        order_items {
          reference
        }
      }
    }
  }
`

const GET_CUSTOMER_ORDER_BY_ID_QUERY = gql`
  query GetCustomerOrderById($where: OrderWhereInput, $take: Int) {
    getCustomerOrders(where: $where, take: $take) {
      totalCount
      orders {
        id
        createdAt
        order_status
        confirmed_delivery_date
        preferred_delivery_date
        total_price_confirmed
        total_price
        order_code
        order_number
        invoice_code
        invoice_pdf_url
        order_type
        order_external_code
        metadata

        shipping_address {
          id
          phone_number
          country
          city
          postal_code
          state_region
          address_1
          address_2
        }

        billing_address {
          id
          phone_number
          country
          city
          postal_code
          state_region
          address_1
          address_2
        }

        payment_method {
          id
          payment_method_profiles {
            title
            language
          }
        }

        order_items {
          id
          reference
          price
          shipping_price
          quantity
          sku
          volume
          metadata
          cart_item {
            advanced_product_type
            selected_sofa_combinations
            fabric_code
            fabric_group_name
            cartItemFabrics {
              id
              fabric_group {
                id
                code
                type
                fabric_group_profiles {
                  language
                  name
                }
              }
              fabric {
                id
                code
                color_name
                image {
                  src
                  src_thumbnail
                }
              }
              combination_option {
                fabricCombinationOptionProfiles {
                  language
                  name
                }
              }
            }
            product_container {
              single_product {
                images {
                  src
                  src_xs
                  src_thumbnail
                }
                product_profiles {
                  name
                  language
                }
              }
              advanced_product {
                images {
                  src
                  src_xs
                  src_thumbnail
                }
                advanced_product_profiles {
                  name
                  language
                }
                dimensions {
                  width
                  height
                  length
                  seat_height
                  seat_width
                  seat_depth
                  headboard_height
                  headboard_width
                  mattress_width
                  mattress_length
                  table_extended_lengh
                  table_top_thickness
                  table_leg_width
                  shade_height
                  shade_radius
                }
              }
            }
            additional_components {
              id
              additionalComponentGroupId
              code
              additional_component_profiles {
                name
                material_name
                language
              }
              image {
                src
                src_thumbnail
              }
              color {
                id
                hex
                background
              }
              additional_component_group {
                id
                code
                additional_component_group_profiles {
                  name
                  language
                }
              }
              dimensions {
                width
                height
                length
              }
              is_wrapper
              linked_components_source {
                display_order
                link_type
                target_component {
                  id
                  code
                  image {
                    src
                    src_thumbnail
                  }
                  additional_component_profiles {
                    name
                    material_name
                    language
                  }
                }
              }
            }
            fabricCombination {
              image {
                src
                src_xs
                src_thumbnail
              }
            }
          }
          shipping_method {
            id
            shipping_method_profiles {
              title
              language
            }
          }
        }

        purchased_subAccount {
          name
        }
        purchased_by {
          name
          account_code
        }
      }
    }
  }
`

const GET_MAGIC_LINK_FOR_B2B_CUSTOMER_MUTATION = gql`
  mutation GetMagicLinkForB2BCustomer(
    $email: String!
    $language: Language
    $ipAddress: String
  ) {
    getMagicLinkForB2BCustomer(
      email: $email
      language: $language
      ipAddress: $ipAddress
    )
  }
`

const VERIFY_MAGIC_LINK_FOR_B2B_CUSTOMER_MUTATION = gql`
  mutation VerifyMagicLinkForB2BCustomer($token: String!) {
    verifyMagicLinkForB2BCustomer(token: $token)
  }
`

const GET_CLAIMS_LINK_QUERY = gql`
  query GetClaimsLink($language: String!) {
    getClaimsLink(language: $language) {
      url
    }
  }
`

const GET_FABRIC_PALETTES_QUERY = gql`
  query GetFabricPalettesDetail {
    getMe {
      fabric_palettes {
        id
        name
        code
        fabric_groups {
          id
          name
          fabric_group {
            id
            code
            fabrics {
              id
              code
              color_name
              order
              image {
                id
                src
                src_thumbnail
                src_md
              }
            }
            fabric_group_profiles {
              id
              name
              language
              description
            }
            fabric_features {
              fabric_feature {
                id
                code
                photo {
                  id
                  src
                }
                fabric_feature_profiles {
                  name
                  language
                }
                fabric_feature_group {
                  id
                  code
                  fabric_feature_group_profiles {
                    name
                    language
                  }
                }
              }
            }
            fabric_price_category {
              id
              group_number
            }
          }
        }
      }
      customer_group {
        fabric_palettes {
          id
          name
          code
          fabric_groups {
            id
            name
            fabric_group {
              id
              code
              fabrics {
                id
                code
                color_name
                order
                image {
                  id
                  src
                  src_thumbnail
                  src_md
                }
              }
              fabric_group_profiles {
                id
                name
                language
                description
              }
              fabric_features {
                fabric_feature {
                  id
                  code
                  photo {
                    id
                    src
                  }
                  fabric_feature_profiles {
                    name
                    language
                  }
                  fabric_feature_group {
                    id
                    code
                    fabric_feature_group_profiles {
                      name
                      language
                    }
                  }
                }
              }
              fabric_price_category {
                id
                group_number
              }
            }
          }
        }
      }
    }
  }
`

const GET_FABRIC_PALETTES_BY_IDS_QUERY = gql`
  query GetFabricPalettesByIds($where: FabricPaletteWhereInput) {
    findManyFabricPalette(where: $where) {
      id
      name
      code
      fabric_groups {
        id
        name
        fabric_group {
          id
          code
          fabrics {
            id
            code
            color_name
            order
            image {
              id
              src
              src_thumbnail
              src_md
            }
          }
          fabric_group_profiles {
            id
            name
            language
            description
          }
          fabric_features {
            fabric_feature {
              id
              code
              photo {
                id
                src
              }
              fabric_feature_profiles {
                name
                language
              }
              fabric_feature_group {
                id
                code
                fabric_feature_group_profiles {
                  name
                  language
                }
              }
            }
          }
          fabric_price_category {
            id
            group_number
          }
        }
      }
    }
  }
`

const SEARCH_CUSTOMERS_QUERY = gql`
  query SearchCustomers($query: String, $limit: Int, $ids: [Int!]) {
    searchCustomers(query: $query, limit: $limit, ids: $ids) {
      id
      name
      surname
      email
      account_code
      b2b_company_name
      price_listId
      role
      tags {
        id
      }
      fabric_palettes {
        id
      }
      customer_group {
        name
        price_listId
        fabric_palettes {
          id
        }
      }
      additional_components {
        additionalComponent {
          id
          code
          additional_component_group {
            code
          }
        }
      }
    }
  }
`

export class CustomerModule {
  constructor(private client: GraphQLClient) {}

  // TODO: Implement GraphQL queries and mutations for customer operations
  // This will include:
  // - getCustomer(): Promise<Customer | null>
  // - login(credentials: AuthCredentials): Promise<{ token: string; customer: Customer }>
  // - register(input: RegisterInput): Promise<{ token: string; customer: Customer }>
  // - logout(): Promise<void>
  // - createCustomer(input: CreateCustomerInput): Promise<Customer>
  // - updateCustomer(input: UpdateCustomerInput): Promise<Customer>
  // - createAddress(input: CreateAddressInput): Promise<Address>
  // - updateAddress(id: string, input: UpdateAddressInput): Promise<Address>
  // - deleteAddress(id: string): Promise<void>

  async login(
    credentials: AuthCredentials
  ): Promise<{ token: string; customer: Customer }> {
    try {
      const response = await this.client.mutate<{
        authenticateB2BCustomer: string
      }>(LOGIN_MUTATION, {
        variables: {
          email: credentials.email,
          password: credentials.password,
        },
      })

      const token = response.authenticateB2BCustomer

      if (!token) {
        throw new Error("Authentication failed: No token received")
      }

      // Store token in cookies internally within the SDK
      await setCookieIfAvailable("_furni_jwt", token, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      })

      // TODO: Fetch customer data after successful authentication
      // For now, we'll return a placeholder customer object
      // This should be replaced with an actual customer query
      const customer: Customer = {
        id: "", // Will be populated from actual customer query
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: credentials.email,
        full_name: "",
        has_account: true,
      }

      return {
        token,
        customer,
      }
    } catch (error) {
      throw error
    }
  }

  async getMe(): Promise<Customer | null> {
    try {
      const response = await this.client.query<{
        getMe: {
          id: string
          name: string
          email: string
          b2b_company_name: string
          account_code: string
          price_listId: string
          b2b_customer_discount: number | null
          tags: { id: number }[]
          fabric_palettes: {
            id: string
          }[]
          customer_group?: {
            price_listId?: string
            fabric_palettes?: {
              id: string
            }[]
          }
          is_configurator_enabled: boolean
          is_claims_enabled: boolean
          role?: string
          customer_accounts?: {
            id: string
            name: string
            email: string
            is_prices_enabled?: boolean
            customerSubAccount: {
              name: string
            }
          }[]
          b2b_company_address: {
            country: string
          }
          // Managers can be an array of objects with id and manager details
          managers: {
            id: string
            manager: {
              name: string
              surname: string
              email: string
              default_phone_number?: string
              role?: string
              image?: {
                src_md: string
                src: string
              }
            }
          }[]
          additional_components?: {
            additionalComponent: {
              code?: string
              additional_component_group?: {
                code?: string
              }
            }
          }[]
        }
      }>(GET_ME_QUERY, {
        fetchPolicy: "no-cache", // Always fetch fresh data, never use cache
        errorPolicy: "all", // Return partial data even if there are errors
      })

      const customerData = response.getMe

      if (!customerData) {
        return null
      }

      // Map the response to the Customer interface
      const customer: Customer = {
        id: customerData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: customerData.email,
        full_name: customerData.name || "",
        has_account: true,
        b2b_company_name: customerData.b2b_company_name,
        account_code: customerData.account_code,
        price_listId: customerData.price_listId,
        group_price_listId: customerData.customer_group?.price_listId ?? null,
        b2b_customer_discount: customerData.b2b_customer_discount,
        tags: customerData.tags,
        fabric_palettes: customerData.fabric_palettes,
        customer_group: customerData.customer_group,
        managers: customerData.managers,
        is_configurator_enabled: customerData.is_configurator_enabled,
        is_claims_enabled: customerData.is_claims_enabled,
        role: customerData.role,
        b2b_company_address: customerData.b2b_company_address,
        name: customerData.name || "",
        additional_components: customerData.additional_components,
        customer_account: customerData?.customer_accounts?.[0]
          ? {
              id: customerData.customer_accounts[0].id,
              name: customerData.customer_accounts[0].name,
              email: customerData.customer_accounts[0].email,
              shop: customerData.customer_accounts[0]?.customerSubAccount?.name,
              is_prices_enabled:
                customerData.customer_accounts[0].is_prices_enabled ?? true,
            }
          : {
              name: "",
              email: "",
              shop: "",
              // No account on the session (agent / impersonation): fail open.
              is_prices_enabled: true,
            },
      }

      return customer
    } catch (error) {
      console.error("Error fetching customer:", error)
      return null
    }
  }

  async getCustomerOrders(
    options?: OrdersQueryOptions
  ): Promise<OrdersQueryResult> {
    try {
      // Set default values
      const searchText = options?.searchText || undefined
      const take = options?.take || 20
      const skip = options?.skip || 0

      const response = await this.client.query<{
        getCustomerOrders: {
          totalCount: number
          currentPage: number
          totalPages: number
          pageSize: number
          hasNextPage: boolean
          hasPreviousPage: boolean
          orders: {
            id: string
            createdAt: string
            order_status: string
            confirmed_delivery_date?: string
            metadata?: Record<string, any>
            total_price_confirmed?: number
            total_price: number
            order_code: string
            order_number: string
            invoice_code?: string
            order_type?: string
            order_external_code?: string
            purchased_subAccount?: {
              name: string
            }
            purchased_by?: {
              name: string
              account_code: string
            }
            order_items?: {
              reference?: string
            }[]
          }[]
        }
      }>(GET_CUSTOMER_ORDERS_QUERY, {
        variables: {
          searchText,
          take,
          skip,
        },
        fetchPolicy: "no-cache", // Always fetch fresh data, never use cache
        errorPolicy: "all", // Return partial data even if there are errors
      })

      const ordersData = response.getCustomerOrders

      if (!ordersData) {
        return {
          orders: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 0,
          pageSize: take,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      }

      // Map the response to the Order interface
      const orders: Order[] = ordersData.orders.map((orderData) => ({
        id: orderData.id, // Use raw DB id for navigation
        display_id: orderData.order_external_code || orderData.order_code,
        created_at: orderData.createdAt,
        updated_at: orderData.createdAt, // Use createdAt as fallback for updated_at
        order_status: orderData.order_status,
        confirmed_delivery_date: orderData.confirmed_delivery_date,
        metadata: orderData.metadata || {},
        total_price_confirmed: orderData.total_price_confirmed,
        total_price: orderData.total_price,
        order_code: orderData.order_code,
        order_number: orderData.order_number,
        invoice_code: orderData.invoice_code,
        order_type: orderData.order_type,
        order_external_code: orderData.order_external_code,
        items:
          orderData.order_items?.map((item) => ({
            id: "", // Will be populated when we have full order item data
            created_at: orderData.createdAt,
            updated_at: orderData.createdAt,
            title: "", // Will be populated when we have full order item data
            quantity: 1, // Will be populated when we have full order item data
            unit_price: 0, // Will be populated when we have full order item data
            total: 0, // Will be populated when we have full order item data
            variant_id: "", // Will be populated when we have full order item data
            product_id: "", // Will be populated when we have full order item data
            reference: item.reference,
          })) || [],
        purchased_subAccount: orderData.purchased_subAccount,
        purchased_by: orderData.purchased_by,
        order_item_references:
          orderData.order_items
            ?.map((item) => item.reference)
            .filter((ref): ref is string => Boolean(ref)) || [],
      }))

      return {
        orders,
        totalCount: ordersData.totalCount,
        currentPage: ordersData.currentPage,
        totalPages: ordersData.totalPages,
        pageSize: ordersData.pageSize,
        hasNextPage: ordersData.hasNextPage,
        hasPreviousPage: ordersData.hasPreviousPage,
      }
    } catch (error) {
      console.error("Error fetching customer orders:", error)
      throw error
    }
  }

  async getCustomerOrderById(orderId: string): Promise<OrderDetail | null> {
    try {
      const response = await this.client.query<{
        getCustomerOrders: {
          totalCount: number
          orders: {
            id: string
            createdAt: string
            order_status: string
            confirmed_delivery_date?: string
            preferred_delivery_date?: string
            total_price_confirmed?: number
            total_price: number
            order_code: string
            order_number: string
            invoice_code?: string
            invoice_pdf_url?: string
            order_type?: string
            order_external_code?: string
            metadata?: Record<string, any>
            shipping_address?: {
              id: number
              phone_number: string
              country: string
              city: string
              postal_code: string
              state_region?: string
              address_1: string
              address_2?: string
            }
            billing_address?: {
              id: number
              phone_number: string
              country: string
              city: string
              postal_code: string
              state_region?: string
              address_1: string
              address_2?: string
            }
            payment_method?: {
              id: number
              payment_method_profiles?: {
                title: string
                language: string
              }[]
            }
            order_items?: {
              id: string
              reference?: string
              price: number
              shipping_price: number
              quantity: number
              sku?: string
              volume?: number
              metadata?: Record<string, any>
              cart_item?: {
                advanced_product_type?: string
                selected_sofa_combinations?: string
                fabric_code?: string
                fabric_group_name?: string
                product_container?: {
                  single_product?: {
                    images?: {
                      src: string
                      src_xs?: string
                      src_thumbnail?: string
                    }[]
                    product_profiles?: {
                      name: string
                      language: string
                    }[]
                  }
                  advanced_product?: {
                    images?: {
                      src: string
                      src_xs?: string
                      src_thumbnail?: string
                    }[]
                    advanced_product_profiles?: {
                      name: string
                      language: string
                    }[]
                  }
                }
                fabricCombination?: {
                  image?: {
                    src: string
                    src_xs?: string
                    src_thumbnail?: string
                  }
                }
              }
              shipping_method?: {
                id: number
                shipping_method_profiles?: {
                  title: string
                  language: string
                }[]
              }
            }[]
            purchased_subAccount?: {
              name: string
            }
            purchased_by?: {
              name: string
              account_code: string
            }
          }[]
        }
      }>(GET_CUSTOMER_ORDER_BY_ID_QUERY, {
        variables: {
          where: { id: { equals: orderId } },
          take: 1,
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      const ordersData = response.getCustomerOrders
      if (!ordersData || ordersData.orders.length === 0) {
        return null
      }

      const orderData = ordersData.orders[0]

      const order: OrderDetail = {
        id: orderData.id, // Use raw DB id
        created_at: orderData.createdAt,
        updated_at: orderData.createdAt,
        order_status: orderData.order_status,
        confirmed_delivery_date: orderData.confirmed_delivery_date,
        preferred_delivery_date: orderData.preferred_delivery_date,
        total_price_confirmed: orderData.total_price_confirmed,
        total_price: orderData.total_price,
        order_code: orderData.order_code,
        order_number: orderData.order_number,
        invoice_code: orderData.invoice_code,
        invoice_pdf_url: orderData.invoice_pdf_url,
        order_type: orderData.order_type,
        order_external_code: orderData.order_external_code,
        metadata: orderData.metadata || {},
        display_id: orderData.order_external_code || orderData.order_code,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        payment_method: orderData.payment_method,
        order_items_detail: orderData.order_items,
        purchased_subAccount: orderData.purchased_subAccount,
        purchased_by: orderData.purchased_by,
      }

      return order
    } catch (error) {
      console.error("Error fetching customer order by ID:", error)
      throw error
    }
  }

  async getStoreLoginLink(): Promise<string> {
    try {
      const response = await this.client.mutate<{
        loginToStoreWithToken: string
      }>(LOGIN_TO_STORE_WITH_TOKEN_MUTATION, {})

      const resultToken = response.loginToStoreWithToken

      if (!resultToken) {
        throw new Error("Login with token failed: No token received")
      }

      const storeUrl = `${process.env.NEXT_PUBLIC_SHOP_URL}/login?token=${resultToken}`

      return storeUrl
    } catch (error) {
      throw error
    }
  }

  async getMagicLinkForB2BCustomer(
    email: string,
    language?: string,
    ipAddress?: string
  ): Promise<string> {
    try {
      const response = await this.client.mutate<{
        getMagicLinkForB2BCustomer: string
      }>(GET_MAGIC_LINK_FOR_B2B_CUSTOMER_MUTATION, {
        variables: {
          email,
          language: language || null,
          ipAddress: ipAddress || null,
        },
      })
      // console.log("Magic link response:", response)
      const result = response.getMagicLinkForB2BCustomer

      if (!result) {
        throw new Error("Failed to get magic link")
      }
      return result
    } catch (error) {
      throw error
    }
  }

  async verifyMagicLink(token: string): Promise<string> {
    try {
      const response = await this.client.mutate<{
        verifyMagicLinkForB2BCustomer: string
      }>(VERIFY_MAGIC_LINK_FOR_B2B_CUSTOMER_MUTATION, {
        variables: {
          token,
        },
      })

      const authToken = response.verifyMagicLinkForB2BCustomer

      if (!authToken) {
        throw new Error("Magic link verification failed: No token received")
      }

      // Store token in cookies internally within the SDK
      await setCookieIfAvailable("_furni_jwt", authToken, {
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      })

      return authToken
    } catch (error) {
      console.error("Error verifying magic link:", error)
      throw error
    }
  }

  async getClaimsLink(language: string): Promise<string> {
    try {
      const response = await this.client.query<{
        getClaimsLink: {
          url: string
        }
      }>(GET_CLAIMS_LINK_QUERY, {
        variables: {
          language,
        },
        fetchPolicy: "no-cache", // Always fetch fresh data, never use cache
        errorPolicy: "all", // Return partial data even if there are errors
      })

      const claimsData = response.getClaimsLink

      if (!claimsData?.url) {
        throw new Error("No claims URL received")
      }

      return claimsData.url
    } catch (error) {
      console.error("Error fetching claims link:", error)
      throw error
    }
  }

  async getFabricPalettes(): Promise<FabricPaletteDetail[]> {
    try {
      const response = await this.client.query<{
        getMe: {
          fabric_palettes: FabricPaletteDetail[]
          customer_group?: {
            fabric_palettes?: FabricPaletteDetail[]
          }
        }
      }>(GET_FABRIC_PALETTES_QUERY, {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      const directPalettes = response?.getMe?.fabric_palettes ?? []
      const groupPalettes =
        response?.getMe?.customer_group?.fabric_palettes ?? []

      // Merge and deduplicate by ID
      const allPalettes = [...directPalettes]
      const existingIds = new Set(directPalettes.map((p) => p.id))
      for (const palette of groupPalettes) {
        if (!existingIds.has(palette.id)) {
          allPalettes.push(palette)
        }
      }

      return allPalettes
    } catch (error) {
      console.error("[getFabricPalettes] Error:", error)
      return []
    }
  }

  async getFabricPalettesByIds(
    paletteIds: number[]
  ): Promise<FabricPaletteDetail[]> {
    if (!paletteIds.length) return []
    try {
      const response = await this.client.query<{
        findManyFabricPalette: FabricPaletteDetail[]
      }>(GET_FABRIC_PALETTES_BY_IDS_QUERY, {
        variables: {
          where: { id: { in: paletteIds } },
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      return response?.findManyFabricPalette ?? []
    } catch (error) {
      console.error("[getFabricPalettesByIds] Error:", error)
      return []
    }
  }

  async searchCustomers(
    args: SearchCustomerArgs
  ): Promise<SearchCustomerResult[]> {
    try {
      const response = await this.client.query<{
        searchCustomers: SearchCustomerResult[]
      }>(SEARCH_CUSTOMERS_QUERY, {
        variables: {
          query: args.query,
          limit: args.limit,
          ids: args.ids,
        },
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      })

      return (response.searchCustomers ?? []).map((c) => ({
        ...c,
        group_price_listId: c.customer_group?.price_listId ?? null,
      }))
    } catch (error) {
      console.error("Error searching customers:", error)
      throw error
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear auth headers from the client
      this.client.setAuthHeaders({})

      // Clear JWT token from cookies
      await setCookieIfAvailable("_furni_jwt", "", {
        maxAge: -1,
      })

      console.log("Customer logged out successfully")
    } catch (error) {
      console.error("Error during logout:", error)
      throw error
    }
  }

  async placeholder(): Promise<void> {
    // Placeholder method to prevent TypeScript errors
    // Remove this when implementing actual methods
    console.log("Customer module placeholder")
  }
}

export * from "./types"
