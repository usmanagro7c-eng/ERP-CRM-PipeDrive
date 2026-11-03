import { queryOptions } from "@tanstack/react-query";

export interface SessionUser {
  user: string;
  name: string;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

export const SESSION_QUERY_KEY = ["session"] as const;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return ((await response.json()) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (response.status === 401) return null;
  if (!response.ok) throw new AuthError(response.status, "Could not check your session");
  const data = await readJson(response);
  return { user: String(data["user"] ?? ""), name: String(data["name"] ?? data["user"] ?? "") };
}

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
    retry: false,
  });

export async function login(usr: string, pwd: string): Promise<SessionUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new AuthError(
      response.status,
      String(data["error"] ?? `Sign in failed (${response.status})`),
    );
  }
  return { user: String(data["user"] ?? usr), name: String(data["name"] ?? usr) };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}
