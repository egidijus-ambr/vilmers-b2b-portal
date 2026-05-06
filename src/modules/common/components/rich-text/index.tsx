import Markdown from "markdown-to-jsx"

type RichTextProps = {
  value: string | null | undefined
  format?: "plain" | "markdown" | null | undefined
  textColor?: string | null
  className?: string
  paragraphClassName?: string
}

export default function RichText({
  value,
  format,
  textColor,
  className,
  paragraphClassName = "text-base font-normal leading-6 text-gray-600",
}: RichTextProps) {
  if (!value) return null

  if (format === "markdown") {
    return (
      <div
        className={"prose prose-sm max-w-none prose-p:leading-6 prose-li:leading-6 prose-ul:leading-6 prose-ol:leading-6 " + (className ?? "")}
        style={textColor ? { color: textColor } : undefined}
      >
        <Markdown
          options={{
            disableParsingRawHTML: true,
            overrides: {
              a: {
                props: {
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "underline",
                },
              },
            },
          }}
        >
          {value}
        </Markdown>
      </div>
    )
  }

  return (
    <div className={className}>
      {value.split(/\\n|\n/).map((line, i) => (
        <p
          key={i}
          className={paragraphClassName}
          style={textColor ? { color: textColor } : undefined}
        >
          {line}
        </p>
      ))}
    </div>
  )
}
