#!/usr/bin/env node

/**
 * Get products from Meilisearch and add rich content to Strapi
 */

const STRAPI_URL = "http://192.168.0.45:1337";
const STRAPI_TOKEN = "c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb";
const MEILISEARCH_URL = "http://192.168.0.45:7700";
const MEILISEARCH_TOKEN = "IZKjKX6kXKnH0d4VgL0LrBgSccbImu4PkvDOvL81dww";

// Content templates for different product types
const contentTemplates = {
  "shirt": {
    title: "Classic Cotton T-Shirt",
    description: `<h2>Everyday Essential</h2>
<p>Comfortable 100% cotton t-shirt perfect for casual wear. Soft breathable fabric that feels great all day long.</p>
<h3>Why You'll Love It</h3>
<ul>
<li>Premium cotton blend for maximum comfort</li>
<li>Reinforced seams for durability</li>
<li>Pre-shrunk fabric that won't shrink in the wash</li>
<li>Classic fit that looks good on everyone</li>
</ul>`,
    features: ["100% cotton", "Reinforced seams", "Pre-shrunk"],
    specs: { "Material": "100% Cotton", "Weight": "180g/m²", "Fit": "Classic" },
  },
  "towel": {
    title: "Premium Microfiber Towel",
    description: `<h2>Ultra-Absorbent</h2>
<p>Our premium microfiber towel absorbs 7x more water than regular cotton towels. Quick-drying and lint-free for a superior experience.</p>
<h3>Features</h3>
<ul>
<li>7x absorption capacity</li>
<li>Fast-drying fibers</li>
<li>Lint-free material</li>
<li>Durable construction</li>
<li>Machine washable</li>
</ul>`,
    features: ["7x absorption", "Lint-free", "Quick-dry"],
    specs: { "Material": "Microfiber", "Size": "70x140cm", "Weight": "350g" },
  },
  "chair": {
    title: "Ergonomic Office Chair",
    description: `<h2>Work in Comfort</h2>
<p>Designed for long work sessions, this ergonomic chair provides excellent lumbar support and promotes healthy posture.</p>
<h3>Ergonomic Features</h3>
<ul>
<li>Adjustable lumbar support</li>
<li>3D armrest for different tasks</li>
<li>Seat height adjustment</li>
<li>360° swivel mechanism</li>
<li>Breathable mesh back</li>
</ul>`,
    features: ["Lumbar support", "3D armrest", "360° swivel", "Mesh back"],
    specs: { "Height Range": "45-55cm", "Seat": "Fabric/Leather", "Weight": "18kg" },
  },
  "fish": {
    title: "Aquarium Decoration Ornament",
    description: `<h2>Artificial Fish Decoration</h2>
<p>Beautiful hand-crafted resin fish decoration perfect for aquarium enthusiasts. Safe for freshwater and saltwater tanks.</p>
<h3>Features</h3>
<ul>
<li>Hand-painted details</li>
<li>Safe resin material</li>
<li>UV resistant coloring</li>
<li>Won't affect water chemistry</li>
</ul>`,
    features: ["Hand-painted", "Safe resin", "UV resistant"],
    specs: { "Material": "Resin", "Size": "15cm", "Suitable": "Freshwater & Saltwater" },
  },
  "mouse": {
    title: "Wireless Optical Mouse",
    description: `<h2>Precision Control</h2>
<p>High-precision wireless mouse with optical tracking. Perfect for work, gaming, or casual browsing.</p>
<h3>Technical Specs</h3>
<ul>
<li>16000 DPI optical sensor</li>
<li>2.4GHz wireless connection</li>
<li>Programmable buttons</li>
<li>Rechargeable battery</li>
<li>Ergonomic design</li>
</ul>`,
    features: ["16000 DPI", "Wireless", "Rechargeable", "Programmable"],
    specs: { "DPI": "16000", "Connection": "2.4GHz", "Battery": "Rechargeable Li-ion" },
  },
  "computer": {
    title: "Business Laptop Computer",
    description: `<h2>Professional Performance</h2>
<p>High-performance business laptop with powerful processor and ample RAM. Perfect for productivity applications and multitasking.</p>
<h3>Key Features</h3>
<ul>
<li>Intel Core i7 processor</li>
<li>32GB RAM</li>
<li>512GB SSD storage</li>
<li>15.6" Full HD display</li>
<li>Windows 11 Professional</li>
</ul>`,
    features: ["i7 Processor", "32GB RAM", "512GB SSD", "15.6\" FHD"],
    specs: { "CPU": "Intel Core i7", "RAM": "32GB", "Storage": "512GB SSD", "OS": "Windows 11 Pro" },
  },
  "car": {
    title: "Die-Cast Model Car",
    description: `<h2>Collectible Toy</h2>
<p>Highly detailed 1:18 scale die-cast model car. Perfect for collectors and enthusiasts alike.</p>
<h3>What's Included</h3>
<ul>
<li>1:18 scale model with opening doors</li>
<li>Rubber tires</li>
<li>Premium paint finish</li>
<li>Collector's display stand</li>
</ul>`,
    features: ["1:18 scale", "Die-cast", "Collector edition"],
    specs: { "Scale": "1:18", "Material": "Die-cast metal", "Tires": "Rubber" },
  },
  "salad": {
    title: "Fresh Garden Salad Mix",
    description: `<h2>Ready to Serve</h2>
<p>Our signature salad mix includes a variety of fresh, crisp vegetables. Perfect for a quick healthy meal.</p>
<h3>Ingredients</h3>
<ul>
<li>Fresh lettuce mix</li>
<li>Ripe cherry tomatoes</li>
<li>Crisp cucumber slices</li>
<li>Red onion wedges</li>
<li>House-made balsamic dressing on the side</li>
</ul>`,
    features: ["Fresh ingredients", "Ready to serve", "Chef's balsamic"],
    specs: { "Serves": "2-4", "Ingredients": "Lettuce, Tomato, Cucumber, Red Onion" },
  },
  "hat": {
    title: "Classic Baseball Cap",
    description: `<h2>Timeless Style</h2>
<p>Classic wool-blend baseball cap with embroidered logo. Adjustable snap closure for a perfect fit.</p>
<h3>Features</h3>
<ul>
<li>Premium wool blend fabric</li>
<li>Adjustable snap back</li>
<li>Embroidered logo</li>
<li>Sweatband inside</li>
<li>Vintage-inspired design</li>
</ul>`,
    features: ["Wool blend", "Snap closure", "Embroidered logo"],
    specs: { "Material": "Wool blend", "Closure": "Snap", "Size": "One Size Fits Most" },
  },
  "ball": {
    title: "Official Baseball Ball",
    description: `<h2>Game-Ready</h2>
<p>Official league baseball ball. Cork and rubber construction with official league specifications.</p>
<h3>Specifications</h3>
<ul>
<li>Official league specifications</li>
<li>Cork and rubber core</li>
<li>Standard circumference</li>
<li>Premium leather cover</li>
</ul>`,
    features: ["League official", "Cork & rubber", "Premium leather"],
    specs: { "Type": "League Official", "Core": "Cork & rubber", "Circumference": "Standard" },
  },
  "pizza": {
    title: "Italian Style Pizza",
    description: `<h2>Authentic Taste</h2>
<p>Traditional Italian pizza with thin, crispy crust. Made with San Marzano tomatoes and imported olive oil.</p>
<h3>What Makes It Special</h3>
<ul>
<li>San Marzano tomatoes DOP certified</li>
<li>Imported Italian olive oil</li>
<li>Fresh mozzarella di bufala</li>
<li>Wood-fired oven baking</li>
</ul>`,
    features: ["San Marzano tomatoes", "Italian olive oil", "Wood-fired", "DOP certified"],
    specs: { "Style": "Italian Neapolitan", "Oven": "Wood-fired", "Serves": "4-8" },
  },
  "chips": {
    title: "Gourmet Potato Chips",
    description: `<h2>Crispy & Flavorful</h2>
<p>Artisan potato chips cooked in small batches. Seasoned with premium spices for exceptional taste.</p>
<h3>Why These Chips?</h3>
<ul>
<li>Hand-cooked in small batches</li>
<li>Premium spice blend</li>
<li>Crispy texture every time</li>
<li>No artificial preservatives</li>
<li>Perfectly salted</li>
</ul>`,
    features: ["Hand-cooked", "Premium spices", "No preservatives", "Small batches"],
    specs: { "Cooking": "Hand-cooked", "Texture": "Extra crispy", "Ingredients": "Potatoes, Sunflower oil, Premium spices" },
  },
  "tuna": {
    title: "Premium Canned Tuna",
    description: `<h2>Wild-Caught</h2>
<p>Premium wild-caught tuna canned in pure olive oil. Rich in flavor and sustainable source.</p>
<h3>Fishing Methods</h3>
<ul>
<li>Pole-and-line fishing</li>
<li>Sustainable practices</li>
<li>Dolphin-safe methods</li>
<li>Quick processing after catch</li>
</ul>`,
    features: ["Wild-caught", "Dolphin-safe", "Sustainable", "Pure olive oil"],
    specs: { "Method": "Wild-caught", "Sustainable": "Yes", "Type": "Skipjack", "Liquid": "Pure olive oil" },
  },
  "shoes": {
    title: "Running Sneakers",
    description: `<h2>Ready to Run</h2>
<p>Lightweight running sneakers with cushioned insole and breathable mesh upper. Perfect for daily jogs and casual walks.</p>
<h3>Comfort Features</h3>
<ul>
<li>Cushioned EVA insole</li>
<li>Breathable mesh upper</li>
<li>Shock-absorbing midsole</li>
<li>Non-marking rubber outsole</li>
<li>Padded collar and tongue</li>
</ul>`,
    features: ["Cushioned insole", "Breathable mesh", "Shock absorbing"],
    specs: { "Upper": "Breathable mesh", "Sole": "Non-marking rubber", "Weight": "280g per shoe" },
  },
  "table": {
    title: "Dining Table Set",
    description: `<h2>Modern Design</h2>
<p>Sleek dining table set that seats 6 comfortably. Folds for easy storage when not in use.</p>
<h3>What's Included</h3>
<ul>
<li>6 dining chairs</li>
<li>Large glass tabletop</li>
<li>1 serving cart</li>
<li>Assembly hardware included</li>
</ul>`,
    features: ["Folds for storage", "Glass tabletop", "6 chairs included", "Assembly hardware"],
    specs: { "Capacity": "6 people", "Tabletop": "Tempered glass", "Chairs": "6 dining chairs" },
  },
  "gloves": {
    title: "Winter Gloves",
    description: `<h2>Warm & Waterproof</h2>
<p>Insulated winter gloves perfect for outdoor activities. Waterproof membrane and thermal lining keep hands warm in cold weather.</p>
<h3>Weather Rating</h3>
<ul>
<li>Waterproof breathable membrane</li>
<li>Thermal fleece lining</li>
<li>Wind-resistant outer shell</li>
<li>Grip-enhanced palms</li>
<li>Elasticated wrists</li>
</ul>`,
    features: ["Waterproof", "Thermal", "Wind-resistant", "Grip-enhanced"],
    specs: { "Waterproof": "Yes", "Temperature": "-20°C to 5°C", "Membrane": "Breathable" },
  },
};

