const { test, expect } = require('@playwright/test');

test('homepage loads successfully', async ({ page }) => {
  // Navigate to the root page
  await page.goto('/');

  // Check if the page loaded by verifying a basic element is present.
  // We can just verify the page title or that the body exists.
  await expect(page.locator('body')).toBeVisible();
  
  // Example for future tests:
  // await expect(page.locator('h1')).toContainText('Altitud Hub');
});
