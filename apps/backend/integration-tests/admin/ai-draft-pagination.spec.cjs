const { test, expect } = require("@playwright/test")

const next = (page) => page.getByRole("button", { name: "Next", exact: true })
const prev = (page) => page.getByRole("button", { name: "Prev", exact: true })
const search = (page) => page.getByRole("textbox", { name: "Search AI product drafts" })
const request = (page) => page.getByLabel("Last list request")
const expectOffset = async (page, offset) => {
  await expect(request(page)).toContainText(`"offset":${offset}`)
  await expect(next(page)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error("Fixture render error:", error.message))
  await page.goto("/")
  await expect(page.getByText("15 of 47 results", { exact: true })).toBeVisible()
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 365 }, { width: 390, height: 844 }]) {
  test(`keeps native bottom pagination reachable and unclipped at ${viewport.width}px and requests every page`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const footer = page.getByRole("navigation", { name: "AI product drafts pagination" })
    await expect.poll(() => footer.evaluate((nav) => document.querySelector("table").compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy()
    await next(page).scrollIntoViewIfNeeded()
    await expect(next(page)).toBeInViewport({ ratio: 1 })
    await expect(footer).toBeInViewport({ ratio: 1 })
    await page.screenshot({ path: test.info().outputPath(`pagination-${viewport.width}.png`) })
    await expect(prev(page)).toBeDisabled()
    await expect(page.getByText("1 of 4 pages", { exact: true })).toBeVisible()
    await expect(request(page)).toContainText('"limit":15')
    for (const offset of [15, 30, 45]) {
      await next(page).click()
      await expectOffset(page, offset)
      await expect(page.getByRole("link", { name: `Fixture Product ${String(offset + 1).padStart(2, "0")}`, exact: true })).toBeVisible()
    }
    await expect(next(page)).toBeDisabled()
    await expect(page.getByText("47 of 47 results", { exact: true })).toBeVisible()
    await expect(page.getByText("4 of 4 pages", { exact: true })).toBeVisible()
    await prev(page).click()
    await expectOffset(page, 30)
  })
}

test("resets page for search, clear, status, queue card, and sorting changes", async ({ page }) => {
  await search(page).fill("Fixture")
  await expect(request(page)).toContainText('"q":"Fixture"')
  await next(page).click()
  await expectOffset(page, 15)
  await page.getByRole("button", { name: "Clear", exact: true }).click()
  await expect(request(page)).toContainText('"q":""')
  await expectOffset(page, 0)
  await next(page).click()
  await expectOffset(page, 15)
  await page.getByLabel("Filter AI product drafts by status").selectOption("validation_failed")
  await expectOffset(page, 0)
  await expect(page.getByRole("button", { name: "Clean up 31 failed drafts", exact: true })).toBeVisible()
  await next(page).click()
  await expectOffset(page, 15)
  await expect(page.getByRole("button", { name: "Export 31 failed drafts", exact: true })).toBeVisible()
  await expect(page.getByRole("checkbox")).toHaveCount(0)
  await page.getByRole("button", { name: "Needs Review 47", exact: true }).click()
  await expectOffset(page, 0)
  await next(page).click()
  await expectOffset(page, 15)
  await page.getByRole("button", { name: "Product", exact: true }).click()
  await expect(request(page)).toContainText('"order":"product_name"')
  await expectOffset(page, 0)
  await next(page).click()
  await expectOffset(page, 15)
  await search(page).fill("Product 47")
  await expect(request(page)).toContainText('"q":"Product 47"')
  await expectOffset(page, 0)
  await expect(page.getByText("1 of 1 results", { exact: true })).toBeVisible()
  await expect(next(page)).toBeDisabled()
})

test("resets at the debounced search boundary after an intervening page click", async ({ page }) => {
  await search(page).fill("Fixture")
  await next(page).click()
  await expectOffset(page, 15)
  await expect(request(page)).toContainText('"q":"Fixture"')
  await expectOffset(page, 0)
  await expect(page.getByText("1 of 4 pages", { exact: true })).toBeVisible()
})

test("returns to a valid page when records disappear from the last page", async ({ page }) => {
  for (const offset of [15, 30, 45]) {
    await next(page).click()
    await expectOffset(page, offset)
  }
  await page.getByRole("button", { name: "Simulate queue shrink", exact: true }).click()
  await expect(page.getByRole("link", { name: "Fixture Product 01", exact: true })).toBeVisible()
  await expectOffset(page, 0)
  await expect(page.getByText("1 of 1 results", { exact: true })).toBeVisible()
  await expect(prev(page)).toBeDisabled()
  await expect(next(page)).toBeDisabled()
})

test("handles empty results, loading, list errors, and retry without losing pagination", async ({ page }) => {
  await search(page).fill("no matches")
  await expect(page.getByText("0 of 0 results", { exact: true })).toBeVisible()
  await expect(page.getByText("1 of 1 pages", { exact: true })).toBeVisible()
  await expect(next(page)).toBeDisabled()
  await expect(prev(page)).toBeDisabled()
  await search(page).fill("slow")
  await expect(request(page)).toContainText('"q":"slow"')
  await expect(page.getByRole("link", { name: "Fixture Product 01", exact: true })).toBeVisible()
  await next(page).click()
  await expect(request(page)).toContainText('"offset":15')
  await expect(page.getByRole("navigation", { name: "AI product drafts pagination" })).toBeVisible()
  await expect(page.locator("nav fieldset")).toHaveAttribute("disabled", "")
  await expect(next(page)).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Fixture Product 16", exact: true })).toBeVisible()
  await search(page).fill("error")
  await expect(page.getByRole("alert")).toContainText("Could not load AI product drafts")
  await expect(next(page)).toBeDisabled()
  await expect(prev(page)).toBeDisabled()
  await page.getByRole("button", { name: "Try again", exact: true }).click()
  await expect(page.getByRole("alert")).toBeVisible()
  await page.getByRole("button", { name: "Clear", exact: true }).click()
  await expect(page.getByText("15 of 47 results", { exact: true })).toBeVisible()
  await expectOffset(page, 0)
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 365 }, { width: 390, height: 844 }, { width: 390, height: 365 }]) {
  test(`contains long rows and every footer label at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto("/?long=true")
    await expect(page.getByText("15 of 47 results", { exact: true })).toBeVisible()
    const footer = page.getByRole("navigation", { name: "AI product drafts pagination" })
    await footer.scrollIntoViewIfNeeded()
    const geometry = await footer.evaluate((nav) => {
      const table = document.querySelector("table")
      const scroller = table.parentElement
      const main = document.querySelector("main")
      const lastRow = table.rows[table.rows.length - 1]
      const footerRect = nav.getBoundingClientRect()
      const clip = main.getBoundingClientRect()
      const labels = [...nav.querySelectorAll("p, button")].map((element) => {
        const rect = element.getBoundingClientRect()
        return { text: element.textContent, unclipped: rect.top >= clip.top && rect.bottom <= clip.bottom && rect.left >= clip.left && rect.right <= clip.right && element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight }
      })
      return {
        afterRows: footerRect.top >= lastRow.getBoundingClientRect().bottom,
        outsideRowScroller: !scroller.contains(nav),
        completeLastRow: lastRow.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().bottom,
        noVerticalRowClipping: scroller.scrollHeight <= scroller.clientHeight + 1,
        productWidth: table.rows[1].cells[0].firstElementChild.getBoundingClientRect().width,
        labels,
      }
    })
    expect(geometry.afterRows).toBe(true)
    expect(geometry.outsideRowScroller).toBe(true)
    expect(geometry.completeLastRow).toBe(true)
    expect(geometry.noVerticalRowClipping).toBe(true)
    expect(geometry.productWidth).toBeLessThanOrEqual(250)
    await expect(page.locator("tbody tr").first().locator("td").first()).toHaveCSS("position", "static")
    await page.locator("table").evaluate((table) => { table.parentElement.scrollLeft = table.parentElement.scrollWidth })
    const trailingText = await page.locator("tbody tr").last().locator("td").nth(5).evaluate((cell) => {
      const range = document.createRange()
      range.selectNodeContents(cell)
      const text = range.getBoundingClientRect()
      const clip = cell.closest("table").parentElement.getBoundingClientRect()
      return text.left >= clip.left && text.right <= clip.right
    })
    expect(trailingText).toBe(true)
    expect(geometry.labels.every((label) => label.unclipped)).toBe(true)
    expect(geometry.labels.map((label) => label.text)).toEqual(["1", "15 of 47 results", "1 of 4 pages", "Prev", "Next"])
    await page.screenshot({ path: test.info().outputPath(`long-rows-${viewport.width}x${viewport.height}.png`) })
  })
}

test("uses the same bottom paginator presentation as the installed native Products table", async ({ page }) => {
  const footer = page.getByRole("navigation", { name: "AI product drafts pagination" })
  const presentation = await footer.locator("fieldset > div").evaluate((element) => {
    const s = getComputedStyle(element)
    return { display: s.display, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, fontSize: s.fontSize, labels: element.innerText.replace(/\s+/g, " ").trim() }
  })
  await page.goto("/native-table")
  const nativeFooter = next(page).locator("xpath=../..")
  const nativePresentation = await nativeFooter.evaluate((element) => {
    const s = getComputedStyle(element)
    return { display: s.display, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, fontSize: s.fontSize, labels: element.innerText.replace(/\s+/g, " ").trim() }
  })
  expect(presentation).toEqual(nativePresentation)
})
