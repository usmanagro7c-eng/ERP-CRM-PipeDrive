import { test, expect, login } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/dashboard",
  "/organizations",
  "/leads",
  "/deals",
  "/contacts",
  "/quotations",
  "/sales-orders",
  "/activities",
  "/notes",
  "/calls",
];

for (const route of routes) {
  test(`a11y ${route} @a11y`, async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    // Wait for the page to settle: scanning a loading skeleton reports
    // violations that disappear once the data has rendered.
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious,
      JSON.stringify(
        serious.map((v) => v.id),
        null,
        2,
      ),
    ).toEqual([]);
  });
}
