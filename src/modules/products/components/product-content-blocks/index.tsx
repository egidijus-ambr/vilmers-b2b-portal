import React from "react"
import ContentBlock from "@modules/home/components/content-block"
import ProductSection from "@modules/products/components/product-section"
import type { ContentBlockData } from "@modules/home/components/content-block/types"

type ProductContentBlocksProps = {
  blocks: ContentBlockData[]
  languageCode: string
}

const ProductContentBlocks: React.FC<ProductContentBlocksProps> = ({
  blocks,
  languageCode,
}) => {
  if (blocks.length === 0) {
    return null
  }

  return (
    <ProductSection divider>
      <div className="space-y-8">
        {blocks.map((block, idx) => (
          <ContentBlock
            key={block.id}
            data={block}
            index={idx}
            languageCode={languageCode}
          />
        ))}
      </div>
    </ProductSection>
  )
}

export default ProductContentBlocks
