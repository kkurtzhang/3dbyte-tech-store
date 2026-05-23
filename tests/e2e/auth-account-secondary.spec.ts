import { expect, test } from "@playwright/test"

test.describe("Auth and account secondary coverage", () => {
  test("email sign-in validates input without invoking Google OAuth", async ({ page }) => {
    await page.goto("/sign-in")

    const form = page.locator("form").first()
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
    await expect(form.getByRole("button", { name: /continue with google/i })).toBeVisible()

    await form.getByRole("button", { name: /^sign in$/i }).click()

    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test("email registration validates password confirmation", async ({ page }) => {
    await page.goto("/sign-up")

    const form = page.locator("form").first()
    await form.getByLabel(/^first name$/i).fill("E2E")
    await form.getByLabel(/^last name$/i).fill("Customer")
    await form.getByLabel(/^email$/i).fill("e2e-register@example.com")
    await form.getByLabel(/^password$/i).fill("password-one")
    await form.getByLabel(/^confirm password$/i).fill("password-two")
    await form.getByRole("button", { name: /create account/i }).click()

    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up/)
  })

  test("signed-out account pages redirect to email sign-in", async ({ page }) => {
    for (const accountPath of [
      "/account",
      "/account/orders",
      "/account/product-files",
      "/account/product-registrations",
      "/account/addresses",
      "/account/settings",
    ]) {
      await page.goto(accountPath)
      await expect(page).toHaveURL(/\/sign-in/)
      await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
    }
  })
})
