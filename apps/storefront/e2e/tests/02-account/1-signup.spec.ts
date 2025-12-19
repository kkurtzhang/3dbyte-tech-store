import { expect, test } from '@playwright/test'

import Signup from '../../fixtures/page-objects/2-account/signup'
import helpers from '../../utils/tests-helpers'

export {}

test.describe('Signup Tests', () => {
  let signup: Signup

  test.beforeEach(async ({ page }) => {
    signup = new Signup(page)

    helpers.waitForPageLoad(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Go to `/account` page', async ({ page }) => {
    await helpers.goToSignUpPage(page)

    await page.waitForURL(signup.accountPageUrl)

    await expect(page).toHaveURL(/\/account/)
  })

  test('Check `Create account` page items and inputs validation', async ({
    page,
  }) => {
    await helpers.goToSignUpPage(page)

    await signup.checkHeaderAndFormComponent()

    await signup.checkEmptyInputsValidation()

    await signup.checkInvalidPasswordCharacters()

    await signup.checkPasswordLackOfUpperCase()

    await signup.checkPasswordLackOfNumberOrSymbol()
  })

  test('Check transition between `signup` and `signin` pages', async ({
    page,
  }) => {
    await helpers.goToSignUpPage(page)

    await signup.checkTransitionBetweenLogInAndSignUp()
  })

  test('Fill inputs and correctly signup', async ({ page }) => {
    await signup.checkCorrectlySignUp()
  })
})
