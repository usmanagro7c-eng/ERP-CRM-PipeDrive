import { defineConfig, devices } from "@playwright/test";

const BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\pw-browsers";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5180",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "iPhone SE",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "iPhone 14",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "Pixel 7",
      use: {
        browserName: "chromium",
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "iPad",
      use: {
        browserName: "chromium",
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "Laptop", use: { viewport: { width: 1366, height: 768 } } },
    { name: "Desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "Wide", use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    // The test stack runs on its own port so it can never take over the port a
    // developer uses for `npm run dev` (5173) and silently serve mock data.
    command: "npm run dev:test",
    url: "http://localhost:5180",
    reuseExistingServer: true,
    timeout: 120000,
    env: { PLAYWRIGHT_BROWSERS_PATH: BROWSERS_PATH },
  },
});
