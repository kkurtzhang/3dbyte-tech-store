#!/usr/bin/env node

/**
 * Strapi Content Creator
 * 
 * Adds rich product descriptions and brand content to Strapi CMS.
 * Run from the project root:
 *   node scripts/create-strapi-content.js
 * 
 * Requires Strapi server running at http://192.168.0.45:1337
 */

const STRAPI_URL = "http://192.168.0.45:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb";

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${STRAPI_TOKEN}`,
};

// Brand content to add
const brandsToAdd = [
  {
    medusa_brand_id: "01KBEVJ0PNJZPXJP49Z3HWX3ZE", // Polymaker
    brand_name: "Polymaker",
    brand_handle: "polymaker",
    rich_description: `<h2>Premium 3D Printing Materials</h2>
<p>Polymaker is a leading manufacturer of high-quality 3D printing materials. Founded in 2014, we've built our reputation on consistent, reliable filaments that deliver professional results.</p>

<h3>Our Philosophy</h3>
<p>We believe everyone deserves access to premium 3D printing materials. That's why we engineer our filaments to print flawlessly on a wide range of printers, from budget-friendly machines to high-end professional systems.</p>

<h3>Quality You Can Trust</h3>
<ul>
<li>±0.02mm diameter tolerance - the tightest in the industry</li>
<li>Vacuum-sealed packaging with desiccant</li>
<li>Rigorous quality control testing</li>
<li>ISO 9001 certified manufacturing</li>
</ul>

<h3>Our Product Families</h3>
<p><strong>PolyLite™</strong> - Our flagship PLA line with exceptional surface finish and vibrant colors.</p>
<p><strong>PolyMax™</strong> - Impact-resistant materials that outperform ABS in toughness testing.</p>
<p><strong>PolyWood™</strong> - Natural wood composites with realistic grain and texture.</p>
<p><strong>High-Temp Series</strong> - Engineering-grade materials for demanding applications.</p>`,
    seo_title: "Polymaker 3D Printer Filament | Premium Quality Materials",
    seo_description: "Discover Polymaker's range of premium 3D printing filaments. PolyLite PLA, PolyMax PC, and specialty materials for professional results.",
    meta_keywords: ["polymaker", "3d filament", "pla", "3d printing materials", "premium filament"],
  }
];

// Additional products to create descriptions for (using known Meilisearch product IDs)
const productsToCreate = [
  {
    medusa_product_id: "prod_01KDA311Z4182EVK1TMTWHN1JS", // Shirt_17 (use as template)
    product_title: "Premium PLA Filament - 1.75mm",
    product_handle: "premium-pla-filament-175mm",
    rich_description: `<h2>Premium PLA Filament for Perfect Prints</h2>
<p>Our premium PLA filament is engineered for consistency and quality. Made from NatureWorks Ingeo™ PLA, this filament delivers smooth extrusion and beautiful layer adhesion.</p>

<h3>Key Features</h3>
<ul>
<li>±0.02mm diameter tolerance for consistent extrusion</li>
<li>Vacuum-sealed packaging with desiccant</li>
<li>Glossy finish with vibrant, saturated colors</li>
<li>No heated bed required - print straight away</li>
<li>Biodegradable and environmentally friendly</li>
</ul>

<h3>Print Settings</h3>
<table>
<tr><td>Nozzle Temperature</td><td>190-220°C</td></tr>
<tr><td>Bed Temperature</td><td>0-60°C</td></tr>
<tr><td>Print Speed</td><td>40-80mm/s</td></tr>
<tr><td>Cooling</td><td>100% recommended</td></tr>
</table>

<p>Perfect for prototypes, cosplay props, educational models, and decorative pieces.</p>`,
    features: [
      "Premium PLA formulation",
      "±0.02mm tolerance",
      "Vacuum sealed",
      "12+ vibrant colors",
      "1kg spool weight",
    ],
    specifications: {
      "Material": "PLA (Polylactic Acid)",
      "Diameter": "1.75mm",
      "Tolerance": "±0.02mm",
      "Spool Weight": "1kg",
      "Print Temp": "190-220°C",
      "Bed Temp": "0-60°C",
    },
    seo_title: "Premium PLA Filament | High-Quality 1.75mm 3D Printing Material",
    seo_description: "Shop premium PLA filament for 3D printing. Consistent diameter, vibrant colors, and excellent layer adhesion.",
    meta_keywords: ["pla filament", "3d printing filament", "premium pla", "1.75mm filament"],
  },
  {
    medusa_product_id: "prod_01KDA311Z33JWE711K9SDQBWYV", // Fish_4
    product_title: "PETG Professional Filament",
    product_handle: "petg-professional-filament",
    rich_description: `<h2>The Best of Both Worlds</h2>
<p>PETG combines the ease of printing of PLA with the strength and durability of ABS. This professional-grade filament is perfect for functional parts that need to withstand real-world conditions.</p>

<h3>Why Choose PETG?</h3>
<ul>
<li><strong>Strong & Durable</strong> - Higher impact resistance than PLA</li>
<li><strong>Moisture Resistant</strong> - Won't absorb water like nylon</li>
<li><strong>Food Safe</strong> - Safe for food-contact applications (when printed properly)</li>
<li><strong>UV Resistant</strong> - Won't degrade in sunlight</li>
<li><strong>Easy to Print</strong> - No enclosure required, minimal warping</li>
</ul>

