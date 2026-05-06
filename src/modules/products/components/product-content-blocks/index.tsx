import React from "react"
import ContentBlock from "@modules/home/components/content-block"
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
    <div className="mt-8 space-y-8">
      {blocks.map((block, idx) => (
        <ContentBlock
          key={block.id}
          data={block}
          index={idx}
          languageCode={languageCode}
        />
      ))}
    </div>
  )
}

export default ProductContentBlocks
