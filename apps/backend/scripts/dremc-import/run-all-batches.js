// Process all batches sequentially
const BATCHES = 22; // Total batches (1064 products / 50 per batch)

for (let batch = 2; batch <= BATCHES; batch++) {
  console.log(`\n=== Processing batch ${batch}/${BATCHES} ===`);
  
  // Update batch number in script
  const fs = require('fs');
  const path = require('path');
  const scriptPath = path.join(__dirname, 'src/scripts/smart-import.ts');
  let script = fs.readFileSync(scriptPath, 'utf8');
  script = script.replace(/BATCH_NUMBER = \d+/, `BATCH_NUMBER = ${batch}`);
  fs.writeFileSync(scriptPath, script);
  
  // Run import
  const { execSync } = require('child_process');
  try {
    execSync('cd apps/backend && npx medusa exec ./src/scripts/smart-import.ts', {
      stdio: 'inherit',
      timeout: 180000
    });
  } catch (e) {
    console.log(`Batch ${batch} had errors`);
  }
}

console.log('\n=== ALL BATCHES COMPLETE ===');
