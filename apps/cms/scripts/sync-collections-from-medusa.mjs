const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "")
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const MEDUSA_URL = (process.env.MEDUSA_URL || "http://localhost:9000").replace(/\/$/, "")
const MEDUSA_DB_URL = process.env.MEDUSA_DB_URL || ""
const DEFAULT_COLLECTION_IMAGE_ID = Number(process.env.STRAPI_DEFAULT_COLLECTION_IMAGE_ID || 0) || null
const DRY_RUN = process.env.DRY_RUN === "1"

if (!STRAPI_API_TOKEN) {
  console.error("Missing STRAPI_API_TOKEN. Set a Strapi API token before running this script.")
  process.exit(1)
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toDescription(collection) {
  const metadataDescription =
    collection?.metadata && typeof collection.metadata === "object"
      ? normalizeText(collection.metadata.description)
      : ""

  if (metadataDescription) {
    return metadataDescription
  }

  return `Explore ${collection.title} at 3DByte Tech.`
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${url}: ${JSON.stringify(body)}`)
  }

  return body
}

async function fetchAllStrapiCollections() {
  const pageSize = 200
  let page = 1
  const all = []

  while (true) {
    const query = new URLSearchParams({
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "fields[0]": "Title",
      "fields[1]": "Handle",
      "fields[2]": "Description",
      "populate[Image][fields][0]": "id",
      "populate[Image][fields][1]": "documentId",
    })

    const body = await fetchJson(`${STRAPI_URL}/api/collections?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
    })

    const rows = Array.isArray(body.data) ? body.data : []
    all.push(...rows)

    const pageCount = body?.meta?.pagination?.pageCount || 1
    if (page >= pageCount) {
      break
    }

    page += 1
  }

  return all
}

async function fetchMedusaCollections() {
  const query = new URLSearchParams({ limit: "200" })
  const body = await fetchJson(`${MEDUSA_URL}/store/collections?${query.toString()}`)
  return Array.isArray(body.collections) ? body.collections : []
}

async function fetchMedusaCollectionsFromDb() {
  if (!MEDUSA_DB_URL) {
    throw new Error("MEDUSA_DB_URL is not set for DB fallback")
  }

  const { Client } = await import("pg")
  const client = new Client({ connectionString: MEDUSA_DB_URL })
  await client.connect()

  try {
    const result = await client.query(`
      select id, handle, title
      from product_collection
      where deleted_at is null
      order by created_at asc
    `)

    return result.rows.map((row) => ({
      id: row.id,
      handle: row.handle,
      title: row.title,
      metadata: {},
    }))
  } finally {
    await client.end()
  }
}

async function createCollection(data) {
  const url = `${STRAPI_URL}/api/collections?status=published`
  if (DRY_RUN) {
    return { dryRun: true, data }
  }

  return fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  })
}

async function updateCollection(documentId, data) {
  const url = `${STRAPI_URL}/api/collections/${documentId}?status=published`
  if (DRY_RUN) {
    return { dryRun: true, data }
  }

  return fetchJson(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  })
}

async function main() {
  console.log(`Using Medusa: ${MEDUSA_URL}`)
  console.log(`Using Strapi: ${STRAPI_URL}`)
  if (DRY_RUN) {
    console.log("DRY_RUN enabled")
  }

  let medusaCollections
  try {
    medusaCollections = await fetchMedusaCollections()
  } catch (error) {
    console.warn(`Medusa API unavailable, using DB fallback: ${error.message}`)
    medusaCollections = await fetchMedusaCollectionsFromDb()
  }

  const strapiCollections = await fetchAllStrapiCollections()

  const strapiByHandle = new Map(
    strapiCollections
      .map((entry) => [normalizeText(entry.Handle).toLowerCase(), entry])
      .filter(([handle]) => handle.length > 0)
  )

  let updated = 0
  let created = 0
  let skippedNoImage = 0
  let alreadyInSync = 0

  for (const medusaCollection of medusaCollections) {
    const handle = normalizeText(medusaCollection.handle).toLowerCase()
    const title = normalizeText(medusaCollection.title)

    if (!handle || !title) {
      continue
    }

    const desired = {
      Title: title,
      Handle: handle,
      Description: toDescription(medusaCollection),
    }

    const existing = strapiByHandle.get(handle)

    if (!existing) {
      const imageId = DEFAULT_COLLECTION_IMAGE_ID
      if (!imageId) {
        skippedNoImage += 1
        console.warn(`Skipping create for ${handle}: no STRAPI_DEFAULT_COLLECTION_IMAGE_ID`) 
        continue
      }

      await createCollection({ ...desired, Image: imageId })
      created += 1
      console.log(`Created collection ${handle}`)
      continue
    }

    const existingTitle = normalizeText(existing.Title)
    const existingDescription = normalizeText(existing.Description)

    if (existingTitle === desired.Title && existingDescription === desired.Description) {
      alreadyInSync += 1
      continue
    }

    const existingImageId = existing?.Image?.id || DEFAULT_COLLECTION_IMAGE_ID
    if (!existingImageId) {
      skippedNoImage += 1
      console.warn(`Skipping update for ${handle}: existing row has no image and no default image id set`)
      continue
    }

    const identifier = existing.documentId || existing.id
    await updateCollection(identifier, {
      ...desired,
      Image: existingImageId,
    })

    updated += 1
    console.log(`Updated collection ${handle}`)
  }

  console.log("Summary")
  console.log(`- Medusa collections: ${medusaCollections.length}`)
  console.log(`- Strapi collections: ${strapiCollections.length}`)
  console.log(`- Created: ${created}`)
  console.log(`- Updated: ${updated}`)
  console.log(`- Already in sync: ${alreadyInSync}`)
  console.log(`- Skipped (missing image): ${skippedNoImage}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
