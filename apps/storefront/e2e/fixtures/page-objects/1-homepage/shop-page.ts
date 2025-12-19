import { expect, Page } from '@playwright/test'

import helpers from '../../../utils/tests-helpers'

export {}

class ShopPage {
  page: Page
  shopPageUrl: string
  homeURL: string
  shopWithFiltersUrl: string

  constructor(page: Page) {
    this.page = page
    this.shopPageUrl = 'https://solace-medusa-starter.vercel.app/de/shop'
    this.shopWithFiltersUrl =
      'https://solace-medusa-starter.vercel.app/de/shop?collection=pcol_01J93QK3N82DHGC3K3XE19YMVG&type=ptyp_01J93Z6T952WCBPX62QFM2SADB&material=Leather&price=under-100'
  }

  async checkTitleAndHeading() {
    await this.page.goto(this.shopPageUrl)

    expect(this.shopPageUrl).toContain('/shop')

    await this.page.waitForSelector('h1')

    const pageHeader = await this.page.$eval('h1', (el) => el.textContent)

    expect(pageHeader).toBe('All products')
  }

  async checkFilteringByCollections() {
    await this.page.goto(this.shopPageUrl)

    await helpers.waitForPageLoad(this.page)

    expect(this.shopPageUrl).toContain('/shop')

    const collectionFilterBtn = this.page.getByLabel('Choose collection/s')

    await expect(collectionFilterBtn).toBeVisible()

    await collectionFilterBtn.click({ force: true })

    // single item from filter check and click
    await this.page
      .locator('[data-testid="ashton-filter-item"] button[role="checkbox"]')
      .waitFor()

    await this.page
      .locator('[data-testid="ashton-filter-item"] button[role="checkbox"]')
      .click({ force: true })
  }

  async checkFilteringByProductType() {
    await this.page.goto(this.shopPageUrl)

    await helpers.waitForPageLoad(this.page)

    expect(this.shopPageUrl).toContain('/shop')

    const productTypeFilterBtn = this.page.getByLabel('Choose product type/s')

    await productTypeFilterBtn.click()

    // single item from filter check and click
    expect(this.page.getByTestId('barstools-filter-item')).toBeVisible()

    await this.page
      .locator('[data-testid="barstools-filter-item"] button[role="checkbox"]')
      .click()
  }

  async checkFilteringByMaterial() {
    await this.page.goto(this.shopPageUrl)

    await helpers.waitForPageLoad(this.page)

    expect(this.shopPageUrl).toContain('/shop')

    const materialFilterBtn = this.page.getByLabel('Choose material/s')

    await materialFilterBtn.click()

    // single item from filter check and click
    expect(this.page.getByTestId('leather-filter-item')).toBeVisible()

    await this.page
      .locator('[data-testid="leather-filter-item"] button[role="checkbox"]')
      .click()
  }

  async checkFilteringByPrice() {
    await this.page.goto(this.shopPageUrl)

    await helpers.waitForPageLoad(this.page)

    expect(this.shopPageUrl).toContain('/shop')

    const priceFilterBtn = this.page.getByLabel('Choose price')

    await priceFilterBtn.click()

    // single item from filter check and click
    expect(this.page.getByTestId('under-$100-filter-item')).toBeVisible()

    await this.page
      .locator('[data-testid="under-$100-filter-item"] button[role="checkbox"]')
      .click()
  }

  async checkFilterResults() {
    await this.page.goto(this.shopWithFiltersUrl)

    await helpers.waitForPageLoad(this.page)

    // Check filtered product by params from URL
    const regex = /(?:[?&])(collection|type|material|price)=/

    expect(this.shopWithFiltersUrl).toMatch(regex)
  }

  async checkRecommendedProducts() {
    await this.page.goto(this.shopPageUrl)

    await helpers.waitForPageLoad(this.page)

    expect(this.shopPageUrl).toContain('/shop')

    const recommendedProductsHeading = this.page.getByRole('heading', {
      name: 'Recommended products',
    })

    expect(recommendedProductsHeading).toHaveText('Recommended products')

    // check recomended products existing
    const recommendedProductsSection = this.page.locator('.flex.gap-2')

    const allRecommendedProducts = recommendedProductsSection.locator('*')

    const recommendedProductsCount = await allRecommendedProducts.count()

    expect(recommendedProductsCount).toBeGreaterThan(0)
  }

  async checkPagination() {
    await this.page.goto(this.shopPageUrl)

    await helpers.waitForPageLoad(this.page)

    const pagination = this.page.getByTestId('product-pagination')

    expect(pagination).toBeVisible()

    // click on second page
    const page2Link = pagination.locator('a', { hasText: '2' })

    await page2Link.waitFor()

    page2Link.click()

    await this.page.waitForURL(/.*page=2/)

    expect(this.page.url()).toContain('page=2')

    // click on first page
    const page1Link = pagination.locator('a', { hasText: '1' })

    await page1Link.waitFor()

    page1Link.click()

    await this.page.waitForURL(/.*page=1/)

    expect(this.page.url()).toContain('page=1')
  }
}

export default ShopPage
