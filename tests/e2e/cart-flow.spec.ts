import { expect, test } from "@playwright/test"
import { addTestBundleToCart, clearCartState } from "./helpers"

test.setTimeout(120_000)

test.describe("Cart Flow", () => {
  test("empty cart state is displayed", async ({ page }) => {
    await clearCartState(page)
    await page.goto("/cart")

    await expect(page.locator("main")).toBeVisible()
    await expect(page.locator("main")).toContainText(/cart/i)
  })

  test("can open the cart sheet from homepage", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: /open cart/i }).click()

    await expect(page.getByRole("dialog")).toContainText(/cart/i)
  })

  test("cart displays the test bundle when added", async ({ page }) => {
    await addTestBundleToCart(page)
    await page.goto("/cart")

    await expect(page.locator("main")).toContainText(/ldo colony clacker door kit/i)
    await expect(page.locator("main")).toContainText(/box turtle apex gearset/i)
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 60_000,
    })
  })
})
