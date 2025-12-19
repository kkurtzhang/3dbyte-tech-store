import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class Searchbar {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  async checkSearchbarVisibility() {
    await helpers.waitForPageLoad(this.page)

    await this.page.getByTestId('search-button').click()

    await this.page.waitForLoadState('load')

    const recommendedSearchResults = await this.page
      .locator('div')
      .filter({ hasText: /^Recommended$/ })

    expect(recommendedSearchResults).toBeTruthy()

    const lastSearchResults = await this.page
      .locator('div')
      .filter({ hasText: /^Search results$/ })

    expect(lastSearchResults).toBeTruthy()
  }

  async checkRealProductSearching() {
    await helpers.waitForPageLoad(this.page)

    await this.page.getByTestId('search-button').click()

    await this.page.waitForLoadState('load')

    await this.page.getByTestId('search-input').click()

    await this.page.getByTestId('search-input').fill('Ashton')

    await this.page.getByTestId('search-input').press('Enter')

    await this.page.waitForLoadState('domcontentloaded')

    await this.page.waitForURL(/\/Ashton/)

    await expect(this.page).toHaveURL(/\/Ashton/)

    const realProductHeading = await this.page.getByRole('heading', {
      name: '"Ashton"',
    })

    expect(realProductHeading).toBeTruthy()
  }

  async checkNonExistingProductSearching() {
    await helpers.waitForPageLoad(this.page)

    await this.page.getByTestId('search-button').click()

    await this.page.waitForLoadState('load')

    await this.page.getByTestId('search-input').click()

    await this.page.getByTestId('search-input').fill('non existing item')

    await this.page.getByTestId('search-input').press('Enter')

    await this.page.waitForLoadState('domcontentloaded')

    const noResultPlaceholder = await this.page.getByRole('heading', {
      name: 'No results for "non existing item"',
    })

    expect(noResultPlaceholder).toBeTruthy()
  }
}

export default Searchbar
