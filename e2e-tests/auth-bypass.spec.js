const { test, expect } = require('@playwright/test');

test.describe('Altitud Hub Test Mock Mode (Auth & DAL Bypass)', () => {

  test('Homepage (OKR Dashboard) loads successfully without redirecting to login', async ({ page }) => {
    await page.goto('/');
    
    // We expect the URL to remain / (since auth is bypassed in test mode)
    await expect(page).toHaveURL('/');
    
    // Verify that the Dashboard content is rendered
    await expect(page.locator('body')).toBeVisible();
    
    // Check for dashboard elements
    await expect(page.locator('#main-scroll-area')).toBeVisible();
  });

  test('CRM Contacts page loads successfully and displays mocked contact', async ({ page }) => {
    await page.goto('/contactos');
    
    // We expect the URL to remain /contactos
    await expect(page).toHaveURL('/contactos');
    
    // Verify that the contacts list page loads and contains the mock contact "Juan Pérez"
    await expect(page.locator('body')).toContainText('Juan');
    await expect(page.locator('body')).toContainText('Pérez');
  });

  test('Properties list page loads successfully and displays mocked property details', async ({ page }) => {
    await page.goto('/propiedades');
    
    // We expect the URL to remain /propiedades
    await expect(page).toHaveURL('/propiedades');
    
    // Verify that the property page loads and contains mock property info
    await expect(page.locator('body')).toContainText('Escazú');
    await expect(page.locator('body')).toContainText('Bella');
  });

  test('Office panel loads successfully', async ({ page }) => {
    await page.goto('/oficina');
    await expect(page).toHaveURL('/oficina');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Public development landing page loads successfully without auth', async ({ page }) => {
    await page.goto('/d/demo-development');
    await expect(page).toHaveURL('/d/demo-development');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText('Towers');
  });

});
