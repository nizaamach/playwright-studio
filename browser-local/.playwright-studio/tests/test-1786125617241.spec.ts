import { test, expect } from '@playwright/test';

const testData = {
  baseUrl: "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login",
  email: "Admin",
  password: "admin123"
};

test("Orange-Login", async ({ page }) => {
  await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/auth/login");
  await page.getByPlaceholder("Username").click();
  await page.getByPlaceholder("Username").press("Tab");
  await page.getByPlaceholder("Username").fill("Admin");
  await page.getByPlaceholder("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await page.goto("https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index");
});
