import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
  },
});

export async function login(page: import("@playwright/test").Page, user = "admin@example.com", pass = "admin") {
  await page.goto("/login");
  await page.getByLabel(/username|email|user/i).first().fill(user).catch(() => {});
  // fallback selectors
  const usr = page.locator('input[name="usr"], input[type="text"], input[type="email"]').first();
  await usr.fill(user);
  const pwd = page.locator('input[name="pwd"], input[type="password"]').first();
  await pwd.fill(pass);
  await page.getByRole("button", { name: /sign in|login|log in/i }).first().click();
  await page.waitForURL(/dashboard|leads|deals|organizations/, { timeout: 15000 }).catch(() => {});
}

export { expect };