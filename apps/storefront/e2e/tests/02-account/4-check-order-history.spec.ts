import { test } from '@playwright/test'

import OrderHistory from '../../fixtures/page-objects/2-account/check-order-history'
import helpers from '../../utils/tests-helpers'

export {}

test.describe('Order history page', () => {
  let orderHistory: OrderHistory

  test.beforeEach(async ({ page, browser }) => {
    orderHistory = new OrderHistory(page)

    await helpers.waitForPageLoad(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Check order history page and single order page', async ({ page }) => {
    // login
    await helpers.login(page)

    // order product
    await helpers.orderProductFlow(page)

    // go to account
    await helpers.goToAccount(page)

    // check order history page
    await orderHistory.checkOrderHistoryPage()

    // check single order page
    await orderHistory.checkSingleOrderPage()
  })
})
