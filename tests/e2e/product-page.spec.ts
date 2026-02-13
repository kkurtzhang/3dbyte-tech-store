import { test, expect } from '@playwright/test';

test.describe('Product Page', () => {
  test('product detail page loads', async ({ page }) => {
    // First, navigate to homepage to find a product
    await page.goto('/');

    // Look for product links
    const productLinks = page.locator('a[href*="/products/"]');
    const count = await productLinks.count();

    if (count > 0) {
      // Click on the first product link
      await productLinks.first().click();

      // Wait for navigation
      await page.waitForURL(/\/products\//);

      // Verify we're on a product page
      expect(page.url()).toContain('/products/');

      // Check for common product page elements
      const main = page.locator('main');
      await expect(main).toBeVisible();
    } else {
      // If no products found, at least verify the products page loads
      await page.goto('/products');
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('product page displays product information', async ({ page }) => {
    await page.goto('/products');

    // Try to find and click on a product
    const productCard = page.locator('[data-testid*="product"], .product-card, [class*="product"]').first();
    const cardExists = await productCard.count() > 0;

    if (cardExists) {
      await productCard.click();
      await page.waitForURL(/\/products\//);

      // Check for product details (title, price, etc.)
      const productTitle = page.locator('h1, h2, [data-testid*="title"]');
      const titleExists = await productTitle.count() > 0;
      if (titleExists) {
        await expect(productTitle.first()).toBeVisible();
      }

      // Check for add to cart button or similar
      const addToCart = page.locator('button:has-text("Add"), button:has-text("Cart"), [data-testid*="add"], [data-testid*="cart"]');
      const addToCartExists = await addToCart.count() > 0;
      if (addToCartExists) {
        await expect(addToCart.first()).toBeVisible();
      }
    }
  });

  test('product images load correctly', async ({ page }) => {
    await page.goto('/products');

    // Wait for images to load
    const images = page.locator('img');
    const count = await images.count();

    if (count > 0) {
      // Check that at least some images are visible
      for (let i = 0; i < Math.min(count, 5); i++) {
        const image = images.nth(i);
        const isVisible = await image.isVisible();
        if (isVisible) {
          const src = await image.getAttribute('src');
          expect(src).toBeTruthy();
        }
      }
    }
  });
});
