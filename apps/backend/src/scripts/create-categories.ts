import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function createCategories({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const productModuleService = container.resolve(Modules.PRODUCT);

  logger.info("=== Creating 3DByte Category Structure ===");

  const categories = [
    // Top-level categories
    { name: "3D Printers", handle: "3d-printers", description: "Complete 3D printer kits and systems", is_active: true },
    { name: "Filament", handle: "filament", description: "3D printing filaments for all applications", is_active: true },
    { name: "Spare Parts", handle: "spare-parts", description: "Replacement and upgrade parts for 3D printers", is_active: true },
    { name: "Electronics", handle: "electronics", description: "Mainboards, displays, and electronic components", is_active: true },
    { name: "Motion", handle: "motion", description: "Belts, rails, bearings, and motors", is_active: true },
    { name: "Build Plates", handle: "build-plates", description: "PEI plates, flex plates, and build surfaces", is_active: true },
    { name: "Tools", handle: "tools", description: "3D printing tools and accessories", is_active: true },
    { name: "Accessories", handle: "accessories", description: "Miscellaneous 3D printing accessories", is_active: true },
  ];

  const childCategories = [
    // Filament children
    { name: "PLA", handle: "pla", parent_handle: "filament" },
    { name: "PETG", handle: "petg", parent_handle: "filament" },
    { name: "ABS & ASA", handle: "abs-asa", parent_handle: "filament" },
    { name: "TPU", handle: "tpu", parent_handle: "filament" },
    { name: "Specialty", handle: "specialty", parent_handle: "filament" },
    // Spare Parts children
    { name: "Hotends", handle: "hotends", parent_handle: "spare-parts" },
    { name: "Nozzles", handle: "nozzles", parent_handle: "spare-parts" },
    { name: "Extruders", handle: "extruders", parent_handle: "spare-parts" },
    { name: "Thermistors", handle: "thermistors", parent_handle: "spare-parts" },
    { name: "Heater Cartridges", handle: "heater-cartridges", parent_handle: "spare-parts" },
    { name: "Beds", handle: "beds", parent_handle: "spare-parts" },
    // Electronics children
    { name: "Mainboards", handle: "mainboards", parent_handle: "electronics" },
    { name: "Displays", handle: "displays", parent_handle: "electronics" },
    { name: "Stepper Drivers", handle: "stepper-drivers", parent_handle: "electronics" },
    { name: "Power Supplies", handle: "power-supplies", parent_handle: "electronics" },
    // Motion children
    { name: "Linear Rails", handle: "linear-rails", parent_handle: "motion" },
    { name: "Belts", handle: "belts", parent_handle: "motion" },
    { name: "Bearings", handle: "bearings", parent_handle: "motion" },
    { name: "Motors", handle: "motors", parent_handle: "motion" },
  ];

  try {
    // Create top-level categories
    logger.info("\n📁 Creating top-level categories...");
    const createdCategories: Record<string, string> = {};
    
    for (const cat of categories) {
      try {
        const created = await productModuleService.createProductCategories({
          name: cat.name,
          handle: cat.handle,
          description: cat.description,
          is_active: cat.is_active,
        });
        createdCategories[cat.handle] = created.id;
        logger.info(`  ✅ Created: ${cat.name} (${cat.handle})`);
      } catch (e: any) {
        if (e.message?.includes("already exists")) {
          logger.info(`  ⚠️  Already exists: ${cat.name}`);
          // Get existing category
          const existing = await productModuleService.listProductCategories({
            handle: cat.handle,
          });
          if (existing.length > 0) {
            createdCategories[cat.handle] = existing[0].id;
          }
        } else {
          logger.error(`  ❌ Failed: ${cat.name} - ${e.message}`);
        }
      }
    }

    // Create child categories
    logger.info("\n📁 Creating child categories...");
    for (const cat of childCategories) {
      const parentId = createdCategories[cat.parent_handle];
      if (!parentId) {
        logger.error(`  ❌ Parent not found: ${cat.parent_handle}`);
        continue;
      }

      try {
        await productModuleService.createProductCategories({
          name: cat.name,
          handle: cat.handle,
          parent_category_id: parentId,
          is_active: true,
        });
        logger.info(`  ✅ Created: ${cat.name} (parent: ${cat.parent_handle})`);
      } catch (e: any) {
        if (e.message?.includes("already exists")) {
          logger.info(`  ⚠️  Already exists: ${cat.name}`);
        } else {
          logger.error(`  ❌ Failed: ${cat.name} - ${e.message}`);
        }
      }
    }

    logger.info("\n✅ Category structure creation complete!");
    
    // List all categories
    const allCategories = await productModuleService.listProductCategories({}, {
      select: ["id", "name", "handle", "parent_category_id"],
    });
    logger.info(`\n📊 Total categories: ${allCategories.length}`);
    
  } catch (error) {
    logger.error(`Error creating categories: ${error}`);
  }
}
