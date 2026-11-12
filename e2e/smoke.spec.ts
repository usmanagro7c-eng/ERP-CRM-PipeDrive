import { test, expect, login } from "./fixtures";

test.describe("smoke", () => {
  test("login and navigate dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard|leads|deals|organizations/, { timeout: 20000 });
  });

  test("organizations list renders", async ({ page }) => {
    await login(page);
    await page.goto("/organizations");
    // Target the page content, not the nav label: the mobile nav also contains
    // a hidden "Organizations" span, which `getByText` would match first.
    await expect(page.getByPlaceholder(/search organizations/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("link", { name: /ORG-\d{3}/ }).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test("no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await page.goto("/organizations");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(overflow).toBeFalsy();
  });
});
