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
    const budgetSummary = [
      {
        category_name: 'Dining',
        category_id: 101,
        category_group_name: 'Food',
        group_id: null,
        is_group: false,
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        order: 1,
        archived: false,
        data: {
          [monthKey]: {
            num_transactions: 4,
            spending_to_base: 150,
            budget_to_base: 400,
            budget_amount: 400,
            budget_currency: 'USD',
            is_automated: false,
          },
        },
        config: {
          config_id: 1,
          cadence: 'monthly',
          amount: 400,
          currency: 'USD',
          to_base: 400,
          auto_suggest: 'fixed',
        },
        recurring: { data: [] },
      },
      {
        category_name: 'Salary',
        category_id: 201,
        category_group_name: 'Income',
        group_id: null,
        is_group: false,
        is_income: true,
        exclude_from_budget: false,
        exclude_from_totals: false,
        order: 2,
        archived: false,
        data: {
          [monthKey]: {
            num_transactions: 1,
            spending_to_base: -3000,
            budget_to_base: -3000,
            budget_amount: -3000,
            budget_currency: 'USD',
            is_automated: false,
          },
        },
        config: {
          config_id: 2,
          cadence: 'monthly',
          amount: -3000,
          currency: 'USD',
          to_base: -3000,
          auto_suggest: 'fixed',
        },
        recurring: { data: [] },
      },
    ];

    await page.route('**/v1/budgets**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(budgetSummary),
      })
    );

    await page.route('**/v1/recurring_expenses**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recurring_expenses: [] }),
      })
    );

    await page.route('**/v1/transactions**', route =>
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

  test('should display offline indicator when offline', async ({
    page,
    context,
  }) => {
    // Simulate offline mode
    await context.setOffline(true);
    try {
      // Trigger a network request or wait for offline detection
      await page.waitForTimeout(1000);

      // Check for offline indicator
      const offlineIndicator = page.locator('[role="alert"]');
      await expect(offlineIndicator).toBeVisible();
      await expect(offlineIndicator).toContainText(/offline/i);
    } finally {
      await context.setOffline(false);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check that h1 exists and is unique
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Check heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
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

  test('should display customize dialog when requested', async ({ page }) => {
    await page.goto('/dashboard');

    const customizeButton = page.getByRole('button', { name: /customise/i });
    await expect(customizeButton).toBeVisible();

    await customizeButton.click();

    const dialogHeading = page.getByRole('heading', {
      name: /customize your dashboard/i,
    });

    await expect(dialogHeading).toBeVisible();
  });
});