<h3>Applications</h3>
<p>Outdoor fixtures, automotive parts, containers, protective cases, and functional prototypes.</p>`,
    features: [
      "Industrial-grade durability",
      "Moisture resistant",
      "UV stable",
      "Food safe compatible",
      "Low odor printing",
    ],
    specifications: {
      "Material": "PETG",
      "Diameter": "1.75mm",
      "Print Temp": "230-260°C",
      "Bed Temp": "70-90°C",
      "Tensile Strength": "50 MPa",
      "Layer Adhesion": "Excellent",
    },
    seo_title: "PETG Professional Filament | Durable 3D Printing Material",
    seo_description: "Shop PETG filament for strong, durable 3D prints. Moisture resistant and UV stable for outdoor applications.",
    meta_keywords: ["petg filament", "3d printing", "durable filament", "outdoor filament"],
  },
];

// Blog posts to create
const blogsToCreate = [
  {
    title: "Getting Started with 3D Printing: A Complete Guide",
    slug: "getting-started-3d-printing-guide",
    content: `<h2>Welcome to 3D Printing</h2>
<p>3D printing, also known as additive manufacturing, creates three-dimensional objects from digital models. Whether you're a maker, engineer, artist, or hobbyist, 3D printing opens up incredible possibilities.</p>

<h3>Types of 3D Printers</h3>
<p>The most common types for beginners are FDM (Fused Deposition Modeling) and SLA (Stereolithography). FDM printers extrude plastic filament layer by layer, while SLA printers use liquid resin cured by UV light.</p>

<h3>Essential Accessories</h3>
<ul>
<li><strong>Filament/Resin</strong> - Your printing material</li>
<li><strong>Glue stick</strong> - Helps adhesion on the build plate</li>
<li><strong>Scraper</strong> - For removing finished prints safely</li>
<li><strong>Resin wash station</strong> - For SLA printing</li>
<li><strong>Calipers</strong> - Measure your prints for precision</li>
</ul>`,
    excerpt: "Everything you need to know to start your 3D printing journey.",
    published: true,
  },
  {
    title: "Top 10 3D Printer Filaments Explained",
    slug: "3d-printer-filaments-guide",
    content: `<h2>Know Your Materials</h2>
<p>With so many filament options available, choosing the right material can be overwhelming. Here's your comprehensive guide to the most popular 3D printing materials.</p>

<h3>PLA - The Beginner Standard</h3>
<p>Polylactic Acid is the most common filament. It's easy to print, doesn't require a heated bed, and is biodegradable. Perfect for prototypes, toys, and decorative items.</p>

<h3>PETG - The All-Rounder</h3>
<p>PETG combines the ease of PLA with the strength of ABS. It's impact-resistant, moisture-resistant, and food-safe (with caveats). Great for functional parts and outdoor use.</p>

<h3>ABS - The Industrial Classic</h3>
<p>Acrylonitrile Butadiene Styrene is strong and heat-resistant but requires a heated chamber and good ventilation. Use for functional parts that need durability.</p>`,
    excerpt: "A comprehensive guide to PLA, PETG, ABS, TPU, and specialty filaments.",
    published: true,
  },
];

async function createEntry(endpoint, data) {
  try {
    const response = await fetch(`${STRAPI_URL}/api/${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to create ${endpoint}:`, error.substring(0, 200));
      return null;
    }
    
    const result = await response.json();
    console.log(`✅ Created ${endpoint}`);
    return result.data;
  } catch (error) {
    console.error(`❌ Error creating ${endpoint}:`, error.message);
    return null;
  }
}

async function createBrandContent() {
  console.log("\n📦 Creating brand content...");
  for (const brand of brandsToAdd) {
    // First check if it exists
    const checkRes = await fetch(
      `${STRAPI_URL}/api/brand-descriptions?filters[medusa_brand_id][$eq]=${brand.medusa_brand_id}`,
      { headers }
    );
    const checkData = await checkRes.json();
    
    if (checkData.data && checkData.data.length > 0) {
      console.log(`⏭️  Brand ${brand.brand_name} already exists`);
      continue;
    }
    
    await createEntry("brand-descriptions", brand);
  }
}

async function createProductContent() {
  console.log("\n📦 Creating product content...");
  for (const product of productsToCreate) {
    const { features, specifications, ...data } = product;
    await createEntry("product-descriptions", data);
  }
}

async function createBlogContent() {
  console.log("\n📦 Creating blog posts...");
  for (const post of blogsToCreate) {
    await createEntry("blogs", post);
  }
}

async function main() {
  console.log("🌱 Starting Strapi content creation...");
  console.log(`   URL: ${STRAPI_URL}`);
  
  try {
    await createBrandContent();
    await createProductContent();
    await createBlogContent();
    
    console.log("\n✨ Content creation complete!");
    console.log("\nNext steps:");
    console.log("1. Go to Strapi Admin → Content Manager");
    console.log("2. Review and publish any draft content");
    console.log("3. Run: curl -X POST http://localhost:9000/admin/meilisearch/sync-products");
  } catch (error) {
    console.error("\n💥 Failed:", error.message);
    process.exit(1);
  }
}

main();
