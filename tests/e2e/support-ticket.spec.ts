import { expect, test } from "@playwright/test"

const ticketNumberPattern = /3DBS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{6}/

test("contact form creates a support ticket through the live API", async ({ page }) => {
  const email = `e2e.support+${Date.now()}@example.com`
  const supportTicketResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/support-tickets") &&
      response.request().method() === "POST",
  )

  await page.goto("/contact")
  await page.getByLabel(/^name$/i).fill("E2E Customer")
  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^subject$/i).selectOption("Order Status")
  await page.getByLabel(/^message$/i).fill("Can you check this order?")
  await page.getByRole("button", { name: /send message/i }).click()

  const response = await supportTicketResponse
  const payload = await response.json()
  const ticketNumber = payload?.ticket?.ticket_number

  expect(response.status()).toBe(201)
  expect(ticketNumber).toMatch(ticketNumberPattern)
  await expect(page.getByText(/support request received/i)).toBeVisible()
  await expect(page.getByText(ticketNumber)).toBeVisible()
})
