import { X, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface FilterChipsBarProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterChipsBar({ chips, onClearAll, className }: FilterChipsBarProps) {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 py-1 px-3 sm:px-6 bg-muted/20 border-b border-border/50 text-xs animate-in fade-in duration-150 ${className || ""}`}>
      <span className="text-[11px] font-medium text-muted-foreground mr-1">Active filters:</span>
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-normal bg-background/80 border border-border/70 text-foreground shadow-2xs group"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="font-medium max-w-[140px] truncate">{chip.value}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            aria-label={`Remove filter for ${chip.label}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}

      {onClearAll && chips.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium ml-1.5 cursor-pointer underline-offset-2 hover:underline"
        >
          <RotateCcw className="size-2.5" />
          <span>Clear all</span>
        </button>
      )}
    </div>
  );
}
