import { expect, test } from "@playwright/test"

test.describe("Product locality search", () => {
  test("uses the locality autocomplete endpoint for PDP postage suggestions", async ({
    page,
  }) => {
    const addressAutocompleteRequests: string[] = []

    page.on("request", (request) => {
      if (request.url().includes("/store/addresses/autocomplete")) {
        addressAutocompleteRequests.push(request.url())
      }
    })

    await page.route("**/store/localities/autocomplete**", async (route) => {
      const url = new URL(route.request().url())

      expect(url.searchParams.get("q")).toBe("Wol")
      expect(url.searchParams.get("country")).toBe("AU")

      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          localities: [
            {
              id: "au_nsw_2500_wollongong",
              display_name: "Wollongong, NSW 2500",
              locality: "Wollongong",
              state: "NSW",
              postcode: "2500",
              country: "AU",
            },
          ],
          count: 1,
          processingTimeMs: 1,
        }),
      })
    })

    await page.goto("/products/test-bundle-product")

    const localityRequest = page.waitForRequest((request) => {
      return (
        request.url().includes("/store/localities/autocomplete") &&
        request.url().includes("q=Wol")
      )
    })

    await page.getByRole("combobox", { name: /suburb or postcode/i }).fill("Wol")
    await localityRequest

    const option = page.getByRole("option", { name: "Wollongong NSW 2500" })
    await expect(option).toBeVisible()

    await option.click()
    await expect(
      page.getByRole("combobox", { name: /suburb or postcode/i })
    ).toHaveValue("Wollongong NSW 2500")
    expect(addressAutocompleteRequests).toEqual([])
  })
})
