import {
  defineCustomerAiEvalCase,
  releaseSuites,
} from "./customer-eval-case-helpers";

const narration = {
  label: "Answer the customer rather than narrating evidence governance.",
  pattern:
    /approved evidence|from this document|Magigoo describes|manufacturer describes|not established/i,
};
const irrelevant = {
  label: "Do not dump unrelated specifications or extreme component ratings.",
  pattern: /500|Colour|Kit contents|Ra\s*≤/i,
};
const inputs = [
  {
    id: "everyday-magigoo-release",
    customerPrompt: "When does Magigoo Original release the print?",
    required: /thermally activated.*holds.*hot bed.*releases after cooling/i,
    cues: ["hot bed", "cooling"],
    forbidden: /[0-9].*(?:°C|degrees)|I can.t confirm/i,
  },
  {
    id: "everyday-dragonfly-print-settings",
    customerPrompt:
      "What temperature should I use to print PETG with a Dragonfly BMS?",
    required:
      /filament manufacturer.s settings.*printer.s operating limits[\s\S]*which filament brand\/grade and printer setup/i,
    cues: ["settings", "printer"],
    forbidden: /[0-9].*(?:°C|degrees)|I can.t confirm/i,
  },
  {
    id: "everyday-magigoo-petg-glass",
    customerPrompt: "I'm printing PETG on glass. Is Magigoo Original suitable?",
    required: /designed and tested for PETG on glass/i,
    cues: ["PETG", "glass"],
    forbidden:
      /thin coat|all surfaces|PEI|guarantee|(?:not|never) designed|can't confirm/i,
  },
  {
    id: "everyday-magigoo-tpu-follow-up",
    customerPrompt: "I'm printing PETG on glass. Is Magigoo Original suitable?",
    customerPrompts: [
      "I'm printing PETG on glass. Is Magigoo Original suitable?",
      "What about TPU?",
    ],
    required: /designed and tested for TPU on glass/i,
    cues: ["TPU", "glass"],
    forbidden:
      /every plate|all surfaces|PEI|guarantee|(?:not|never) designed|can't confirm/i,
  },
  {
    id: "everyday-magigoo-pei-unknown",
    customerPrompt: "Will Magigoo Original work on textured PEI?",
    required: /does not establish[^.]*textured PEI/i,
    cues: ["PEI", "glass"],
    forbidden: /(?:yes|safe|tested for TPU on textured PEI)/i,
  },
  {
    id: "everyday-magigoo-application-unknown",
    customerPrompt: "How much Magigoo Original should I apply?",
    required:
      /application amount and method.*need checking[\s\S]*follow.*application instructions/i,
    cues: ["application", "instructions"],
    forbidden: /thin|coat|layer|drops|hot bed|cooling/i,
  },
  {
    id: "everyday-dragonfly-printer-fit",
    customerPrompt: "Will a Dragonfly BMS fit my printer?",
    required:
      /check.*mounting and electrical requirements[\s\S]*which printer model/i,
    cues: ["fit", "printer model"],
    forbidden: /(?:definitely|guaranteed|universal) fit|I can.t confirm/i,
  },
  {
    id: "everyday-dragonfly-petg-setup",
    customerPrompt: "Can I print PETG with a Dragonfly BMS?",
    required:
      /check the PETG filament.*printing requirements[\s\S]*which printer model/i,
    cues: ["PETG", "printer model"],
    forbidden: /safe for PETG|definitely compatible|I can.t confirm/i,
  },
  {
    id: "everyday-dragonfly-body-material",
    customerPrompt: "What is the Dragonfly BMS made from?",
    required: /Dragonfly BMS is mainly copper alloy/i,
    cues: ["copper alloy"],
    forbidden: /heater|firmware/i,
  },
];
export const customerAiEverydayKnowledgeEvalCases = inputs.map(
  ({ required, cues, forbidden, ...input }) =>
    defineCustomerAiEvalCase({
      ...input,
      checks: { toolCall: { required: ["searchKnowledge"] } },
      expectedAnswer: {
        formatHints: [
          "Answer the customer's question directly using the current exact product evidence; include only relevant limitations.",
        ],
        requiredPatterns: [
          {
            label:
              "Relevant supported answer or specific uncertainty with a useful next step",
            pattern: required,
          },
        ],
        maxQuestions: 1,
        mustIncludeOneOf: cues,
        minimumCueMatches: cues.length,
        forbiddenPatterns: [
          narration,
          irrelevant,
          {
            label: "Do not invent compatibility, instructions or guarantees.",
            pattern: forbidden,
          },
        ],
      },
      suites: releaseSuites,
      tags: [
        "product_documents",
        ...(input.customerPrompts ? ["follow_up" as const] : []),
      ],
    }),
);
