import { expect, test } from "@playwright/test"
import {
  continueCheckoutAsGuest,
  fillCheckoutShippingAddress,
  openCheckoutWithTestBundle,
} from "./helpers"

test.describe("Support and checkout secondary coverage", () => {
  test("contact page exposes the support form without submitting mailto", async ({ page }) => {
    await page.goto("/contact")

    const form = page.locator("form").filter({ hasText: "Send Message" }).first()
    await expect(page.getByRole("heading", { name: /contact/i })).toBeVisible()
    await expect(form.getByLabel(/^name$/i)).toBeVisible()
    await expect(form.getByLabel(/^email$/i)).toBeVisible()
    await expect(form.getByLabel(/^subject$/i)).toBeVisible()
    await expect(form.getByLabel(/^message$/i)).toBeVisible()
    await expect(form.getByRole("button", { name: /send message/i })).toBeVisible()
  })

  test("track-order reports an invalid order lookup cleanly", async ({ page }) => {
    await page.goto("/track-order")

    await page.getByLabel(/order number or reference/i).fill("3DBO-NOT-FOUND")
    await page.getByLabel(/email address/i).fill("missing-order@example.com")
    await page.getByRole("button", { name: /track order/i }).click()

    await expect(
      page.getByText(/order not found|unable to look up your order/i)
    ).toBeVisible({ timeout: 60_000 })
  })

  test("newsletter API rejects invalid payloads at the storefront boundary", async ({
    page,
  }) => {
    const response = await page.request.post("/api/newsletter/subscribe", {
      data: { email: "not-an-email" },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: "Invalid request payload.",
      })
    )
  })

  test("checkout reaches delivery options after a complete guest address", async ({
    page,
  }) => {
    test.setTimeout(180_000)

    await openCheckoutWithTestBundle(page)
    await continueCheckoutAsGuest(page)
    await fillCheckoutShippingAddress(page)

    await page
      .locator("main form")
      .first()
      .getByRole("button", { name: /continue to delivery/i })
      .click()

    await expect(page.getByRole("heading", { name: /delivery method/i })).toBeVisible({
      timeout: 90_000,
    })
    await expect(page.getByRole("button", { name: /continue to payment/i })).toBeVisible()
  })
})
