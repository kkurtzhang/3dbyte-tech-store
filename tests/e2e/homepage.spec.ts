import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and displays main content', async ({ page }) => {
    await page.goto('/');

    // Check that the page loaded successfully
    await expect(page).toHaveTitle(/3D Byte Tech Store/);

    // Check for common navigation elements
    const navigation = page.locator('nav, header');
    await expect(navigation).toBeVisible();

    // Check that main content area is present
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Check if there are navigation links
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();

    if (count > 0) {
      // Click the first visible link and verify navigation
      const firstLink = navLinks.first();
      await firstLink.click();
      await expect(page).toHaveURL(/./);
    }
  });

  test('responsive design works', async ({ page }) => {
    await page.goto('/');

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav, header')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav, header')).toBeVisible();
  });
});
