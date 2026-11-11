import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  checkEnvExample,
  checkWranglerVars,
  mask,
  scanFile,
  scanRepository,
  stripJsonComments,
} from "../../scripts/check-secrets.mjs";

// The fixtures are assembled at runtime: a literal secret in this file would
// (correctly) trip the repository scan below.
const HEX_SECRET = "fb08" + "190ef15316d";
const TOKEN_HEADER = "token " + "abcdef123456" + ":" + "zyxwvu987654";
const SECRET_LITERAL = "super" + "-secret-value";
const SECRET_NAME = "api" + "Secret";
const AUTH_HEADER_NAME = "Author" + "ization";

function tempDir(): string {
  return mkdtempSync(path.join(tmpdir(), "secrets-scan-"));
}

describe("secret scanner", () => {
  it('detects a hard-coded "token key:secret" header', () => {
    const dir = tempDir();
    const file = path.join(dir, "leaky.ts");
    writeFileSync(file, `const headers = { ${AUTH_HEADER_NAME}: "${TOKEN_HEADER}" };\n`);
    const findings = scanFile(file, dir);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.pattern === "token key:secret")).toBe(true);
    // The finding must never contain the secret itself.
    expect(JSON.stringify(findings)).not.toContain("zyxwvu987654");
  });

  it("detects a 15+ character hex secret", () => {
    const dir = tempDir();
    const file = path.join(dir, "leaky.ts");
    writeFileSync(file, `const key = "${HEX_SECRET}";\n`);
    const findings = scanFile(file, dir);
    expect(findings.some((f) => f.pattern === "quoted hex secret (15+ chars)")).toBe(true);
  });

  it("detects a credential assigned to a literal", () => {
    const dir = tempDir();
    const file = path.join(dir, "leaky.ts");
    writeFileSync(file, `const ${SECRET_NAME} = "${SECRET_LITERAL}";\n`);
    const findings = scanFile(file, dir);
    expect(findings.some((f) => f.pattern === "credential assigned to a literal")).toBe(true);
  });

  it("ignores values that are read from the environment", () => {
    const dir = tempDir();
    const file = path.join(dir, "fine.ts");
    writeFileSync(
      file,
      [
        'const key = readEnv("FRAPPE_API_KEY");',
        "const secret = process.env.SESSION_SECRET;",
        "const other = import.meta.env.VITE_TOKEN;",
        `// const ${SECRET_NAME} = "should-not-be-checked";`,
        "",
      ].join("\n"),
    );
    expect(scanFile(file, dir)).toEqual([]);
  });

  it("masks what it reports", () => {
    expect(mask(HEX_SECRET)).not.toContain("fb08");
    expect(mask("abc")).toBe("***");
  });
});

describe("repository checks", () => {
  it("finds no hard-coded credentials in this repository", () => {
    const findings = scanRepository();
    expect(findings).toEqual([]);
  });

  it("requires .env.example to only contain empty placeholders", () => {
    const dir = tempDir();
    writeFileSync(
      path.join(dir, ".env.example"),
      ["FRAPPE_API_KEY=", "SESSION_SECRET=", `ERPNEXT_API_KEY=${SECRET_LITERAL}`, ""].join("\n"),
    );
    const findings = checkEnvExample(dir);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(3);
  });

  it("requires wrangler vars to hold no secret", () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "wrangler.jsonc"),
      `{ "name": "x", "vars": { "FRAPPE_API_KEY": "${SECRET_LITERAL}", "ALLOWED_USERS": "a@b.c" } }`,
    );
    const findings = checkWranglerVars(dir);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.pattern).toBe("secret in wrangler vars");
  });

  it("strips comments from jsonc", () => {
    const parsed = JSON.parse(
      stripJsonComments('{ // comment\n "a": 1 /* block */, "b": "http://x" }'),
    ) as { a: number; b: string };
    expect(parsed.a).toBe(1);
    expect(parsed.b).toBe("http://x");
  });
});
