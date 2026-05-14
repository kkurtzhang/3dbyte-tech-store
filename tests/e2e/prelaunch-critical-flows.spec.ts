import { expect, test, type Page } from "@playwright/test"

test.setTimeout(180_000)

function capturePageErrors(page: Page) {
  const errors: string[] = []

  page.on("pageerror", (error) => {
    errors.push(error.message)
  })

  return errors
}

test.describe("Pre-launch critical storefront flows", () => {
  test("shop pages load without client hook errors", async ({ page }) => {
    const pageErrors = capturePageErrors(page)

    await page.goto("/shop")
    await expect(page.getByRole("heading", { name: /all products/i })).toBeVisible()

    await page.goto("/shop?category=Filament")
    await expect(page.getByRole("heading", { name: /all products/i })).toBeVisible()
    await expect(page).toHaveURL(/\/shop\?category=Filament/)

    await page.goto("/search?q=nozzle", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: /search: \"nozzle\"/i })).toBeVisible()
    await expect(page).toHaveURL(/\/search\?q=nozzle/)

    expect(pageErrors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining("Rendered more hooks than during the previous render"),
      ])
    )
  })

  test("quick view opens an accessible product dialog", async ({ page }) => {
    await page.goto("/shop")

    await page.getByRole("button", { name: /quick view/i }).first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/view full details|add to cart/i)
  })

  test("404 suggestions and launched navigation do not expose zombie catalog, compare, gift-card, or loyalty links", async ({
    page,
  }) => {
    await page.goto("/definitely-not-a-launched-page")

    const internalHrefs = await page
      .locator("main a[href^='/']")
      .evaluateAll((links) =>
        Array.from(
          new Set(
            links
              .map((link) => link.getAttribute("href"))
              .filter((href): href is string => Boolean(href))
          )
        )
      )

    expect(internalHrefs).toContain("/shop")
    expect(internalHrefs).not.toContain("/products")
    expect(internalHrefs).not.toContain("/categories")
    expect(internalHrefs).not.toContain("/compare")
    expect(internalHrefs).not.toContain("/gift-cards")
    expect(internalHrefs).not.toContain("/loyalty")

    for (const href of internalHrefs) {
      const response = await page.request.get(href)
      expect.soft(response.status(), href).not.toBe(404)
    }

    await page.goto("/")
    const launchedNavigationHrefs = await page
      .locator("header a[href], footer a[href]")
      .evaluateAll((links) =>
        Array.from(
          new Set(
            links
              .map((link) => link.getAttribute("href"))
              .filter((href): href is string => Boolean(href))
          )
        )
      )

    expect(launchedNavigationHrefs).not.toContain("/gift-cards")
    expect(launchedNavigationHrefs).not.toContain("/loyalty")
    expect(launchedNavigationHrefs).not.toContain("/compare")

    for (const href of launchedNavigationHrefs.filter((href) => href.startsWith("/"))) {
      const response = await page.request.get(href)
      expect.soft(response.status(), `navigation ${href}`).not.toBe(404)
    }

    const sitemap = await page.request.get("/sitemap.xml")
    const sitemapText = await sitemap.text()
    expect(sitemapText).not.toContain("/gift-cards")
    expect(sitemapText).not.toContain("/loyalty")
    expect(sitemapText).not.toContain("/compare")

    const compareResponse = await page.request.get("/compare")
    expect.soft(compareResponse.status(), "/compare").toBe(404)

    const giftCardsResponse = await page.request.get("/gift-cards")
    expect.soft(giftCardsResponse.status(), "/gift-cards").toBe(404)

    const loyaltyResponse = await page.request.get("/loyalty")
    expect.soft(loyaltyResponse.status(), "/loyalty").toBe(404)
  })
})
