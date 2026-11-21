import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SESSION_QUERY_KEY, login } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · AgroCRM" }] }),
  component: LoginPage,
});

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usrRef = useRef<HTMLInputElement>(null);
  const pwdRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Restore remembered username/email on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUsr = localStorage.getItem("agrocrm_saved_email");
      if (savedUsr && usrRef.current) {
        usrRef.current.value = savedUsr;
        // Focus password input if email was pre-filled
        pwdRef.current?.focus();
      }
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.getModifierState && typeof e.getModifierState === "function") {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const usr = usrRef.current?.value.trim() ?? "";
    const pwd = pwdRef.current?.value ?? "";

    if (!usr || !pwd) {
      setError("Please enter both username/email and password.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setError(null);
    setPending(true);

    try {
      const user = await login(usr, pwd);

      // Save or remove remembered email
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("agrocrm_saved_email", usr);
        } else {
          localStorage.removeItem("agrocrm_saved_email");
        }
      }

      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      if (user.isDedicatedSystem) {
        await navigate({ to: "/settings", search: {} });
      } else {
        await navigate({ to: "/dashboard", search: {} });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* ── Left Hero Panel (Desktop) ────────────────────────── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#06140e] p-12 text-white select-none lg:flex xl:p-16 border-r border-emerald-950/40">
        {/* Animated Background Ambience */}
        <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px] animate-pulse-glow" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-teal-500/10 blur-[130px] animate-float-reverse" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(16,185,129,0.12)_1px,transparent_1px)] [background-size:28px_28px] opacity-70" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25 ring-1 ring-white/20">
              <Leaf className="size-6 text-emerald-950 stroke-[2.2]" />
            </span>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                AgroCRM
              </span>
              <span className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-emerald-300 backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <span>Live Dual-Sync</span>
          </div>
        </div>

        {/* Centerpiece Visual & Copy */}
        <div className="relative z-10 my-auto max-w-lg space-y-8 py-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Sparkles className="size-3.5 text-emerald-300" />
              High-Velocity Agri Sales Suite
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white xl:text-4xl">
              Close deals faster.
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                Power your entire pipeline.
              </span>
            </h1>
            <p className="text-sm leading-relaxed text-emerald-100/70">
              Integrated real-time synchronization between Frappe CRM and ERPNext. Built for agribusinesses, distributors, and field teams.
            </p>
          </div>

          {/* Floating Interactive Deal Preview Card */}
          <div className="relative pt-4">
            {/* Top-Right Floating Velocity Badge */}
            <div className="absolute -top-1 -right-3 z-20 flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-[#0d2a1f]/95 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-md animate-float-reverse">
              <TrendingUp className="size-3.5 text-emerald-400" />
              <span>+38% Pipeline Velocity</span>
            </div>

            {/* Main Glass Card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl animate-float-slow transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Leaf className="size-4" />
                  </span>
                  <div>
                    <div className="text-xs font-medium text-emerald-200/60">Active Deal</div>
                    <div className="text-sm font-semibold text-white">Pak Green Fertilizers Ltd</div>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  Proposal Sent
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-emerald-100/50">Deal Value</div>
                  <div className="text-xl font-bold text-white">PKR 8,500,000</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-100/50">Win Probability</div>
                  <div className="text-sm font-bold text-emerald-400">85%</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
              </div>

              {/* Footer item in card */}
              <div className="mt-3.5 flex items-center justify-between text-xs text-emerald-100/60 pt-2 border-t border-white/5">
                <span>Quotation #QTN-2026-0042</span>
                <span className="text-emerald-300 font-medium">Synced with ERPNext</span>
              </div>
            </div>

            {/* Bottom-Left Floating Trust Badge */}
            <div className="absolute -bottom-3 -left-3 z-20 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/90 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-xl backdrop-blur-md">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>Dual-Instance Auth Active</span>
            </div>
          </div>
        </div>

        {/* Left Bottom Status */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-emerald-100/50">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>ERP & Frappe Services Operational</span>
          </div>
          <span>AgroCRM v2.4</span>
        </div>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-14 xl:px-20">
        {/* Subtle decorative background ambient glow */}
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-primary/5 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-emerald-500/5 blur-[90px]" />

        <div className="relative z-10 w-full max-w-[410px] space-y-7">
          {/* Mobile Header Branding */}
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md shadow-emerald-600/20">
              <Leaf className="size-5 stroke-[2.2]" />
            </span>
            <div>
              <span className="font-display text-lg font-bold tracking-tight">AgroCRM</span>
              <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Enterprise
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your Frappe CRM or ERPNext account.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={onSubmit}
            onKeyDown={handleKeyDown}
            className={cn("space-y-4.5 transition-transform", shake && "animate-[shake_0.5s_ease]")}
          >
            {/* Username / Email field */}
            <div className="space-y-1.5">
              <Label htmlFor="usr" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email or Username
              </Label>
              <div className="relative rounded-xl border border-input/90 bg-card/60 shadow-xs transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-input">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <Mail className="size-4" />
                </span>
                <input
                  id="usr"
                  ref={usrRef}
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="name@agrovisions.pk"
                  disabled={pending}
                  className="h-11 w-full rounded-xl bg-transparent pl-10 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pwd" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                {capsLockActive && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    Caps Lock is ON
                  </span>
                )}
              </div>
              <div className="relative rounded-xl border border-input/90 bg-card/60 shadow-xs transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-input">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <Lock className="size-4" />
                </span>
                <input
                  id="pwd"
                  ref={pwdRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  disabled={pending}
                  className="h-11 w-full rounded-xl bg-transparent pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-0.5">
              <label
                htmlFor="remember"
                className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none"
              >
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  className="size-4 rounded-md"
                />
                <span>Remember my email</span>
              </label>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={pending}
              className="group relative h-11 w-full overflow-hidden rounded-xl font-semibold shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30"
            >
              {/* Shimmer overlay animation on button */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-sheen" />

              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>Signing in…</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Sign in</span>
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          {/* Security & System footer info */}
          <div className="pt-2 text-center text-xs text-muted-foreground/80 space-y-2 border-t border-border/50">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground/70">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Frappe CRM & ERPNext Authorized Access</span>
            </div>
            <p className="text-[11px] text-muted-foreground/60 leading-normal">
              Users with ERPNext or Frappe CRM credentials can log in directly. System users will have access to notification controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}