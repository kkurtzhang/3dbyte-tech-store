const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "")
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_API_TOKEN) {
  console.error("Missing STRAPI_API_TOKEN. Set a Strapi API token before running this script.")
  process.exit(1)
}

function route(path) {
  return path.startsWith("/") ? path : `/${path}`
}

async function upsertSingleType(apiId, data) {
  const response = await fetch(`${STRAPI_URL}/api/${apiId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      `Failed to upsert ${apiId}: ${response.status} ${JSON.stringify(body)}`
    )
  }

  return body
}

const helpCenterPayload = {
  Heading: "Help Center",
  Subheading: "Find fast answers for shipping, returns, account, and order support.",
  Categories: [
    {
      Title: "Shipping",
      Description: "Delivery windows, methods, and shipping restrictions.",
      Href: route("/shipping"),
      Icon: "package",
      Articles: [
        { Title: "How long does delivery take?" },
        { Title: "What shipping options can I choose?" },
        { Title: "Do you ship internationally?" },
      ],
    },
    {
      Title: "Returns",
      Description: "Eligibility, return flow, and refund timelines.",
      Href: route("/returns"),
      Icon: "refresh-cw",
      Articles: [
        { Title: "How to start a return" },
        { Title: "Refund processing times" },
        { Title: "Items that cannot be returned" },
      ],
    },
    {
      Title: "Orders",
      Description: "Order status, tracking, and post-purchase updates.",
      Href: route("/track-order"),
      Icon: "shopping-bag",
      Articles: [
        { Title: "Track an existing order" },
        { Title: "Where to find tracking details" },
        { Title: "What to do if tracking stalls" },
      ],
    },
    {
      Title: "Account",
      Description: "Sign-in, profile management, and saved items.",
      Href: route("/account"),
      Icon: "user",
      Articles: [
        { Title: "Reset account access" },
        { Title: "Update account details" },
        { Title: "Manage saved products" },
      ],
    },
  ],
  PopularResources: [
    { Title: "Track your order", Category: "Orders", Href: route("/track-order") },
    { Title: "Shipping policy", Category: "Shipping", Href: route("/shipping") },
    { Title: "Returns and refunds", Category: "Returns", Href: route("/returns") },
    { Title: "Frequently asked questions", Category: "FAQ", Href: route("/faq") },
    { Title: "Contact support", Category: "Support", Href: route("/contact") },
    { Title: "Manage account settings", Category: "Account", Href: route("/account/settings") },
  ],
  ContactOptions: [
    {
      Title: "Email Support",
      Description: "Share your issue details with our support team.",
      Value: "support@3dbyte.tech",
      Action: "Open Contact Form",
      Href: route("/contact"),
      Icon: "mail",
    },
    {
      Title: "Support Form",
      Description: "Use our guided form for order, product, and account issues.",
      Value: "Best for detailed requests",
      Action: "Open Contact Form",
      Href: route("/contact"),
      Icon: "message-circle",
    },
    {
      Title: "Track an Order",
      Description: "Check shipping progress using your order number and email.",
      Value: "Live order status lookup",
      Action: "Track Order",
      Href: route("/track-order"),
      Icon: "package",
    },
  ],
}

const guidesPagePayload = {
  Heading: "3D Printing Guides",
  Subheading:
    "Expert tutorials and walkthroughs for building, calibrating, and mastering your 3D printer.",
  FeaturedGuides: [
    {
      Title: "Complete Voron 2.4 Build Guide",
      Category: "Voron Builds",
      ReadTime: "4 hours",
      Rating: "4.9",
      Description:
        "A comprehensive step-by-step guide to building your own Voron 2.4 3D printer from scratch.",
      Href: route("/blog"),
      Icon: "book-open",
    },
    {
      Title: "Filament Guide: Which Material for Your Project?",
      Category: "Filament Selection",
      ReadTime: "15 min",
      Rating: "4.8",
      Description:
        "Learn the differences between PLA, PETG, ABS, TPU, and specialty filaments.",
      Href: route("/blog"),
      Icon: "book-open",
    },
    {
      Title: "First Layer Perfect Every Time",
      Category: "Calibration",
      ReadTime: "10 min",
      Rating: "4.9",
      Description:
        "Master the most important layer in 3D printing with this calibration guide.",
      Href: route("/blog"),
      Icon: "book-open",
    },
  ],
  Categories: [
    {
      Title: "Voron Builds",
      Description: "Complete build guides for Voron 2.4, V0, and Trident printers",
      Icon: "printer",
      Tone: "blue",
      Guides: [
        { Title: "Voron 2.4 Full Build Guide", Href: route("/blog") },
        { Title: "V0.2 Build Tutorial", Href: route("/blog") },
        { Title: "Trident Assembly Walkthrough", Href: route("/blog") },
      ],
    },
    {
      Title: "Filament Selection",
      Description: "Choose the right material for your project",
      Icon: "layers",
      Tone: "green",
      Guides: [
        { Title: "PLA vs PETG vs ABS Comparison", Href: route("/blog") },
        { Title: "Best Filaments for Functional Parts", Href: route("/blog") },
        { Title: "TPU Printing Tips", Href: route("/blog") },
      ],
    },
    {
      Title: "Printer Calibration",
      Description: "Optimize your prints with proper calibration",
      Icon: "settings",
      Tone: "purple",
      Guides: [
        { Title: "First Layer Calibration Guide", Href: route("/blog") },
        { Title: "Pressure Advance Tuning", Href: route("/blog") },
        { Title: "Retraction Settings Explained", Href: route("/blog") },
      ],
    },
  ],
  QuickLinks: [
    {
      Title: "Getting Started with 3D Printing",
      Href: route("/blog"),
      Icon: "zap",
    },
    {
      Title: "Nozzle Maintenance Guide",
      Href: route("/blog"),
      Icon: "wrench",
    },
    {
      Title: "SD Card Setup for Klipper",
      Href: route("/docs"),
      Icon: "package",
    },
    {
      Title: "Voltage Theory Explained",
      Href: route("/docs"),
      Icon: "thermometer",
    },
  ],
}

async function main() {
  console.log(`Using Strapi: ${STRAPI_URL}`)

  await upsertSingleType("help-center", helpCenterPayload)
  console.log("Upserted help-center content")

  await upsertSingleType("guides-page", guidesPagePayload)
  console.log("Upserted guides-page content")

  console.log("Done")
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
