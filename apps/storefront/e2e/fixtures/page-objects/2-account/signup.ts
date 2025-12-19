import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class Signup {
  page: Page
  accountPageUrl: string

  constructor(page: Page) {
    this.page = page
    this.accountPageUrl = 'https://solace-medusa-starter.vercel.app/de/account'
  }

  async checkHeaderAndFormComponent() {
    //check header
    const signUpPageHeader = await this.page.getByRole('heading', {
      name: 'Create account',
    })

    expect(signUpPageHeader).toBeTruthy()

    //check sign up form component
    const signUpForm = await this.page.getByTestId('register-page')

    expect(signUpForm).toBeTruthy()
  }

  async checkEmptyInputsValidation() {
    const emptyInputsError = await this.page
      .locator('div')
      .filter({ hasText: /^Please enter$/ })
      .getByRole('paragraph')

    expect(emptyInputsError).toBeTruthy()
  }

  async checkInvalidPasswordCharacters() {
    await this.page.locator('#password').fill('test')

    await this.page.getByTestId('register-button').click({ force: true })

    const atLeast8CharactersError = await this.page
      .locator('p')
      .filter({ hasText: 'At least 8 characters' })

    expect(atLeast8CharactersError).toBeTruthy()
  }

  async checkPasswordLackOfUpperCase() {
    await this.page.getByTestId('password-input').fill('testtestt')

    await this.page.getByTestId('register-button').click()

    const upperCaseError = await this.page
      .locator('p')
      .filter({ hasText: 'One uppercase letter' })

    expect(upperCaseError).toBeTruthy()
  }

  async checkPasswordLackOfNumberOrSymbol() {
    await this.page.getByTestId('password-input').fill('testtesttT')

    await this.page.getByTestId('register-button').click()

    const numberOrSymbolError = await this.page
      .locator('p')
      .filter({ hasText: 'One number or symbol' })

    expect(numberOrSymbolError).toBeTruthy()

    // overwrite input for clearing
    await this.page.getByTestId('password-input').fill('')
  }

  async checkTransitionBetweenLogInAndSignUp() {
    await this.page.getByRole('button', { name: 'Log in' }).click()

    const signInPageHeader = await this.page.getByRole('heading', {
      name: 'Log in',
    })

    expect(signInPageHeader).toBeTruthy()

    await this.page.getByRole('button', { name: 'Create account' }).click()

    const signUpPageHeader = await this.page.getByRole('heading', {
      name: 'Create account',
    })

    expect(signUpPageHeader).toBeTruthy()
  }

  async checkCorrectlySignUp() {
    await this.page.goto('https://solace-medusa-starter.vercel.app/de')

    await this.page.getByTestId('profile-dropdown-button').hover()

    await this.page.getByRole('link', { name: 'Sign up' }).click()

    await helpers.fillSignupInputs(this.page)

    await this.page.getByRole('button', { name: 'Create account' }).click()

    await this.page.waitForLoadState('load')

    await this.page.waitForLoadState('domcontentloaded')

    const dashboardMenuItem = await this.page.getByRole('link', {
      name: 'Dashboard icon Dashboard',
    })

    expect(dashboardMenuItem).toBeTruthy()
  }
}
export default Signup
