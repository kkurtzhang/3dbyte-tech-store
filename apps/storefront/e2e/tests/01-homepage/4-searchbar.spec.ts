import { test } from '@playwright/test'

import Searchbar from '../../fixtures/page-objects/1-homepage/searchbar'

test.describe('Searchbar Tests', () => {
  let searchbar: Searchbar

  test.beforeEach(async ({ page }) => {
    searchbar = new Searchbar(page)

    await page.goto('https://solace-medusa-starter.vercel.app/de/about-us')

    await page.waitForLoadState('load')

    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Check searchbar visibility', async ({ page }) => {
    await searchbar.checkSearchbarVisibility()
  })

  test('Checking the search for a real product', async ({ page }) => {
    await searchbar.checkRealProductSearching()
  })

  test('Checking the search for a unexisting product', async ({ page }) => {
    await searchbar.checkNonExistingProductSearching()
  })
})
