import { test, expect } from '@playwright/test';

test("Test Form", async ({ page }) => {
  await page.goto("https://example.com");
});
