import { test, expect } from '@playwright/test';

test.describe('SiteDataService', () => {
  test('should clear IndexedDB and localStorage on logout', async ({
    page,
  }) => {
    // 1. Mock API responses to allow dashboard to load
    await page.route('**/v2/categories**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: [] }),
      })
    );
    await page.route('**/v2/summary**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ aligned: true, categories: [] }),
      })
    );
    await page.route('**/v2/recurring_items**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recurring_items: [] }),
      })
    );

    // 2. Pre-seed authentication and create the target IndexedDB
    await page.addInitScript(() => {
      // Seed API key
      localStorage.setItem('lunchbuddy_api_key', 'test-key-for-site-data-test');

      // Create the background database that SiteDataService should delete
      const request = indexedDB.open('lunchbuddy-background', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config');
        }
      };
      request.onsuccess = () => {
        request.result.close(); // Close it immediately so it doesn't block deletion
      };
    });

    // 3. Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);

    // 4. Verify DB exists before logout
    const dbExistsBefore = await page.evaluate(async () => {
      const databases = await (indexedDB as any).databases();
      return databases.some((db: any) => db.name === 'lunchbuddy-background');
    });
    expect(dbExistsBefore).toBe(true);

    // 5. Trigger Logout
    const logoutButton = page.locator('.logout-btn');
    await logoutButton.click();

    // 6. Wait for redirect to login
    await expect(page).toHaveURL(/\/login$/);

    // Give it a moment for the async deletion to finish
    await page.waitForTimeout(1000);

    // 7. Verify data is cleared
    const results = await page.evaluate(async () => {
      const apiKey = localStorage.getItem('lunchbuddy_api_key');
      const databases = await (indexedDB as any).databases();
      const dbStillExists = databases.some(
        (db: any) => db.name === 'lunchbuddy-background'
      );

      return {
        apiKey,
        dbStillExists,
      };
    });

    expect(results.apiKey).toBeNull();
    expect(results.dbStillExists).toBe(false);
  });
});
