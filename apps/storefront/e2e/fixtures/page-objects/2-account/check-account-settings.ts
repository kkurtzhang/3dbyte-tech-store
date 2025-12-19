import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class AccountSettings {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goToAccountSettings() {
    // go to account settings page
    await this.page
      .locator("li[data-testid='account-settings-nav-item']")
      .click()

    await expect(this.page).toHaveURL(/\/account\/profile$/)

    await helpers.waitForPageLoad(this.page)

    // check current data
    const profileDetailsBox = await this.page.getByTestId(
      'profile-pagge-wrapper'
    )

    await expect(profileDetailsBox).toBeTruthy()

    //    const userName = this.page.getByText('Adam Nowak');

    //    await expect(userName).toContainText(/Adam Nowak/i, { timeout: 3000 });
  }

  async editAccountDetails() {
    // click edit button and check modal
    await this.page.getByTestId('edit-details-button').nth(0).click()

    const profileDetailsModal = await this.page.getByRole('dialog')

    expect(profileDetailsModal).toBeTruthy()

    // edit data
    await this.page.getByTestId('first-name-input').fill('')

    await this.page.getByTestId('first-name-input').fill('Janusz')

    await this.page.getByTestId('last-name-input').fill('')

    await this.page.getByTestId('last-name-input').fill('Kowalski')

    await this.page.getByTestId('phone-input').fill('')

    await this.page.getByTestId('phone-input').fill('111000111')

    await this.page.getByTestId('save-details-button').click()
  }

  async checkNewAccountDetails() {
    const profileDetailsBox = await this.page.getByTestId(
      'profile-pagge-wrapper'
    )

    await expect(profileDetailsBox).toBeTruthy()

    const userName = this.page.getByText('Janusz Kowalski')

    await expect(userName).toContainText(/Janusz Kowalski/i, { timeout: 3000 })
  }
}
export default AccountSettings
