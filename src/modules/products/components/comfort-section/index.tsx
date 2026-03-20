import Image from "next/image"

export type ComfortItemData = {
  name: string
  description: string | null
  imageUrl: string | null
}

export type ComfortGroupData = {
  title: string
  items: ComfortItemData[]
}

export type ComfortSectionData = {
  title: string
  groups: ComfortGroupData[]
}

type Props = { data: ComfortSectionData }

export default function ComfortSection({ data }: Props) {
  const allItems = data.groups.flatMap((group) => group.items)

  return (
    <div>
      <h2 className="section-title mb-6">{data.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {allItems.map((item, i) => (
          <div key={i} className="flex flex-row gap-6 items-start">
            {item.imageUrl && (
              <div className="w-[323px] min-w-[323px] bg-gray-50 rounded">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={323}
                  height={323}
                  className="object-contain w-full h-auto"
                />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-dark-blue mb-3">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-sm text-dark-blue mb-3 whitespace-pre-line">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
