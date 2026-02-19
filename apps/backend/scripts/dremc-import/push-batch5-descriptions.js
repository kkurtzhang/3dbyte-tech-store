const fs = require('fs');

const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = '0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47';

// Load all products from Medusa
const allProducts = JSON.parse(fs.readFileSync('/tmp/medusa-products.json', 'utf8'));

// Get batch 4 products (skip first 50)
const batch5Products = allProducts.slice(199);
console.log(`Pushing descriptions for ${batch5Products.length} batch 4 products...`);

function generateDescription(title) {
  return `<p>${title} is a quality 3D printing component designed for reliable performance.</p><p>Built to exacting standards, this product offers excellent value and compatibility with popular 3D printer models.</p><p>An essential addition to your 3D printing toolkit or spare parts collection.</p>`;
}

async function createDescription(product) {
  const description = generateDescription(product.title);
  
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
      console.log(`✅ ${product.title.substring(0, 40)}...`);
      return true;
    } else {
      console.log(`❌ ${product.title.substring(0, 40)}... - ${data.error?.message || 'unknown'}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${product.title.substring(0, 40)}... - ${err.message}`);
    return false;
  }
}

async function main() {
  let created = 0;
  
  for (const product of batch5Products) {
    const success = await createDescription(product);
    if (success) created++;
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log(`\nDone! Created ${created}/${batch5Products.length} descriptions`);
}

main().catch(console.error);
