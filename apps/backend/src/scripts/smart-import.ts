import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";

// Smart import with correct options, images, and defaults

const BATCH_FILE = "products-fresh-extract.json";
const BATCH_SIZE = 50;
const BATCH_NUMBER = parseInt(process.env.BATCH || "1");

// Parse variant title into structured options
function parseVariantOptions(variantTitle: string, productType: string): Record<string, string> {
  const options: Record<string, string> = {};
  
  // Nozzle pattern: "V6 / 0.4mm"
  const nozzleMatch = variantTitle.match(/^(.+?)\s*\/\s*(.+)$/);
  if (nozzleMatch && productType.includes('nozzle')) {
    options['Nozzle Type'] = nozzleMatch[1].trim();
    options['Nozzle Size'] = nozzleMatch[2].trim();
    return options;
  }
  
  // Hotend pattern
  if (productType.includes('hotend')) {
    const parts = variantTitle.split('/').map(p => p.trim());
    if (parts.length >= 2) {
      options['Fitment'] = parts[0];
      options['Size'] = parts.slice(1).join(' / ');
    } else {
      options['Fitment'] = variantTitle;
    }
    return options;
  }
  
  // Filament pattern
  if (['filament', 'pla', 'petg', 'tpu', 'abs', 'asa'].some(t => productType.includes(t))) {
    options['Colour'] = variantTitle;
    return options;
  }
  
  // Size pattern
  const sizeMatch = variantTitle.match(/^(\d+\.?\d*\s*(mm|ML|g|kg))/i);
  if (sizeMatch) {
    options['Size'] = variantTitle;
    return options;
  }
  
  // Generic split by /
  if (variantTitle.includes('/')) {
    const parts = variantTitle.split('/').map(p => p.trim());
    if (parts.length === 2) {
      options['Type'] = parts[0];
      options['Variant'] = parts[1];
      return options;
    }
  }
  
  // Fallback
  options['Variant'] = variantTitle;
  return options;
}

function determineProductType(product: any): string {
  const tags = (product.tags || []).join(' ').toLowerCase();
  const title = (product.title || '').toLowerCase();
  const pt = (product.product_type || '').toLowerCase();
  
  if (tags.includes('nozzle') || title.includes('nozzle')) return 'nozzle';
  if (tags.includes('hotend') || title.includes('hotend')) return 'hotend';
  if (['filament', 'pla', 'petg', 'tpu', 'abs', 'asa'].some(t => tags.includes(t))) return 'filament';
  if (tags.includes('extruder') || title.includes('extruder')) return 'extruder';
  return pt || 'other';
}

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const brandModule = container.resolve("brand" as any);
  const regionModule = container.resolve(Modules.REGION);
  
  console.log(`=== SMART IMPORT BATCH ${BATCH_NUMBER} ===\n`);
  
  const sourcePath = path.join(__dirname, `../../scripts/dremc-import/data/${BATCH_FILE}`);
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  
  const brands = await brandModule.listBrands({}, { select: ["id", "name"] });
  const brandMap = new Map(brands.map((b: any) => [b.name.toLowerCase(), b.id]));
  const regions = await regionModule.listRegions({}, { take: 1 });
  const currency = regions[0]?.currency_code || "AUD";
  
  const start = (BATCH_NUMBER - 1) * BATCH_SIZE;
  const batch = source.products.slice(start, start + BATCH_SIZE);
  
  console.log(`Processing products ${start + 1}-${start + batch.length} of ${source.products.length}\n`);
  
  let imported = 0, skipped = 0;
  
  for (const product of batch) {
    try {
      const cleanHandle = product.handle.replace(/[^\w-]/g, '');
      const existing = await productModule.listProducts({ handle: cleanHandle });
      if (existing.length > 0) { skipped++; continue; }
      
      const brandId = brandMap.get(product.vendor?.toLowerCase() || "");
      const variants = product.variants || [];
      const productType = determineProductType(product);
      
      let optionsData: any[] = [];
      let variantsData: any[] = [];
      
      if (variants.length > 1) {
        // Multi-variant: parse options
        const optionTitles = new Set<string>();
        const optionValues = new Map<string, Set<string>>();
        
        variants.forEach((v: any) => {
          const opts = parseVariantOptions(v.title || 'Default', productType);
          Object.entries(opts).forEach(([title, value]) => {
            optionTitles.add(title);
            if (!optionValues.has(title)) optionValues.set(title, new Set());
            optionValues.get(title)!.add(value);
          });
        });
        
        optionsData = Array.from(optionTitles).map(title => ({
          title,
          values: Array.from(optionValues.get(title) || []),
        }));
        
        variantsData = variants.map((v: any) => ({
          title: v.title || 'Default',
          sku: `3DB-${(product.vendor || "UNK").substring(0,3).toUpperCase()}-${v.sku || v.title}`.substring(0,100),
          prices: [{ amount: Math.round((v.price || product.price || 0) * 100), currency_code: currency }],
          options: parseVariantOptions(v.title || 'Default', productType),
          manage_inventory: false,
          allow_backorder: true,
        }));
      } else {
        // Single variant: use Default option
        const v = variants[0] || { title: 'Default', price: product.price };
        optionsData = [{ title: 'Default', values: ['Default'] }];
        variantsData = [{
          title: v.title || 'Default',
          sku: `3DB-${(product.vendor || "UNK").substring(0,3).toUpperCase()}-${v.sku || '001'}`.substring(0,100),
          prices: [{ amount: Math.round((v.price || product.price || 0) * 100), currency_code: currency }],
          options: { 'Default': 'Default' },
          manage_inventory: false,
          allow_backorder: true,
        }];
      }
      
      await productModule.createProducts({
        title: product.title,
        handle: cleanHandle,
        status: 'published',
        is_giftcard: false,
        discountable: true,
        options: optionsData,
        variants: variantsData,
        metadata: {
          vendor: product.vendor,
          dremc_id: String(product.dremc_id),
          brand_id: brandId || undefined,
          category: product.mapped_category,
        },
        images: (product.images || []).slice(0, 5).map((url: string) => ({
          url: url.startsWith('//') ? `https:${url}` : url,
        })),
      });
      
      imported++;
      if (imported % 10 === 0) console.log(`  Progress: ${imported}/${batch.length}`);
      
    } catch (e: any) {
      console.log(`❌ ${product.handle}: ${e.message}`);
      skipped++;
    }
  }
  
  console.log(`\n=== BATCH ${BATCH_NUMBER} SUMMARY ===`);
  console.log(`Imported: ${imported}, Skipped: ${skipped}`);
  
  return { imported, skipped };
}
