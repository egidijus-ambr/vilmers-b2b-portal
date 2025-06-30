import { gql } from "@apollo/client"
import { GraphQLClient } from "../../client"
import { GraphQLRequestConfig } from "../../client/types"
import {
  Customer,
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

  async placeholder(): Promise<void> {
    // Placeholder method to prevent TypeScript errors
    // Remove this when implementing actual methods
    console.log("Customer module placeholder")
  }
}

export * from "./types"
