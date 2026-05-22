import { expect, test } from "@playwright/test"

test("contact form creates a support ticket and shows the ticket number", async ({ page }) => {
  await page.route("**/api/support-tickets", async (route) => {
    const payload = route.request().postDataJSON()

    expect(payload).toMatchObject({
      name: "E2E Customer",
      email: "e2e.support@example.com",
      subject: "Order Status",
      category: "order_status",
      source: "contact_form",
    })

    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        ticket: {
          id: "spt_e2e",
          ticket_number: "3DBS-E2E1-234567",
          status: "new",
        },
      }),
    })
  })

  await page.goto("/contact")
  await page.getByLabel(/^name$/i).fill("E2E Customer")
  await page.getByLabel(/^email$/i).fill("e2e.support@example.com")
  await page.getByLabel(/^subject$/i).selectOption("Order Status")
  await page.getByLabel(/^message$/i).fill("Can you check this order?")
  await page.getByRole("button", { name: /send message/i }).click()

  await expect(page.getByText(/support request received/i)).toBeVisible()
  await expect(page.getByText(/3DBS-E2E1-234567/)).toBeVisible()
})
