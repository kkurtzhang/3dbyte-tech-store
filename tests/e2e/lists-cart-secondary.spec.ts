import { expect, test } from "@playwright/test"
import {
  addTestBundleToCart,
  registerUniqueCustomer,
} from "./helpers"

test.describe("Lists and cart secondary coverage", () => {
  test("signed-out wishlist redirects to sign in", async ({ page }) => {
    await page.goto("/wishlist")

    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
  })

  test("signed-in customer can save and remove a wishlist item", async ({ page }) => {
    test.setTimeout(180_000)

    await registerUniqueCustomer(page, "/wishlist")
    await expect(
      page.getByRole("heading", { name: /your wishlist is empty/i })
    ).toBeVisible()

    await page.goto("/products/test-bundle-product")
    await page.getByRole("button", { name: "Black - 180" }).click()

    await page.getByRole("button", { name: /save to wishlist/i }).click()

    await expect(
      page.getByRole("button", { name: /remove from wishlist/i })
    ).toBeVisible({ timeout: 60_000 })
    await expect(
      page.locator("header a[href='/wishlist'] span").filter({ hasText: "1" })
    ).toBeVisible()

    await page.goto("/wishlist")

    await expect(page.getByRole("heading", { name: /my wishlist/i })).toBeVisible()
    await expect(page.getByText("Test Bundle Product")).toBeVisible()

    await page
      .getByRole("button", { name: /remove test bundle product from wishlist/i })
      .click()

    await expect(page.getByRole("heading", { name: /your wishlist is empty/i })).toBeVisible()
    await expect(
      page.locator("header a[href='/wishlist'] span").filter({ hasText: "1" })
    ).toHaveCount(0)
  })

  test("signed-out waitlist redirects to sign in", async ({ page }) => {
    await page.goto("/waitlist")

    await expect(page).toHaveURL(/\/sign-in/)
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
  })

  test("guest can subscribe to a product waitlist with email only", async ({ page }) => {
    await page.goto("/products/anycubic-s1-toolhead-short-fan-extension-cable")
    await expect(
      page.getByRole("heading", {
        name: /anycubic s1 toolhead short fan extension cable/i,
      })
    ).toBeVisible()

    await page
      .locator("input[id^='waitlist-email-']")
      .fill(`guest-${Date.now()}@example.com`)
    await page.getByRole("button", { name: /notify me/i }).click()

    await expect(
      page.getByRole("button", { name: /already notified/i })
    ).toBeVisible({ timeout: 60_000 })
    await expect(page).not.toHaveURL(/\/sign-in/)
  })

  test("signed-in customer can subscribe and remove a waitlist item", async ({ page }) => {
    test.setTimeout(180_000)

    const { email } = await registerUniqueCustomer(page, "/")
    await page.goto("/products/anycubic-s1-toolhead-short-fan-extension-cable")
    await expect(
      page.getByRole("heading", {
        name: /anycubic s1 toolhead short fan extension cable/i,
      })
    ).toBeVisible()

    await expect(page.locator("input[id^='waitlist-email-']")).toHaveValue(
      email,
      { timeout: 60_000 }
    )
    await page.getByRole("button", { name: /notify me/i }).click()
    await expect(
      page.getByRole("button", { name: /already notified/i })
    ).toBeVisible({ timeout: 60_000 })

    await page.goto("/waitlist")

    await expect(page.getByRole("heading", { name: /my waitlist/i })).toBeVisible()
    await expect(
      page.getByText("Anycubic S1 Toolhead Short Fan Extension Cable").first()
    ).toBeVisible()
    await expect(page.getByText(email).first()).toBeVisible()

    await page
      .getByRole("button", {
        name: /remove anycubic s1 toolhead short fan extension cable from waitlist/i,
      })
      .click()

    await expect(page.getByRole("heading", { name: /no notifications yet/i })).toBeVisible()
  })

  test("cart bundle quantity can be increased and removed", async ({ page }) => {
    test.setTimeout(180_000)

    await addTestBundleToCart(page)
    await page.goto("/cart")

    await expect(page.getByRole("heading", { name: /shopping cart/i })).toContainText(
      "1 item"
    )

    await page.getByRole("button", { name: /increase .* quantity/i }).click()
    await expect(page.getByRole("heading", { name: /shopping cart/i })).toContainText(
      "2 items",
      { timeout: 60_000 }
    )

    await page.getByRole("button", { name: /^remove /i }).click()
    await expect(page.getByRole("heading", { name: /your cart is empty/i })).toBeVisible({
      timeout: 60_000,
    })
  })
})
