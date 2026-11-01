import { list } from "./knowledge-claim-presentation";
import { knowledgeNextStep, temperatureSetup } from "./knowledge-help";
import type { KnowledgeAnswerIntent } from "./knowledge-answer-intent";

/** Safe decision steps ask for evidence; they assert no product capability. */
export function missingCapabilityGuidance(
  intent: KnowledgeAnswerIntent,
  subject: string,
) {
  const printer = temperatureSetup("", subject) === "printer";
  const question = printer && intent.kind === "material_use" && !intent.materials.length
    ? "What filament and printer setup are you using?"
    : knowledgeNextStep("Can it fit?", subject);
  if (intent.kind === "release_behavior")
    return "Check the release or cooling instructions for the exact product and surface before removing the print.";
  if (intent.kind === "print_settings")
    return "Start with the filament manufacturer's settings for that exact material, then check your printer's operating limits before choosing a temperature.\n\nWhich filament brand/grade and printer setup are you using?";
  if (intent.kind === "application")
    return /adhesive|glue/i.test(subject)
      ? "The application amount and method need checking for your exact adhesive and build plate. Follow their application instructions before applying it."
      : "Start with the installation or operating instructions for your exact model and setup. The procedure needs checking before I can walk you through it.";
  if (intent.kind === "fit")
    return [
      printer
        ? "Check the replacement hotend's mounting and electrical requirements against your printer before choosing it."
        : "Check the product's mounting and connection requirements against your device before choosing it.",
      question,
    ].join("\n\n");
  const materials = list(intent.materials);
  const filament = materials ? `the ${materials} filament's` : "your filament's";
  return [
    printer
      ? `Check ${filament} printing requirements against your printer's hotend setup before choosing settings.`
      : `Check the requirements for ${materials || "the intended use"} against the exact product and setup before choosing it.`,
    question,
  ].join("\n\n");
}
export const PRINTER_LIMIT_CHECK =
  "A hotend rating is not an installed printer's operating limit; check the heater, sensor, wiring and firmware limits before choosing a temperature.";
export function temperatureRatingGuidance(temperature: string) {
  return `The ${temperature} figure is the hotend's stated heat-resistance rating. It does not establish a safe operating temperature for your printer; the heater, sensor, wiring and firmware limits still need checking.`;
}
