import { expect, test } from "@playwright/test"

test.describe("Mobile launch smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("mobile nav, search, product, and cart surfaces remain usable", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /3d byte/i })).toBeVisible()

    await page.getByRole("button", { name: /open menu/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("link", { name: /^shop$/i }).click()
    await expect(page).toHaveURL(/\/shop/)
    await expect(page.locator("main h1").filter({ hasText: /all products/i })).toBeVisible()

    await page.goto("/")
    await page.getByRole("button", { name: /^search$/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByPlaceholder(/search products/i).fill("nozzle")
    await expect(
      page.getByText(/search all results for "nozzle"/i)
    ).toBeVisible({ timeout: 60_000 })

    await page.goto("/products/test-bundle-product")
    await page.getByRole("button", { name: "Black - 180" }).click()
    await expect(page.getByRole("button", { name: /add bundle to cart/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /open cart/i })).toBeVisible()
  })
})
