import * as React from "react";
import { cn } from "@/lib/utils";

const GRADIENT_PALETTES = [
  { bg: "from-indigo-500 to-blue-600", text: "text-white" },
  { bg: "from-violet-500 to-purple-600", text: "text-white" },
  { bg: "from-pink-500 to-rose-600", text: "text-white" },
  { bg: "from-rose-500 to-orange-500", text: "text-white" },
  { bg: "from-orange-500 to-amber-500", text: "text-white" },
  { bg: "from-emerald-500 to-teal-600", text: "text-white" },
  { bg: "from-teal-500 to-cyan-600", text: "text-white" },
  { bg: "from-cyan-500 to-blue-600", text: "text-white" },
  { bg: "from-fuchsia-500 to-pink-600", text: "text-white" },
];

function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "—";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return (parts[0]?.substring(0, 2) ?? "").toUpperCase();
  }
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts[parts.length - 1]?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase();
}

export interface AvatarGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  rounded?: "full" | "md" | "lg";
}

export function AvatarGradient({
  name,
  size = "sm",
  rounded = "full",
  className,
  ...props
}: AvatarGradientProps) {
  const hash = React.useMemo(() => stringToHash(name || "User"), [name]);
  const palette = GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length] ?? GRADIENT_PALETTES[0]!;
  const initials = React.useMemo(() => getInitials(name), [name]);

  const sizeClasses = {
    xs: "size-5 text-[9px]",
    sm: "size-6.5 text-[11px]",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
  }[size];

  const roundedClasses = {
    full: "rounded-full",
    md: "rounded-md",
    lg: "rounded-xl",
  }[rounded];

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold bg-gradient-to-tr shadow-2xs select-none ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-150 group-hover:scale-105",
        palette.bg,
        palette.text,
        sizeClasses,
        roundedClasses,
        className,
      )}
      title={name}
      {...props}
    >
      <span>{initials}</span>
    </div>
  );
}
