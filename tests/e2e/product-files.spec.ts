import { expect, test } from "@playwright/test"

test.describe("Product file surfaces", () => {
  test("download center renders the public document search shell", async ({ page }) => {
    await page.goto("/downloads")

    await expect(
      page.getByRole("heading", { name: /download center/i }),
    ).toBeVisible()
    await expect(
      page.getByLabel(/search public product documents/i),
    ).toBeVisible()
    await expect(page.getByText(/documents found/i)).toBeVisible()
  })
})
