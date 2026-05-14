import { expect, test } from "@playwright/test"
import { addTestBundleToCart } from "./helpers"

test.setTimeout(120_000)

test.describe("Checkout summary pricing", () => {
  test("keeps cart prices intact through checkout", async ({ page }) => {
    await addTestBundleToCart(page)

    await page.goto("/cart")
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.locator("main")).toContainText("A$87.40")

    await page.getByText("Proceed to Checkout").click()

    await expect(page).toHaveURL(/\/checkout/)
    const orderSummary = page.getByTestId("order-summary")
    await expect(orderSummary).toBeVisible()

    await expect(orderSummary).toContainText(/order summary/i)
    await expect(orderSummary).toContainText("A$87.40")
    await expect(orderSummary).toContainText("A$46.08")
    await expect(orderSummary).toContainText("A$41.32")
    await expect(orderSummary).not.toContainText("Order_Manifest")
    await expect(orderSummary).not.toContainText("A$0.87")
  })
})
