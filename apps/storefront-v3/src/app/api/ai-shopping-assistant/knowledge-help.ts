import { knowledgeAnswerIntent } from "./knowledge-answer-intent";
import { knowledgeTopics } from "./knowledge-context";

export type MissingKnowledgeReason =
  | "empty"
  | "not_current"
  | "unavailable"
  | "not_retrieved";

export function temperatureSetup(question: string, subject = "") {
  if (/\b(?:dry|drying|anneal|annealing)\b/i.test(question)) return "process";
  if (/\b(?:esc|motor|battery|servo)\b/i.test(`${question} ${subject}`))
    return "electrical";
  if (/\b(?:printer|hotend|nozzle)\b/i.test(`${question} ${subject}`))
    return "printer";
  return "unknown";
}

/** Safe clarification is not a product specification and does not need a corpus fact. */
export function knowledgeNextStep(question: string, subject = "") {
  const topics = knowledgeTopics(question);
  if (topics.includes("temperature")) {
    const setup = temperatureSetup(question, subject);
    if (setup === "process")
      return "Could you share the manufacturer's drying or processing instructions for that exact material?";
    if (setup === "electrical")
      return "What device and exact components are you using?";
    if (setup === "printer")
      return "Which printer model are you using, and has its hotend setup been modified?";
    return "What device or setup do you want to use at that temperature?";
  }
  if (topics.includes("electrical"))
    return "What are the exact models of the parts you want to connect?";
  if (topics.includes("compatibility"))
    return /\b(?:printer|hotend|nozzle)\b/i.test(`${question} ${subject}`)
      ? "Which printer model are you using, and is its hotend setup still stock or modified?"
      : "Which device model should it fit?";
  return "Could you share a link to the manufacturer's manual or the model number on its label?";
}

export function missingKnowledgeAnswer(
  question: string,
  reason: MissingKnowledgeReason,
  subjectContext = "",
) {
  const topics = knowledgeTopics(question);
  const setup = temperatureSetup(question, subjectContext);
  const intent = knowledgeAnswerIntent(question);
  const subject =
    intent.kind === "application"
      ? "the application amount or procedure"
      : intent.kind === "material_use"
        ? `suitability for ${intent.materials.join(" and ") || "that material"}${intent.surfaces.length ? " on " + intent.surfaces.join(" and ") : " in that setup"}`
        : topics.includes("temperature")
          ? "that operating temperature"
          : topics.includes("electrical")
            ? "the electrical compatibility of those parts"
            : topics.includes("compatibility")
              ? "the fit for that setup"
              : topics.includes("material")
                ? "the requested material or use"
                : "the requested specification";
  const explanation = {
    empty: "No matching specification was found.",
    not_current: "I don't have current specifications I can rely on.",
    unavailable: "The specification lookup is temporarily unavailable.",
    not_retrieved: "I haven't been able to check this specification yet.",
  }[reason];
  return [
    `I can't confirm ${subject} yet. ${explanation}`,
    ...(topics.includes("temperature") && setup === "printer"
      ? [
          "A component rating does not establish an installed printer's operating limit. The heater, sensor, wiring and firmware limits remain unknown.",
        ]
      : topics.includes("temperature") && setup === "electrical"
        ? [
            "A component rating does not establish the operating limit of the complete assembly.",
          ]
        : []),
    reason === "unavailable"
      ? "Please try the lookup again, or share the manufacturer's manual so we can check the specific requirement."
      : intent.kind === "application"
        ? "Check the product's application instructions before applying it."
        : knowledgeNextStep(question, subjectContext),
  ].join("\n\n");
}
