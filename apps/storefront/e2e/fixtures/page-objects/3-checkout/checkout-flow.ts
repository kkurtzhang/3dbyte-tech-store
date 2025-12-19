import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'
import AddToCart from './adding-to-cart'

export {}

class Checkout {
  page: Page
  addToCart: AddToCart

  constructor(page: Page) {
    this.page = page
    this.addToCart = new AddToCart(page)
  }

  async addProductToCart() {
    await this.addToCart.addProductToCart()

    await this.addToCart.goToCartViaButton()

    await this.page.getByRole('button', { name: 'Proceed to checkout' }).click()

    await helpers.waitForPageLoad(this.page)

    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=address'
    )

    await expect(this.page).toHaveURL(/checkout\?step=address$/)
  }

  async saveAndProceedToDeliveryStep() {
    await this.page.getByTestId('submit-address-button').click()

    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=delivery'
    )

    await expect(this.page).toHaveURL(/checkout\?step=delivery$/)

    await this.page.goBack({ waitUntil: 'load' })

    await helpers.waitForPageLoad(this.page)
  }

  async editShippingDetails() {
    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=address'
    )

    await expect(this.page).toHaveURL(/checkout\?step=address$/)

    await helpers.waitForPageLoad(this.page)

    await this.page.getByTestId('edit-address-button').nth(0).click()

    const firstNameInput = await this.page.getByTestId(
      'shipping-first-name-input'
    )

    await firstNameInput.click()

    await firstNameInput.fill('')

    await firstNameInput.fill('Jan')

    await this.page.getByRole('button', { name: 'Proceed to delivery' }).click()

    await helpers.waitForPageLoad(this.page)
  }

  async checkEditedShippingDetails() {
    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=delivery'
    )

    await expect(this.page).toHaveURL(/checkout\?step=delivery$/)

    await helpers.waitForPageLoad(this.page)

    const shippingAddressSummary = await this.page.getByTestId(
      'shipping-address-summary'
    )

    await expect(shippingAddressSummary).toContainText(/Jan Nowak/i, {
      timeout: 3000,
    })
  }

  async chooseDeliveryMethod() {
    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=delivery'
    )

    await expect(this.page).toHaveURL(/checkout\?step=delivery$/)

    const standardShippingOption = await this.page
      .getByTestId('delivery-option-radio')
      .filter({
        hasText: 'Standard Shipping',
      })

    standardShippingOption.click()

    await helpers.waitForPageLoad(this.page)

    const standardShippingMethod =
      await this.page.getByText('Standard Shipping')

    expect(standardShippingMethod).toBeTruthy()

    await this.page.getByRole('button', { name: 'Proceed to payment' }).click()

    await helpers.waitForPageLoad(this.page)
  }

  async editDeliveryMethod() {
    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=delivery'
    )

    await expect(this.page).toHaveURL(/checkout\?step=delivery$/)

    await helpers.waitForPageLoad(this.page)

    await this.page.getByTestId('edit-delivery-button').nth(0).click()

    const storePickupOption = await this.page
      .getByTestId('delivery-option-radio')
      .filter({
        hasText: 'Store Pickup',
      })

    storePickupOption.click()

    expect(storePickupOption).toBeTruthy()

    await this.page.getByRole('button', { name: 'Proceed to payment' }).click()

    await helpers.waitForPageLoad(this.page)
  }

  async checkEditedDeliveryMethod() {
    await this.page.waitForURL(
      'https://solace-medusa-starter.vercel.app/de/checkout?step=payment'
    )

    await expect(this.page).toHaveURL(/checkout\?step=payment$/)

    await helpers.waitForPageLoad(this.page)

    const deliveryOption = await this.page.getByText('Store Pickup')

    expect(deliveryOption).toBeTruthy()
  }

  async choosePaymentMethod() {
    await helpers.waitForPageLoad(this.page)

    await this.page
      .getByRole('radio')
      .filter({ hasText: 'Manual payment' })
      .check()

    await helpers.waitForPageLoad(this.page)

    const manualPaymentMethod = await this.page.getByText('Manual Payment')

    expect(manualPaymentMethod).toBeTruthy()
  }

  async checkOrderConfirmationPage() {
    // go to `Order Confirmation` page
    await this.page.getByTestId('submit-order-button').click()

    // wait for redirect
    await this.page.waitForURL(/\/order\/confirmed/, { timeout: 5000 })

    await expect(this.page.url()).toContain('order/confirmed')

    await helpers.waitForPageLoad(this.page)

    // check order confirmation page items
    const orderConfirmedPage = await this.page.locator('h1').textContent()

    expect(orderConfirmedPage).toContain(
      'Thank you! Your order was placed successfully'
    )
  }
}
export default Checkout
