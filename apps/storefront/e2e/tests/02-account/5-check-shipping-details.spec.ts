import { test } from '@playwright/test'

import ShippingDetails from '../../fixtures/page-objects/2-account/check-shipping-details'
import helpers from '../../utils/tests-helpers'

export {}

test.describe('Shipping details in account settings page', () => {
  let shippingDetails: ShippingDetails

  test.beforeEach(async ({ page, browser }) => {
    shippingDetails = new ShippingDetails(page)

    await helpers.waitForPageLoad(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Add and edit shipping details in account settings', async ({
    page,
  }) => {
    // login
    await helpers.login(page)

    // go to account
    await helpers.goToAccount(page)

    // go to shipping details page
    await shippingDetails.checkShippingDetailsPage()

    // add new address
    await shippingDetails.addNewAddress()

    // check new address
    await shippingDetails.checkNewAddress()

    // edit address
    await shippingDetails.editNewAddress()

    // check edited address
    await shippingDetails.checkEditedAddress()

    //delete address
    await shippingDetails.deleteAddress()
  })
})
