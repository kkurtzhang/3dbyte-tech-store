const fs = require('fs');

const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = '0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47';

// Load Medusa products
const medusaProducts = JSON.parse(fs.readFileSync('/tmp/medusa-products.json', 'utf8'));
console.log(`Loaded ${medusaProducts.length} products from Medusa`);

// Description templates
function generateDescription(title, vendor, type) {
  const templates = {
    'Nozzle': `<p>The ${title} by ${vendor} is a precision-engineered nozzle designed for consistent filament extrusion in 3D printing applications.</p><p>Manufactured to exacting tolerances, this nozzle ensures smooth material flow and reliable print quality. Compatible with a wide range of filament types including PLA, PETG, and ABS.</p><p>Easy to install and maintain, it's an essential spare part for maintaining optimal print performance.</p>`,
    'Hotend Assembly': `<p>The ${title} by ${vendor} delivers reliable high-temperature printing performance for demanding 3D printing applications.</p><p>Featuring quality construction, this hotend enables printing at elevated temperatures, perfect for various filament types. The precision design ensures consistent extrusion.</p><p>Designed for easy installation, this component enhances print quality and reliability.</p>`,
    'Hotend Kit': `<p>The ${title} by ${vendor} delivers reliable high-temperature printing performance for demanding 3D printing applications.</p><p>Featuring all-metal construction, this hotend kit enables printing at temperatures up to 300°C, perfect for engineering-grade filaments. Precision-machined components ensure consistent extrusion.</p><p>Complete kit includes everything needed for installation and upgrade.</p>`,
    'Mainboard': `<p>The ${title} by ${vendor} is a powerful control board designed to enhance your 3D printer's performance and capabilities.</p><p>Featuring advanced processing for faster computation and smoother motion control, this mainboard supports silent stepper drivers and modern connectivity options.</p><p>An excellent upgrade for improving print quality, reliability, and enabling advanced firmware features.</p>`,
    'Thermistor': `<p>The ${title} by ${vendor} is a precision temperature sensor essential for accurate hotend and bed temperature monitoring.</p><p>With high accuracy and fast response time, this thermistor ensures your printer maintains precise temperature control for optimal print quality.</p><p>A critical spare part to keep on hand for maintaining your 3D printer's performance.</p>`,
    'default': `<p>The ${title} by ${vendor} is a quality 3D printing component designed for reliable performance.</p><p>Built to exacting standards, this product offers excellent value and compatibility with popular 3D printer models.</p><p>An essential addition to your 3D printing toolkit or spare parts collection.</p>`
  };
  return templates[type] || templates['default'];
}

async function createDescription(product) {
  const description = generateDescription(
    product.title,
    product.title.split(' ')[0], // Extract vendor from title start
    'default'
  );
  
  const payload = {
    data: {
      medusa_product_id: product.id,
      product_handle: product.handle,
      product_title: product.title,
      rich_description: description,
      seo_title: `${product.title} | 3DByte Tech`,
      seo_description: `Shop ${product.title} at 3DByte Tech. Quality 3D printing parts and accessories.`,
      sync_status: 'synced'
    }
  };
  
  try {
    const response = await fetch(`${STRAPI_URL}/api/product-descriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.data?.id) {
      console.log(`✅ Created: ${product.title.substring(0, 40)}...`);
      return true;
    } else {
      console.log(`❌ Failed: ${product.title.substring(0, 40)}... - ${data.error?.message || 'unknown'}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Error: ${product.title.substring(0, 40)}... - ${err.message}`);
    return false;
  }
}

async function main() {
  let created = 0;
  
  for (const product of medusaProducts) {
    const success = await createDescription(product);
    if (success) created++;
    await new Promise(r => setTimeout(r, 200)); // Rate limit
  }
  
  console.log(`\nDone! Created: ${created}/${medusaProducts.length}`);
}

main().catch(console.error);
