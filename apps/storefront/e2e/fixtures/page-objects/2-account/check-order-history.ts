import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class OrderHistory {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  async checkOrderHistoryPage() {
    await this.page.locator("li[data-testid='order-history-nav-item']").click()

    await expect(this.page).toHaveURL(/\/account\/orders$/)

    const allOrders = await this.page.getByTestId('orders-page-wrapper')

    expect(allOrders).toBeTruthy()
  }

  async checkSingleOrderPage() {
    await this.page.getByRole('link', { name: 'View order' }).first().click()

    await expect(this.page).toHaveURL(/\/account\/orders\/details/)

    const orderDetailsContainer = await this.page.getByTestId(
      'order-details-container'
    )

    expect(orderDetailsContainer).toBeTruthy()

    const orderNumberHeading = await this.page.getByRole('heading', {
      name: 'Order #',
    })

    expect(orderNumberHeading).toBeTruthy()

    const orderedProduct = await this.page.getByTestId('product-row')

    expect(orderedProduct).toBeTruthy()

    const totalPrice = await this.page.getByText('Total€')

    expect(totalPrice).toBeTruthy()

    const shippingAddress = await this.page.getByText('Shipping address', {
      exact: true,
    })

    expect(shippingAddress).toBeTruthy()

    const billingAddress = await this.page.getByText('Billing address')

    expect(billingAddress).toBeTruthy()

    const deliveryMethod = await this.page.getByText('Delivery method')

    expect(deliveryMethod).toBeTruthy()

    const paymentMethod = await this.page.getByText('Payment method')

    expect(paymentMethod).toBeTruthy()

    await this.page.getByTestId('back-to-overview-button').click()

    await helpers.waitForPageLoad(this.page)

    await expect(this.page.url()).toContain('/account/orders/')
  }
}
export default OrderHistory
