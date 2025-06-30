import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { GraphQLRequestConfig } from "../../client/types"
import {
  Customer,
  Order,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateAddressInput,
  UpdateAddressInput,
  AuthCredentials,
  RegisterInput,
} from "./types"
import { useMutation } from "@apollo/client"

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    authenticateB2BCustomer(email: $email, password: $password)
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
    }
  }
`

const GET_CUSTOMER_ORDERS_QUERY = gql`
  query GetCustomerOrders {
    getCustomerOrders {
      id
      createdAt
      order_status
      total_price
      order_code
      order_number
      invoice_code
      order_type
      _count {
        order_items
      }
      order_external_code
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

      // Set the auth token for future requests
      this.client.setAuthHeaders({
        authorization: `Bearer ${token}`,
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
        }
      }>(GET_ME_QUERY)

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
      }

      return customer
    } catch (error) {
      console.error("Error fetching customer:", error)
      return null
    }
  }

  async getCustomerOrders(distinct?: string[]): Promise<Order[]> {
    try {
      const response = await this.client.query<{
        getCustomerOrders: {
          id: string
          createdAt: string
          order_status: string
          total_price: number
          order_code: string
          order_number: string
          invoice_code?: string
          order_type?: string
          _count: {
            order_items: number
          }
          order_external_code?: string
        }[]
      }>(GET_CUSTOMER_ORDERS_QUERY, {
        variables: distinct ? { distinct } : undefined,
      })

      const ordersData = response.getCustomerOrders

      if (!ordersData) {
        return []
      }

      // Map the response to the Order interface
      const orders: Order[] = ordersData.map((orderData) => ({
        id: orderData.order_external_code || orderData.id, // Use order_external_code as primary id
        created_at: orderData.createdAt,
        updated_at: orderData.createdAt, // Use createdAt as fallback for updated_at
        order_status: orderData.order_status,
        total_price: orderData.total_price,
        order_code: orderData.order_code,
        order_number: orderData.order_number,
        invoice_code: orderData.invoice_code,
        order_type: orderData.order_type,
        order_external_code: orderData.order_external_code,
        order_items_count: orderData._count.order_items,
      }))

      return orders
    } catch (error) {
      console.error("Error fetching customer orders:", error)
      throw error
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear auth headers from the client
      this.client.setAuthHeaders({})
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
