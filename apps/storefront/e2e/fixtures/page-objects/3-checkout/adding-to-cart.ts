import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class AddToCart {
  page: Page
  singleProductPageUrl: string
  cartPage: string

  constructor(page: Page) {
    this.page = page
    this.singleProductPageUrl =
      'https://solace-medusa-starter.vercel.app/de/products/winsdor-bar-stool'
    this.cartPage = 'https://solace-medusa-starter.vercel.app/de/cart'
  }

  async checkSingleProduct() {
    await helpers.goToSingleProductPage(this.page)

    const productTitle = await this.page.getByTestId('product-title')

    expect(productTitle).toBeTruthy()

    const productPrice = await this.page.getByTestId('product-price')

    expect(productPrice).toBeTruthy()
  }

  async addProductToCart() {
    await helpers.goToSingleProductPage(this.page)

    await this.page.getByTestId('add-product-button').click()

    const shoppingCartModalHeader = await this.page
      .getByTestId('nav-cart-dropdown')
      .locator('div')
      .filter({ hasText: 'Shopping Cart' })

    await helpers.waitForPageLoad(this.page)

    await this.page.waitForTimeout(3000)

    expect(shoppingCartModalHeader).toBeTruthy()
  }

  async goToCartViaBagIcon() {
    await this.page.getByTestId('nav-cart-link').click()

    await this.page.waitForURL(this.cartPage)

    await expect(this.page).toHaveURL(/\/cart/)

    await helpers.waitForPageLoad(this.page)

    await this.page.goto(this.singleProductPageUrl)

    await this.page.waitForURL(this.singleProductPageUrl)

    await expect(this.page).toHaveURL(/products\/winsdor-bar-stool/)
  }

  async goToCartViaButton() {
    await this.page.getByTestId('nav-cart-link').hover()

    await this.page.waitForLoadState('domcontentloaded')

    await this.page.getByTestId('go-to-cart-button').click()

    await this.page.waitForURL(this.cartPage)

    await expect(this.page).toHaveURL(/\/cart/)

    await helpers.waitForPageLoad(this.page)
  }

  async checkCartItems() {
    await helpers.goToCartPage(this.page)

    const cartItem = await this.page.getByTestId('cart-item')

    expect(cartItem).toBeTruthy()

    const promoCodeItem = await this.page.getByTestId(
      'discount-code-accordion-trigger'
    )

    expect(promoCodeItem).toBeTruthy()

    const subtotalPrice = await this.page.getByText(
      'Subtotal (excl. shipping and taxes)€'
    )

    expect(subtotalPrice).toBeTruthy()

    const totalPrice = await this.page.getByText('Total€')

    expect(totalPrice).toBeTruthy()

    const proceedToCheckoutButton = await this.page.getByRole('button', {
      name: 'Proceed to checkout',
    })

    expect(proceedToCheckoutButton).toBeTruthy()
  }

  async checkRemovingItemFromCart() {
    await helpers.goToCartPage(this.page)

    await this.page.waitForURL(this.cartPage)

    await this.page.waitForLoadState('domcontentloaded')

    await this.page.getByTestId('delete-button').click()

    const toast = await this.page.getByText('Product was removed from cart.')

    expect(toast).toBeTruthy()

    const emptyCartPlaceholder = await this.page.getByRole('heading', {
      name: 'Your shopping cart is empty',
    })

    expect(emptyCartPlaceholder).toBeTruthy()
  }
}
export default AddToCart
