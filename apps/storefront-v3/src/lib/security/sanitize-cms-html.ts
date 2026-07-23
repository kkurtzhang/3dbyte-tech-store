import sanitizeHtml from "sanitize-html"

const allowedTags = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]

export function sanitizeCmsHtml(content: string): string {
  if (!content) return ""

  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      code: ["class"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (tagName, attributes) => {
        const nextAttributes = { ...attributes }

        if (nextAttributes.target === "_blank") {
          nextAttributes.rel = "noopener noreferrer"
        } else if (nextAttributes.target && nextAttributes.target !== "_self") {
          delete nextAttributes.target
        }

        return { tagName, attribs: nextAttributes }
      },
    },
  })
}
