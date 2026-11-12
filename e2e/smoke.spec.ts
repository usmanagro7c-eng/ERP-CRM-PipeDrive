import { test, expect, login } from "./fixtures";

test.describe("smoke", () => {
  test("login and navigate dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard|leads|deals|organizations/, { timeout: 20000 });
  });

  test("organizations list renders", async ({ page }) => {
    await login(page);
    await page.goto("/organizations");
    await expect(page.getByText(/organization/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await page.goto("/organizations");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBeFalsy();
  });
});