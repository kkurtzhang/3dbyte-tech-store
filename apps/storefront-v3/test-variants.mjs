import { sdk } from "./src/lib/medusa/client"

async function testVariantImages() {
  try {
    const { products } = await sdk.store.product.list({
      handle: "strapi-sync-test",
      limit: 1,
      fields: "*variants,*variants.images,*images",
    })

    const product = products[0]
    console.log("=== Product Images ===")
    console.log(JSON.stringify(product.images?.map(i => ({ id: i.id, url: i.url })), null, 2))

    if (product.variants) {
      product.variants.forEach((v, i) => {
        console.log(`\n=== Variant ${i} ===`)
        console.log("ID:", v.id)
        console.log("Options:", v.options)
        console.log("Has images property?", "images" in v)
        console.log("Images value:", JSON.stringify(v.images, null, 2))
      })
    }
  } catch (e) {
    console.error("Error:", e)
  }
}

testVariantImages()
