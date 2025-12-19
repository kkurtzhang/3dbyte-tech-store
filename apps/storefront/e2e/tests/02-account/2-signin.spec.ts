import { expect, test } from '@playwright/test'

import Signin from '../../fixtures/page-objects/2-account/signin'
import helpers from '../../utils/tests-helpers'

export {}

test.describe('Signin Tests', () => {
  let signin: Signin

  test.beforeEach(async ({ page }) => {
    signin = new Signin(page)

    await helpers.waitForPageLoad(page)

    await helpers.goToSignInPage(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Go to `/account` page', async ({ page }) => {
    await page.waitForURL(signin.accountPageUrl)

    await expect(page).toHaveURL(/\/account/)
  })

  test('Check `Log in` page items and inputs validation', async ({ page }) => {
    await signin.checkHeaderAndFormComponent()

    await signin.checkEmptyInputsValidation()

    await signin.checkIncorrectDataValidation()
  })

  test('Check correctly sign in', async ({ page }) => {
    await signin.checkCorrectlySignIn()
  })
})
