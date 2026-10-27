import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types"

import { knowledgeTopics } from "./knowledge-context"

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
/**
 * Select an explicit field or a recognized single-topic question. Compound or
 * unrecognized requests keep every bounded fact and unknown. Fact values and
 * source text never influence selection; safety qualifiers stay with their topic.
 */
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
  const exclusive = question
    .trim()
    .replace(/\.\s*Do not list unrelated specifications\.?$/i, "")
    .match(
      /^(?:only(?: (?:tell|show|give) me)?|(?:tell|show|give) me only)\s+(?:the\s+)?([^.!?]+)[.!?]?$/i,
    )
  if (exclusive) {
    // Match the whole requested field, not one word within an extra clause.
    const requested = words(exclusive[1])
      .filter((word) => !productWords.has(word))
      .join(" ")
    const exact = document.facts.filter((fact) =>
      [fact.field, fact.label].some(
        (label) => words(label).join(" ") === requested,
      ),
    )
    if (exact.length === 1) return exact
    if (exact.length > 1)
      return [
        ...exact,
        ...document.facts.filter((fact) => !exact.includes(fact)),
      ]
  }
  const topics = knowledgeTopics(question)
  const compound =
    /[,;]|[.!?].+\S|\b(?:and|plus|also|anything|unknowns?|not established|what is it for)\b/i.test(
      question,
    )
  if (topics.length === 1 && !compound) {
    const pattern = {
      temperature:
        /temperature|thermal|heat|sensor|thermistor|wiring|firmware|safety|limit|condition|rating/i,
      material:
        /material|made|composition|body|substrate|abrasive|outdoor|weather|condition|limit|safety|warning/i,
      electrical:
        /voltage|volt|current|amp|power|battery|connector|electrical|safety|limit|condition/i,
      compatibility:
        /compatib|fit|thread|printer|device|safety|limit|condition/i,
    }[topics[0]]
    // Narrow only this recognized single-topic request. Never infer missing fields.
    return document.facts.filter((fact) =>
      pattern.test(`${fact.field} ${fact.label}`),
    )
  }
  const query = new Set(
    words(question).filter(
      (word) => !common.has(word) && !productWords.has(word),
    ),
  )
  if (
    query.has("degree") ||
    query.has("celsius") ||
    /°\s*c\b|\bhow hot\b/i.test(question)
  )
    query.add("temperature")
  const matches = (fact: ApprovedKnowledgeDocument["facts"][number]) =>
    words(`${fact.field} ${fact.label}`).some((word) => query.has(word))
  // No silent truncation or partial-match filtering: the DTO already bounds 30 facts.
  return [
    ...document.facts.filter(matches),
    ...document.facts.filter((fact) => !matches(fact)),
  ]
}
