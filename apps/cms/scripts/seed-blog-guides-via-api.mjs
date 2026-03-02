const STRAPI_URL = (process.env.STRAPI_URL || "http://localhost:1337").replace(/\/$/, "")
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN
const DEFAULT_BLOG_IMAGE_ID = Number(process.env.STRAPI_DEFAULT_BLOG_IMAGE_ID || 0) || null
const DRY_RUN = process.env.DRY_RUN === "1"

if (!STRAPI_API_TOKEN) {
  console.error("Missing STRAPI_API_TOKEN. Set a Strapi API token before running this script.")
  process.exit(1)
}

if (!DEFAULT_BLOG_IMAGE_ID) {
  console.error("Missing STRAPI_DEFAULT_BLOG_IMAGE_ID. Blog entries require FeaturedImage.")
  process.exit(1)
}

const posts = [
  {
    title: "Voron 2.4 Build Checklist",
    slug: "voron-2-4-build-checklist",
    excerpt: "A practical pre-build checklist to avoid rework while assembling a Voron 2.4.",
    content: "Before building, verify BOM completeness, frame squareness, wiring labels, and toolhead alignment. A disciplined checklist reduces downtime and rework.",
  },
  {
    title: "First Layer Calibration Playbook",
    slug: "first-layer-calibration-playbook",
    excerpt: "A repeatable process to dial in nozzle height, bed prep, and adhesion consistency.",
    content: "Calibrate Z-offset in small increments, verify bed mesh quality, and test with a simple single-layer pattern across the bed before full prints.",
  },
  {
    title: "ABS Warping Mitigation Guide",
    slug: "abs-warping-mitigation-guide",
    excerpt: "How to reduce edge lift and layer separation when printing high-temperature materials.",
    content: "Use enclosure heat retention, stable chamber temperatures, proper bed prep, and conservative cooling to reduce ABS warping risk.",
  },
  {
    title: "Nozzle Maintenance Routine for Reliable Prints",
    slug: "nozzle-maintenance-routine",
    excerpt: "A maintenance schedule to prevent clogs and maintain consistent extrusion quality.",
    content: "Run cold-pulls regularly, inspect wear on abrasive-material nozzles, and track replacement intervals to maintain flow stability.",
  },
  {
    title: "Klipper Pressure Advance Tuning",
    slug: "klipper-pressure-advance-tuning",
    excerpt: "Tune pressure advance with minimal guesswork using a controlled test sequence.",
    content: "Start from conservative values, print calibration patterns, and choose the setting that removes corner blobbing while preserving wall quality.",
  },
  {
    title: "PETG Stringing Reduction Workflow",
    slug: "petg-stringing-reduction-workflow",
    excerpt: "A step-by-step adjustment order for retraction, travel, and temperature when PETG strings.",
    content: "Lower print temperature incrementally, tune retraction distance and speed, and optimize travel moves to reduce PETG strings.",
  },
  {
    title: "Reliable Support Removal Techniques",
    slug: "reliable-support-removal-techniques",
    excerpt: "How to tune support settings for easier removal without surface damage.",
    content: "Balance support density, interface layers, and Z-distance for clean detachment while protecting external surface finish.",
  },
  {
    title: "Filament Drying Baseline Settings",
    slug: "filament-drying-baseline-settings",
    excerpt: "Temperature and duration baseline settings for common filament families.",
    content: "Use manufacturer-safe drying temperatures and hold times for PLA, PETG, ABS, and TPU to improve print consistency.",
  },
  {
    title: "Diagnosing Layer Shifts Quickly",
    slug: "diagnosing-layer-shifts-quickly",
    excerpt: "A fast troubleshooting tree for mechanical and firmware causes of layer shifts.",
    content: "Check belt tension, pulley set screws, driver thermal limits, and acceleration settings to isolate the dominant cause.",
  },
  {
    title: "Choosing Nozzle Diameter by Use Case",
    slug: "choosing-nozzle-diameter-by-use-case",
    excerpt: "How to choose between 0.25, 0.4, 0.6, and 0.8 mm nozzles for speed and detail.",
    content: "Select smaller diameters for detail and larger diameters for strength and throughput, then retune layer height and flow limits.",
  },
]

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${url}: ${JSON.stringify(body)}`)
  }

  return body
}

async function findBlogBySlug(slug) {
  const query = new URLSearchParams({
    "filters[Slug][$eq]": slug,
    "pagination[pageSize]": "1",
    "fields[0]": "Title",
    "fields[1]": "Slug",
  })

  const body = await fetchJson(`${STRAPI_URL}/api/blogs?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
  })

  return Array.isArray(body.data) && body.data.length > 0 ? body.data[0] : null
}

async function createBlog(data) {
  const url = `${STRAPI_URL}/api/blogs?status=published`
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

async function updateBlog(documentId, data) {
  const url = `${STRAPI_URL}/api/blogs/${documentId}?status=published`
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
  console.log(`Using Strapi: ${STRAPI_URL}`)
  if (DRY_RUN) {
    console.log("DRY_RUN enabled")
  }

  let created = 0
  let updated = 0

  for (const post of posts) {
    const existing = await findBlogBySlug(post.slug)

    const payload = {
      Title: normalizeText(post.title),
      Slug: normalizeText(post.slug),
      Excerpt: normalizeText(post.excerpt),
      Content: normalizeText(post.content),
      FeaturedImage: DEFAULT_BLOG_IMAGE_ID,
    }

    if (!existing) {
      await createBlog(payload)
      created += 1
      console.log(`Created blog: ${post.slug}`)
      continue
    }

    await updateBlog(existing.documentId || existing.id, payload)
    updated += 1
    console.log(`Updated blog: ${post.slug}`)
  }

  console.log("Summary")
  console.log(`- Total processed: ${posts.length}`)
  console.log(`- Created: ${created}`)
  console.log(`- Updated: ${updated}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
