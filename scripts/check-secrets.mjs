/**
 * Fails when the repository contains a hard-coded credential.
 *
 *   npm run check:secrets
 *
 * Checks:
 *  - "token <key>:<secret>" and "Bearer <token>" strings,
 *  - quoted hex strings of 15+ characters (Frappe API keys are 15 hex chars),
 *  - assignments of a credential-ish name to a literal value,
 *  - `.env.example` must only contain empty placeholders,
 *  - `wrangler.jsonc` `vars` must not contain a secret.
 *
 * The same scanner runs as part of the unit test suite (src/test/secrets.test.ts).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Directories that never contain first-party source. */
export const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".wrangler",
  ".tanstack",
  ".playwright-mcp",
  "dist",
  "playwright-report",
  "test-results",
  "node_modules",
  "node_modules_old",
  "coverage",
  ".next",
  ".agents",
  ".ui-audit-cache",
  "ui-audit",
]);

/** Files that are allowed to contain hashes / lock file integrity values. */
export const IGNORED_FILES = new Set([
  "package-lock.json",
  "skills-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  // Local, never committed: real values live here.
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".dev.vars",
]);

export const PATTERNS = [
  {
    name: "token key:secret",
    regex: /\btoken\s+[A-Za-z0-9_-]{6,}:[A-Za-z0-9_-]{6,}/g,
  },
  {
    name: "bearer token",
    regex: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/g,
  },
  {
    name: "quoted hex secret (15+ chars)",
    regex: /["'`][0-9a-fA-F]{15,}["'`]/g,
  },
  {
    name: "credential assigned to a literal",
    regex:
      /\b(?:api[_-]?key|api[_-]?secret|password|passwd|secret|token|authorization)\b\s*[:=]\s*["'`][^"'`\n]{6,}["'`]/gi,
  },
];

/** Lines that only *read* a secret from the environment are fine. */
const SAFE_LINE = [
  /\bprocess\s*\.\s*env\b/,
  /\breadEnv\s*\(/,
  /\bimport\s*\.\s*meta\s*\.\s*env\b/,
  /\bsecrets\s*\./,
  /\bgetCloudflareBinding\b/,
  /\bgetSecret\b/,
  /\benv\.[A-Z_]+\b/,
  // Cloudflare account ids are identifiers, not credentials.
  /\baccount_id\b/,
  /^\s*(?:\/\/|\*|#)/,
];

function isSafeLine(line) {
  return SAFE_LINE.some((pattern) => pattern.test(line));
}

/** Recursively list the files that must be scanned. */
export function listScannableFiles(root = ROOT) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (IGNORED_FILES.has(entry.name)) continue;
      if (entry.name.endsWith(".map")) continue;
      files.push(full);
    }
  };
  walk(root);
  return files;
}

function relative(file, root = ROOT) {
  return path.relative(root, file).split(path.sep).join("/");
}

/**
 * Scan a single file. Returns a list of findings:
 * `{ file, line, pattern, snippet }` — the snippet is masked.
 */
export function scanFile(file, root = ROOT) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const findings = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isSafeLine(line)) return;
    for (const { name, regex } of PATTERNS) {
      const matches = line.match(regex);
      if (!matches) continue;
      for (const match of matches) {
        findings.push({
          file: relative(file, root),
          line: index + 1,
          pattern: name,
          snippet: mask(match),
        });
      }
    }
  });
  return findings;
}

/** Mask a secret so it can be shown in a report. */
export function mask(value) {
  const text = String(value);
  if (text.length <= 4) return "*".repeat(text.length);
  return `${text.slice(0, 2)}${"*".repeat(Math.max(4, text.length - 4))}${text.slice(-2)}`;
}

/** Strip // and /* comments from a JSONC file. */
export function stripJsonComments(text) {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (char === "\n") {
        inLine = false;
        out += char;
      }
      continue;
    }
    if (inBlock) {
      if (char === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        i++;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === "/" && next === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += char;
  }
  return out;
}

/** `.env.example` may only contain empty placeholders. */
export function checkEnvExample(root = ROOT) {
  const file = path.join(root, ".env.example");
  if (!fs.existsSync(file)) return [];
  const findings = [];
  fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) return;
      const value = match[2].trim();
      if (value.length === 0) return;
      findings.push({
        file: ".env.example",
        line: index + 1,
        pattern: "non-empty placeholder",
        snippet: `${match[1]}=${mask(value)}`,
      });
    });
  return findings;
}
/** `wrangler.jsonc` vars must not contain a secret. */
export function checkWranglerVars(root = ROOT) {
  const file = path.join(root, "wrangler.jsonc");
  if (!fs.existsSync(file)) return [];
  let config;
  try {
    config = JSON.parse(stripJsonComments(fs.readFileSync(file, "utf8")));
  } catch {
    return [
      {
        file: "wrangler.jsonc",
        line: 1,
        pattern: "could not be parsed",
        snippet: "",
      },
    ];
  }
  const findings = [];
  const vars = config?.vars ?? {};
  for (const [name, value] of Object.entries(vars)) {
    if (!/(KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL)/i.test(name)) continue;
    findings.push({
      file: "wrangler.jsonc",
      line: 1,
      pattern: "secret in wrangler vars",
      snippet: `${name}=${mask(String(value))}`,
    });
  }
  return findings;
}

/** Run every check and return all findings. */
export function scanRepository(root = ROOT) {
  const findings = [];
  for (const file of listScannableFiles(root)) {
    findings.push(...scanFile(file, root));
  }
  findings.push(...checkEnvExample(root));
  findings.push(...checkWranglerVars(root));
  return findings;
}

function main() {
  const findings = scanRepository(ROOT);
  if (findings.length === 0) {
    console.log("check:secrets — no hard-coded credentials found.");
    return 0;
  }
  console.error(`check:secrets — ${findings.length} potential secret(s) found:\n`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}  [${finding.pattern}]  ${finding.snippet}`);
  }
  console.error("\nRemove the value, read it from the environment instead.");
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
