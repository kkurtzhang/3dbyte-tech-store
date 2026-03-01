import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";
import { createBrandWorkflow } from "../workflows/brand/create-brand";

// Categories to create
const CATEGORIES = [
  { name: "3D Printers", handle: "3d-printers", is_active: true },
  { name: "Filament", handle: "filament", is_active: true },
  { name: "Spare Parts", handle: "spare-parts", is_active: true },
  { name: "Electronics", handle: "electronics", is_active: true },
  { name: "Motion", handle: "motion", is_active: true },
  { name: "Build Plates", handle: "build-plates", is_active: true },
  { name: "Tools", handle: "tools", is_active: true },
  { name: "Accessories", handle: "accessories", is_active: true },
];

// Subcategories to create
const SUBCATEGORIES = [
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

// Brands to create
const BRANDS = [
  "Creality",
  "LDO",
  "Trianglelab",
  "Micro Swiss",
  "Fysetc",
  "E3D",
  "BIGTREETECH",
  "Bondtech",
  "Phaetus",
  "Sovol",
  "Anycubic",
  "Slice Engineering",
  "Gates",
  "CNC Kitchen",
  "Polymaker",
  "QIDI TECH",
  "Duet3D",
  "Mellow3D",
  "Fabreeko",
  "Flashforge",
  "Molex",
  "Artillery 3D",
  "GDSTIME",
  "West3D",
  "Mean Well",
  "Luke's Laboratory",
  "Magigoo",
  "DEVIL DESIGN",
  "Cartographer3D",
  "Cookiecad",
  "Pine64",
  "JST",
  "Elegoo",
  "HIWIN",
  "Omron",
  "NSK",
  "MISUMI",
  "IWISS",
  "Provok3d",
  "Vector 3D",
  "Sunon",
  "AG",
  "Capricorn",
  "Miniware",
  "TBI Motion",
  "IGUS",
  "Adam Tech",
  "Delta Electronics",
  "AJAX",
  "Ember Prototypes",
  "Moons",
  "Wago",
  "ANTCLABS",
  "MY3Dtech",
  "Schallenkammer",
  "Proto Pasta",
  "Keenovo",
];

function createHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function importCategoriesAndBrands({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("=== Starting Category and Brand Import ===");

  // Step 1: Create top-level categories
  logger.info(`Creating ${CATEGORIES.length} top-level categories...`);

  // Check which categories already exist
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  });

  const existingHandles = new Set(existingCategories.map((c) => c.handle));
  const categoriesToCreate = CATEGORIES.filter((c) => !existingHandles.has(c.handle));

  let createdCategories: any[] = [];
  if (categoriesToCreate.length > 0) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoriesToCreate,
      },
    });
    createdCategories = result;
    logger.info(`Created ${createdCategories.length} top-level categories`);
  } else {
    logger.info("All top-level categories already exist");
    createdCategories = existingCategories.filter((c) =>
      CATEGORIES.some((cat) => cat.handle === c.handle)
    );
  }

  // Build handle -> id map for all categories (including subcategories)
  const categoryMap = new Map<string, string>();
  [...createdCategories, ...existingCategories].forEach((cat) => {
    categoryMap.set(cat.handle, cat.id);
  });

  // Get all existing categories again (including the ones we just created)
  const { data: allCategoriesAfter } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  });

  // Build a full handle map including parent paths
  const allHandles = new Set<string>();
  const handleToId = new Map<string, string>();

  allCategoriesAfter.forEach((cat: any) => {
    allHandles.add(cat.handle);
    handleToId.set(cat.handle, cat.id);
  });

  // Step 2: Create subcategories
  logger.info(`Creating ${SUBCATEGORIES.length} subcategories...`);

  const subcategoriesToCreate: any[] = [];
  for (const sub of SUBCATEGORIES) {
    const fullHandle = `${sub.parent_handle}/${sub.handle}`;

    if (!allHandles.has(fullHandle)) {
      const parentId = categoryMap.get(sub.parent_handle);
      if (parentId) {
        subcategoriesToCreate.push({
          name: sub.name,
          handle: fullHandle,
          parent_category_id: parentId,
          is_active: true,
        });
      }
    }
  }

  let createdSubcategories: any[] = [];
  if (subcategoriesToCreate.length > 0) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: subcategoriesToCreate,
      },
    });
    createdSubcategories = result;
    logger.info(`Created ${createdSubcategories.length} subcategories`);
  } else {
    logger.info("All subcategories already exist");
  }

  // Step 3: Create brands
  logger.info(`Creating ${BRANDS.length} brands...`);

  // Check which brands already exist
  const { data: existingBrands } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle"],
  });

  const existingBrandHandles = new Set(existingBrands.map((b) => b.handle));
  const brandsToCreate = BRANDS.filter((b) => !existingBrandHandles.has(createHandle(b)));

  let createdBrands: any[] = [];
  for (const brandName of brandsToCreate) {
    try {
      const { result } = await createBrandWorkflow(container).run({
        input: {
          name: brandName,
          handle: createHandle(brandName),
        },
      });
      createdBrands.push(result);
    } catch (error) {
      logger.error(`Failed to create brand "${brandName}": ${error}`);
    }
  }

  logger.info(`Created ${createdBrands.length} brands`);

  // Summary
  logger.info("=== Import Summary ===");
  logger.info(`Categories: ${categoriesToCreate.length} created, ${existingHandles.size} existing`);
  logger.info(`Subcategories: ${subcategoriesToCreate.length} created`);
  logger.info(`Brands: ${createdBrands.length} created, ${existingBrands.length} existing`);
  logger.info("=== Import Complete ===");
}
