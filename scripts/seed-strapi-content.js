#!/usr/bin/env node

/**
 * Strapi Content Seeder
 * 
 * Seeds Strapi CMS with sample product descriptions, brand content, and blog posts.
 * Run from the project root:
 *   node scripts/seed-strapi-content.js
 * 
 * Requires:
 * - Strapi server running at STRAPI_URL (default: http://localhost:1337)
 * - Admin API token with write access
 */

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_TOKEN) {
  console.error("❌ STRAPI_API_TOKEN environment variable is required");
  console.error("   Get it from Strapi Admin → Settings → API Tokens");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${STRAPI_TOKEN}`,
};

// Sample Brand Content
const brandContent = {
  "prusa": {
    medusa_brand_id: "brand_prusa",
    brand_name: "Prusa Research",
    brand_handle: "prusa",
    rich_description: `<h2>About Prusa Research</h2><p>Prusa Research is a Czech 3D printer manufacturer founded by Josef Prusa in 2012. We develop and produce 3D printers in our headquarters in Prague, Czech Republic.</p><p>Our flagship <strong>Original Prusa MK4</strong> sets new standards in desktop 3D printing with its revolutionary features and unmatched reliability.</p><h3>Why Choose Prusa?</h3><ul><li>Open-source heritage with fully-serviceable printers</li><li>Multi-material printing capabilities</li><li>Exceptional print quality backed by years of R&D</li><li>Global shipping and local support worldwide</li></ul>`,
    seo_title: "Prusa 3D Printers | Official Prusa Research Distributor",
    seo_description: "Shop authentic Prusa 3D printers and accessories. Official reseller of Original Prusa MK4, MINI+, and more.",
    meta_keywords: ["prusa", "3d printer", "original prusa", "mk4", "filament 3d printer"],
  },
  "polymaker": {
    medusa_brand_id: "brand_polymaker",
    brand_name: "Polymaker",
    brand_handle: "polymaker",
    rich_description: `<h2>Premium 3D Printing Materials</h2><p>Polymaker is a leading manufacturer of high-quality 3D printing materials. Based in Shanghai with global distribution, we specialize in engineering-grade filaments.</p><p>Our products are renowned for consistent diameter tolerance, vibrant colors, and mechanical properties that meet demanding applications.</p><h3>Our Product Line</h3><ul><li><strong>PolyLite™</strong> - Premium PLA with excellent surface finish</li><li><strong>PolyMax™</strong> - Impact-resistant materials stronger than ABS</li><li><strong>PolyWood™</strong> - Wood composite with realistic grain</li><li><strong>High-Temp Series</strong> - Engineering materials for extreme conditions</li></ul>`,
    seo_title: "Polymaker 3D Printer Filament | Premium Quality Materials",
    seo_description: "Discover Polymaker's range of premium 3D printing filaments. PolyLite PLA, PolyMax PC, and specialty materials.",
    meta_keywords: ["polymaker", "filament", "pla", "3d printing materials", "premium filament"],
  },
  "creality": {
    medusa_brand_id: "brand_creality",
    brand_name: "Creality",
    brand_handle: "creality",
    rich_description: `<h2>3D Printing for Everyone</h2><p>Creality is a global leader in consumer and professional 3D printing solutions. Since 2014, we've helped millions of makers bring their ideas to life.</p><p>From the bestselling <strong>Ender-3</strong> series to professional <strong>K1</strong> systems, Creality offers打印机 for every budget and skill level.</p><h3>Popular Series</h3><ul><li><strong>Ender-3</strong> - Best-selling budget 3D printer</li><li><strong>CR-10</strong> - Large-format printing made accessible</li><li><strong>K1</strong> - High-speed professional performance</li><li><strong>HALOT</strong> - Advanced resin 3D printing</li></ul>`,
    seo_title: "Creality 3D Printers | Ender, K1 & More",
    seo_description: "Shop Creality 3D printers and accessories. Ender-3 series, K1 high-speed printers, and HALOT resin printers.",
    meta_keywords: ["creality", "3d printer", "ender 3", "k1 3d printer", "budget 3d printer"],
  },
};

