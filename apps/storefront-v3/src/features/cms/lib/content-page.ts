function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function stripLeadingMarkdownHeading(
  content: string,
  headingCandidates: string[]
) {
  if (!content.trim()) {
    return content
  }

  const patterns = headingCandidates
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .map(escapeRegex)

  if (!patterns.length) {
    return content.trim()
  }

  const headingPattern = new RegExp(
    `^\\s{0,3}#{1,2}\\s+(?:${patterns.join("|")})\\s*\\n+`,
    "i"
  )

  return content.replace(headingPattern, "").trim()
}
