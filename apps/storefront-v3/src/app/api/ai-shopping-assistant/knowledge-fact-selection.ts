import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types"

const common = new Set(
  "a an and are as be by can check cite do does for from how i in is it its me my of on only or please product provided say source specification specifications tell that the their these this to use what when where which with you your all approved documented manufacturer evidence list unrelated".split(
    " ",
  ),
)
function words(value: string) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).map((word) =>
    word.length > 4 && word.endsWith("s") && word !== "celsius"
      ? word.slice(0, -1)
      : word,
  )
}
/** Lexical relevance selects existing facts; it never generates or validates a claim. */
export function selectKnowledgeFacts(
  document: ApprovedKnowledgeDocument,
  question: string,
) {
  if (
    /\b(all|every|complete|full)\b.*\b(facts|specs|specifications|details)\b/i.test(
      question,
    )
  )
    return document.facts
  const productWords = new Set(words(document.product_title))
  const query = new Set(
    words(question).filter(
      (word) => !common.has(word) && !productWords.has(word),
    ),
  )
  if (query.has("degree") || query.has("celsius")) query.add("temperature")
  const matches = document.facts.filter((fact) =>
    words(`${fact.field} ${fact.label}`).some((word) => query.has(word)),
  )
  // No silent eight-fact truncation: the validated DTO already bounds this to 30.
  // If wording does not identify a field, retain all facts rather than hiding the answer.
  return matches.length ? matches : document.facts
}
