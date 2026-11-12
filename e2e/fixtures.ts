import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
  },
});

export async function login(page: import("@playwright/test").Page, user = "admin@example.com", pass = "admin") {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator("#usr").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#usr").fill(user);
  await page.locator("#pwd").fill(pass);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard|leads|deals|organizations/, { timeout: 20000 }).catch(() => {});
}

export { expect };