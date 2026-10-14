import { officialResourceRequested } from "./official-resource-intent";

/** Public supplier hardware tables only; official build guides and FAQs stay link-only. */
export function supplierBomComparisonRequested(question: string): boolean {
  return (
    /3dmakerparts/i.test(question) &&
    /\bboms?\b|supplier.*hardware/i.test(question) &&
    /landy/i.test(question) &&
    /buggy|buggster|sandy/i.test(question) &&
    !/wes\d+/i.test(question) &&
    !/\b(?:guide|manual|faq|assembly|instructions|steps?)\b/i.test(question) &&
    !officialResourceRequested(question)
  );
}