// Sample Product Descriptions
const productContent = [
  {
    medusa_product_id: "prod_pla_filament",
    product_title: "PLA Premium Filament",
    product_handle: "pla-premium-filament",
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

<p>Perfect for prototypes, cosplay props, educational models, and decorative pieces. Compatible with all FDM 3D printers using 1.75mm filament.</p>`,
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
      "Filament Brand": "Polymaker",
    },
    seo_title: "Premium PLA Filament | High-Quality 1.75mm 3D Printing Material",
    seo_description: "Shop premium PLA filament for 3D printing. Consistent diameter, vibrant colors, and excellent layer adhesion.",
    meta_keywords: ["pla filament", "3d printing filament", "premium pla", "1.75mm filament"],
  },
  {
    medusa_product_id: "prod_voron_kit",
    product_title: "Voron 2.4 Kit - Complete Build",
    product_handle: "voron-2-4-kit",
    rich_description: `<h2>Build Your Own Voron V2.4</h2>
<p>The Voron 2.4 is a legendary open-source 3D printer design known for its speed, quality, and reliability. This kit includes everything you need to build a complete printer.</p>

<h3>What's Included</h3>
<ul>
<li>Complete aluminum extrusion frame</li>
<li>Motion system (motors, belts, pulleys)</li>
<li>Hotend assembly (Dragon HF or similar)</li>
<li>PCB electronics kit</li>
<li>All fasteners and hardware</li>
<li>HDPE build plate</li>
<li>Full step-by-step build guide</li>
</ul>

<h3>Specifications</h3>
<table>
<tr><td>Build Volume</td><td>250x250x250mm (2.4R2)</td></tr>
<tr><td>Motion System</td><td>CoreXY</td></tr>
<tr><td>Bed Type</td><td>Removable magnetic</td></tr>
<tr><td>Control</td><td>32-bit MCU</td></tr>
<tr><td>Max Speed</td><td>300+ mm/s</td></tr>
</table>

<h3>Why Build a Voron?</h3>
<p>Experience the thrill of building your own machine while learning every aspect of 3D printer mechanics. The result is a printer that outperforms most commercial options at a fraction of the cost.</p>

<p><strong>Note:</strong> 3D printing skills recommended. Plan 20-40 hours for assembly.</p>`,
    features: [
      "CoreXY motion system",
      "250mm³ build volume",
      "300+ mm/s print speed",
      "Afterburner toolhead",
      "Open-source design",
      "DIY build experience",
    ],
    specifications: {
      "Build Volume": "250x250x250mm",
      "Motion System": "CoreXY",
      "Bed": "Removable magnetic",
      "Electronics": "32-bit MCU",
      "Frame": " aluminum extrusion",
      "Assembly Time": "20-40 hours",
      "Difficulty": "Intermediate",
    },
    seo_title: "Voron 2.4 3D Printer Kit | Complete Build Bundle",
    seo_description: "Build your own Voron 2.4 CoreXY 3D printer. Complete kit with all parts for a fully functional machine.",
    meta_keywords: ["voron 2.4", "3d printer kit", "corexy 3d printer", "diy 3d printer", "open source 3d printer"],
  },
  {
    medusa_product_id: "prod_htpla",
    product_title: "High Temp HT-PLA",
    product_handle: "high-temp-htpla",
    rich_description: `<h2>Engineered for High Performance</h2>
<p>HT-PLA is a specialty PLA formulation that can withstand temperatures up to 100°C after annealing. This makes it suitable for functional parts that need heat resistance.</p>

<h3>Applications</h3>
<ul>
<li>Functional prototypes</li>
<li>End-use parts</li>
<li>Automotive components</li>
<li>Hotend parts (after annealing)</li>
<li>Industrial jigs and fixtures</li>
</ul>

<h3>How to Anneal</h3>
<p>Heat your oven to 80-100°C (176-212°F). Place the printed part on a baking sheet with holes. Heat for 1-2 hours. Allow to cool slowly in the oven.</p>

<p>After annealing, your HT-PLA prints will have improved heat deflection temperature while maintaining their dimensional accuracy and strength.</p>`,
    features: [
      "100°C heat resistance after annealing",
      "Stronger than standard PLA",
      "Easy to print like regular PLA",
      "Dimensional stability",
      "Matte premium finish",
    ],
    specifications: {
      "Material": "HT-PLA (High-Temperature PLA)",
      "Diameter": "1.75mm",
      "Print Temp": "210-240°C",
      "Bed Temp": "50-60°C",
      "HDT (Annealed)": "100°C",
      "Tensile Strength": "50+ MPa",
      "Spool Weight": "1kg",
    },
    seo_title: "High Temp HT-PLA Filament | Heat Resistant 3D Printing",
    seo_description: "Shop HT-PLA for functional 3D prints. Heat resistant up to 100°C after annealing. Perfect for end-use parts.",
    meta_keywords: ["htpla", "high temperature pla", "heat resistant pla", "annealing pla", "functional 3d printing"],
  },
  {
    medusa_product_id: "prod_resin_standard",
    product_title: "Standard UV Resin",
    product_handle: "standard-uv-resin",
    rich_description: `<h2>Versatile LCD/LED Resin</h2>
<p>Our standard UV resin is formulated for compatibility with all LCD and LED-based 3D printers. It offers a balance of detail resolution, strength, and ease of use.</p>

<h3>Properties</h3>
<ul>
<li>Low odor formula for comfortable printing</li>
<li>Fast curing times (2-4 seconds per layer)</li>
<li>High detail resolution for miniature work</li>
<li>Good mechanical properties</li>
<li>Easy post-processing with IPA</li>
</ul>

<h3>Safety Information</h3>
<p>⚠️ Always wear nitrile gloves when handling uncured resin. Work in a well-ventilated area. Use UV safety glasses. Keep away from children and pets.</p>

<p>Proper curing and washing are essential for optimal part properties. Wash in isopropyl alcohol for 2-5 minutes, then post-cure under UV light for 5-10 minutes.</p>`,
    features: [
      "Low odor formulation",
      "2-4 second layer cure time",
      "High detail capability",
      "Easy post-processing",
      "Compatible with all LCD/LED printers",
    ],
    specifications: {
      "Type": "Standard UV Photopolymer",
      "Wavelength": "405nm",
      "Layer Height": "0.01-0.1mm",
      "Cure Time": "2-4s per layer",
      "Wash Time": "2-5 min IPA",
      "Post-Cure": "5-10 min UV",
      "Volume": "500ml / 1L",
      "Shore Hardness": "80-85D",
    },
    seo_title: "Standard UV Resin for LCD 3D Printers",
    seo_description: "Shop quality UV resin for LCD/LED 3D printers. Low odor, fast curing, high detail. Available in multiple colors.",
    meta_keywords: ["uv resin", "3d printer resin", "lcd resin", "standard resin", "photopolymer resin"],
  },
];

// Blog Posts
const blogContent = [
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
    publishedAt: new Date().toISOString(),
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
    publishedAt: new Date().toISOString(),
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

async function seedBrands() {
  console.log("\n📦 Seeding brand content...");
  for (const [key, brand] of Object.entries(brandContent)) {
    await createEntry("brand-descriptions", brand);
  }
}

async function seedProducts() {
  console.log("\n📦 Seeding product content...");
  for (const product of productContent) {
    const { features, specifications, ...data } = product;
    await createEntry("product-descriptions", data);
  }
}

async function seedBlog() {
  console.log("\n📦 Seeding blog posts...");
  for (const post of blogContent) {
    await createEntry("blogs", {
      ...post,
      published: true,
    });
  }
}

async function main() {
  console.log("🌱 Starting Strapi content seeder...");
  console.log(`   URL: ${STRAPI_URL}`);
  
  try {
    await seedBrands();
    await seedProducts();
    await seedBlog();
    
    console.log("\n✨ Seeding complete!");
    console.log("\nNext steps:");
    console.log("1. Go to Strapi Admin → Content Manager");
    console.log("2. Review and publish the seeded content");
    console.log("3. Run Meilisearch sync to index the new content");
  } catch (error) {
    console.error("\n💥 Seeding failed:", error.message);
    process.exit(1);
  }
}

main();
