import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  batchInventoryItemLevelsWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedDummyProducts({ container }: ExecArgs) {
  // Dynamic import for ESM-only faker package
  //   const { faker } = await import("@faker-js/faker")

  //   const salesChannelModuleService = container.resolve(
  //     Modules.SALES_CHANNEL
  //   )
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  //   const defaultSalesChannel = await salesChannelModuleService
  //     .listSalesChannels({
  //       name: "Web Store",
  //     })

  //   const sizeOptions = ["1.75mm","2.8mm",]
  //   const colorOptions = ["Black", "White", "Red", "Blue", "Green", "Yellow", "Purple"]
  //   const currency_code = "aud"
  //   const productsNum = 100

  //   logger.info(`Seeding ${productsNum} products...`)

  //   const productsData = new Array(productsNum).fill(0).map((_, index) => {
  //   const title = faker.commerce.product() + "_" + index
  //   return {
  //     title,
  //     is_giftcard: false,
  //     description: faker.commerce.productDescription(),
  //     status: ProductStatus.PUBLISHED,
  //     options: [
  //       {
  //         title: "Size",
  //         values: sizeOptions,
  //       },
  //       {
  //         title: "Color",
  //         values: colorOptions,
  //       },
  //     ],
  //     images: [
  //       {
  //         url: faker.image.urlPicsumPhotos(),
  //       },
  //       {
  //         url: faker.image.urlPicsumPhotos(),
  //       },
  //     ],
  //     variants: new Array(10).fill(0).map((_, variantIndex) => ({
  //       title: `${title} ${variantIndex}`,
  //       sku: `variant-${variantIndex}${index}`,
  //       prices: new Array(10).fill(0).map((_, priceIndex) => ({
  //         currency_code,
  //         amount: 10 * priceIndex,
  //       })),
  //       options: {
  //         Size: sizeOptions[Math.floor(Math.random() * sizeOptions.length)],
  //         Color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
  //       },
  //     })),
  //     shipping_profile_id: "sp_01JWZVBDAH2PJTX53PBPFFG9BC",
  //     sales_channels: [
  //       {
  //         id: defaultSalesChannel[0].id,
  //       },
  //     ],
  //   }
  // })

  // const { result: products } = await createProductsWorkflow(container).run({
  //   input: {
  //     products: productsData,
  //   },
  // })

  // logger.info(`Seeded ${products.length} products.`)

  // logger.info("Seeding inventory levels.")

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels = inventoryItems.map((inventoryItem) => ({
    location_id: stockLocations[0].id,
    stocked_quantity: 1000000,
    inventory_item_id: inventoryItem.id,
  }));

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  await batchInventoryItemLevelsWorkflow(container).run({
    input: {
    //   delete: ["iitem_01KDA314TRC8557XMGQG3MM7A1"],
      create: [...inventoryLevels],
      update: [...inventoryLevels],
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
