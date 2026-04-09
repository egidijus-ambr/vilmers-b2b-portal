import { gql } from "@apollo/client"

/**
 * Dedicated GraphQL query for configurator data.
 * Loaded on-demand when the configurator modal opens.
 *
 * Fetches all data needed for the product configurator:
 * - Sofa forms with dimensions, pricing, metadata
 * - Fabric combinations with options
 * - Additional component groups with components, pricing, dimensions
 * - Product-level pricing by fabric category
 * - Base prices (for non-fabric products)
 * - Manufacturer fabric price categories (for fabric group resolution)
 */
export const GET_CONFIGURATOR_DATA = gql`
  query GetConfiguratorData(
    $productContainerId: Int!
    $priceListId: Int!
    $language: Language
    $fabricWhere: FabricGroupWhereInput
  ) {
    findUniqueProductContainer(where: { id: $productContainerId }) {
      id
      type
      discount {
        id
        discount
        active
        startDate
        expiryDate
      }
      advanced_product {
        id
        price_from
        base_price
        base_prices {
          price
          price_from
          price_listId
        }
        advanced_product_type

        advanced_product_profiles(where: { language: { equals: $language } }) {
          id
          name
          description
          language
        }

        images {
          id
          src
          src_md
          src_xs
          display_order
        }

        product_details {
          id
          meta_content
        }

        # Sofa forms (modules)
        sofa_forms(where: { enabled: { equals: true } }) {
          id
          name
          type
          code
          left_and_right
          metadata
          enabled_connectors
          package_dimensions {
            volume
          }
          dimensions {
            width
            height
            length
            seat_height
            seat_depth
            armrest_width
            backrest_width
            mattress_width
            mattress_length
            corner_part_length
            corner_radius
            angle
            extendable_part_length
            number_of_big_pillows
            number_of_small_pillows
            spread_of_small_pillows
            spread_of_big_pillows
            size_of_big_pillow
            size_of_pillow
            seat_sections
            backrest_sections
            composition
            extension_type
            backrest_type
            covered_side
          }
          form_price_fabric_category(
            where: { price_listId: { equals: $priceListId } }
          ) {
            id
            price
            price_listId
            fabrice_price_category {
              id
              group_number
            }
          }
        }

        # Fabric combinations
        fabricCombinations(where: { enabled: { equals: true } }) {
          id
          visible
          code
          image {
            id
            src_md
          }
          fabricCombinationOptions {
            id
            code
            image {
              id
              src_xs
            }
            fabricCombinationOptionProfiles(
              where: { language: { equals: $language } }
            ) {
              id
              name
              description
              language
            }
          }
          fabricCombinationProfiles(
            where: { language: { equals: $language } }
          ) {
            id
            name
            description
            language
          }
        }

        # Product-level pricing by fabric category
        advanced_product_price_fabric_category(
          where: { price_listId: { equals: $priceListId } }
        ) {
          id
          price
          price_listId
          fabrice_price_category {
            id
            group_number
            fabric_groups {
              id
            }
          }
        }

        # Component-to-product associations (with pricing)
        additional_component_to_advanced_product(
          where: { enabled: { equals: true } }
        ) {
          id
          extra_price
          extra_prices(where: { price_listId: { equals: $priceListId } }) {
            price
          }
          price_fabric_category(
            where: { price_listId: { equals: $priceListId } }
          ) {
            price
            fabrice_price_category {
              group_number
            }
          }
          metadata
          enabled
          conditions
          isDefault
          additional_component {
            id
          }
        }

        # Group-level associations (which groups are enabled for this product)
        additional_component_group_to_advanced_product(
          where: { enabled: { equals: true } }
        ) {
          additional_component_group {
            id
          }
        }

        # Dimensions
        dimensions {
          id
          width
          height
          length
          seat_height
          armrest_width
          backrest_width
        }
      }

      # Manufacturer data (component groups + fabric categories)
      manufacturer {
        id

        # Component groups with all components
        additional_component_groups {
          id
          ui_type
          code
          order
          use_fabric_prices_for_components
          hide_components_without_price
          enable_custom_dimensions_for_components
          enabled_dimensions_in_group
          additional_component_group_profiles(
            where: { language: { equals: $language } }
          ) {
            id
            name
            description
            language
          }
          additional_components {
            id
            additionalComponentGroupId
            is_wrapper
            additional_component_profiles(
              where: { language: { equals: $language } }
            ) {
              id
              name
              material_name
              description
              language
            }
            component_sku
            code
            color {
              id
              hex
              background
            }
            package_dimensions {
              volume
            }
            image {
              id
              src
              src_md
              src_xs
            }
            linked_components_source(orderBy: { display_order: asc }) {
              id
              link_type
              display_order
              target_component {
                id
                code
                component_sku
                image {
                  src_thumbnail
                  src_md
                }
                additional_component_profiles(
                  where: { language: { equals: $language } }
                ) {
                  id
                  name
                  description
                  language
                }
              }
            }
            dimensions {
              id
              width
              height
              length
              armrest_width
              backrest_width
              seat_height
              leg_height
              seat_sections
              backrest_sections
              extension_type
              backrest_type
              covered_side
            }
          }
        }

        # Fabric price categories with fabric groups
        fabric_price_category {
          id
          group_number
          fabric_groups(where: $fabricWhere) {
            id
            code
            fabric_group_profiles(
              where: { language: { equals: $language } }
            ) {
              id
              name
              language
            }
            fabric_palettes {
              name
              fabric_palette {
                id
              }
            }
            fabrics {
              id
              code
              color_name
              order
              image {
                id
                src
                src_md
                src_xs
              }
            }
          }
        }
      }
    }
  }
`
