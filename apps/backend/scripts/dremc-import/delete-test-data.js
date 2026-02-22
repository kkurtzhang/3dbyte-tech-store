// Delete test data from Strapi v5
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = 'c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb';

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
    console.log(`Page ${page}: ${data.data.length} entries`);
    if (data.data.length < 100) break;
    page++;
  }
  return all;
}

async function deleteEntry(id) {
  const url = `${STRAPI_URL}/api/product-descriptions/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.status === 204 || res.status === 200;
}

// Test data patterns
const testPatterns = [
  /^shirt-\d+$/i, /^fish-\d+$/i, /^towels?-?\d*$/i, /^salad-\d+$/i,
  /^chair-\d+$/i, /^mouse-\d+$/i, /^computer-\d+$/i, /^chips-\d+$/i,
  /^ball-\d+$/i, /^car-\d+$/i, /^hat-\d+$/i, /^gloves-\d+$/i,
];

function isTestData(entry) {
  const handle = (entry.product_handle || '').toLowerCase();
  const title = (entry.product_title || '').toLowerCase();
  
  for (const pattern of testPatterns) {
    if (pattern.test(handle)) return true;
  }
  
  // Check underscore format (Shirt_17)
  if (/^(shirt|fish|towel|salad|chair|mouse|computer|chips|ball|car|hat|gloves)_\d+$/i.test(title)) {
    return true;
  }
  
  // Created on Dec 25, 2025 = test data
  if (entry.createdAt?.startsWith('2025-12-25')) return true;
  
  return false;
}

async function main() {
  const deleteFlag = process.argv.includes('--delete');
  
  console.log('=== Strapi v5 Test Data Cleanup ===\n');
  console.log('Fetching all entries...');
  
  const entries = await fetchAllStrapi();
  console.log(`Total: ${entries.length}\n`);
  
  const testEntries = entries.filter(isTestData);
  const legitEntries = entries.filter(e => !isTestData(e));
  
  console.log(`Test data: ${testEntries.length}`);
  console.log(`Legitimate: ${legitEntries.length}\n`);
  
  if (testEntries.length > 0) {
    console.log('Test entries (sample):');
    testEntries.slice(0, 10).forEach(e => 
      console.log(`  - ID ${e.id}: ${e.product_handle}`)
    );
    
    if (deleteFlag) {
      console.log(`\nDeleting ${testEntries.length} entries...`);
      let deleted = 0, failed = 0;
      
      for (const entry of testEntries) {
        const ok = await deleteEntry(entry.id);
        if (ok) {
          deleted++;
          process.stdout.write(`\r  Progress: ${deleted}/${testEntries.length}`);
        } else {
          failed++;
        }
        await new Promise(r => setTimeout(r, 50));
      }
      
      console.log(`\n\n✅ Deleted: ${deleted}, Failed: ${failed}`);
      console.log(`Remaining entries: ${legitEntries.length}`);
    } else {
      console.log('\nRun with --delete to remove');
    }
  } else {
    console.log('✅ No test data found!');
  }
}

main().catch(console.error);
