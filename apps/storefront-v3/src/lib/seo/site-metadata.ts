import type { Metadata } from "next"

const DEFAULT_SITE_URL = "https://store.3dbytetech.com.au"
const SITE_NAME = "3D Byte Tech Store"
const DEFAULT_TITLE = "3D Byte Tech Store - Premium 3D Printing Supplies"
const DEFAULT_DESCRIPTION =
  "High-performance filaments, Voron kits, and hardware for makers and engineers."
const DEFAULT_SOCIAL_IMAGE =
  "/ai-catalogue/products/ai-filament-dryer-box.png"
const INDEXABLE_HOSTNAMES = new Set(["store.3dbytetech.com.au"])

type SiteMetadataEnv = Record<string, string | undefined>

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "")
}

function getHostname(siteUrl: string) {
  try {
    return new URL(siteUrl).hostname.toLowerCase()
  } catch {
    return ""
  }
}

export function getSiteUrl(env: SiteMetadataEnv = process.env) {
  return stripTrailingSlash(env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL)
}

export function isIndexableSiteUrl(siteUrl = getSiteUrl()) {
  return INDEXABLE_HOSTNAMES.has(getHostname(siteUrl))
}

export function buildRobotsDirective(
  siteUrl = getSiteUrl()
): Metadata["robots"] {
  if (!isIndexableSiteUrl(siteUrl)) {
    return {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    }
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  }
}

export function buildRootMetadata(
  env: SiteMetadataEnv = process.env
): Metadata {
  const siteUrl = getSiteUrl(env)

  return {
    metadataBase: new URL(`${siteUrl}/`),
    applicationName: SITE_NAME,
    title: {
      template: `%s | ${SITE_NAME}`,
      default: DEFAULT_TITLE,
    },
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: "/",
    },
    robots: buildRobotsDirective(siteUrl),
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: "/",
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE,
          width: 900,
          height: 900,
          alt: "3D Byte Tech Store product catalogue",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  }
}
