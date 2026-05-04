import { expect, test } from "@playwright/test"

test.describe("Checkout summary pricing", () => {
  test("keeps cart prices intact through checkout", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => {
      localStorage.removeItem("_medusa_cart_id")
      document.cookie = "_medusa_cart_id=; Path=/; Max-Age=0; SameSite=Lax"
    })

    await page.goto("/products/test-bundle-product")

    await page.getByRole("button", { name: /add bundle to cart/i }).click()
    await expect(page.getByText("Bundle added to cart", { exact: true })).toBeVisible({
      timeout: 60_000,
    })
    await page.waitForFunction(() => localStorage.getItem("_medusa_cart_id"))

    await page.goto("/cart")
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.locator("main")).toContainText("A$87.40")

    await page.getByText("Proceed to Checkout").click()

    await expect(page).toHaveURL(/\/checkout/)
    const orderSummary = page.getByTestId("order-summary")
    await expect(orderSummary).toBeVisible()

    await expect(orderSummary).toContainText("Order summary")
    await expect(orderSummary).toContainText("A$87.40")
    await expect(orderSummary).toContainText("A$46.08")
    await expect(orderSummary).toContainText("A$41.32")
    await expect(orderSummary).not.toContainText("Order_Manifest")
    await expect(orderSummary).not.toContainText("A$0.87")
  })
})
