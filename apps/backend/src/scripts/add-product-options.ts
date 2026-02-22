import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

// This script adds product options and option values to existing variants
// It creates a single "Variant" option for each product with multiple variants
// and links each variant to its corresponding option value

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  
  console.log('=== ADDING PRODUCT OPTIONS AND VALUES ===\n');
  
  // Get all products
  const products = await productModule.listProducts({}, { 
    select: ['id', 'handle', 'title'] 
  });
  
  let productsUpdated = 0;
  let optionsCreated = 0;
  let optionValuesCreated = 0;
  let variantsLinked = 0;
  
  for (const product of products) {
    try {
      // Get variants for this product
      const variants = await productModule.listProductVariants({ 
        product_id: product.id 
      });
      
      // Skip products with only 1 variant (default, no options needed)
      if (variants.length <= 1) {
        continue;
      }
      
      // Check if options already exist
      const existingOptions = await productModule.listProductOptions({
        product_id: product.id,
      });
      
      if (existingOptions.length > 0) {
        console.log(`  ${product.handle}: Already has options, skipping`);
        continue;
      }
      
      console.log(`\n${product.handle}:`);
      console.log(`  Variants: ${variants.length}`);
      
      // Create a single "Variant" option for this product
      const option = await productModule.createProductOptions({
        title: "Variant",
        product_id: product.id,
      });
      
      optionsCreated++;
      console.log(`  Created option: "Variant"`);
      
      // Create option values and link variants
      for (const variant of variants) {
        // Use variant title as option value
        const optionValueTitle = variant.title || `Variant ${variants.indexOf(variant) + 1}`;
        
        // Create option value
        const optionValue = await productModule.createProductOptionValues({
          option_id: option.id,
          value: optionValueTitle,
        });
        
        optionValuesCreated++;
        
        // Update variant to link to this option value
        await productModule.updateProductVariants(variant.id, {
          options: {
            [option.id]: optionValue.value,
          },
        });
        
        variantsLinked++;
      }
      
      console.log(`  Created ${variants.length} option values and linked variants`);
      productsUpdated++;
      
    } catch (error: any) {
      console.log(`  Error: ${error.message}`);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Products updated: ${productsUpdated}`);
  console.log(`Options created: ${optionsCreated}`);
  console.log(`Option values created: ${optionValuesCreated}`);
  console.log(`Variants linked: ${variantsLinked}`);
  
  return { productsUpdated, optionsCreated, optionValuesCreated, variantsLinked };
}
