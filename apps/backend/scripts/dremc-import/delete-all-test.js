// Delete ALL test entries from all pages
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = 'c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb';

async function fetchAllPages() {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${STRAPI_URL}/api/product-descriptions?pagination%5Bpage%5D=${page}&pagination%5BpageSize%5D=100`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` } });
    const data = await res.json();
    if (!data.data?.length) break;
    all.push(...data.data);
    console.log(`Page ${page}: ${data.data.length} entries`);
    if (data.data.length < 100) break;
    page++;
  }
  return all;
}

async function deleteEntry(id) {
  const res = await fetch(`${STRAPI_URL}/api/product-descriptions/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.status === 204;
}

async function main() {
  console.log('Fetching all entries...\n');
  const all = await fetchAllPages();
  
  const testEntries = all.filter(e => e.createdAt?.startsWith('2025-12-25'));
  console.log(`\nTotal entries: ${all.length}`);
  console.log(`Test entries: ${testEntries.length}\n`);
  
  if (testEntries.length === 0) {
    console.log('✅ No test entries found!');
    return;
  }
  
  console.log('Deleting test entries...');
  let deleted = 0, failed = 0;
  
  for (const entry of testEntries) {
    const ok = await deleteEntry(entry.id);
    await new Promise(r => setTimeout(r, 100));
    if (ok) {
      deleted++;
      process.stdout.write(`\r  Progress: ${deleted}/${testEntries.length}`);
    } else {
      failed++;
    }
  }
  
  console.log(`\n\nDone: ${deleted} deleted, ${failed} failed`);
  console.log(`Remaining legitimate entries: ${all.length - testEntries.length}`);
}

main().catch(console.error);
