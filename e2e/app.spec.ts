import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login Flow', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);

    // Check for key elements
    await expect(page.locator('h1')).toContainText(/login|sign in/i);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should validate API key input', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without entering API key
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Enter invalid API key format
    const apiKeyInput = page.locator('input[type="password"]');
    await apiKeyInput.fill('short');

    // Should still be invalid
    await expect(submitButton).toBeDisabled();
  });

  test('should have no accessibility violations on login page', async ({
    page,
  }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for dashboard tests
    await page.goto('/');

    // Set up mock API key in localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        'lunchmoney_api_key',
        'test-api-key-for-e2e-testing'
      );
    });
  });

  test('should display offline indicator when offline', async ({
    page,
    context,
  }) => {
    await page.goto('/dashboard');

    // Simulate offline mode
    await context.setOffline(true);

    // Trigger a network request or wait for offline detection
    await page.waitForTimeout(1000);

    // Check for offline indicator
    const offlineIndicator = page.locator('[role="alert"]');
    await expect(offlineIndicator).toBeVisible();
    await expect(offlineIndicator).toContainText(/offline/i);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that h1 exists and is unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Check heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');

    // Press Tab to navigate through interactive elements
    let focusedElementsCount = 0;

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');

      if ((await focusedElement.count()) > 0) {
        focusedElementsCount++;
      }
    }

    // Should have navigated through several elements
    expect(focusedElementsCount).toBeGreaterThan(0);
  });
});
