/**
 * Seed or refresh the Homepage single type with storefront-ready content.
 *
 * Run from the CMS workspace:
 *   pnpm strapi console < scripts/upsert-homepage-content.js
 */

(async () => {
  const homepageApi = "api::homepage.homepage"

  const existingHomepage = await strapi.documents(homepageApi).findFirst({
    populate: {
      HeroBanner: { populate: ["Image", "CTA", "SecondaryCTA", "FeatureTags"] },
      MidBanner: { populate: ["Image", "CTA", "SecondaryCTA", "FeatureTags"] },
      AnnouncementBarItems: true,
      CollectionsSection: { populate: ["CTA"] },
      ProductsSection: { populate: ["CTA"] },
      GuidesHelpSection: { populate: ["Cards"] },
      SupportStrip: { populate: ["CTA"] },
      QuickLinks: true,
      TrustStats: true,
    },
  })

  const preferredHeroImageId = 5
  const fallbackImageId = 2
  const heroImageId =
    existingHomepage?.HeroBanner?.Image?.id ||
    preferredHeroImageId ||
    fallbackImageId
  const midBannerImageId =
    existingHomepage?.MidBanner?.Image?.id ||
    existingHomepage?.HeroBanner?.Image?.id ||
    preferredHeroImageId ||
    fallbackImageId

  const selectedHeroImage = await strapi.db.query("plugin::upload.file").findOne({
    where: { id: heroImageId },
    select: ["id", "name"],
  })
  const selectedMidBannerImage = await strapi.db
    .query("plugin::upload.file")
    .findOne({
      where: { id: midBannerImageId },
      select: ["id", "name"],
    })

  if (!selectedHeroImage || !selectedMidBannerImage) {
    throw new Error(
      "Homepage seed requires existing upload media. Add media in Strapi first, then rerun this script."
    )
  }

  const homepageData = {
    QuickLinksHeading: "Shop by Focus",
    HeroBanner: {
      id: existingHomepage?.HeroBanner?.id,
      Eyebrow: "3D BYTE THE LAB",
      Headline: "Precision 3D Printing Materials",
      Text: "Premium filaments, nozzles, build surfaces, and practical parts support for makers who want fewer failed prints and faster decisions.",
      Image: selectedHeroImage.id,
      CTA: {
        id: existingHomepage?.HeroBanner?.CTA?.id,
        BtnText: "Shop Filaments",
        BtnLink: "/shop",
      },
      SecondaryCTA: {
        id: existingHomepage?.HeroBanner?.SecondaryCTA?.id,
        BtnText: "Explore Collections",
        BtnLink: "/collections",
      },
      FeatureTags: [
        { Text: "FILAMENTS" },
        { Text: "PARTS & UPGRADES" },
        { Text: "PRACTICAL SUPPORT" },
      ],
    },
    MidBanner: {
      id: existingHomepage?.MidBanner?.id,
      Eyebrow: "WHY BUY FROM 3D BYTE",
      Headline: "Lower-friction buying for serious builders.",
      Text: "Start with curated collections, compare proven essentials, and get support before a compatibility mistake becomes a cart problem.",
      Image: selectedMidBannerImage.id,
      CTA: {
        id: existingHomepage?.MidBanner?.CTA?.id,
        BtnText: "Browse Collections",
        BtnLink: "/collections",
      },
      SecondaryCTA: existingHomepage?.MidBanner?.SecondaryCTA?.id
        ? {
            id: existingHomepage.MidBanner.SecondaryCTA.id,
            BtnText: "Contact Support",
            BtnLink: "/contact",
          }
        : undefined,
      FeatureTags: [],
    },
    AnnouncementBarItems: [
      {
        Text: "Free shipping over $149",
        Icon: "package",
      },
      {
        Text: "Curated materials and parts for reliable builds",
        Icon: "sparkles",
      },
      {
        Text: "Need a compatibility check? Contact support",
        Link: "/contact",
        Icon: "shield-check",
      },
    ],
    CollectionsSection: {
      id: existingHomepage?.CollectionsSection?.id,
      Enabled: true,
      Eyebrow: "COLLECTIONS",
      Heading: "Shop the catalog by build focus.",
      Text: "Start with curated collection rails instead of wandering the full catalog.",
      CTA: {
        id: existingHomepage?.CollectionsSection?.CTA?.id,
        BtnText: "View All Collections",
        BtnLink: "/collections",
      },
    },
    ProductsSection: {
      id: existingHomepage?.ProductsSection?.id,
      Enabled: true,
      Eyebrow: "LATEST DROPS",
      Heading: "Fresh arrivals and proven essentials.",
      Text: "New additions, practical restocks, and proven parts worth checking before you build the long way around.",
      CTA: {
        id: existingHomepage?.ProductsSection?.CTA?.id,
        BtnText: "View All Products",
        BtnLink: "/shop",
      },
    },
    GuidesHelpSection: {
      id: existingHomepage?.GuidesHelpSection?.id,
      Enabled: true,
      Eyebrow: "GUIDES + HELP",
      Heading: "Get the answers that usually block checkout.",
      Text: "Use guides, shipping info, and support to resolve compatibility and dispatch questions before you commit.",
      Cards: [
        {
          Eyebrow: "GUIDES",
          Title: "Start with practical build guides",
          Text: "Calibration, setup, and material-selection guidance for first-time and repeat buyers.",
          LinkText: "Explore Guides",
          Link: "/guides",
          Icon: "book-open",
        },
        {
          Eyebrow: "SHIPPING",
          Title: "Check delivery and returns first",
          Text: "Answer dispatch, shipping, and return-policy questions before you head into checkout.",
          LinkText: "View Shipping Info",
          Link: "/shipping",
          Icon: "truck",
        },
        {
          Eyebrow: "SUPPORT",
          Title: "Get help with parts and fit",
          Text: "Use support if you want a second check on compatibility, replacement parts, or selection.",
          LinkText: "Contact Support",
          Link: "/contact",
          Icon: "shield-check",
        },
      ],
    },
    SupportStrip: {
      id: existingHomepage?.SupportStrip?.id,
      Enabled: true,
      Label: "NEED A SECOND CHECK?",
      Text: "Shipping, compatibility, and returns answers are one click away before you commit to a build.",
      CTA: {
        id: existingHomepage?.SupportStrip?.CTA?.id,
        BtnText: "Get Support",
        BtnLink: "/contact",
      },
    },
    QuickLinks: [],
    TrustStats: [
      {
        Value: "Curated Catalog",
        Label: "Less searching, fewer dead ends",
      },
      {
        Value: "Trusted Brands",
        Label: "Start with proven manufacturers",
      },
      {
        Value: "Practical Guides",
        Label: "Use guides before you buy",
      },
      {
        Value: "Support First",
        Label: "Ask about fit and compatibility",
      },
    ],
  }

  if (existingHomepage?.documentId) {
    await strapi.documents(homepageApi).update({
      documentId: existingHomepage.documentId,
      data: homepageData,
    })
    console.log(`Updated homepage document ${existingHomepage.documentId}`)
  } else {
    const createdHomepage = await strapi.documents(homepageApi).create({
      data: homepageData,
    })
    console.log(`Created homepage document ${createdHomepage.documentId}`)
  }

  console.log(
    `Homepage content is ready. Hero image: ${selectedHeroImage.name}. Mid banner image: ${selectedMidBannerImage.name}.`
  )
  process.exit(0)
})().catch((error) => {
  console.error("Homepage seed failed:", error)
  process.exit(1)
})
