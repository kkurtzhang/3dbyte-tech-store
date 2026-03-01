// Delete test entries one by one with verification
const STRAPI_URL = 'http://192.168.0.45:1337';
const STRAPI_TOKEN = 'c68fec065347ba6ae663ed352446548d0b8cbb376103def7a1129eb7e7c5780361877b926787403d3eb6e387191a7cd8c9c844f7d9bd96610bce7a0c9d0832c73d0921476f32746ee5934333bc1629128cd9cb3c8ca6eeb391ffd0cbaffb9aca71e644c54e35662db95d8e12b514a302ae3d12413ee5a01b2f7de7b6fa2a93cb';

async function deleteEntry(id) {
  const url = `${STRAPI_URL}/api/product-descriptions/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.status;
}

async function verifyDeleted(id) {
  const url = `${STRAPI_URL}/api/product-descriptions/${id}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  return res.status === 404;
}

async function main() {
  // Get all test entries created on Dec 25
  const res = await fetch(`${STRAPI_URL}/api/product-descriptions?pagination%5BpageSize%5D=100`, {
    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
  });
  const data = await res.json();
  
  const testEntries = data.data.filter(d => d.createdAt?.startsWith('2025-12-25'));
  console.log(`Found ${testEntries.length} test entries to delete\n`);
  
  let deleted = 0, failed = 0;
  
  for (const entry of testEntries) {
    const status = await deleteEntry(entry.id);
    await new Promise(r => setTimeout(r, 200)); // Wait 200ms
    
    const verified = await verifyDeleted(entry.id);
    if (verified) {
      deleted++;
      process.stdout.write(`\r✓ Deleted ${deleted}/${testEntries.length}`);
    } else {
      failed++;
      console.log(`\n✗ Failed to delete ID ${entry.id} (status ${status})`);
    }
  }
  
  console.log(`\n\nDone: ${deleted} deleted, ${failed} failed`);
}

main().catch(console.error);
