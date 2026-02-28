import type { MetadataRoute } from "next";
import { getProductHandles } from "@/lib/medusa/products";
import { getCollections } from "@/lib/medusa/collections";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

const staticRoutes = [
  "/",
  "/shop",
  "/search",
  "/brands",
  "/bundles",
  "/blog",
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/privacy-policy",
  "/terms-and-conditions",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
  }));

  try {
    const [productHandles, collections] = await Promise.all([
      getProductHandles(),
      getCollections(),
    ]);

    const productEntries: MetadataRoute.Sitemap = productHandles.map((handle) => ({
      url: `${siteUrl}/products/${handle}`,
      lastModified: now,
    }));

    const collectionEntries: MetadataRoute.Sitemap = collections
      .filter((collection) => collection.handle)
      .map((collection) => ({
        url: `${siteUrl}/collections/${collection.handle}`,
        lastModified: now,
      }));

    return [...staticEntries, ...productEntries, ...collectionEntries];
  } catch {
    return staticEntries;
  }
}
