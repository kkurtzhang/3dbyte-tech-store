import { test } from '@playwright/test'

import AccountSettings from '../../fixtures/page-objects/2-account/check-account-settings'
import helpers from '../../utils/tests-helpers'

export {}

test.describe('Account settings page', () => {
  let accountSettings: AccountSettings

  test.beforeEach(async ({ page, browser }) => {
    accountSettings = new AccountSettings(page)

    await helpers.waitForPageLoad(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Check account settings page', async ({ page }) => {
    // login
    await helpers.login(page)

    // go to account
    await helpers.goToAccount(page)

    // go to account settings
    await accountSettings.goToAccountSettings()

    // edit acconut details
    await accountSettings.editAccountDetails()

    // check new account details
    await accountSettings.checkNewAccountDetails()

    // reverse default account details
    await helpers.fillProfileDetails(page)
  })
})
