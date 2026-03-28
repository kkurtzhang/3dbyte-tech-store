import type {
  HomepageCta,
  HomepageData,
  HomepageGuidesHelpSection,
  HomepageLinkCard,
  HomepageLinkCardIcon,
  HomepageSectionConfig,
  HomepageSupportStrip,
  HomepageHeroBanner,
  HomepageStat,
  StrapiImage,
} from "@/lib/strapi/types"

export interface HomepageSectionView {
  eyebrow: string
  heading: string
  text: string
  ctaText: string
  ctaLink: string
  enabled: boolean
}

export interface HomepageLinkCardView {
  id: number
  eyebrow: string
  title: string
  text: string
  linkText: string
  link: string
  icon: HomepageLinkCardIcon
}

export interface HomepageSupportStripView {
  label: string
  text: string
  ctaText: string
  ctaLink: string
  enabled: boolean
}

export interface HomepageViewModel {
  hero: HomepageHeroBanner
  midBanner: HomepageHeroBanner | null
  quickLinksHeading: string
  quickLinks: HomepageLinkCardView[]
  trustStats: HomepageStat[]
  collectionsSection: HomepageSectionView
  productsSection: HomepageSectionView
  guidesHelpSection: {
    eyebrow: string
    heading: string
    text: string
    enabled: boolean
    cards: HomepageLinkCardView[]
  }
  supportStrip: HomepageSupportStripView
}

const defaultHero: HomepageHeroBanner = {
  id: 0,
  Eyebrow: "3D BYTE THE LAB",
  Headline: "Engineered for Precision.",
  Text: "Premium Voron kits, high-performance materials, and precision components for serious builders.",
  CTA: {
    id: 1,
    BtnText: "BROWSE CATALOG",
    BtnLink: "/shop",
  },
  SecondaryCTA: {
    id: 2,
    BtnText: "SHOP BRANDS",
    BtnLink: "/brands",
  },
  FeatureTags: [
    { id: 1, Text: "VORON KITS" },
    { id: 2, Text: "HIGH-PERF FILAMENTS" },
    { id: 3, Text: "PRECISION HARDWARE" },
  ],
}

const defaultCollectionsSection: HomepageSectionView = {
  eyebrow: "COLLECTIONS",
  heading: "Shop the catalog by build focus.",
  text: "Start with curated collection rails instead of wandering the full catalog.",
  ctaText: "View All Collections",
  ctaLink: "/collections",
  enabled: true,
}

const defaultProductsSection: HomepageSectionView = {
  eyebrow: "LATEST DROPS",
  heading: "Fresh arrivals and proven essentials.",
  text: "Automatic storefront picks from the newest catalog additions and high-signal inventory.",
  ctaText: "View All Products",
  ctaLink: "/shop",
  enabled: true,
}

const defaultSupportStrip: HomepageSupportStripView = {
  label: "NEED A SECOND CHECK?",
  text: "Shipping, compatibility, and returns answers are one click away before you commit to a build.",
  ctaText: "Get Support",
  ctaLink: "/contact",
  enabled: true,
}

const defaultQuickLinks: HomepageLinkCardView[] = [
  {
    id: 1,
    eyebrow: "SHOP",
    title: "Browse the full catalog",
    text: "Jump straight into the full storefront when you already know what you need.",
    linkText: "Open shop",
    link: "/shop",
    icon: "package",
  },
  {
    id: 2,
    eyebrow: "COLLECTIONS",
    title: "Shop by build focus",
    text: "Use collection rails to narrow the catalog by use case, system, or material family.",
    linkText: "Explore collections",
    link: "/collections",
    icon: "sparkles",
  },
  {
    id: 3,
    eyebrow: "BRANDS",
    title: "Browse trusted manufacturers",
    text: "Move quickly by starting from the brands you already rely on for printers and materials.",
    linkText: "View brands",
    link: "/brands",
    icon: "store",
  },
  {
    id: 4,
    eyebrow: "GUIDES",
    title: "Learn before you buy",
    text: "Use guides and docs to avoid compatibility surprises and dead-end purchases.",
    linkText: "Open guides",
    link: "/guides",
    icon: "book-open",
  },
]

const defaultGuidesHelpCards: HomepageLinkCardView[] = [
  {
    id: 1,
    eyebrow: "GUIDES",
    title: "Start with practical build guides",
    text: "Calibration, setup, and material-selection guidance for first-time and repeat buyers.",
    linkText: "Explore guides",
    link: "/guides",
    icon: "book-open",
  },
  {
    id: 2,
    eyebrow: "SHIPPING",
    title: "Check delivery and returns first",
    text: "Answer dispatch, shipping, and return-policy questions before you head into checkout.",
    linkText: "View shipping info",
    link: "/shipping",
    icon: "truck",
  },
  {
    id: 3,
    eyebrow: "SUPPORT",
    title: "Get help with parts and fit",
    text: "Use support if you want a second check on compatibility, replacement parts, or selection.",
    linkText: "Contact support",
    link: "/contact",
    icon: "shield-check",
  },
]

function getCtaText(cta: HomepageCta | null | undefined, fallbackText: string): string {
  return cta?.BtnText?.trim() || fallbackText
}

