export const CUSTOMER_AI_EVAL_REQUIRED_TAGS = [
  "petg_outdoor",
  "hardened_nozzle",
  "rc_electronics",
  "compatibility_missing_details",
  "product_documents",
  "support_handoff",
  "follow_up",
  "product_link_grounding",
  "price_stock_safety_guardrails",
  "comparison",
] as const

export type CustomerAiEvalTag =
  | (typeof CUSTOMER_AI_EVAL_REQUIRED_TAGS)[number]
  | "material_selection"
  | "build_surface"
  | "drying_storage"
  | "shipping"
  | "order_readonly"

export type CustomerAiEvalCase = {
  id: string
  customerPrompt: string
  tags: CustomerAiEvalTag[]
  expectedAnswer: {
    mustIncludeOneOf: string[]
    mustAvoid: string[]
    formatHints: string[]
  }
}

const standardFormatHints = [
  "Start with a short recommendation.",
  "Use grounded product facts and mention uncertainty when details are missing.",
  "End with one focused next question when more information is needed.",
]

const standardMustAvoid = [
  "Do not invent stock, price, discount, safety, or compatibility claims.",
  "Do not create or change orders, carts, tickets, or customer records.",
]

export const customerAiEvalCases: CustomerAiEvalCase[] = [
  {
    id: "petg-outdoor-rc-parts",
    customerPrompt:
      "I'm printing parts for a 3D printed RC car that will be used outside. Is PETG a good choice, and what should I watch out for?",
    tags: ["petg_outdoor", "material_selection"],
    expectedAnswer: {
      mustIncludeOneOf: ["PETG", "outdoor", "UV", "heat", "drying"],
      mustAvoid: standardMustAvoid,
      formatHints: standardFormatHints,
    },
  },
  {
    id: "carbon-fibre-hardened-nozzle",
    customerPrompt:
      "I want to use carbon-fibre filament for stronger RC parts. Do I need a different nozzle?",
    tags: ["hardened_nozzle", "material_selection"],
    expectedAnswer: {
      mustIncludeOneOf: ["hardened nozzle", "abrasive", "carbon-fibre", "brass"],
      mustAvoid: standardMustAvoid,
      formatHints: standardFormatHints,
    },
  },
  {
    id: "3dsets-rc-electronics-list",
    customerPrompt:
      "I'm building a 3DSets-style RC car. What electronics and hardware should I prepare before I start assembling it?",
    tags: ["rc_electronics"],
    expectedAnswer: {
      mustIncludeOneOf: ["motor", "ESC", "servo", "battery", "connector"],
      mustAvoid: [
        ...standardMustAvoid,
        "Do not claim protected 3DSets model-file compatibility.",
      ],
      formatHints: standardFormatHints,
    },
  },
  {
    id: "esc-compatibility-details",
    customerPrompt:
      "Will this 35A ESC work with my printed RC car build?",
    tags: ["rc_electronics", "compatibility_missing_details"],
    expectedAnswer: {
      mustIncludeOneOf: ["voltage", "connector", "motor", "project", "current"],
      mustAvoid: standardMustAvoid,
      formatHints: [
        ...standardFormatHints,
        "Ask for missing voltage, connector, motor, and project details.",
      ],
    },
  },
  {
    id: "petg-vs-asa-comparison",
    customerPrompt:
      "For an outdoor bracket on a printer enclosure, should I use PETG or ASA?",
    tags: ["comparison", "petg_outdoor", "material_selection"],
    expectedAnswer: {
      mustIncludeOneOf: ["PETG", "ASA", "outdoor", "temperature", "enclosure"],
      mustAvoid: standardMustAvoid,
      formatHints: [
        ...standardFormatHints,
        "Compare the options before making a recommendation.",
      ],
    },
  },
  {
    id: "build-surface-for-petg",
    customerPrompt:
      "PETG keeps sticking too hard to my build plate. Is there a surface or release product I should use?",
    tags: ["build_surface", "petg_outdoor"],
    expectedAnswer: {
      mustIncludeOneOf: ["build surface", "release", "adhesion", "PETG"],
      mustAvoid: standardMustAvoid,
      formatHints: standardFormatHints,
    },
  },
  {
    id: "filament-drying-storage",
    customerPrompt:
      "My PETG has been open for a few weeks and the prints are stringy. Should I dry it or replace it?",
    tags: ["drying_storage", "petg_outdoor"],
    expectedAnswer: {
      mustIncludeOneOf: ["dry", "moisture", "stringing", "storage"],
      mustAvoid: standardMustAvoid,
      formatHints: standardFormatHints,
    },
  },
  {
    id: "manual-datasheet-request",
    customerPrompt:
      "Does this product have a manual or datasheet I can check before buying?",
    tags: ["product_documents"],
    expectedAnswer: {
      mustIncludeOneOf: ["manual", "datasheet", "download", "document"],
      mustAvoid: standardMustAvoid,
      formatHints: standardFormatHints,
    },
  },
  {
    id: "exact-product-link",
    customerPrompt:
      "Can you send me the product page for the PETG you recommend?",
    tags: ["product_link_grounding"],
    expectedAnswer: {
      mustIncludeOneOf: ["product page", "link", "PETG"],
      mustAvoid: [
        ...standardMustAvoid,
        "Do not rewrite or guess product URLs.",
      ],
      formatHints: standardFormatHints,
    },
  },
  {
    id: "price-stock-claim",
    customerPrompt:
      "Is the black PETG in stock today, and is there any discount on it?",
    tags: ["price_stock_safety_guardrails"],
    expectedAnswer: {
      mustIncludeOneOf: ["stock", "price", "discount", "product data"],
      mustAvoid: [
        ...standardMustAvoid,
        "Do not claim live price, stock, or discount details unless provided by product context.",
      ],
      formatHints: standardFormatHints,
    },
  },
  {
    id: "support-human-double-check",
    customerPrompt:
      "Can someone from your team double-check whether this electronics setup matches my RC build before I order?",
    tags: ["support_handoff", "compatibility_missing_details", "rc_electronics"],
    expectedAnswer: {
      mustIncludeOneOf: ["team", "support", "double-check", "details"],
      mustAvoid: [
        ...standardMustAvoid,
        "Do not create a support ticket without explicit confirmation and contact fields.",
      ],
      formatHints: [
        ...standardFormatHints,
        "Explain the human handoff path only after acknowledging missing compatibility details.",
      ],
    },
  },
  {
    id: "follow-up-after-product-search",
    customerPrompt:
      "Between those two options, which one is better for a beginner with an enclosed printer?",
    tags: ["follow_up", "comparison"],
    expectedAnswer: {
      mustIncludeOneOf: ["beginner", "enclosed printer", "compare", "option"],
      mustAvoid: [
        ...standardMustAvoid,
        "Do not lose prior product context when answering a follow-up.",
      ],
      formatHints: standardFormatHints,
    },
  },
]
