import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// This script:
// 1. Creates product option values if they don't exist
// 2. Links variants to option values by ID (not value string!)

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  console.log('=== FIXING VARIANT OPTION VALUES ===\n');
  
  // Get all products
  const products = await productModule.listProducts({}, { select: ['id', 'handle'] });
  
  let productsFixed = 0;
  let optionValuesCreated = 0;
  let variantsLinked = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      // Get options for this product
      const options = await productModule.listProductOptions({
        product_id: product.id,
      });
      
      if (options.length === 0) continue;
      
      // Get variants for this product
      const variants = await productModule.listProductVariants({
        product_id: product.id,
      });
      
      if (variants.length <= 1) continue;
      
      const option = options[0]; // We created one "Variant" option
      
      // Get existing option values for this option
      const existingValues = await productModule.listProductOptionValues({
        option_id: option.id,
      });
      
      const existingValueMap = new Map(
        existingValues.map((v: any) => [v.value.toLowerCase(), v])
      );
      
      console.log(`\n${product.handle}:`);
      console.log(`  Option: ${option.title} (${option.id})`);
      console.log(`  Existing option values: ${existingValues.length}`);
      console.log(`  Variants to link: ${variants.length}`);
      
      // For each variant, ensure option value exists and link it
      for (const variant of variants) {
        const valueStr = variant.title || `Variant ${variants.indexOf(variant) + 1}`;
        const valueKey = valueStr.toLowerCase();
        
        let optionValue = existingValueMap.get(valueKey);
        
        // Create option value if it doesn't exist
        if (!optionValue) {
          try {
            optionValue = await productModule.createProductOptionValues({
              option_id: option.id,
              value: valueStr,
            });
            optionValuesCreated++;
            existingValueMap.set(valueKey, optionValue); // Add to map
            console.log(`  ✅ Created option value: "${valueStr}" (${optionValue.id})`);
          } catch (e: any) {
            if (e.message.includes('already exists')) {
              // Try to find it again
              const allValues = await productModule.listProductOptionValues({
                option_id: option.id,
              });
              optionValue = allValues.find((v: any) => v.value.toLowerCase() === valueKey);
              if (optionValue) {
                existingValueMap.set(valueKey, optionValue);
              }
            } else {
              console.log(`  ❌ Error creating option value "${valueStr}": ${e.message}`);
              errors++;
              continue;
            }
          }
        }
        
        // Now link the variant to the option value using the option VALUE ID
        try {
          await productModule.updateProductVariants(variant.id, {
            options: {
              [option.id]: optionValue.id,  // Use option VALUE ID, not value string!
            },
          } as any);
          variantsLinked++;
          console.log(`  ✅ Linked variant "${valueStr}" to option value`);
        } catch (e: any) {
          console.log(`  ❌ Error linking variant "${valueStr}": ${e.message}`);
          errors++;
        }
      }
      
      productsFixed++;
      
    } catch (error: any) {
      console.log(`Product error: ${error.message}`);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products fixed: ${productsFixed}`);
  console.log(`Option values created: ${optionValuesCreated}`);
  console.log(`Variants linked: ${variantsLinked}`);
  console.log(`Errors: ${errors}`);
  
  return { productsFixed, optionValuesCreated, variantsLinked, errors };
}