function getCtaLink(cta: HomepageCta | null | undefined, fallbackLink: string): string {
  return cta?.BtnLink?.trim() || fallbackLink
}

function buildSectionView(
  section: HomepageSectionConfig | null | undefined,
  fallback: HomepageSectionView
): HomepageSectionView {
  return {
    eyebrow: section?.Eyebrow?.trim() || fallback.eyebrow,
    heading: section?.Heading?.trim() || fallback.heading,
    text: section?.Text?.trim() || fallback.text,
    ctaText: getCtaText(section?.CTA, fallback.ctaText),
    ctaLink: getCtaLink(section?.CTA, fallback.ctaLink),
    enabled: section?.Enabled ?? fallback.enabled,
  }
}

function buildSupportStripView(
  strip: HomepageSupportStrip | null | undefined
): HomepageSupportStripView {
  return {
    label: strip?.Label?.trim() || defaultSupportStrip.label,
    text: strip?.Text?.trim() || defaultSupportStrip.text,
    ctaText: getCtaText(strip?.CTA, defaultSupportStrip.ctaText),
    ctaLink: getCtaLink(strip?.CTA, defaultSupportStrip.ctaLink),
    enabled: strip?.Enabled ?? defaultSupportStrip.enabled,
  }
}

function guessCardIcon(link: string, title: string): HomepageLinkCardIcon {
  if (link.includes("/guides") || title.toLowerCase().includes("guide")) {
    return "book-open"
  }

  if (link.includes("/shipping") || title.toLowerCase().includes("shipping")) {
    return "truck"
  }

  if (link.includes("/contact") || title.toLowerCase().includes("support")) {
    return "shield-check"
  }

  if (link.includes("/brands") || title.toLowerCase().includes("brand")) {
    return "store"
  }

  if (link.includes("/collections")) {
    return "sparkles"
  }

  return "package"
}

function buildCardView(card: HomepageLinkCard, index: number): HomepageLinkCardView | null {
  const title = card.Title?.trim()
  const link = card.Link?.trim()

  if (!title || !link) {
    return null
  }

  return {
    id: card.id || index + 1,
    eyebrow: card.Eyebrow?.trim() || "",
    title,
    text: card.Text?.trim() || "",
    linkText: card.LinkText?.trim() || "Explore",
    link,
    icon: card.Icon || guessCardIcon(link, title),
  }
}

function buildQuickLinkCards(homepage: HomepageData | null | undefined): HomepageLinkCardView[] {
  if (!homepage?.QuickLinks?.length) {
    return defaultQuickLinks
  }

  const cards = homepage.QuickLinks.map((link, index) => {
    const title = link.BtnText?.trim()
    const href = link.BtnLink?.trim()

    if (!title || !href) {
      return null
    }

    return {
      id: link.id || index + 1,
      eyebrow: index === 0 ? "SHOP" : "",
      title,
      text: "",
      linkText: "Explore",
      link: href,
      icon: guessCardIcon(href, title),
    } satisfies HomepageLinkCardView
  }).filter((card): card is HomepageLinkCardView => Boolean(card))

  return cards.length > 0 ? cards : defaultQuickLinks
}

function buildGuidesHelpSection(
  section: HomepageGuidesHelpSection | null | undefined
): HomepageViewModel["guidesHelpSection"] {
  const cards =
    section?.Cards
      ?.map((card, index) => buildCardView(card, index))
      .filter((card): card is HomepageLinkCardView => Boolean(card)) || []

  return {
    eyebrow: section?.Eyebrow?.trim() || "GUIDES + HELP",
    heading: section?.Heading?.trim() || "Lower-friction support before checkout.",
    text:
      section?.Text?.trim() ||
      "Use guides, shipping info, and support links to answer the questions that usually block first-time conversion.",
    enabled: section?.Enabled ?? true,
    cards: cards.length > 0 ? cards : defaultGuidesHelpCards,
  }
}

export function getHomepageImageProps(image: StrapiImage | null | undefined) {
  if (!image?.url) {
    return null
  }

  const src = image.url.startsWith("http")
    ? image.url
    : `${process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"}${image.url}`

  return {
    src,
    alt: image.alternativeText?.trim() || "Homepage image",
    width: image.width,
    height: image.height,
  }
}

export function buildHomepageViewModel(homepage: HomepageData | null | undefined): HomepageViewModel {
  return {
    hero: homepage?.HeroBanner || defaultHero,
    midBanner: homepage?.MidBanner || null,
    quickLinksHeading: homepage?.QuickLinksHeading?.trim() || "Shop by Focus",
    quickLinks: buildQuickLinkCards(homepage),
    trustStats: homepage?.TrustStats || [],
    collectionsSection: buildSectionView(
      homepage?.CollectionsSection,
      defaultCollectionsSection
    ),
    productsSection: buildSectionView(
      homepage?.ProductsSection,
      defaultProductsSection
    ),
    guidesHelpSection: buildGuidesHelpSection(homepage?.GuidesHelpSection),
    supportStrip: buildSupportStripView(homepage?.SupportStrip),
  }
}
