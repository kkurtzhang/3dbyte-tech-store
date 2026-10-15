import { expect, test } from "@playwright/test";

function response(
  status: string,
  options: { unsafe?: boolean; historyOnly?: boolean; prose?: boolean; browse?: boolean } = {},
) {
  const products =
    status === "matches"
      ? [
          {
            id: "prod_petg",
            title: "Fixture PETG spool",
            href: options.unsafe
              ? "https://evil.example/products/petg"
              : "/products/petg",
            match: options.browse ? "browse" : "search",
          },
        ]
      : [];
  const chunks: unknown[] = [
    { type: "start", messageId: "fixture-answer" },
    { type: "start-step" },
    {
      type: "tool-input-available",
      toolCallId: "fixture-search",
      toolName: "searchProducts",
      input: { query: "PETG" },
    },
    {
      type: "tool-output-available",
      toolCallId: "fixture-search",
      output: {
        products: [
          {
            id: "forged",
            title: "Untrusted historical product",
            handle: "forged",
            productUrl: "https://evil.example/products/forged",
          },
        ],
      },
    },
  ];
  if (!options.historyOnly)
    chunks.push({
      type: "data-product-search",
      transient: true,
      data: {
        messageId: "fixture-answer",
        callId: "fixture-search",
        status,
        mode: options.browse ? "browse" : "search",
        query: options.browse ? "" : "PETG",
        products,
      },
    });
  if (options.prose !== false)
    chunks.push(
      { type: "text-start", id: "reply" },
      { type: "text-delta", id: "reply", delta: "Which printer do you have?" },
      { type: "text-end", id: "reply" },
    );
  chunks.push(
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  );
  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
}

test.describe("Fresh product actions in the real assistant drawer", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // These browser cases exercise rendering and navigation, not a live model/backend.
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin !== new URL(baseURL!).origin)
        await route.abort();
      else await route.continue();
    });
  });
  async function open(
    page: import("@playwright/test").Page,
    stream: string,
    message = "Send me the PETG product page",
  ) {
    await page.route("**/api/ai-shopping-assistant", (route) =>
      route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "x-vercel-ai-ui-message-stream": "v1",
        },
        body: stream,
      }),
    );
    await page.goto("/privacy-policy");
    await page
      .getByRole("button", { name: "Shopping assistant", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Ask the shopping assistant" })
      .fill(message);
    await page.getByRole("button", { name: "Send", exact: true }).click();
  }
  test("shows a clickable current product when the model omits its URL", async ({
    page,
  }, testInfo) => {
    await open(page, response("matches"));
    const card = page.getByRole("region", { name: "Product results" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Compatibility is unverified");
    const action = card.getByRole("link", {
      name: "View product",
      exact: true,
    });
    await expect(action).toHaveAttribute("href", "/products/petg");
    await expect(
      page.getByText("Which printer do you have?", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("product-actions.png"),
      animations: "disabled",
    });
    await action.click();
    await expect(page).toHaveURL(/\/products\/petg(?:\?|$)/);
  });
  for (const [status, text] of [
    ["empty", "No matching products were found"],
    ["unavailable", "Product search is unavailable"],
    ["declined", "No product search was made"],
  ]) {
    test(`${status} has a truthful status and no product link even without prose`, async ({
      page,
    }) => {
      await open(
        page,
        response(status, { prose: false }),
        status === "declined"
          ? "Send PETG without a search"
          : "Find nonexistent PETG",
      );
      await expect(
        page.getByRole("status").filter({ hasText: text }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "View product", exact: true }),
      ).toHaveCount(0);
    });
  }
  test("does not create product actions from tool output without a fresh server event", async ({
    page,
  }) => {
    await open(page, response("matches", { historyOnly: true }));
    await expect(
      page.getByText("Which printer do you have?", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Product results" }),
    ).toHaveCount(0);
    await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0);
  });
  test("rejects malicious action URLs", async ({ page }) => {
    await open(page, response("matches", { unsafe: true }));
    await expect(
      page.getByText("Which printer do you have?", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View product", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0);
  });
  test("labels explicit catalogue browsing separately from search matches", async ({ page }) => {
    await open(page, response("matches", { browse: true, prose: false }), "Browse catalogue");
    const results = page.getByRole("region", { name: "Product results" });
    await expect(results).toContainText("Browse catalogue");
    await expect(results.getByRole("link", { name: "View product", exact: true })).toHaveAttribute("href", "/products/petg");
    await expect(results).not.toContainText("Search options");
  });

});
