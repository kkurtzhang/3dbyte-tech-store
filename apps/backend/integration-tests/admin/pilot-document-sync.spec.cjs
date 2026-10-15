const { test, expect } = require("@playwright/test");
const path = require("node:path");
const ids = ["mu3sv3poa965a25lvvlbdngc", "uur1zr0pe99e6px1r5ljs0nm"];
const action = page => page.getByRole("button", {name:"Sync two pilot documents", exact:true});
const requests = async page => JSON.parse(await page.getByLabel("Fixture mutation requests").textContent());
async function confirm(page) {
 await action(page).click();
 const dialog = page.getByRole("alertdialog");
 await expect(dialog).toBeVisible();
 for (const id of ids) await expect(dialog).toContainText(id);
 await dialog.getByRole("button", {name:"Sync these two documents",exact:true}).click();
}
test.beforeEach(async ({page}) => {
 await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
});
test("initial page is inert, fixed scope visible, cancellation performs no mutation", async ({page}) => {
 await page.goto("/");
 await expect(action(page)).toBeVisible();
 for (const id of ids) await expect(page.getByRole("region", {name:"Two-document pilot"})).toContainText(id);
 expect(await requests(page)).toEqual([]);
 await action(page).click();
 await page.getByRole("alertdialog").getByRole("button", {name:"Cancel",exact:true}).click();
 expect(await requests(page)).toEqual([]);
 await expect(action(page)).toBeEnabled();
});
test("confirmed click submits only exact two IDs with ordinary SDK options", async ({page}) => {
 await page.goto("/"); await confirm(page);
 await expect(page.getByRole("status")).toContainText("Server confirmed 2 indexed documents, 0 deletions, and 2 approved knowledge projections");
 expect(await requests(page)).toEqual([{path:"/admin/meilisearch/sync-product-documents/scoped",options:{method:"POST",body:{document_ids:ids}}}]);
 await expect(action(page)).toBeDisabled();
 if (process.env.THREEDBYTE_ARTIFACTS_DIR) await page.screenshot({path:path.join(process.env.THREEDBYTE_ARTIFACTS_DIR,"admin-pilot-action.png"),fullPage:true});
});
test("pending request cannot be submitted again", async ({page}) => {
 await page.goto("/?mode=slow"); await confirm(page);
 await expect(action(page)).toBeDisabled();
 expect(await requests(page)).toHaveLength(1);
 await page.evaluate(() => window.finishFixtureSync());
 await expect(page.getByRole("status")).toContainText("Server confirmed");
 expect(await requests(page)).toHaveLength(1);
});
for (const mode of ["401","403","503","partial"]) {
 test(`failure ${mode} remains unconfirmed, hides server detail and does not retry`, async ({page}) => {
  await page.goto(`/?mode=${mode}`); await confirm(page);
  await expect(page.getByRole("alert")).toContainText("Sync outcome unconfirmed");
  await expect(page.getByRole("alert")).toContainText("Check index state before another attempt");
  await expect(page.getByText("synthetic private server detail")).toHaveCount(0);
  await expect(action(page)).toBeDisabled();
  await page.waitForTimeout(1200);
  expect(await requests(page)).toHaveLength(1);
 });
}
