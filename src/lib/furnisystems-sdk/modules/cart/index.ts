import { gql } from "@apollo/client"
import { ApolloGraphQLClient } from "../../client"
import {
  FurnisystemsCart,
  FurnisystemsCartItem,
  AddCartItemInput,
  CartSummary,
} from "./types"

const CART_ITEM_FRAGMENT = gql`
  fragment CartItemFields on CartItem {
    id
    quantity
    price
    volume
    reference
    product_type
    advanced_product_type
    fabric_code
    fabric_group_name
    fabric {
      id
    }
    fabric_group {
      id
    }
    selected_sofa_combinations
    components_by_module
    cartId
    productContainerId
    createdAt
    updatedAt
    product_container {
      single_product {
        images {
          src
          src_xs
          src_thumbnail
        }
        category_photo {
          id
          src
          src_md
          src_xs
          src_thumbnail
          display_order
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
        category_photo {
          id
          src
          src_md
          src_xs
          src_thumbnail
          display_order
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
    cartItemFabrics {
      id
      fabric {
        id
        code
        color_name
        image {
          src
          src_thumbnail
        }
      }
      fabric_group {
        id
        code
        type
        fabric_group_profiles {
          language
          name
        }
      }
      combination_option {
        id
        fabricCombinationOptionProfiles {
          language
          name
        }
      }
    }
    sofa_forms {
      id
      name
      code
    }
    fabricCombination {
      id
      image {
        src
        src_xs
        src_thumbnail
      }
    }
  }
`

const CART_FRAGMENT = gql`
  fragment CartFields on Cart {
    id
    name
    isActive
    customerId
    createdAt
    updatedAt
    items {
      ...CartItemFields
    }
  }
  ${CART_ITEM_FRAGMENT}
`

const GET_OR_CREATE_ACTIVE_CART = gql`
  ${CART_ITEM_FRAGMENT}
  query GetOrCreateActiveCart($customerId: Int!) {
    getOrCreateActiveCart(customerId: $customerId) {
      id
      name
      isActive
      customerId
      createdAt
      updatedAt
      items {
        ...CartItemFields
      }
    }
  }
`

const ADD_ITEM_TO_CART = gql`
  ${CART_ITEM_FRAGMENT}
  mutation AddItemToCart(
    $cartId: Int!
    $productContainerId: Int!
    $product_type: ProductType!
    $advanced_product_type: AdvancedProductType
    $quantity: Int
    $price: Float
    $volume: Float
    $fabricId: Int
    $fabric_groupId: Int
    $fabricCombinationId: Int
    $fabric_code: String
    $fabric_group_name: String
    $selected_sofa_combinations: String
    $additionalComponentIds: [Int!]
    $componentsByModule: [ComponentByModuleInput!]
    $cartItemFabrics: [CartItemFabricInput]
    $customerReference: String
  ) {
    addItemToCart(
      cartId: $cartId
      productContainerId: $productContainerId
      product_type: $product_type
      advanced_product_type: $advanced_product_type
      quantity: $quantity
      price: $price
      volume: $volume
      fabricId: $fabricId
      fabric_groupId: $fabric_groupId
      fabricCombinationId: $fabricCombinationId
      fabric_code: $fabric_code
      fabric_group_name: $fabric_group_name
      selected_sofa_combinations: $selected_sofa_combinations
      additionalComponentIds: $additionalComponentIds
      componentsByModule: $componentsByModule
      cartItemFabrics: $cartItemFabrics
      customerReference: $customerReference
    ) {
      ...CartItemFields
    }
  }
`

const UPDATE_CART_ITEM_QUANTITY = gql`
  mutation UpdateCartItemQuantity($cartItemId: Int!, $quantity: Int!) {
    updateCartItemQuantity(cartItemId: $cartItemId, quantity: $quantity) {
      id
      quantity
    }
  }
`

const REMOVE_CART_ITEM = gql`
  mutation RemoveCartItem($cartItemId: Int!) {
    removeCartItem(cartItemId: $cartItemId) {
      id
    }
  }
`

const UPDATE_CART_ITEM_REFERENCE = gql`
  mutation UpdateCartItemReference($cartItemId: Int!, $reference: String!) {
    updateCartItemReference(cartItemId: $cartItemId, reference: $reference) {
      id
      items {
        ...CartItemFields
      }
    }
  }
  ${CART_ITEM_FRAGMENT}
`

const GET_CUSTOMER_CARTS = gql`
  query GetCustomerCarts($customerId: Int!) {
    getCustomerCarts(customerId: $customerId) {
      id
      name
      isActive
      updatedAt
      itemCount
    }
  }
`

const GET_CART_BY_ID = gql`
  ${CART_FRAGMENT}
  query GetCartById($cartId: Int!) {
    getCartById(cartId: $cartId) {
      ...CartFields
    }
  }
`

const RENAME_CART = gql`
  ${CART_FRAGMENT}
  mutation RenameCart($cartId: Int!, $name: String!) {
    renameCart(cartId: $cartId, name: $name) {
      ...CartFields
    }
  }
`

const SET_ACTIVE_CART = gql`
  ${CART_FRAGMENT}
  mutation SetActiveCart($cartId: Int!) {
    setActiveCart(cartId: $cartId) {
      ...CartFields
    }
  }
`

const START_NEW_CART = gql`
  ${CART_FRAGMENT}
  mutation StartNewCart($customerId: Int!) {
    startNewCart(customerId: $customerId) {
      ...CartFields
    }
  }
`

