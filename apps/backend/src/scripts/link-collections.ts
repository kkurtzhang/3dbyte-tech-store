/**
 * Link Products to Collections for 3DByte Tech Store
 * 
 * Assigns products to collections based on tags and categories
 */

import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function linkProductsToCollections({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModuleService = container.resolve(Modules.PRODUCT)

  console.log("🔗 Linking products to collections...")

  // Get all collections
  const collections = await productModuleService.listProductCollections({})
  console.log(`📋 Found ${collections.length} collections`)
  
  const collectionMap = new Map(collections.map((c: any) => [c.handle, c.id]))
  collections.forEach((c: any) => console.log(`   - ${c.title} (${c.handle}): ${c.id}`))

  // Get all products with tags
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

  console.log(`\n📦 Processing ${products.length} products...`)

  // Define assignment rules based on tags
  const assignmentRules = [
    { collectionHandle: "voron-compatible", tags: ["voron", "voron-2.4", "voron-0", "voron-trident", "v0", "v2.4"] },
    { collectionHandle: "creality-ender-3-series", tags: ["ender-3", "ender-3-v2", "ender-3-s1", "creality", "ender 3", "ender 3 v2", "ender 3 s1", "ender 3 v3", "ender 3 v4"] },
    { collectionHandle: "bambu-lab-compatible", tags: ["bambu", "bambu-lab", "x1c", "p1p", "a1", "x1", "p1", "bambu lab"] },
    { collectionHandle: "high-temperature-printing", tags: ["abs", "asa", "nylon", "polycarbonate", "pc", "high-temp", "high temperature"] },
    { collectionHandle: "hotend-upgrades", tags: ["hotend", "v6", "mosquito", "revo", "rapido", "dragon", "nfz", "bmo"] },
    { collectionHandle: "extruder-solutions", tags: ["extruder", "bondtech", "lgx", "hemera", "pocketwatch", "galileo"] },
    { collectionHandle: "mainboards-electronics", tags: ["mainboard", "skr", "manta", "octopus", "btt", "bigtreetech", "display", "screen"] },
    { collectionHandle: "premium-filaments", tags: ["filament", "pla", "petg", "tpu", "abs", "asa"] },
    { collectionHandle: "motion-components", tags: ["linear", "rail", "mgn", "belt", "bearing", "motor", "stepper"] },
    { collectionHandle: "build-plates-surfaces", tags: ["pei", "build plate", "bed", "flex plate", "spring steel"] },
    { collectionHandle: "nozzles-tips", tags: ["nozzle", "brass", "steel", "ruby", "tungsten", "0.4", "0.6"] },
  ]

  let totalAssigned = 0
  let errors = 0

  for (const product of products) {
    const productTags = ((product.tags || []) as any[]).map(t => t.value?.toLowerCase() || "")
    
    for (const rule of assignmentRules) {
      const matchesTag = rule.tags.some(tag => 
        productTags.some(pt => pt.includes(tag.toLowerCase()) || tag.toLowerCase().includes(pt))
      )

      if (matchesTag) {
        const collectionId = collectionMap.get(rule.collectionHandle)
        if (collectionId) {
          try {
            await productModuleService.updateProducts(product.id, {
              collection_id: collectionId
            })
            totalAssigned++
            if (totalAssigned <= 20 || totalAssigned % 100 === 0) {
              console.log(`  ✅ "${product.title}" → ${rule.collectionHandle}`)
            }
          } catch (e: any) {
            errors++
            if (errors <= 5) {
              console.log(`  ❌ Error assigning "${product.title}": ${e.message}`)
            }
          }
          break // Only assign to first matching collection
        }
      }
    }
  }

  // Get products without collection
  const { data: unassignedProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    filters: { collection_id: null }
  })

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Products assigned: ${totalAssigned}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   📦 Products without collection: ${unassignedProducts.length}`)

  // Show collection distribution
  console.log(`\n📋 Collection Distribution:`)
  for (const col of collections) {
    const { data: colProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { collection_id: col.id }
    })
    console.log(`   - ${col.title}: ${colProducts.length} products`)
  }

  return { 
    totalAssigned,
    errors,
    unassigned: unassignedProducts.length 
  }
}
