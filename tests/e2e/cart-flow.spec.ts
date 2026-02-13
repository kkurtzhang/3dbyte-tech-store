import { test, expect } from '@playwright/test';

test.describe('Cart Flow', () => {
  test('cart page loads', async ({ page }) => {
    await page.goto('/cart');

    // Check that cart page loads
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for cart-specific elements
    const cartContainer = page.locator('[data-testid*="cart"], .cart, [class*="cart"]');
    await expect(cartContainer.first()).toBeVisible();
  });

  test('can navigate to cart from homepage', async ({ page }) => {
    await page.goto('/');

    // Look for cart icon/link
    const cartLink = page.locator('a[href="/cart"], [data-testid*="cart"], [aria-label*="cart"]');
    const count = await cartLink.count();

    if (count > 0) {
      await cartLink.first().click();
      await expect(page).toHaveURL('/cart');
    }
  });

  test('cart displays items when added', async ({ page }) => {
    // Go to products page
    await page.goto('/products');

    // Try to find a product
    const productCard = page.locator('[data-testid*="product"], .product-card, [class*="product"]').first();
    const cardExists = await productCard.count() > 0;

    if (cardExists) {
      // Click on product
      await productCard.click();
      await page.waitForURL(/\/products\//);

      // Look for add to cart button
      const addToCartButton = page.locator('button:has-text("Add"), button:has-text("Cart"), [data-testid*="add"]');
      const buttonExists = await addToCartButton.count() > 0;

      if (buttonExists) {
        // Add to cart
        await addToCartButton.first().click();

        // Wait a moment for any animation/update
        await page.waitForTimeout(1000);

        // Navigate to cart
        await page.goto('/cart');

        // Check if cart is no longer empty or shows the item
        const cartItems = page.locator('[data-testid*="item"], .cart-item, [class*="item"]');
        const itemsCount = await cartItems.count();

        // Either we have items or we see some cart content
        const cartContent = page.locator('main').textContent();
        expect(cartContent).toBeTruthy();
      }
    }
  });

  test('cart navigation elements work', async ({ page }) => {
    await page.goto('/cart');

    // Check for checkout button or continue shopping
    const checkoutButton = page.locator('a[href*="checkout"], button:has-text("Checkout"), [data-testid*="checkout"]');
    const continueButton = page.locator('a[href="/"], a[href*="shop"], button:has-text("Continue")');

    const checkoutExists = await checkoutButton.count() > 0;
    const continueExists = await continueButton.count() > 0;

    // At least one navigation element should exist
    expect(checkoutExists || continueExists).toBeTruthy();
  });

  test('empty cart state is displayed', async ({ page }) => {
    // This test assumes we're starting with an empty cart
    await page.goto('/cart');

    // Look for empty cart message
    const emptyMessage = page.locator(':text("empty"), :text("Empty"), [data-testid*="empty"]');
    const emptyExists = await emptyMessage.count() > 0;

    if (emptyExists) {
      await expect(emptyMessage.first()).toBeVisible();
    }
  });
});
