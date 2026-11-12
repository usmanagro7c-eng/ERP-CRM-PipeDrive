// Lighthouse audit for the local UI.
//
// Usage:
//   npm run audit:lighthouse                          # audits the routes below
//   BASE_URL=http://localhost:5173 LIGHTHOUSE_ROUTES=/login npm run audit:lighthouse
//   LIGHTHOUSE_LOGIN=false npm run audit:lighthouse   # audit anonymously (no login)
//   LIGHTHOUSE_MIN_SCORE=90 npm run audit:lighthouse  # exit non-zero below 90
//
// Chrome is auto-detected (CHROME_PATH wins, then the usual install paths, then
// the Playwright chromium build). Lighthouse itself is fetched on demand with
// `npx`, so it is not a project dependency. Reports land in
// `ui-audit/lighthouse/` as JSON + HTML.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/$/, "");
const ROUTES = (process.env.LIGHTHOUSE_ROUTES || "/dashboard,/leads,/deals,/organizations,/contacts")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const OUT_DIR = path.resolve("ui-audit", "lighthouse");
const MIN_SCORE = Number(process.env.LIGHTHOUSE_MIN_SCORE || 0);
const SHOULD_LOGIN = process.env.LIGHTHOUSE_LOGIN !== "false";
const IS_WINDOWS = process.platform === "win32";

function fail(message) {
  console.error(`\n[lighthouse] ${message}\n`);
  process.exit(1);
}

async function main() {
  try {
    const probe = await fetch(BASE, { redirect: "manual" });
    if (probe.status >= 500) fail(`${BASE} responded with ${probe.status}.`);
  } catch {
    fail(`No server at ${BASE}. Start it first, e.g. "npm run dev:test" or "npm run dev".`);
  }

  const chromePath = resolveChrome();
  const extraHeaders = SHOULD_LOGIN ? await loginCookieHeader() : {};
  mkdirSync(OUT_DIR, { recursive: true });

  // Lighthouse is spawned through a shell on Windows, and this project's path
  // contains spaces. Run it from a space-free scratch dir with relative paths so
  // no argument needs quoting. The dir lives next to the repo (gitignored) so a
  // full system temp drive cannot break the audit.
  const cacheRoot = path.resolve(".ui-audit-cache");
  mkdirSync(cacheRoot, { recursive: true });
  const workDir = mkdtempSync(path.join(cacheRoot, "lh-"));
  if (Object.keys(extraHeaders).length > 0) {
    writeFileSync(path.join(workDir, "headers.json"), JSON.stringify(extraHeaders));
  }
  const env = {
    ...process.env,
    CHROME_PATH: chromePath,
    npm_config_cache: path.join(cacheRoot, "npm"),
  };

  const results = [];
  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    const slug = (route === "/" ? "root" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")) || "root";
    const reportName = `report-${slug}`;
    const args = [
      "--yes",
      "lighthouse@12",
      url,
      "--quiet",
      "--output=json",
      "--output=html",
      `--output-path=${reportName}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      ...(Object.keys(extraHeaders).length > 0 ? ["--extra-headers=headers.json"] : []),
    ];
    console.log(`\n[lighthouse] Auditing ${url}`);
    const run = IS_WINDOWS
      ? // `shell` is required to launch npx.cmd; one command string avoids the
        // DEP0190 warning that `shell` + an args array raises.
        spawnSync(["npx", ...args].map(quoteForCmd).join(" "), {
          cwd: workDir,
          env,
          shell: true,
          stdio: "inherit",
        })
      : spawnSync("npx", args, { cwd: workDir, env, stdio: "inherit" });
    // Lighthouse names single-output reports `<name>.<ext>` and multi-output
    // reports `<name>.report.<ext>`, so match by prefix.
    const produced = readdirSyncSafe(workDir).filter((file) => file.startsWith(reportName));
    const jsonFile = produced.find((file) => file.endsWith(".json"));
    const htmlFile = produced.find((file) => file.endsWith(".html"));
    if (run.status !== 0 || !jsonFile) {
      console.error(`[lighthouse] Skipped ${url} (audit did not produce a report).`);
      continue;
    }
    copyFileSync(path.join(workDir, jsonFile), path.join(OUT_DIR, `${slug}.json`));
    if (htmlFile) copyFileSync(path.join(workDir, htmlFile), path.join(OUT_DIR, `${slug}.html`));
    results.push({ route, report: readJson(path.join(workDir, jsonFile)) });
  }

  rmSync(workDir, { recursive: true, force: true });

  if (results.length === 0) fail("No reports were produced.");

  console.log("\n[lighthouse] Scores");
  const rows = results.map(({ route, report }) => {
    const categories = report.categories || {};
    const row = { route };
    for (const key of ["performance", "accessibility", "best-practices", "seo"]) {
      const score = categories[key]?.score;
      row[key] = typeof score === "number" ? Math.round(score * 100) : "n/a";
    }
    return row;
  });
  console.table(rows);
  console.log(`\n[lighthouse] HTML + JSON reports written to ${OUT_DIR}`);

  if (MIN_SCORE > 0) {
    const failures = [];
    for (const row of rows) {
      for (const key of ["performance", "accessibility", "best-practices", "seo"]) {
        if (typeof row[key] === "number" && row[key] < MIN_SCORE) {
          failures.push(`${row.route} ${key}=${row[key]} (< ${MIN_SCORE})`);
        }
      }
    }
    if (failures.length > 0) fail(`Below the ${MIN_SCORE} threshold:\n  ${failures.join("\n  ")}`);
  }
}

function resolveChrome() {
  for (const candidate of [process.env.CHROME_PATH, process.env.LIGHTHOUSE_CHROME_PATH]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  for (const candidate of [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  const pwBrowsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (pwBrowsers && existsSync(pwBrowsers)) {
    for (const entry of readdirSyncSafe(pwBrowsers)) {
      if (!entry.startsWith("chromium-")) continue;
      for (const exe of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-linux/chrome"]) {
        const candidate = path.join(pwBrowsers, entry, exe);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return fail(
    "Could not find Chrome. Install it, or set CHROME_PATH to a Chrome/Chromium executable.",
  );
}

function quoteForCmd(arg) {
  return /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** Log in through the running app and return the cookies Lighthouse should send. */
async function loginCookieHeader() {
  const user = process.env.LIGHTHOUSE_USER || "admin@example.com";
  const pass = process.env.LIGHTHOUSE_PASS || "admin";
  try {
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`${BASE}/login`);
    await page.locator("#usr").fill(user, { timeout: 10_000 });
    await page.locator("#pwd").fill(pass, { timeout: 10_000 });
    await page.getByRole("button", { name: /sign in/i }).click();
    await page
      .waitForURL(/dashboard|leads|deals|organizations/, { timeout: 20_000 })
      .catch(() => {});
    const cookies = await browser.contexts()[0].cookies();
    await browser.close();
    if (cookies.length === 0) return {};
    console.log(`[lighthouse] Reusing the session cookie for ${user}`);
    return { Cookie: cookies.map((item) => `${item.name}=${item.value}`).join("; ") };
  } catch (error) {
    console.warn(
      `[lighthouse] Could not log in (${error instanceof Error ? error.message : error}); auditing anonymously.`,
    );
    return {};
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

await main();
