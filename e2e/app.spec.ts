import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Login Flow', () => {
  test('should display login page when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await expect.poll(() => new URL(page.url()).pathname).toBe('/login');

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
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-01`;
    const categories = {
      categories: [
        {
          id: 101,
          name: 'Dining',
          description: null,
          is_income: false,
          exclude_from_budget: false,
          exclude_from_totals: false,
          archived: false,
          archived_at: null,
          updated_at: now.toISOString(),
          created_at: now.toISOString(),
          is_group: false,
          group_id: null,
          order: 1,
          collapsed: false,
        },
        {
          id: 201,
          name: 'Salary',
          description: null,
          is_income: true,
          exclude_from_budget: false,
          exclude_from_totals: false,
          archived: false,
          archived_at: null,
          updated_at: now.toISOString(),
          created_at: now.toISOString(),
          is_group: false,
          group_id: null,
          order: 2,
          collapsed: false,
        },
      ],
    };

    const budgetSummary = {
      aligned: true,
      categories: [
        {
          category_id: 101,
          totals: {
            other_activity: 150,
            recurring_activity: 0,
            budgeted: 400,
            available: 250,
            recurring_remaining: 0,
            recurring_expected: 0,
          },
          occurrences: [
            {
              current: true,
              start_date: monthKey,
              end_date: monthKey,
              other_activity: 150,
              recurring_activity: 0,
              budgeted: 400,
              budgeted_amount: '400.00',
              budgeted_currency: 'USD',
              notes: null,
            },
          ],
        },
        {
          category_id: 201,
          totals: {
            other_activity: -3000,
            recurring_activity: 0,
            budgeted: 3000,
            available: 0,
            recurring_remaining: 0,
            recurring_expected: 0,
          },
          occurrences: [
            {
              current: true,
              start_date: monthKey,
              end_date: monthKey,
              other_activity: -3000,
              recurring_activity: 0,
              budgeted: 3000,
              budgeted_amount: '3000.00',
              budgeted_currency: 'USD',
              notes: null,
            },
          ],
        },
      ],
    };

    await page.route('**/v2/categories**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      })
    );

    await page.route('**/v2/summary**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(budgetSummary),
      })
    );

    await page.route('**/v2/recurring_items**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recurring_items: [] }),
      })
    );

    await page.route('**/v2/transactions**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactions: [], has_more: false }),
      })
    );

    // Mock authentication for dashboard tests by seeding storage
    await page.addInitScript(() => {
      localStorage.setItem(
        'lunchmoney_api_key',
        'test-api-key-for-e2e-testing'
      );
    });

    await page.goto('/dashboard');
    if (/\/dashboard$/.test(new URL(page.url()).pathname)) {
      await expect(page).toHaveURL(/\/dashboard$/);
    } else {
      await page.evaluate(() => {
        localStorage.setItem(
          'lunchbuddy_api_key',
          'test-api-key-for-e2e-testing'
        );
      });
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Wait for the dashboard to fully load
    await page.waitForSelector('h2', { timeout: 5000 });

    // Check that h2 exists for month name
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(1);
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    const focusableSelector =
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    await page.locator(focusableSelector).first().waitFor();
    await page.click('body');

    // Press Tab to navigate through interactive elements
    let focusedElementsCount = 0;

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const activeTag = await page.evaluate(
        () => document.activeElement?.tagName ?? ''
      );

      if (activeTag !== '' && activeTag !== 'BODY') {
        focusedElementsCount++;
      }
    }

    // Should have navigated through several elements
    expect(focusedElementsCount).toBeGreaterThan(0);
  });

  test('should display settings dialog when requested', async ({ page }) => {
    await page.goto('/dashboard');

    const customizeButton = page.getByRole('button', {
      name: 'Open settings',
      exact: true,
    });
    await expect(customizeButton).toBeVisible();

    await customizeButton.click();

    const dialogHeading = page.getByRole('heading', {
      level: 2,
      name: 'Settings',
      exact: true,
    });

    await expect(dialogHeading).toBeVisible();
  });
});
