// Test stack: mock Frappe backend + Vite dev server, wired together.
//
//   npm run dev:test        -> mock API on :8099, UI on :5180
//
// The mock backend is started as a child process, so one command owns the whole
// stack and Ctrl+C stops both. The port is deliberately different from the one
// `npm run dev` uses (5173): the mock serves generated records, and it must
// never end up behind the developer's browser instead of the real backend.
import { spawn } from "node:child_process";

const MOCK_PORT = process.env.MOCK_PORT || "8099";
const DEV_PORT = process.env.DEV_PORT || "5180";

const env = {
  ...process.env,
  FRAPPE_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  ERPNEXT_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  FRAPPE_API_KEY: "test",
  FRAPPE_API_SECRET: "test",
  ERPNEXT_API_KEY: "test",
  ERPNEXT_API_SECRET: "test",
  SESSION_SECRET: "ui-polish-test-secret-32chars-minimum!!",
  ALLOWED_USERS: "*",
  // Flags the UI with a "TEST DATA" badge so mock records are never mistaken
  // for live CRM data.
  VITE_TEST_DATA: "1",
};

const children = [];

function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "inherit", env, shell: true, ...options });
  children.push(child);
  return child;
}

start("node", ["scripts/mock-frappe.mjs"]);

const dev = start("npx", ["vite", "dev", "--port", DEV_PORT, "--strictPort"]);

function shutdown(code) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code ?? 0);
}

dev.on("exit", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
