const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = '0fe54a2a66615700eca2265a6420ca9b7df81856eababd43c61b2fbac4608b3c48b3b7a771f79aade1c1e232bcf3191cf98981a9fa9c1295cd3873eeeb552191c4164a066bd4111c4d40de8ee1f29caf977d57d38b7bc08cf76d16e55519d635554ae04b0c632ac78d2765ccedfa3f2c999c68f924b731ff9c80a3791a441a47';

async function fixAllStrapiHandles() {
  let updated = 0;
  let page = 1;
  let hasMore = true;
  
  console.log('Fetching all product descriptions...');
  
  while (hasMore) {
    const response = await fetch(`${STRAPI_URL}/api/product-descriptions?pagination[page]=${page}&pagination[pageSize]=25`, {
      headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
    });
    
    const data = await response.json();
    const items = data.data || [];
    
    if (items.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const item of items) {
      const oldHandle = item.product_handle;
      if (!oldHandle || !oldHandle.startsWith('dremc-')) continue;
      
      const newHandle = oldHandle.replace('dremc-', '');
      const docId = item.documentId;
      
      const updateResponse = await fetch(`${STRAPI_URL}/api/product-descriptions/${docId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { product_handle: newHandle }
        })
      });
      
      const result = await updateResponse.json();
      
      if (result.data?.id) {
        updated++;
        console.log(`✅ ${updated}: ${oldHandle.substring(0, 35)}... → ${newHandle.substring(0, 30)}...`);
      } else {
        console.log(`❌ Failed: ${oldHandle}`);
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    page++;
    hasMore = page <= data.meta.pagination.pageCount;
  }
  
  console.log(`\n✅ Done! Updated ${updated} Strapi handles`);
}

fixAllStrapiHandles().catch(console.error);
