import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Leaf, Loader2, TrendingUp, Users, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SESSION_QUERY_KEY, login } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · AgroCRM" }] }),
  component: LoginPage,
});

const FEATURES = [
  { icon: TrendingUp, text: "Real-time sales pipeline" },
  { icon: Users, text: "Unified contact management" },
  { icon: BarChart3, text: "Live CRM analytics" },
  { icon: Zap, text: "Synced with Frappe backend" },
];

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usrRef = useRef<HTMLInputElement>(null);
  const pwdRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const usr = usrRef.current?.value ?? "";
    const pwd = pwdRef.current?.value ?? "";
    setError(null);
    setPending(true);
    try {
      const user = await login(usr, pwd);
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      await navigate({ to: "/organizations", search: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left brand panel (desktop only) ──────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-primary p-10 text-primary-foreground">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Leaf className="size-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">AgroCRM</span>
        </div>

        {/* Value prop */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">
              Your agri sales pipeline, always in sync.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
              Track leads, close deals, and manage your field teams — all powered by Frappe CRM.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-primary-foreground/85">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <Icon className="size-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-primary-foreground/40">
          AgroCRM · Built on Frappe CRM
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">AgroCRM</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your Frappe CRM account.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className={cn("space-y-5 transition-transform", shake && "animate-[shake_0.5s_ease]")}
          >
            <div className="space-y-2">
              <Label htmlFor="usr">Username or email</Label>
              <Input
                id="usr"
                ref={usrRef}
                autoComplete="username"
                autoFocus
                placeholder="you@example.com"
                defaultValue=""
                disabled={pending}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Password</Label>
              <Input
                id="pwd"
                ref={pwdRef}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                defaultValue=""
                disabled={pending}
                className="h-10"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-semibold gap-2"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