const DELETE_CART = gql`
  ${CART_FRAGMENT}
  mutation DeleteCart($cartId: Int!) {
    deleteCart(cartId: $cartId) {
      ...CartFields
    }
  }
`

export class CartModule {
  constructor(private client: ApolloGraphQLClient) {}

  async getOrCreateActiveCart(
    customerId: number
  ): Promise<FurnisystemsCart> {
    const data = await this.client.query<{
      getOrCreateActiveCart: FurnisystemsCart
    }>(GET_OR_CREATE_ACTIVE_CART, {
      variables: { customerId },
      // no-cache (not network-only): the shared normalized InMemoryCache keys
      // Cart entities by id across getOrCreateActiveCart / setActiveCart /
      // getCustomerCarts. A setActiveCart mutation only writes the newly-active
      // Cart, so the previously-active Cart's `isActive` would stay stale in the
      // cache and be read back here. no-cache bypasses the cache read-back.
      fetchPolicy: "no-cache",
    })
    return data.getOrCreateActiveCart
  }

  async addItem(
    cartId: number,
    input: AddCartItemInput
  ): Promise<FurnisystemsCartItem> {
    const data = await this.client.mutate<{
      addItemToCart: FurnisystemsCartItem
    }>(ADD_ITEM_TO_CART, {
      variables: {
        cartId,
        productContainerId: input.productContainerId,
        product_type: input.product_type,
        advanced_product_type: input.advanced_product_type || null,
        quantity: input.quantity,
        price: input.price || null,
        volume: input.volume || null,
        fabricId: input.fabricId || null,
        fabric_groupId: input.fabric_groupId || null,
        fabricCombinationId: input.fabricCombinationId || null,
        fabric_code: input.fabric_code || null,
        fabric_group_name: input.fabric_group_name || null,
        selected_sofa_combinations: input.selected_sofa_combinations || null,
        additionalComponentIds: input.additionalComponentIds || [],
        componentsByModule: input.componentsByModule || [],
        cartItemFabrics: input.cartItemFabrics || [],
        customerReference: input.customerReference || null,
      },
    })
    return data.addItemToCart
  }

  async updateItemQuantity(
    cartItemId: number,
    quantity: number
  ): Promise<FurnisystemsCartItem> {
    const data = await this.client.mutate<{
      updateCartItemQuantity: FurnisystemsCartItem
    }>(UPDATE_CART_ITEM_QUANTITY, {
      variables: { cartItemId, quantity },
    })
    return data.updateCartItemQuantity
  }

  async updateItemReference(
    cartItemId: number,
    reference: string
  ): Promise<FurnisystemsCart> {
    const data = await this.client.mutate<{
      updateCartItemReference: FurnisystemsCart
    }>(UPDATE_CART_ITEM_REFERENCE, {
      variables: { cartItemId, reference },
    })
    return data.updateCartItemReference
  }

  async removeItem(cartItemId: number): Promise<{ id: number }> {
    const data = await this.client.mutate<{
      removeCartItem: { id: number }
    }>(REMOVE_CART_ITEM, {
      variables: { cartItemId },
    })
    return data.removeCartItem
  }

  async getCustomerCarts(customerId: number): Promise<CartSummary[]> {
    const data = await this.client.query<{
      getCustomerCarts: CartSummary[]
    }>(GET_CUSTOMER_CARTS, {
      variables: { customerId },
      // no-cache: the carts table reads each row's `isActive` (DB truth) to
      // drive both the ACTIVE badge and the disabled "Use this cart"/"Delete"
      // buttons. With network-only the result is read back through the shared
      // normalized cache, where a prior setActiveCart mutation left the old
      // active cart's `isActive: true` (stale), so the badge would not move
      // after switching carts. no-cache returns the fresh network payload.
      fetchPolicy: "no-cache",
    })
    return data.getCustomerCarts
  }

  async getCartById(cartId: number): Promise<FurnisystemsCart | null> {
    const data = await this.client.query<{
      getCartById: FurnisystemsCart | null
    }>(GET_CART_BY_ID, {
      variables: { cartId },
      // no-cache: same shared-normalized-cache hazard as the other cart reads;
      // always reflect DB truth for a single cart's fields (e.g. isActive).
      fetchPolicy: "no-cache",
    })
    return data.getCartById
  }

  async renameCart(cartId: number, name: string): Promise<FurnisystemsCart> {
    const data = await this.client.mutate<{
      renameCart: FurnisystemsCart
    }>(RENAME_CART, {
      variables: { cartId, name },
    })
    return data.renameCart
  }

  async setActiveCart(cartId: number): Promise<FurnisystemsCart> {
    const data = await this.client.mutate<{
      setActiveCart: FurnisystemsCart
    }>(SET_ACTIVE_CART, {
      variables: { cartId },
    })
    return data.setActiveCart
  }

  async startNewCart(customerId: number): Promise<FurnisystemsCart> {
    const data = await this.client.mutate<{
      startNewCart: FurnisystemsCart
    }>(START_NEW_CART, {
      variables: { customerId },
    })
    return data.startNewCart
  }

  async deleteCart(cartId: number): Promise<FurnisystemsCart> {
    const data = await this.client.mutate<{
      deleteCart: FurnisystemsCart
    }>(DELETE_CART, {
      variables: { cartId },
    })
    return data.deleteCart
  }
}

export * from "./types"
