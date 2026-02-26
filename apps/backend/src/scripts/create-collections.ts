/**
 * Create Product Collections for 3DByte Tech Store
 * 
 * Uses Medusa v2 Product Module to create collections
 */

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function createCollections({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  console.log("🚀 Creating product collections...")

  // Get the product module service
  const productModuleService = container.resolve(Modules.PRODUCT)

  // Check what methods are available
  console.log("Available methods on product module:")
  const methods = Object.keys(productModuleService).filter(k => typeof productModuleService[k] === 'function')
  const collectionMethods = methods.filter(m => m.toLowerCase().includes('collection'))
  console.log("Collection-related methods:", collectionMethods)

  // Get existing collections
  try {
    const collections = await productModuleService.listProductCollections?.({})
    console.log(`📋 Found ${collections?.length || 0} existing collections`)
  } catch (e: any) {
    console.log(`📋 Error listing collections: ${e.message}`)
  }

  // Define collections to create
  const collectionsToCreate = [
    { title: "Voron Compatible", handle: "voron-compatible" },
    { title: "Creality Ender 3 Series", handle: "creality-ender-3-series" },
    { title: "Bambu Lab Compatible", handle: "bambu-lab-compatible" },
    { title: "High-Temperature Printing", handle: "high-temperature-printing" },
    { title: "Beginner Friendly", handle: "beginner-friendly" },
    { title: "Hotend Upgrades", handle: "hotend-upgrades" },
    { title: "Extruder Solutions", handle: "extruder-solutions" },
    { title: "Mainboards & Electronics", handle: "mainboards-electronics" },
    { title: "Premium Filaments", handle: "premium-filaments" },
    { title: "Motion Components", handle: "motion-components" },
    { title: "Build Plates & Surfaces", handle: "build-plates-surfaces" },
    { title: "Nozzles & Tips", handle: "nozzles-tips" }
  ]

  // Try to create collections using the module
  for (const collectionData of collectionsToCreate) {
    try {
      // Try different method names that might exist
      if (typeof productModuleService.createProductCollections === 'function') {
        const collection = await productModuleService.createProductCollections(collectionData)
        console.log(`✅ Created collection "${collectionData.title}" (${collection.id})`)
      } else if (typeof productModuleService.createCollections === 'function') {
        const collection = await productModuleService.createCollections(collectionData)
        console.log(`✅ Created collection "${collectionData.title}" (${collection.id})`)
      } else {
        console.log(`⚠️ No create collection method found`)
        break
      }
    } catch (e: any) {
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        console.log(`⏭️ Collection "${collectionData.title}" already exists`)
      } else {
        console.log(`❌ Error creating "${collectionData.title}": ${e.message}`)
      }
    }
  }

  // Get products with tags for assignment analysis
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "tags.id",
      "tags.value",
    ],
  })

  console.log(`\n📦 Total products: ${products.length}`)

  // Sample tags for assignment rules
  const allTags = new Set<string>()
  for (const p of products) {
    for (const tag of (p.tags || [])) {
      allTags.add((tag as any).value?.toLowerCase())
    }
  }
  console.log(`🏷️ Unique tags found: ${allTags.size}`)
  console.log(`   Sample: ${[...allTags].slice(0, 20).join(", ")}`)

  return { success: true }
}
