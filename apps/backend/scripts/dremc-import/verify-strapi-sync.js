// Verify Strapi product-descriptions sync with Medusa products
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = '0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47';

async function fetchAllStrapiDescriptions() {
  console.log('Fetching all product-descriptions from Strapi...\n');
  const allDescriptions = [];
  let page = 1;
  const pageSize = 100;
  
  while (true) {
    try {
      const url = `${STRAPI_URL}/api/product-descriptions?pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
      });
      
      if (!res.ok) {
        console.log(`Strapi error: ${res.status} ${res.statusText}`);
        return null;
      }
      
      const data = await res.json();
      if (!data.data || data.data.length === 0) break;
      
      allDescriptions.push(...data.data);
      console.log(`  Page ${page}: ${data.data.length} entries (total: ${allDescriptions.length})`);
      
      if (data.data.length < pageSize) break;
      page++;
    } catch (err) {
      console.log(`Error fetching Strapi: ${err.message}`);
      return null;
    }
  }
  
  return allDescriptions;
}

async function main() {
  console.log('=== STRAPI-MEDUSA SYNC VERIFICATION ===\n');
  
  // 1. Fetch Strapi descriptions
  const strapiDescriptions = await fetchAllStrapiDescriptions();
  
  if (strapiDescriptions === null) {
    console.log('\n❌ Cannot reach Strapi at', STRAPI_URL);
    console.log('Make sure you have network access to 192.168.0.45:1337');
    process.exit(1);
  }
  
  console.log(`\nTotal Strapi product-descriptions: ${strapiDescriptions.length}`);
  
  // 2. Analyze Strapi data
  const withMedusaId = strapiDescriptions.filter(d => d.attributes?.medusa_product_id);
  const withProductHandle = strapiDescriptions.filter(d => d.attributes?.product_handle || d.attributes?.productHandle);
  const withRichDescription = strapiDescriptions.filter(d => d.attributes?.rich_description);
  
  console.log('\n--- Strapi Description Analysis ---');
  console.log(`With medusa_product_id: ${withMedusaId.length}`);
  console.log(`With product_handle: ${withProductHandle.length}`);
  console.log(`With rich_description: ${withRichDescription.length}`);
  
  // 3. Sample entries - show ALL attributes
  if (strapiDescriptions.length > 0) {
    console.log('\n--- Sample Entries (first 5) - ALL ATTRIBUTES ---');
    strapiDescriptions.slice(0, 5).forEach((d, i) => {
      console.log(`\n[${i + 1}] Document ID: ${d.documentId || d.id}`);
      console.log(`    Attributes:`, JSON.stringify(d.attributes, null, 2));
    });
  }
  
  // 4. Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Strapi descriptions: ${strapiDescriptions.length}`);
  console.log(`Expected (Medusa products): ~1,044`);
  
  if (strapiDescriptions.length === 0) {
    console.log('\n⚠️  No product descriptions in Strapi!');
    console.log('Action needed: Generate and push descriptions for all products');
  } else if (strapiDescriptions.length < 1000) {
    console.log(`\n⚠️  Only ${strapiDescriptions.length} descriptions found`);
    console.log(`Missing: ~${1044 - strapiDescriptions.length} descriptions`);
  } else {
    console.log('\n✅ Count looks good. Need to verify medusa_product_id matches...');
  }
  
  // 5. Get Medusa products for comparison
  console.log('\n\n=== CHECKING MEDUSA PRODUCTS ===\n');
  try {
    const medusaRes = await fetch('http://localhost:9000/store/products?limit=1');
    const medusaData = await medusaRes.json();
    const medusaCount = medusaData.count || medusaData.meta?.total || 'unknown';
    console.log(`Medusa total products: ${medusaCount}`);
    
    // Fetch all Medusa product handles
    console.log('\nFetching all Medusa product handles...');
    const allMedusaProducts = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const res = await fetch(`http://localhost:9000/store/products?limit=${limit}&offset=${offset}`);
      const data = await res.json();
      const products = data.products || data.data || [];
      if (products.length === 0) break;
      allMedusaProducts.push(...products);
      offset += limit;
      if (products.length < limit) break;
    }
    
    console.log(`Fetched ${allMedusaProducts.length} Medusa products`);
    
    // Compare handles
    const medusaHandles = new Set(allMedusaProducts.map(p => p.handle));
    const strapiHandles = new Set(
      strapiDescriptions
        .map(d => d.attributes?.product_handle || d.attributes?.productHandle)
        .filter(h => h)
    );
    
    console.log(`\nMedusa unique handles: ${medusaHandles.size}`);
    console.log(`Strapi handles with value: ${strapiHandles.size}`);
    
    // Find mismatched
    let matched = 0;
    let unmatched = 0;
    
    strapiDescriptions.forEach(d => {
      const handle = d.attributes?.product_handle || d.attributes?.productHandle;
      if (handle && medusaHandles.has(handle)) {
        matched++;
      } else if (handle) {
        unmatched++;
      }
    });
    
    console.log(`\nStrapi handles matching Medusa: ${matched}`);
    console.log(`Strapi handles NOT matching: ${unmatched}`);
    
  } catch (err) {
    console.log(`Could not fetch Medusa products: ${err.message}`);
    console.log('Make sure Medusa backend is running on port 9000');
  }
  
  return strapiDescriptions;
}

main().catch(console.error);
