import { expect, test } from "@playwright/test"
import { addTestBundleToCart, clearCartState } from "./helpers"

test.setTimeout(120_000)

async function openCheckoutWithBundle(page: Parameters<typeof addTestBundleToCart>[0]) {
  await addTestBundleToCart(page)
  await page.goto("/checkout")
}

async function continueAsGuest(page: Parameters<typeof addTestBundleToCart>[0]) {
  await page.getByRole("button", { name: "Continue as guest" }).click()
  await expect(page.getByText("Checking out as guest")).toBeVisible()
}

function checkoutForm(page: Parameters<typeof addTestBundleToCart>[0]) {
  return page.locator("main form").first()
}

test.describe("Checkout Flow", () => {
  test("empty checkout redirects shoppers back to the storefront", async ({ page }) => {
    await clearCartState(page)

    await page.goto("/checkout")

    await expect(page).toHaveURL("/")
  })

  test("checkout page loads with cart items and order summary", async ({ page }) => {
    await openCheckoutWithBundle(page)

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible()
    await expect(page.getByTestId("order-summary")).toBeVisible()
    await expect(page.getByTestId("order-summary")).toContainText(/order summary/i)
  })

  test("can navigate to checkout from cart", async ({ page }) => {
    await addTestBundleToCart(page)
    await page.goto("/cart")

    await page.getByText("Proceed to Checkout").click({ noWaitAfter: true })
    await page.waitForURL(/\/checkout/, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    await expect(page.getByTestId("order-summary")).toBeVisible()
  })

  test("shipping contact fields accept customer input", async ({ page }) => {
    await openCheckoutWithBundle(page)

    await continueAsGuest(page)
    const form = checkoutForm(page)

    await form.getByLabel(/email address/i).fill("test@example.com")

    await expect(form.getByLabel(/email address/i)).toHaveValue("test@example.com")
    await expect(form.getByRole("button", { name: /continue to delivery/i })).toBeVisible()
  })

  test("checkout validation is shown before delivery selection", async ({ page }) => {
    await openCheckoutWithBundle(page)

    await continueAsGuest(page)
    await checkoutForm(page).getByRole("button", { name: /continue to delivery/i }).click()

    await expect(page.getByText("Required").first()).toBeVisible()
  })

  test("payment step is represented in the checkout flow", async ({ page }) => {
    await openCheckoutWithBundle(page)

    await expect(page.getByLabel("Payment")).toBeVisible()
  })
})
