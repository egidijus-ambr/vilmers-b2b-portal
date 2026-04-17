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

export const GET_PAYMENT_METHOD = gql`
  query GetPaymentMethod {
    findManyPaymentMethod(take: 1) {
      id
    }
  }
`

export const CREATE_ORDER = gql`
  mutation CreateOrder(
    $shipping_address: AddressCreateWithoutShipping_ordersInput!
    $billing_address: AddressCreateWithoutShipping_ordersInput!
    $payment_method: PaymentMethodWhereUniqueInput!
    $purchased_by: PurchasedByCustomInput!
    $discount_applied: Float!
    $sub_total_price: Float!
    $total_shipping_price: Float!
    $total_price_without_VAT: Float!
    $total_price: Float!
    $order_items: [OrderItemCustomInput!]!
    $company_name: String
    $company_code: String
    $vat_code: String
    $zero_vat: Boolean
    $order_locale: Language!
    $shopId: ShopSettingWhereUniqueInput!
    $hostname: String!
    $price_multiplier: Int!
    $b2b_customer_discount: Int
    $metadata: Json
    $cookie: String
    $createdBy: String
    $order_type: String
    $preferred_delivery_date: DateTime
  ) {
    createNewOrder(
      shipping_address: $shipping_address
      billing_address: $billing_address
      payment_method: $payment_method
      purchased_by: $purchased_by
      discount_applied: $discount_applied
      sub_total_price: $sub_total_price
      total_shipping_price: $total_shipping_price
      total_price_without_VAT: $total_price_without_VAT
      total_price: $total_price
      order_items: $order_items
      company_name: $company_name
      company_code: $company_code
      vat_code: $vat_code
      zero_vat: $zero_vat
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
    ) {
      id
      project_id
    }
  }
`
