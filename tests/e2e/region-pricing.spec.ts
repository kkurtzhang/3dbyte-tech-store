import { expect, test, type Page } from "@playwright/test"

const REGION_COOKIE_URL = "http://localhost:3001"

async function selectCountryPricing(page: Page, countryCode: "au" | "nz") {
  await page.context().clearCookies()
  await page.context().addCookies([
    {
      name: "_medusa_country_code",
      value: countryCode,
      url: REGION_COOKIE_URL,
    },
    {
      name: "_medusa_currency_code",
      value: countryCode === "nz" ? "nzd" : "aud",
      url: REGION_COOKIE_URL,
    },
  ])
}

async function expectShopPriceForCurrency(
  page: Page,
  currencySymbolPattern: RegExp
) {
  await page.goto("/shop")
  await expect(
    page.getByRole("heading", { name: /all products/i })
  ).toBeVisible()
  await expect(
    page.locator("main").getByText(currencySymbolPattern).first()
  ).toBeVisible({
    timeout: 60_000,
  })
}

test.describe("AU/NZ region pricing", () => {
  test("renders shop listing prices in the selected launch currency", async ({
    page,
  }) => {
    await selectCountryPricing(page, "au")
    await expectShopPriceForCurrency(page, /A\$\d/)

    await selectCountryPricing(page, "nz")
    await expectShopPriceForCurrency(page, /NZ\$\d/)
  })
})
