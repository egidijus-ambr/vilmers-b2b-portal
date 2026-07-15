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
        className={
          "prose prose-sm max-w-none " +
          // Default heading/paragraph typography, anchored on the site's
          // section-title style (Montserrat/font-sans, font-medium). This
          // makes plain markdown (`## Heading`) render consistently across
          // all content blocks without authors needing extra classes.
          "prose-headings:font-sans prose-headings:font-medium prose-headings:tracking-normal " +
          "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg " +
          "prose-p:font-sans prose-p:font-normal prose-p:text-base " +
          "prose-headings:mt-0 prose-h1:mb-4 prose-h2:mb-4 prose-h3:mb-3 prose-h4:mb-2 " +
          "prose-p:mt-0 prose-p:mb-4 prose-p:leading-6 " +
          "prose-ul:mt-0 prose-ul:mb-4 prose-ol:mt-0 prose-ol:mb-4 prose-li:my-0 prose-li:leading-6 prose-ul:leading-6 prose-ol:leading-6 " +
          (className ?? "")
        }
        style={
          textColor
            ? ({
                color: textColor,
                ["--tw-prose-headings"]: textColor,
                ["--tw-prose-bold"]: textColor,
                ["--tw-prose-links"]: textColor,
                ["--tw-prose-body"]: textColor,
              } as React.CSSProperties)
            : undefined
        }
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
