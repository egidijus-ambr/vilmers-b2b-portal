import { gql } from "@apollo/client"

export const GET_ADDITIONAL_ADDRESS = gql`
  query GetAdditionalAddress($customerId: Int) {
    getAddresses(customerId: $customerId) {
      id
      customer_accounts {
        id
        name
        email
      }
      addresses {
        id
        address_1
        address_2
        city
        postal_code
        country
        state_region
        roles
        description
      }
    }
  }
`

export const CREATE_ORDER = gql`
  mutation CreateOrder(
    $paymentMethodID: Int
    $phoneNumber: String!
    $shipping_country: String!
    $billing_country: String!
    $shipping_address_1: String!
    $billing_address_1: String!
    $shipping_address_2: String!
    $billing_address_2: String!
    $shipping_city: String!
    $billing_city: String!
    $shipping_postal_code: String!
    $billing_postal_code: String!
    $shipping_state_region: String!
    $discount_applied: Float!
    $sub_total_price: Float!
    $total_shipping_price: Float!
    $total_price_without_VAT: Float!
    $total_price: Float!
    $email: String
    $account_code: String
    $name: String
    $surname: String
    $order_items: [OrderItemCustomInput!]!
    $company_name: String
    $company_code: String
    $vat_code: String
    $buying_as_company: Boolean
    $zero_vat: Boolean
    $coupon_code: String
    $order_locale: Language!
    $shopId: Int
    $hostname: String!
    $price_multiplier: Int!
    $b2b_customer_discount: Int
    $metadata: Json
    $cookie: String
    $createdBy: String
    $order_type: String
    $preferred_delivery_date: DateTime
    $customer_accountId: String
  ) {
    createNewOrder(
      paymentMethodID: $paymentMethodID
      phoneNumber: $phoneNumber
      shipping_country: $shipping_country
      billing_country: $billing_country
      shipping_address_1: $shipping_address_1
      billing_address_1: $billing_address_1
      shipping_address_2: $shipping_address_2
      billing_address_2: $billing_address_2
      shipping_city: $shipping_city
      billing_city: $billing_city
      shipping_postal_code: $shipping_postal_code
      billing_postal_code: $billing_postal_code
      shipping_state_region: $shipping_state_region
      discount_applied: $discount_applied
      sub_total_price: $sub_total_price
      total_shipping_price: $total_shipping_price
      total_price_without_VAT: $total_price_without_VAT
      total_price: $total_price
      email: $email
      account_code: $account_code
      name: $name
      surname: $surname
      order_items: $order_items
      company_name: $company_name
      company_code: $company_code
      vat_code: $vat_code
      buying_as_company: $buying_as_company
      zero_vat: $zero_vat
      coupon_code: $coupon_code
      order_locale: $order_locale
      shopId: $shopId
      hostname: $hostname
      price_multiplier: $price_multiplier
      b2b_customer_discount: $b2b_customer_discount
      metadata: $metadata
      cookie: $cookie
      createdBy: $createdBy
      order_type: $order_type
      preferred_delivery_date: $preferred_delivery_date
      customer_accountId: $customer_accountId
    ) {
      id
      project_id
    }
  }
`
