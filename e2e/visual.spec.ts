import { test, expect, login } from "./fixtures";

const screens = ["/dashboard", "/organizations", "/deals"];

for (const scheme of ["light", "dark"] as const) {
  for (const route of screens) {
    test(`visual ${route} ${scheme}`, async ({ page }) => {
      // The app stores the theme choice, so the media emulation alone does not
      // switch it - set the stored preference before the app boots.
      await page.addInitScript((value) => {
        try {
          window.localStorage.setItem("agrocrm.theme", value);
        } catch {
          // storage unavailable: the default theme is used
        }
      }, scheme);
      await login(page);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await expect(page).toHaveScreenshot(`${route.replace(/\//g, "_")}_${scheme}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
}
