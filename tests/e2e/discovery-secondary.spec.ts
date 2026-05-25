import { expect, test, type Page } from "@playwright/test"

async function expectPageOk(page: Page, path: string) {
  const response = await page.request.get(path)
  expect(response.status(), path).toBeLessThan(400)
}

test.describe("Discovery secondary coverage", () => {
  test("shop sorting preserves active filters and clear-all resets the listing URL", async ({
    page,
  }) => {
    await page.goto("/shop?bundle=true&inStock=false")
    await expect(page.getByRole("heading", { name: /all products/i })).toBeVisible()

    await page.getByRole("combobox", { name: /sort by/i }).click()
    await page.getByRole("option", { name: /price: high to low/i }).click()

    await expect(page).toHaveURL(/sort=price-desc/)
    await expect(page).toHaveURL(/bundle=true/)

    await page.getByRole("link", { name: "Clear All", exact: true }).click()
    await expect(page).toHaveURL(/\/shop$/)
  })

  test("collection and brand indexes expose detail links that do not 404", async ({
    page,
  }) => {
    await page.goto("/collections")
    await expect(page.getByRole("heading", { name: /shop by collection/i })).toBeVisible()

    const collectionHref = await page
      .locator("main a[href^='/collections/']")
      .first()
      .getAttribute("href")

    expect(collectionHref).toBeTruthy()
    await expectPageOk(page, collectionHref!)
    await page.goto(collectionHref!)
    await expect(page.locator("main h1").first()).toBeVisible()

    await page.goto("/brands")
    await expect(page.getByRole("heading", { name: /^brands$/i })).toBeVisible()

    const brandHref = await page
      .locator("main a[href^='/brands/']")
      .first()
      .getAttribute("href")

    expect(brandHref).toBeTruthy()
    await expectPageOk(page, brandHref!)
    await page.goto(brandHref!)
    await expect(page.locator("main h1").first()).toBeVisible()
  })

  test("launched content and support pages return non-error responses", async ({
    page,
  }) => {
    for (const path of [
      "/about",
      "/blog",
      "/bundles",
      "/community",
      "/contact",
      "/deals",
      "/docs",
      "/faq",
      "/guides",
      "/help",
      "/privacy-policy",
      "/returns",
      "/shipping",
      "/terms-and-conditions",
      "/track-order",
      "/waitlist",
      "/wishlist",
    ]) {
      await expectPageOk(page, path)
    }
  })
})
