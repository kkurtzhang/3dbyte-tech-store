#!/usr/bin/env node

/**
 * Update a single product description in Strapi
 */

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${STRAPI_TOKEN}`,
};

const PRODUCT_ID = "prod_01KBEWMQKP7E3Q6WQAY48RAFGW";

const richDescription = {
  data: {
    rich_description: `<h2>Engineered for High Performance</h2>
<p>Polymaker's High Temp HT-PLA is a specialty PLA formulation that can withstand temperatures up to 100°C after annealing. This makes it suitable for functional parts that need heat resistance without the complexity of printing ABS or PETG.</p>

<h3>Key Features</h3>
<ul>
<li><strong>Heat Resistant</strong> - Up to 100°C after annealing at 80-100°C for 1-2 hours</li>
<li><strong>Strong & Durable</strong> - Higher tensile strength than standard PLA</li>
<li><strong>Easy to Print</strong> - Print just like regular PLA, no enclosure needed</li>
<li><strong>Matte Finish</strong> - Premium matte surface with excellent layer adhesion</li>
<li><strong>Minimal Warping</strong> - Excellent bed adhesion without a heated bed</li>
</ul>

<h3>How to Anneal</h3>
<p>To achieve maximum heat resistance, anneal your prints:</p>
<ol>
<li>Preheat oven to 80-100°C (176-212°F)</li>
<li>Place prints on a baking sheet with holes for airflow</li>
<li>Heat for 1-2 hours</li>
<li>Turn off oven and allow to cool slowly inside</li>
</ol>

<h3>Print Settings</h3>
<table>
<tr><td>Nozzle Temperature</td><td>210-240°C</td></tr>
<tr><td>Bed Temperature</td><td>50-60°C</td></tr>
<tr><td>Print Speed</td><td>40-80mm/s</td></tr>
<tr><td>Cooling</td><td>50-100% recommended</td></tr>
<tr><td>Retraction</td><td>Standard settings</td></tr>
</table>

<h3>Applications</h3>
<ul>
<li>Functional prototypes and end-use parts</li>
<li>Automotive interior components</li>
<li>Hotend parts (after annealing)</li>
<li>Industrial jigs and fixtures</li>
<li>Outdoor applications exposed to sunlight</li>
</ul>

<p><strong>Note:</strong> Results may vary based on print orientation and annealing conditions. Always test before production use.</p>`,
    features: [
      "100°C heat resistance after annealing",
      "Stronger than standard PLA",
      "Easy to print like regular PLA",
      "Dimensional stability",
      "Matte premium finish",
      "No enclosure required",
    ],
    specifications: {
      "Material": "HT-PLA (High-Temperature PLA)",
      "Brand": "Polymaker",
      "Diameter": "1.75mm",
      "Tolerance": "±0.02mm",
      "Weight": "1kg spool",
      "Print Temp": "210-240°C",
      "Bed Temp": "50-60°C",
      "HDT (Annealed)": "100°C",
      "Tensile Strength": "50+ MPa",
      "Colors": "Black, Red, Grey, Teal, Ice",
    },
    seo_title: "Polymaker High Temp HT-PLA | Heat Resistant 3D Printing Filament",
    seo_description: "Shop Polymaker HT-PLA filament for functional 3D prints. Heat resistant up to 100°C after annealing. Perfect for end-use parts and outdoor applications.",
    meta_keywords: ["htpla", "polymaker", "high temperature pla", "heat resistant pla", "annealing pla", "functional 3d printing"],
    sync_status: "synced",
    last_synced: new Date().toISOString(),
  }
};

async function updateProductDescription() {
  console.log(`🔍 Finding product description for ${PRODUCT_ID}...`);
  
  try {
    // Find existing entry
    const findResponse = await fetch(
      `${STRAPI_URL}/api/product-descriptions?filters[medusa_product_id][$eq]=${PRODUCT_ID}`,
      { headers }
    );
    
    const findData = await findResponse.json();
    
    if (!findData.data || findData.data.length === 0) {
      console.log("❌ Product description not found in Strapi");
      return;
    }
    
    const documentId = findData.data[0].documentId;
    console.log(`✅ Found documentId: ${documentId}`);
    
    // Update the entry
    console.log("📝 Updating with rich content...");
    const updateResponse = await fetch(
      `${STRAPI_URL}/api/product-descriptions/${documentId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(richDescription),
      }
    );
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error("❌ Update failed:", error.substring(0, 200));
      return;
    }
    
    const result = await updateResponse.json();
    console.log("✅ Successfully updated product description!");
    console.log(`   Document ID: ${result.data.documentId}`);
    
    // Now publish it
    console.log("📢 Publishing entry...");
    const publishResponse = await fetch(
      `${STRAPI_URL}/api/product-descriptions/${documentId}/publish`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
    
    if (publishResponse.ok) {
      console.log("✅ Published successfully!");
    } else {
      console.log("⚠️  Publish may require manual action in Strapi admin");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

updateProductDescription();
