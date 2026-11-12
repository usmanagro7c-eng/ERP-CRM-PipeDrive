import { defineConfig, devices } from "@playwright/test";

const BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\pw-browsers";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "iPhone SE", use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
    { name: "iPhone 14", use: { ...devices["iPhone 14"], viewport: { width: 390, height: 844 } } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
    { name: "iPad", use: { ...devices["iPad (gen 7)"], viewport: { width: 820, height: 1180 } } },
    { name: "Laptop", use: { viewport: { width: 1366, height: 768 } } },
    { name: "Desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "Wide", use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: "npm run dev:test",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120000,
    env: { PLAYWRIGHT_BROWSERS_PATH: BROWSERS_PATH },
  },
});