async function fetchProducts() {
  console.log("🔍 Fetching products from Meilisearch...");
  
  // First, POST a search with filter
  const filterResponse = await fetch(`${MEILISEARCH_URL}/indexes/products/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MEILISEARCH_TOKEN}`,
    },
    body: JSON.stringify({
      limit: 50,
      filter: 'handle IN ["shirt-17", "shirt-2", "shirt-32", "fish-4", "towels-1", "towels-1", "chair-5", "salad-0", "salad-3", "mouse-12", "computer-13", "computer-15", "computer-34", "car-25", "car-33", "hat-22", "hat-26", "ball-7", "ball-37", "pizza-36", "chips-40", "tuna-31", "shoes-29", "table-21", "gloves-35"]',
    }),
  });

  if (!filterResponse.ok) {
    const error = await filterResponse.text();
    throw new Error(`Failed to post filter: ${error}`);
  }

  const filterData = await filterResponse.json();
  console.log(`   Task UID: ${filterData.taskUid}`);
  
  // Wait for the task to complete (polling)
  const taskUid = filterData.taskUid;
  const maxWaitTime = 30000; // 30 seconds max
  const startTime = Date.now();
  
  let completed = false;
  while (!completed && Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms
    
    const taskResponse = await fetch(`${MEILISEARCH_URL}/tasks/${taskUid}`, {
      headers: {
        "Authorization": `Bearer ${MEILISEARCH_TOKEN}`,
      },
    });
    
    if (!taskResponse.ok) {
      continue;
    }
    
    const task = await taskResponse.json();
    if (task.status === 'succeeded' || task.status === 'failed') {
      completed = true;
    }
  }
  
  // Now fetch the products
  const response = await fetch(`${MEILISEARCH_URL}/indexes/products/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MEILISEARCH_TOKEN}`,
    },
    body: JSON.stringify({
      limit: 50,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch: ${error}`);
  }

  const data = await response.json();
  console.log(`   Found ${data.hits.length} products\n`);
  return data.hits;
}

async function getProductByHandle(handle) {
  const products = await fetchProducts();
  return products.find(p => p.handle === handle);
}

async function updateStrapiProduct(medusaProductId, content) {
  const { title, description, features, specs } = content;
  const featuresArray = Array.isArray(features) ? features : features ? [features] : [];
  const specsObj = typeof specs === 'string' ? JSON.parse(specs) : specs || {};

  const updateData = {
    data: {
      rich_description: description,
      features: featuresArray,
      specifications: specsObj,
    }
  };

  const response = await fetch(`${STRAPI_URL}/api/product-descriptions/${medusaProductId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${STRAPI_TOKEN}`,
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Failed to update ${medusaProductId}:`, error.substring(0, 200));
    return false;
  }

  console.log(`✅ Updated ${title} (${handle})`);
  return true;
}

