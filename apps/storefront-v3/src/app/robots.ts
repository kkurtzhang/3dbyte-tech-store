import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexableSiteUrl } from "@/lib/seo/site-metadata";

const privatePaths = ["/account", "/checkout", "/api"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (!isIndexableSiteUrl(siteUrl)) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
