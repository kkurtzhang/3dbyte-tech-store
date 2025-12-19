import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class Signin {
  page: Page
  accountPageUrl: string

  constructor(page: Page) {
    this.page = page
    this.accountPageUrl = 'https://solace-medusa-starter.vercel.app/de/account'
  }

  async checkHeaderAndFormComponent() {
    //check header
    const signInPageHeader = await this.page.getByRole('heading', {
      name: 'Log in',
    })

    expect(signInPageHeader).toBeTruthy()

    //check sign up form component
    const signInForm = await this.page.getByTestId('login-page')

    expect(signInForm).toBeTruthy()
  }

  async checkEmptyInputsValidation() {
    await this.page.getByTestId('sign-in-button').click({ force: true })

    const emptyInputsError = await this.page
      .locator('div')
      .filter({ hasText: /^Please enter$/ })
      .getByRole('paragraph')

    expect(emptyInputsError).toBeTruthy()
  }

  async checkIncorrectDataValidation() {
    await this.page.getByTestId('email-input').fill('incorrect@ex.com')

    await this.page.getByTestId('password-input').fill('test')

    await this.page.getByTestId('sign-in-button').click({ force: true })

    await this.page.waitForLoadState('domcontentloaded')

    const errorToast = this.page.getByText('Incorrect email or password.')

    expect(errorToast).toBeTruthy()

    // overwrite input for clearing
    await this.page.getByTestId('email-input').fill('')

    await this.page.getByTestId('password-input').fill('')
  }

  async checkPasswordPreviewIcon() {
    const passwordInput = await this.page.getByTestId('password-input')

    await this.page.getByRole('button', { name: 'Eye Off icon' }).click()

    expect(passwordInput).toHaveAttribute('type', 'text')

    await this.page.getByRole('button', { name: 'Eye icon' }).click()

    expect(passwordInput).toHaveAttribute('type', 'password')
  }

  async checkCorrectlySignIn() {
    await helpers.fillSignInInputs(this.page)

    await this.checkPasswordPreviewIcon()

    await this.page.getByTestId('sign-in-button').click({ force: true })

    await this.page.waitForLoadState('load')

    await this.page.waitForLoadState('domcontentloaded')

    const dashboardMenuItem = await this.page.getByRole('link', {
      name: 'Dashboard icon Dashboard',
    })

    expect(dashboardMenuItem).toBeTruthy()
  }
}
export default Signin
