import { spawn } from "node:child_process";
const env = {
  ...process.env,
  FRAPPE_BASE_URL: "http://127.0.0.1:8099",
  ERPNEXT_BASE_URL: "http://127.0.0.1:8099",
  FRAPPE_API_KEY: "test",
  FRAPPE_API_SECRET: "test",
  ERPNEXT_API_KEY: "test",
  ERPNEXT_API_SECRET: "test",
  SESSION_SECRET: "ui-polish-test-secret-32chars-minimum!!",
  ALLOWED_USERS: "*",
};
const child = spawn("npx", ["vite", "dev"], { stdio: "inherit", env, shell: true });
child.on("exit", (code) => process.exit(code ?? 0));