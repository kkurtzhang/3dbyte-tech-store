import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class AboutUsPage {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  async checkLoadingAndHeader() {
    await helpers.waitForPageLoad(this.page)

    const pageTitle = await this.page.title()

    expect(pageTitle).toBe('About Us')
  }

  async checkPageHeaderAndLogo() {
    await helpers.waitForPageLoad(this.page)

    const headerLogo = this.page
      .locator('div')
      .filter({ hasText: 'Solace Logo Big' })

    expect(headerLogo).toBeTruthy()
  }

  async checkOurStorySection() {
    await helpers.waitForPageLoad(this.page)

    const ourStorySection = this.page
      .locator('div')
      .filter({ hasText: 'Our story' })
      .first()

    expect(ourStorySection).toBeTruthy()

    const ourStoryHeading = this.page.getByRole('heading', {
      name: 'Our story',
    })

    await expect(ourStoryHeading).toBeVisible()

    await expect(ourStoryHeading).toHaveText(/Our story/i)
  }

  async checkWhyUsSection() {
    await helpers.waitForPageLoad(this.page)

    const whyUsSection = this.page.getByText('Why us?')

    expect(whyUsSection).toBeTruthy()

    const whyUsHeading = this.page.getByRole('heading', { name: 'Why us?' })

    await expect(whyUsHeading).toBeVisible()

    await expect(whyUsHeading).toHaveText(/Why us?/i)

    // check section boxes
    const whyUsGrid = await this.page.locator('.grid.gap-4')
    expect(whyUsGrid).toBeVisible()

    const whyUsBoxes = this.page.locator('h3').filter({
      hasText:
        /Timeless design|Exceptional quality|Sustainable practices|Tailored solutions/,
    })
    await expect(whyUsBoxes).toHaveCount(4)
  }

  async checkOurCraftsmanshipSection() {
    await helpers.waitForPageLoad(this.page)

    const ourCraftsmanshipSection = this.page
      .locator('div')
      .filter({ hasText: 'Our craftsmanship' })
      .first()

    expect(ourCraftsmanshipSection).toBeTruthy()

    const ourCraftsmanshipHeading = this.page.getByRole('heading', {
      name: 'Our craftsmanship',
    })

    await expect(ourCraftsmanshipHeading).toBeVisible()

    await expect(ourCraftsmanshipHeading).toHaveText(/Our craftsmanship/i)
  }

  async checkGetInspiredSection() {
    await helpers.waitForPageLoad(this.page)

    const getInspiredSection = this.page
      .locator('div')
      .filter({ hasText: 'Get inspired' })
      .first()

    expect(getInspiredSection).toBeTruthy()

    const getInspiredHeading = this.page.getByRole('heading', {
      name: 'Get inspired',
    })

    await expect(getInspiredHeading).toBeVisible()

    await expect(getInspiredHeading).toHaveText(/Get inspired/i)

    // check section boxes
    const getInspiredBoxes = this.page.locator('.flex.min-w-40').filter({
      hasText:
        /Maximizing small spaces|Caring for wood furniture|Trends in designer furniture/,
    })
    await expect(getInspiredBoxes).toHaveCount(6)

    //check redirection to blog
    await this.page.getByRole('link', { name: 'Read more' }).click()

    await this.page.waitForURL(/\/blog/)

    await expect(this.page).toHaveURL(/\/blog/)
  }
}

export default AboutUsPage
