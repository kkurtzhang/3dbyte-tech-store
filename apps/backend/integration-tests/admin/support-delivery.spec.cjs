const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});
for (const status of ["pending", "queued", "sent", "failed", "unknown"]) {
  test(`shows ${status} accurately`, async ({ page }) => {
    await page.goto(`/?status=${status}`);
    await expect(page.getByText(status, { exact: true })).toBeVisible();
    await expect(page.getByText("confirmed@example.invalid")).toBeVisible();
    if (["queued", "sent", "unknown"].includes(status))
      await expect(
        page.getByRole("button", { name: "Send one email" }),
      ).toHaveCount(0);
    if (status === "sent")
      await expect(
        page.getByText(
          "Provider acceptance recorded. Inbox delivery is not verified.",
        ),
      ).toBeVisible();
  });
}
test("requires evidence and a stopped sender, then a separate send authorization", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?status=unknown");
  await page
    .getByLabel("Verified provider outcome")
    .selectOption("not_accepted");
  const reconcile = page.getByRole("button", { name: "Record reconciliation" });
  await expect(reconcile).toBeDisabled();
  await page
    .getByLabel("Provider case or message reference")
    .fill("provider-case-123");
  await page
    .getByLabel("Reconciliation evidence")
    .fill(
      "Provider confirmed no acceptance and the original worker is stopped.",
    );
  await expect(reconcile).toBeDisabled();
  await page.getByRole("checkbox").check();
  await reconcile.click();
  await expect(page.getByText("failed", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Recorded actions")).toContainText(
    '"action":"reconcile"',
  );
  const send = page.getByRole("button", { name: "Send one email" });
  await expect(send).toBeDisabled();
  await page.screenshot({
    path: test.info().outputPath("reconciled-mobile.png"),
  });
  await page.getByRole("checkbox").check();
  await send.click();
  await expect(page.getByText("sent", { exact: true })).toBeVisible();
  const calls = JSON.parse(
    await page.getByLabel("Recorded actions").textContent(),
  );
  expect(calls).toHaveLength(2);
  expect(calls[0].expectedVersion).toBe(2);
  expect(calls[1].expectedVersion).toBe(3);
});
test("leaves unresolved outcomes blocked and sends nothing", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Provider case or message reference")
    .fill("case-unknown");
  await page
    .getByLabel("Reconciliation evidence")
    .fill("The provider outcome cannot currently be established.");
  await page.getByRole("button", { name: "Record reconciliation" }).click();
  await expect(page.getByText("unknown", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send one email" }),
  ).toHaveCount(0);
});
test("shows recoverable errors and refreshes without retrying the action", async ({
  page,
}) => {
  await page.goto("/?status=pending&error=1");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send one email" }).click();
  await expect(page.getByRole("alert")).toContainText("Refresh status");
  await expect(page.getByLabel("Refresh count")).toHaveText("1");
  expect(
    JSON.parse(await page.getByLabel("Recorded actions").textContent()),
  ).toHaveLength(1);
});
