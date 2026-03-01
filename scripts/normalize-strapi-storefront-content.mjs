#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseEnv(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

const root = process.cwd();
const storefrontEnv = parseEnv(path.join(root, "apps/storefront-v3/.env"));
const backendEnv = parseEnv(path.join(root, "apps/backend/.env"));

const baseUrl = storefrontEnv.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const writeToken =
  process.env.STRAPI_WRITE_TOKEN ||
  process.env.STRAPI_API_TOKEN ||
  backendEnv.STRAPI_API_TOKEN ||
  storefrontEnv.STRAPI_WRITE_TOKEN ||
  storefrontEnv.NEXT_PUBLIC_STRAPI_READ_TOKEN;

if (!writeToken) {
  console.error("Missing Strapi token for write operations.");
  process.exit(1);
}

async function api(endpoint, options = {}) {
  const res = await fetch(`${baseUrl}/api${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${writeToken}`,
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Strapi ${res.status} on ${endpoint}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function updateCollection(type, item, data) {
  const idAttempt = async () =>
    api(`/${type}/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    });

  const documentAttempt = async () =>
    api(`/${type}/${item.documentId}`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    });

  try {
    return await idAttempt();
  } catch {
    return documentAttempt();
  }
}

function replaceLegalFields(content, contactEmail) {
  return content
    .replace(/\*Last updated:.*?\*/i, "*Last updated: February 2026*")
    .replace(/@3dbyte\.com/gi, "@3dbyte.tech")
    .replace(/\*\*privacy@3dbyte\.tech\*\*/i, `**${contactEmail}**`)
    .replace(/\*\*legal@3dbyte\.tech\*\*/i, `**${contactEmail}**`);
}

async function run() {
  const [categories, blogs, privacy, terms] = await Promise.all([
    api("/blog-post-categories?pagination%5Blimit%5D=100"),
    api("/blogs?pagination%5Blimit%5D=100&populate=*"),
    api("/privacy-policy"),
    api("/terms-and-condition"),
  ]);

  const categoryRows = categories.data || [];
  const blogRows = blogs.data || [];

  const ranking = categoryRows.find((c) => c.Slug === "ranking" || c.Title.toLowerCase() === "ranking");
  const allPost = categoryRows.find((c) => c.Slug === "all-post" || c.Title.toLowerCase() === "all post");

  let featuredCategoryId = null;
  let guidesCategoryId = null;

  if (ranking) {
    const updated = await updateCollection("blog-post-categories", ranking, {
      Title: "Featured",
      Slug: "featured",
    });
    featuredCategoryId = updated?.data?.id || ranking.id;
  }

  if (allPost) {
    const updated = await updateCollection("blog-post-categories", allPost, {
      Title: "Guides",
      Slug: "guides",
    });
    guidesCategoryId = updated?.data?.id || allPost.id;
  }

  const targetPost =
    blogRows.find((b) => b.Slug === "caring-for-wood-furniture") ||
    blogRows.find((b) => b.Title.toLowerCase().includes("wood furniture")) ||
    blogRows[0];

  if (targetPost) {
    const content = `# Voron Motion System Tuning Checklist

Dial in reliability for your first 100 print hours with this practical checklist.

## 1. Belt Path and Tension
- Confirm equal belt tension across all axes.
- Verify no belt rubbing on idlers or printed parts.
- Re-check after the first 5 hours of printing.

## 2. Frame and Fastener Audit
- Re-torque frame and gantry fasteners after heat cycles.
- Inspect motor mount and idler hardware for loosening.

## 3. Input Shaper and Pressure Advance
- Re-run input shaping after mechanical changes.
- Tune pressure advance per filament family.

## 4. First Layer Baseline
- Keep one known-good first-layer profile for diagnostics.
- Validate bed mesh and Z offset before major jobs.

## 5. Thermal Stability
- Confirm chamber and nozzle temps are stable for 20+ minutes.
- Watch for fan-induced temp swings on long prints.

## 6. Maintenance Rhythm
- Clean rails and inspect carriage movement weekly.
- Replace worn nozzles proactively for consistent extrusion.

Use this checklist before troubleshooting advanced slicer settings. Most recurring print defects trace back to mechanics and thermal consistency.`;

    const updateData = {
      Title: "Voron Motion System Tuning Checklist",
      Slug: "voron-motion-system-tuning-checklist",
      Content: content,
      Categories: [guidesCategoryId || featuredCategoryId].filter(Boolean),
    };

    await updateCollection("blogs", targetPost, updateData);
  }

  const privacyContent = replaceLegalFields(privacy?.data?.PageContent || "", "privacy@3dbyte.tech");
  const termsContent = replaceLegalFields(terms?.data?.PageContent || "", "legal@3dbyte.tech");

  await Promise.all([
    api("/privacy-policy", {
      method: "PUT",
      body: JSON.stringify({ data: { PageContent: privacyContent } }),
    }),
    api("/terms-and-condition", {
      method: "PUT",
      body: JSON.stringify({ data: { PageContent: termsContent } }),
    }),
  ]);

  const verify = await Promise.all([
    api("/blog-post-categories?pagination%5Blimit%5D=100"),
    api("/blogs?pagination%5Blimit%5D=5&sort=updatedAt:desc"),
    api("/privacy-policy"),
    api("/terms-and-condition"),
  ]);

  const vCats = verify[0].data || [];
  const vBlog = verify[1].data?.[0];

  console.log(
    JSON.stringify(
      {
        categories: vCats.map((c) => ({ title: c.Title, slug: c.Slug })),
        topBlog: vBlog
          ? { title: vBlog.Title, slug: vBlog.Slug, excerpt: vBlog.Excerpt }
          : null,
        legalUpdated: {
          privacyHasTech: (verify[2]?.data?.PageContent || "").includes("@3dbyte.tech"),
          termsHasTech: (verify[3]?.data?.PageContent || "").includes("@3dbyte.tech"),
        },
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