async function main() {
  console.log("🎨 Populating products with rich content...");

  try {
    const products = await fetchProducts();
    console.log(`   Found ${products.length} products\n`);

    let updated = 0;
    let skipped = 0;

    for (const product of products) {
      const handle = product.handle;
      const productId = product.id;
      
      // Determine content type based on handle
      let contentType = null;
      if (handle.includes('shirt')) contentType = 'shirt';
      else if (handle.includes('towel')) contentType = 'towel';
      else if (handle.includes('salad')) contentType = 'salad';
      else if (handle.includes('chair')) contentType = 'chair';
      else if (handle.includes('fish')) contentType = 'fish';
      else if (handle.includes('mouse')) contentType = 'mouse';
      else if (handle.includes('computer')) contentType = 'computer';
      else if (handle.includes('car')) contentType = 'car';
      else if (handle.includes('hat')) contentType = 'hat';
      else if (handle.includes('ball')) contentType = 'ball';
      else if (handle.includes('pizza')) contentType = 'pizza';
      else if (handle.includes('chips')) contentType = 'chips';
      else if (handle.includes('tuna')) contentType = 'tuna';
      else if (handle.includes('shoes')) contentType = 'shoes';
      else if (handle.includes('table')) contentType = 'table';
      else if (handle.includes('gloves')) contentType = 'gloves';

      if (!contentType) {
        console.log(`⏭️  Skipping ${handle} (no content template)`);
        skipped++;
        continue;
      }

      const content = contentTemplates[contentType];
      const success = await updateStrapiProduct(productId, content);
      if (success) updated++;
    }

    console.log(`\n✨ Complete!`);
    console.log(`   Updated: ${updated} products`);
    console.log(`   Skipped: ${skipped} products`);
    console.log("\nNext steps:");
    console.log("1. Run: curl -X POST http://localhost:9000/admin/meilisearch/sync-products");
    console.log("2. Refresh frontend to see updated content");
  } catch (error) {
    console.error("💥 Failed:", error.message);
    process.exit(1);
  }
}

main();
