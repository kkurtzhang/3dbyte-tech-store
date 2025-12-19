import { Locator, Page } from '@playwright/test'

import { BasePage } from './base-page'

export class CheckoutPage extends BasePage {
  container: Locator

  constructor(page: Page) {
    super(page)
    this.container = page.getByTestId('checkout-container')
  }
}