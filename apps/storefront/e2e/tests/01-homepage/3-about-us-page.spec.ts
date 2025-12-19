import { test } from '@playwright/test'

import AboutUsPage from '../../fixtures/page-objects/1-homepage/about-us'

test.describe('Shop page Tests', () => {
  let aboutuspage: AboutUsPage

  test.beforeEach(async ({ page }) => {
    aboutuspage = new AboutUsPage(page)

    await page.goto('https://solace-medusa-starter.vercel.app/de/about-us')

    await page.waitForLoadState('load')

    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'timedOut' && testInfo.status !== 'interrupted') {
      await page.close()
    }
  })

  test('Check about us page loading and it`s header', async ({ page }) => {
    await aboutuspage.checkLoadingAndHeader()
  })

  test('Check header and logo', async ({ page }) => {
    await aboutuspage.checkPageHeaderAndLogo()
  })

  test('Check `Our story` section`', async ({ page }) => {
    await aboutuspage.checkOurStorySection()
  })

  test('Check `Why us?` section`', async ({ page }) => {
    await aboutuspage.checkWhyUsSection()
  })

  test('Check `Our craftsmanship` section`', async ({ page }) => {
    await aboutuspage.checkOurCraftsmanshipSection()
  })

  test('Check `Get inspired` section`', async ({ page }) => {
    await aboutuspage.checkGetInspiredSection()
  })
})
