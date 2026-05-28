import { gql } from "@apollo/client"
import { ApolloGraphQLClient } from "../../client"
import {
  FurnisystemsCart,
  FurnisystemsCartItem,
  AddCartItemInput,
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

export class CartModule {
  constructor(private client: ApolloGraphQLClient) {}

  async getOrCreateActiveCart(
    customerId: number
  ): Promise<FurnisystemsCart> {
    const data = await this.client.query<{
      getOrCreateActiveCart: FurnisystemsCart
    }>(GET_OR_CREATE_ACTIVE_CART, {
      variables: { customerId },
      fetchPolicy: "network-only",
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
}

export * from "./types"
