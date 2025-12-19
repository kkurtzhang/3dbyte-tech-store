import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class ShippingDetails {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  async checkShippingDetailsPage() {
    await this.page
      .locator("li[data-testid='shipping-details-nav-item']")
      .click()

    await expect(this.page).toHaveURL(/\/account\/addresses$/)
  }

  async addNewAddress() {
    // check if we doesn't have any address
    const noSavedAddressesHeading = await this.page.getByText(
      'No saved shipping addresses'
    )

    expect(noSavedAddressesHeading).toBeTruthy()

    // click button and open modal
    await this.page.getByRole('button', { name: 'Add address' }).click()

    const newAddressModal = await this.page.getByRole('dialog')

    expect(newAddressModal).toBeTruthy()

    // fill modal and save
    await helpers.addNewShippingDetailsAddress(this.page)
  }

  async checkNewAddress() {
    const newAddressUserName = this.page.getByText('Adam Nowak')

    await expect(newAddressUserName).toContainText(/Adam Nowak/i, {
      timeout: 3000,
    })
  }

  async editNewAddress() {
    // choose edit option from single address box menuitem
    await this.page.getByTestId('address-actions-button').click()

    await this.page.getByRole('menuitem', { name: 'Edit address' }).click()

    // check modal existing
    const newAddressModal = await this.page.getByRole('dialog')

    expect(newAddressModal).toBeTruthy()

    // change data in modal and save
    await this.page.getByTestId('first-name-input').fill('')

    await this.page.getByTestId('first-name-input').fill('Janusz')

    await this.page.getByTestId('last-name-input').fill('')

    await this.page.getByTestId('last-name-input').fill('Kowalski')

    // save changes
    await this.page.getByTestId('save-address-button').click()
  }

  async checkEditedAddress() {
    const newAddressUserName = this.page.getByText('Janusz Kowalski')

    await expect(newAddressUserName).toContainText(/Janusz Kowalski/i, {
      timeout: 3000,
    })
  }

  async deleteAddress() {
    // delete address
    await this.page.getByTestId('address-actions-button').click()

    await this.page.getByRole('menuitem', { name: 'Delete address' }).click()

    // check if we doesn't have any address
    const noSavedAddressesHeading = await this.page.getByText(
      'No saved shipping addresses'
    )

    expect(noSavedAddressesHeading).toBeTruthy()
  }
}
export default ShippingDetails
