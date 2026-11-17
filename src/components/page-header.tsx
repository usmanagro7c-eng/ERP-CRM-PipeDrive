import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  filters?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

/**
 * Standardized page header component for consistent layout across all pages.
 *
 * Design principle: Clean, professional, information-first hierarchy.
 * No decorative elements, clear typography, proper spacing.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  filters,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("shrink-0", className)}>
      {/* Top bar - title and primary actions */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 sm:px-6 py-3 sm:py-3.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          {/* Breadcrumbs if provided */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/50">/</span>}
                  <span
                    className={cn(
                      i === breadcrumbs.length - 1
                        ? "font-semibold text-foreground"
                        : "font-medium hover:text-foreground transition-colors",
                    )}
                  >
                    {crumb.label}
                  </span>
                </div>
              ))}
            </nav>
          )}

          {/* Title */}
          {!breadcrumbs && (
            <h1 className="text-display text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              {title}
            </h1>
          )}

          {/* Optional badge */}
          {badge && <div className="shrink-0">{badge}</div>}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Secondary bar - filters and secondary actions */}
      {filters && (
        <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 sm:px-6 py-2">
          {filters}
        </div>
      )}

      {/* Subtitle section if provided */}
      {subtitle && (
        <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-2">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      )}
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standardized page content container with consistent padding and layout.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      <div className="p-4 sm:p-6 space-y-6">{children}</div>
    </div>
  );
}

/**
 * Page wrapper that combines header and container.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-full flex-col bg-background overflow-hidden", className)}>
      {children}
    </div>
  );
}
