// Sync Strapi v5 with Medusa - Remove orphaned product-descriptions
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = 'c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb';

// Fetch all Strapi entries
async function fetchAllStrapi() {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${STRAPI_URL}/api/product-descriptions?pagination%5Bpage%5D=${page}&pagination%5BpageSize%5D=100`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
    });
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    all.push(...data.data);
    console.log(`Fetched page ${page}: ${data.data.length} entries (total: ${all.length})`);
    if (data.data.length < 100) break;
    page++;
  }
  return all;
}

// Delete from Strapi
async function deleteStrapi(id) {
  const url = `${STRAPI_URL}/api/product-descriptions/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.ok;
}

// Test data patterns (handle format)
const testPatterns = [
  /^shirt-\d+$/i, /^fish-\d+$/i, /^towels?-?\d*$/i, /^salad-\d+$/i,
  /^chair-\d+$/i, /^mouse-\d+$/i, /^computer-\d+$/i, /^chips-\d+$/i,
  /^ball-\d+$/i, /^car-\d+$/i, /^hat-\d+$/i, /^gloves-\d+$/i,
  /^shoes-\d+$/i, /^bag-\d+$/i, /^watch-\d+$/i, /^phone-\d+$/i,
];

function isTestData(entry) {
  // Strapi v5: attributes at top level
  const handle = entry.product_handle || '';
  const title = entry.product_title || '';
  const seoTitle = entry.seo_title || '';
  
  // Empty handle/title is suspicious
  if (!handle && !title) return true;
  
  const h = handle.toLowerCase();
  const t = title.toLowerCase();
  const s = seoTitle.toLowerCase();
  
  // Check patterns
  for (const pattern of testPatterns) {
    if (pattern.test(h)) return true;
  }
  
  // Check for generic test names with underscore format (e.g., "Shirt_17")
  const underscoreTest = /^(Shirt|Fish|Towel|Salad|Chair|Mouse|Computer|Chips|Ball|Car|Hat|Gloves|Shoes|Bag|Watch|Phone)_\d+$/i;
  if (underscoreTest.test(t) || underscoreTest.test(s)) return true;
  
  // Check for date pattern in creation (test data was created on 2025-12-25)
  const createdDate = entry.createdAt || '';
  if (createdDate.startsWith('2025-12-25')) return true;
  
  return false;
}

async function main() {
  console.log('=== Strapi v5 <-> Medusa Sync ===\n');
  
  // 1. Fetch all Strapi entries
  console.log('1. Fetching all product-descriptions from Strapi...');
  const strapiEntries = await fetchAllStrapi();
  console.log(`   Total: ${strapiEntries.length} entries\n`);
  
  // 2. Categorize entries
  const testEntries = [];
  const legitEntries = [];
  
  for (const entry of strapiEntries) {
    if (isTestData(entry)) {
      testEntries.push(entry);
    } else {
      legitEntries.push(entry);
    }
  }
  
  console.log('2. Categorization:');
  console.log(`   Test data (to delete): ${testEntries.length}`);
  console.log(`   Legitimate data (keep): ${legitEntries.length}\n`);
  
  // Show sample test entries
  if (testEntries.length > 0) {
    console.log('3. Test entries to delete (sample):');
    testEntries.slice(0, 15).forEach(e => {
      console.log(`   - ID ${e.id}: "${e.product_title}" (${e.product_handle})`);
    });
    if (testEntries.length > 15) {
      console.log(`   ... and ${testEntries.length - 15} more\n`);
    }
  }
  
  // Show sample legit entries
  if (legitEntries.length > 0) {
    console.log('\n4. Legitimate entries (sample):');
    legitEntries.slice(0, 5).forEach(e => {
      console.log(`   - ID ${e.id}: "${e.product_title?.substring(0, 40)}..." (${e.product_handle?.substring(0, 30)}...)`);
    });
  }
  
  // Delete test entries
  const deleteFlag = process.argv.includes('--delete');
  
  if (testEntries.length > 0) {
    if (deleteFlag) {
      console.log(`\n5. Deleting ${testEntries.length} test entries...`);
      let deleted = 0;
      let failed = 0;
      
      for (const entry of testEntries) {
        const ok = await deleteStrapi(entry.id);
        if (ok) {
          deleted++;
          process.stdout.write(`\r   Deleted: ${deleted}/${testEntries.length}`);
        } else {
          failed++;
          console.log(`\n   Failed to delete ID ${entry.id}`);
        }
        await new Promise(r => setTimeout(r, 100)); // Rate limit
      }
      
      console.log(`\n\n✅ Complete: ${deleted} deleted, ${failed} failed`);
      console.log(`   Remaining product-descriptions: ${legitEntries.length}`);
    } else {
      console.log('\n⚠️  Run with --delete flag to remove test entries');
      console.log('   Command: node sync-strapi-medusa.js --delete');
    }
  } else {
    console.log('\n✅ No test data found - Strapi is clean!');
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Strapi entries before: ${strapiEntries.length}`);
  console.log(`Test data to remove: ${testEntries.length}`);
  console.log(`Legitimate entries: ${legitEntries.length}`);
}

main().catch(console.error);
