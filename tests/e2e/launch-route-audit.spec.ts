import { expect, test, type Page } from "@playwright/test"

test.setTimeout(180_000)

const publicLaunchRoutes = [
  "/",
  "/shop",
  "/search",
  "/brands",
  "/bundles",
  "/collections",
  "/deals",
  "/blog",
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/privacy-policy",
  "/terms-and-conditions",
  "/help",
  "/faq",
  "/docs",
  "/guides",
  "/community",
  "/track-order",
  "/order/track",
  "/cart",
  "/sign-in",
  "/sign-up",
]

const protectedLaunchRoutes = ["/wishlist", "/waitlist", "/account"]
const unlaunchedRoutes = ["/products", "/compare", "/gift-cards", "/loyalty"]
const ambiguousAccountRoutes = [
  { from: "/account/saved", to: "/wishlist" },
  { from: "/account/alerts", to: "/waitlist" },
]

async function collectInternalLinks(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" })

  return page.locator("a[href^='/']").evaluateAll((links) =>
    Array.from(
      new Set(
        links
          .map((link) => link.getAttribute("href"))
          .filter((href): href is string => Boolean(href))
          .map((href) => href.split("#")[0])
          .filter((href) => href.length > 0)
          .filter((href) => !href.startsWith("/_next"))
      )
    )
  )
}

test.describe("Launch route audit", () => {
  test("public and protected launch routes resolve without 404s", async ({
    page,
  }) => {
    for (const route of publicLaunchRoutes) {
      const response = await page.request.get(route)
      expect.soft(response.status(), route).toBeLessThan(400)
    }

    for (const route of protectedLaunchRoutes) {
      const response = await page.request.get(route)
      expect.soft(response.status(), route).toBeLessThan(400)
    }
  })

  test("unlaunched pages are real 404s and ambiguous account routes redirect", async ({
    page,
  }) => {
    for (const route of unlaunchedRoutes) {
      const response = await page.request.get(route)
      expect.soft(response.status(), route).toBe(404)
    }

    for (const route of ambiguousAccountRoutes) {
      const response = await page.request.get(route.from, { maxRedirects: 0 })
      expect.soft([307, 308], route.from).toContain(response.status())
      expect.soft(response.headers().location, route.from).toContain(route.to)
    }
  })

  test("sitemap and launched internal links do not expose zombie routes", async ({
    page,
  }) => {
    const sitemap = await page.request.get("/sitemap.xml")
    expect(sitemap.status()).toBeLessThan(400)

    const sitemapText = await sitemap.text()
    const sitemapPaths = Array.from(
      sitemapText.matchAll(/<loc>(.*?)<\/loc>/g),
      ([, loc]) => new URL(loc).pathname
    )

    for (const route of [...unlaunchedRoutes, "/account/saved", "/account/alerts"]) {
      expect(sitemapPaths).not.toContain(route)
    }

    for (const route of ["/", "/shop", "/brands", "/collections", "/bundles", "/deals", "/help"]) {
      const links = await collectInternalLinks(page, route)

      for (const zombieRoute of [
        ...unlaunchedRoutes,
        "/account/saved",
        "/account/alerts",
      ]) {
        expect(links, `${route} should not link ${zombieRoute}`).not.toContain(
          zombieRoute
        )
      }

      for (const href of links) {
        const response = await page.request.get(href)
        expect.soft(response.status(), `${route} -> ${href}`).not.toBe(404)
      }
    }
  })
})
