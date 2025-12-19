import { test } from '@playwright/test'

import AddToCart from '../../fixtures/page-objects/3-checkout/adding-to-cart'
import helpers from '../../utils/tests-helpers'

export {}

test.describe('Add product to cart Tests', () => {
  let addToCart: AddToCart

  test.beforeEach(async ({ page }) => {
    addToCart = new AddToCart(page)

    await helpers.waitForPageLoad(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Check single product', async ({ page }) => {
    await addToCart.checkSingleProduct()
  })

  test('Add product, go to cart via `Bag icon` and go back', async ({
    page,
  }) => {
    await addToCart.addProductToCart()

    await addToCart.goToCartViaBagIcon()
  })

  test('Add product and go to cart via `Go to cart` button', async ({
    page,
  }) => {
    await addToCart.addProductToCart()

    await addToCart.goToCartViaButton()
  })

  test('Check cart items', async ({ page }) => {
    await addToCart.addProductToCart()

    await addToCart.checkCartItems()
  })

  test('Check removing product from cart', async ({ page }) => {
    await addToCart.addProductToCart()

    await addToCart.checkRemovingItemFromCart()
  })
})
