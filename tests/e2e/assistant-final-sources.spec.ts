import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== new URL(baseURL!).origin) await route.abort()
    else await route.continue()
  })
})

async function openFixture(page: import("@playwright/test").Page, withSources: boolean, natural = false) {
  // In-memory SSE exercises the actual SDK transport with controlled chunk timing.
  // No assistant, provider or backend request leaves the browser.
  await page.addInitScript(({ withSources, natural }) => {
    const original = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      if (!url.includes("/api/ai-shopping-assistant")) return original(input, init)
      const encoder = new TextEncoder()
      const stream = new ReadableStream({ start(controller) {
        const write = (part: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`))
        write({ type: "start", messageId: "fixture-answer" })
        if (withSources) {
          // Early/repeated parts must not interrupt the visible answer.
          write({ type: "source-url", sourceId: "one", url: "https://source.example/manual", title: "Material document" })
          write({ type: "source-url", sourceId: "two", url: "https://source.example/manual", title: "Temperature document" })
          write({ type: "source-url", sourceId: "unsafe", url: "javascript:alert(1)", title: "Unsafe" })
        }
        write({ type: "text-start", id: "reply" })
        write({ type: "text-delta", id: "reply", delta: natural ? "For PETG on glass, Magigoo Original is a supported choice." : "The 500°C figure is the hotend's stated heat-resistance rating." })
        Object.assign(window, { finishAssistantFixture: () => {
          if (!natural) write({ type: "text-delta", id: "reply", delta: " It does not establish a safe operating temperature for your printer; the heater, sensor, wiring and firmware limits still need checking.\n\nWhich printer model are you using, and has its hotend setup been modified?" })
          write({ type: "text-end", id: "reply" })
          write({ type: "finish", finishReason: "stop" })
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } })
      } })
      return new Response(stream, { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } })
    }
  }, { withSources, natural })
  await page.goto("/privacy-policy")
  await page.getByRole("button", { name: "Shopping assistant", exact: true }).click()
  await page.getByRole("textbox", { name: "Ask the shopping assistant" }).fill(natural ? "Can I use Magigoo Original for PETG on glass?" : "Can I run my Dragonfly BMS at 500°C?")
  await page.getByRole("button", { name: "Send", exact: true }).click()
  await expect(page.getByText(natural ? "For PETG on glass, Magigoo Original is a supported choice." : "The 500°C figure is the hotend's stated heat-resistance rating.", { exact: true })).toBeVisible()
}

for (const withSources of [true, false]) {
  test(`Sources stay at the end after completion (sources=${withSources})`, async ({ page }, testInfo) => {
    await openFixture(page, withSources)
    const sources = page.getByRole("navigation", { name: "Evidence sources" })
    await expect(sources).toHaveCount(0)
    await expect(page.getByText("Thinking...", { exact: true })).toBeVisible()
    await page.evaluate(() => (window as unknown as { finishAssistantFixture: () => void }).finishAssistantFixture())
    await expect(page.getByText("Thinking...", { exact: true })).toHaveCount(0)
    await expect(page.getByText(/heater, sensor, wiring and firmware limits still need checking/)).toBeVisible()
    if (withSources) {
      await expect(sources).toBeVisible()
      await expect(sources.getByRole("link")).toHaveCount(1)
      await expect(sources.getByRole("link")).toHaveAttribute("href", "https://source.example/manual")
      await expect(sources.getByRole("link")).toContainText("Material document")
      await expect(sources.getByRole("link")).toContainText("Temperature document")
      expect(await sources.evaluate((node) => node === node.parentElement?.lastElementChild)).toBe(true)
    } else await expect(sources).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath("final-sources.png"), animations: "disabled" })
  })
}

test("reviewed natural synthesis keeps deterministic Sources at the end of the actual drawer", async ({ page }, testInfo) => {
  await openFixture(page, true, true)
  const sources = page.getByRole("navigation", { name: "Evidence sources" })
  await expect(sources).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { finishAssistantFixture: () => void }).finishAssistantFixture())
  await expect(page.getByText("Thinking...", { exact: true })).toHaveCount(0)
  await expect(page.getByText("For PETG on glass, Magigoo Original is a supported choice.", {exact:true})).toBeVisible()
  await expect(sources).toBeVisible()
  await expect(sources.getByRole("link")).toHaveCount(1)
  expect(await sources.evaluate(node=>node===node.parentElement?.lastElementChild)).toBe(true)
  await page.screenshot({path:testInfo.outputPath("reviewed-natural-sources.png"),animations:"disabled"})
})
