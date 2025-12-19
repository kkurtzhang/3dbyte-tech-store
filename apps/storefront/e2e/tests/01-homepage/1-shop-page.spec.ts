import { test } from '@playwright/test'

import ShopPage from '../../fixtures/page-objects/1-homepage/shop-page'

test.describe('Shop page Tests', () => {
  let shoppage: ShopPage

  test.beforeEach(async ({ page }) => {
    shoppage = new ShopPage(page)

    await page.waitForLoadState('load')

    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Check shop page loading and it`s title and header', async ({
    page,
  }) => {
    await shoppage.checkTitleAndHeading()
  })

  test('Check filtering by collections', async ({ page }) => {
    await shoppage.checkFilteringByCollections()
  })

  test('Check filtering by product type', async ({ page }) => {
    await shoppage.checkFilteringByProductType()
  })

  test('Check filtering by material', async ({ page }) => {
    await shoppage.checkFilteringByMaterial()
  })

  test('Check filtering by price', async ({ page }) => {
    await shoppage.checkFilteringByPrice()
  })

  test('Check filter tabs and result of filtering', async ({ page }) => {
    await shoppage.checkFilterResults()
  })

  test('Check `Recommended products` section', async ({ page }) => {
    await shoppage.checkRecommendedProducts()
  })

  test('Check pagination', async ({ page }) => {
    await shoppage.checkPagination()
  })
})
