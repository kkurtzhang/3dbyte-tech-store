import { expect, type Page } from "@playwright/test"

export async function clearCartState(page: Page) {
  await page.goto("/")
  await page.evaluate(() => {
    localStorage.removeItem("_medusa_cart_id")
    document.cookie = "_medusa_cart_id=; Path=/; Max-Age=0; SameSite=Lax"
  })
}

export async function addTestBundleToCart(page: Page) {
  await clearCartState(page)
  await page.goto("/products/test-bundle-product")

  await page.getByRole("button", { name: "Black - 180" }).click()
  await expect(page.getByText("Hardware Kit + Panel / Black - 180")).toBeVisible()

  const addBundleButton = page.getByRole("button", { name: /add bundle to cart/i })
  await expect(addBundleButton).toBeEnabled({ timeout: 60_000 })
  await addBundleButton.click()

  await expect(page.getByRole("button", { name: /open cart,\s*1 item/i })).toBeVisible({
    timeout: 60_000,
  })
  await page.waitForFunction(() => localStorage.getItem("_medusa_cart_id"))
}

export async function openCheckoutWithTestBundle(page: Page) {
  await addTestBundleToCart(page)
  await page.goto("/checkout")
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible()
}

export async function continueCheckoutAsGuest(page: Page) {
  await page.getByRole("button", { name: "Continue as guest" }).click()
  await expect(page.getByText("Checking out as guest")).toBeVisible()
}

export async function fillCheckoutShippingAddress(page: Page) {
  const form = page.locator("main form").first()

  await form.getByLabel(/email address/i).fill("e2e.customer@example.com")
  await form.getByLabel(/^first name$/i).fill("E2E")
  await form.getByLabel(/^last name$/i).fill("Customer")
  await form.getByRole("combobox", { name: /^address$/i }).fill("1 Main Street")
  await form.getByLabel(/^city$/i).fill("Sydney")
  await form.getByLabel(/^state$/i).fill("NSW")
  await form.getByLabel(/^postal code$/i).fill("2000")
  await form.getByLabel(/^country$/i).fill("AU")
  await form.getByLabel(/^phone/i).fill("0400000000")
}

export async function seedLocalStorage<T>(page: Page, key: string, value: T) {
  await page.goto("/")
  await page.evaluate(
    ({ storageKey, storageValue }) => {
      localStorage.setItem(storageKey, JSON.stringify(storageValue))
    },
    { storageKey: key, storageValue: value }
  )
}

export async function registerUniqueCustomer(
  page: Page,
  redirectPath = "/"
) {
  const email = `e2e-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`
  const password = "Password123!"

  await page.goto(`/sign-up?redirect=${encodeURIComponent(redirectPath)}`)
  await page.getByLabel(/^first name$/i).fill("E2E")
  await page.getByLabel(/^last name$/i).fill("Customer")
  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByLabel(/^confirm password$/i).fill(password)
  await page.getByRole("button", { name: /create account/i }).click()

  await expect(page).toHaveURL(new RegExp(`${redirectPath.replace("/", "\\/")}$`), {
    timeout: 60_000,
  })

  return { email, password }
}
