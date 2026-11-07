import * as React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/80 bg-muted/80 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground shadow-2xs",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
