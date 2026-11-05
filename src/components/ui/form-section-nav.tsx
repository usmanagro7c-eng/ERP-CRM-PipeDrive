import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FrappeDocField, SectionPage } from "@/lib/frappe-meta";

interface FormSectionNavProps {
  pages: SectionPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  values?: Record<string, unknown>;
  isFieldRequired?: (field: FrappeDocField) => boolean;
  className?: string;
}

export function FormSectionNav({
  pages,
  activePageIndex,
  onSelectPage,
  values = {},
  isFieldRequired = (f) => Boolean(f.reqd),
  className,
}: FormSectionNavProps) {
  if (pages.length <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto border-b bg-muted/30 px-6 py-2.5 scrollbar-none",
        className,
      )}
    >
      {pages.map((page, idx) => {
        const isActive = activePageIndex === idx;
        const requiredFields = page.fields.filter(isFieldRequired);
        const hasRequired = requiredFields.length > 0;

        // Check if all required fields in this page are fulfilled
        const isCompleted =
          hasRequired &&
          requiredFields.every((f) => {
            const v = values[f.fieldname];
            return (
              v !== "" &&
              v !== null &&
              v !== undefined &&
              (typeof v !== "string" || v.trim() !== "")
            );
          });

        const missingRequiredCount = requiredFields.filter((f) => {
          const v = values[f.fieldname];
          return (
            v === "" ||
            v === null ||
            v === undefined ||
            (typeof v === "string" && v.trim() === "")
          );
        }).length;

        return (
          <button
            key={page.id}
            type="button"
            onClick={() => onSelectPage(idx)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground border border-border/50",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : isCompleted
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isCompleted ? <Check className="size-2.5 stroke-[3]" /> : idx + 1}
            </span>

            <span className="truncate">{page.label}</span>

            {hasRequired && missingRequiredCount > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "px-1 py-0 text-[10px] h-4 font-mono leading-none shrink-0",
                  isActive
                    ? "border-primary-foreground/40 bg-primary-foreground/20 text-primary-foreground"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}
                title={`${missingRequiredCount} required field(s)`}
              >
                {missingRequiredCount} req
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
