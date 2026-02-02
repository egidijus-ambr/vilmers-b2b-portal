import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <div
      className="flex gap-x-4 px-6 py-4 border-b border-ui-border-base"
      data-testid="product-row"
    >
      <div className="flex w-16 flex-shrink-0">
        <Thumbnail thumbnail={item.thumbnail} size="square" />
      </div>

      <div className="flex flex-col small:flex-row small:items-start small:justify-between flex-1 min-w-0">
        <div>
          <Text
            className="txt-medium-plus text-ui-fg-base"
            data-testid="product-name"
          >
            {item.product_title}
          </Text>
          <LineItemOptions
            variant={item.variant}
            data-testid="product-variant"
          />
        </div>

        <div className="flex flex-col small:items-end mt-1 small:mt-0">
          <span className="flex gap-x-1">
            <Text className="text-ui-fg-muted">
              <span data-testid="product-quantity">{item.quantity}</span>x{" "}
            </Text>
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </span>
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </div>
      </div>
    </div>
  )
}

export default Item
