import { test } from '@playwright/test'

import Homepage from '../../fixtures/page-objects/1-homepage/homepage'

test.describe('Homepage Tests', () => {
  let homepage: Homepage

  test.beforeEach(async ({ page }) => {
    homepage = new Homepage(page)
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(homepage.homepageUrl)
  })

  test('Check page loading and it`s title', async ({ page }) => {
    await homepage.checkPageTitle()
  })

  test('Check header redirections', async ({ page }) => {
    await homepage.checkShopTab()

    await homepage.checkCollectionsTab()

    await homepage.checkAboutUsTab()
  })

  test('Check img existing', async ({ page }) => {
    await homepage.checkImgExisting()
  })

  test('Check redirection to `All products` by `Explore now` button', async ({
    page,
  }) => {
    await homepage.checkRedirectionByExploreNowBtn()
  })

  test('Check redirections from `Our bestsellers` section', async ({
    page,
  }) => {
    await homepage.checkRedirectionToSingleProduct()

    await homepage.checkRedirectionByViewAllBtn()
  })

  test('Check redirections to blog from `Get inspired` section', async ({
    page,
  }) => {
    await homepage.checkRedirectionToSingleBlogPost()

    await homepage.checkRedirectionToAllBlogPosts()
  })
})
