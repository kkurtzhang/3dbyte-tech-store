import { expect, test, type Page } from "@playwright/test";

const proposalId = "a".repeat(64);
const receipt = "b".repeat(64);
const digest = "c".repeat(64);
function combinedStream(status = "matches") {
  const chunks = [
    { type: "start", messageId: "combined-answer" },
    { type: "start-step" },
    {
      type: "data-product-search",
      transient: true,
      data: {
        messageId: "combined-answer",
        callId: "search",
        status,
        mode: "search",
        query: "PETG",
        products:
          status === "matches"
            ? [
                {
                  id: "prod_petg",
                  title: "Fixture PETG",
                  href: "/products/petg",
                  match: "search",
                },
              ]
            : [],
      },
    },
    {
      type: "tool-input-available",
      toolCallId: "draft",
      toolName: "createSupportTicket",
      input: {
        name: "Synthetic Customer",
        email: "synthetic@example.invalid",
        subject: "Synthetic support",
        message: "Synthetic request",
      },
    },
    // A receipt in tool output is never authority. The component obtains its own
    // preview from the direct endpoint before it exposes any send control.
    {
      type: "tool-output-available",
      toolCallId: "draft",
      output: {
        status: "confirmation_required",
        proposalId,
        expiresAt: Date.now() + 600000,
        receipt: "untrusted-tool-receipt",
      },
    },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  ];
  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
}
function preview(include = false) {
  return {
    status: "confirmation_required",
    proposalId,
    receipt: include ? "d".repeat(64) : receipt,
    digest: include ? "e".repeat(64) : digest,
    expiresAt: Date.now() + 120000,
    payload: {
      name: "Synthetic Customer",
      email: "synthetic@example.invalid",
      subject: "Synthetic support",
      message: "Synthetic request",
      category: "general",
      priority: "normal",
      order_reference: null,
      product_handle: null,
      ai_summary: null,
      transcript_excerpt: include ? "user: Synthetic conversation" : null,
      consent_to_include_transcript: include,
      customerLinked: false,
      orderVerified: false,
      supportInbox: "support@example.invalid",
    },
  };
}
const saved = {
  status: "submitted",
  notificationStatus: "pending",
  ticket: {
    id: "synthetic-ticket",
    ticket_number: "SYNTHETIC-1",
    status: "new",
  },
};
async function open(page: Page, status = "matches") {
  await page.route("**/api/ai-shopping-assistant", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: combinedStream(status),
    }),
  );
  await page.goto("/privacy-policy");
  await page
    .getByRole("button", { name: "Shopping assistant", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Ask the shopping assistant" })
    .fill("Show PETG options and prepare a support draft");
  await page.getByRole("button", { name: "Send", exact: true }).click();
}
test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === new URL(baseURL!).origin
      ? route.continue()
      : route.abort(),
  );
});

test("no-prose product actions coexist with explicit review and send, then saved/delayed status", async ({
  page,
}, info) => {
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/ai-shopping-assistant/support-ticket", (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    return route.fulfill({
      status: input.action === "confirm" ? 201 : 200,
      json: input.action === "confirm" ? saved : preview(),
    });
  });
  await open(page);
  await expect(
    page.getByRole("link", { name: "View product", exact: true }),
  ).toHaveAttribute("href", "/products/petg");
  await expect(
    page.getByRole("button", { name: "Send support request" }),
  ).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Review support request" }).click();
  await expect(
    page.getByText("support@example.invalid", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No conversation transcript will be included."),
  ).toBeVisible();
  expect(requests).toEqual([
    { action: "preview", proposalId, includeTranscript: false },
  ]);
  await page.screenshot({
    path: info.outputPath("combined-review.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Send support request" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "SYNTHETIC-1 was saved" }),
  ).toContainText("Email may be delayed");
  expect(requests[1]).toEqual({
    action: "confirm",
    proposalId,
    receipt,
    digest,
    confirmed: true,
  });
  await expect(
    page.getByRole("button", { name: "Send support request" }),
  ).toHaveCount(0);
  expect(requests.filter((r) => r.action === "confirm")).toHaveLength(1);
});

test("empty products do not hide support review and an invalid proposal never exposes send", async ({
  page,
}) => {
  await page.route("**/api/ai-shopping-assistant/support-ticket", (route) =>
    route.fulfill({ status: 409, json: { error: "Check request status" } }),
  );
  await open(page, "empty");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "No matching products were found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review support request" }).click();
  await expect(
    page
      .getByRole("region", { name: "Review support request" })
      .getByRole("alert"),
  ).toContainText("Check request status");
  await expect(
    page.getByRole("button", { name: "Send support request" }),
  ).toHaveCount(0);
});

test("mobile transcript opt-in rotates the receipt while retaining the product action", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/ai-shopping-assistant/support-ticket", (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    return route.fulfill({
      status: 200,
      json:
        input.action === "confirm"
          ? saved
          : preview(input.includeTranscript === true),
    });
  });
  await open(page);
  await page.getByRole("button", { name: "Review support request" }).click();
  await page.getByRole("checkbox").check();
  await expect(
    page.getByText("user: Synthetic conversation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View product", exact: true }),
  ).toHaveAttribute("href", "/products/petg");
  await page.screenshot({
    path: info.outputPath("combined-mobile-consent.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Send support request" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "SYNTHETIC-1 was saved" }),
  ).toBeVisible();
  expect(requests.at(-1)).toEqual({
    action: "confirm",
    proposalId,
    receipt: "d".repeat(64),
    digest: "e".repeat(64),
    confirmed: true,
  });
});

test("an uncertain send recovers saved status through review without replaying confirmation", async ({
  page,
}) => {
  let confirmCount = 0;
  await page.route("**/api/ai-shopping-assistant/support-ticket", (route) => {
    const input = route.request().postDataJSON();
    if (input.action === "confirm") {
      confirmCount++;
      return route.fulfill({
        status: 503,
        json: { error: "Check request status" },
      });
    }
    return route.fulfill({
      status: 200,
      json: confirmCount ? saved : preview(),
    });
  });
  await open(page);
  await page.getByRole("button", { name: "Review support request" }).click();
  await page.getByRole("button", { name: "Send support request" }).click();
  await expect(
    page
      .getByRole("region", { name: "Review support request" })
      .getByRole("alert"),
  ).toContainText("Check request status");
  await expect(
    page.getByRole("button", { name: "Send support request" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Review support request" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "SYNTHETIC-1 was saved" }),
  ).toContainText("Email may be delayed");
  expect(confirmCount).toBe(1);
});

test("the actual direct confirmation endpoint rejects a foreign origin before backend access", async ({
  request,
  baseURL,
}) => {
  const response = await request.post(
    `${baseURL}/api/ai-shopping-assistant/support-ticket`,
    {
      headers: {
        origin: "https://foreign.example",
        "content-type": "application/json",
      },
      data: { action: "confirm", proposalId, receipt, digest, confirmed: true },
    },
  );
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({
    error: "Same-origin confirmation required",
  });
});
