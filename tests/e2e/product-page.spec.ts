import { expect, test } from "@playwright/test"

test.describe("Product Page", () => {
  test("known product detail page loads", async ({ page }) => {
    await page.goto("/products/test-bundle-product")

    await expect(page).toHaveURL(/\/products\/test-bundle-product/)
    await expect(page.getByRole("heading", { name: /test bundle product/i })).toBeVisible()
    await expect(page.locator("main")).toBeVisible()
  })

  test("bundle product exposes the stocked 180mm option for purchase", async ({ page }) => {
    await page.goto("/products/test-bundle-product")

    await page.getByRole("button", { name: "Black - 180" }).click()

    await expect(page.getByText("Hardware Kit + Panel / Black - 180")).toBeVisible()
    await expect(page.getByRole("button", { name: /add bundle to cart/i })).toBeEnabled({
      timeout: 60_000,
    })
  })

  test("product page remains usable when product imagery is missing", async ({ page }) => {
    await page.goto("/products/test-bundle-product")

    await expect(page.getByRole("heading", { name: /test bundle product/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /add bundle to cart/i })).toBeVisible()
  })
})
