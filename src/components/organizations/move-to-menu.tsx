import { useState } from "react";
import { Search } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface MoveToSubmenuProps {
  label: string;
  currentValue?: string | null;
  options: Array<{ key: string; label: string; value: string }>;
  allowNone?: boolean;
  onSelect: (value: string) => void;
}

export function MoveToSubmenu({
  label,
  currentValue,
  options,
  allowNone = false,
  onSelect,
}: MoveToSubmenuProps) {
  const [search, setSearch] = useState("");

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <DropdownMenuSub onOpenChange={(open) => !open && setSearch("")}>
      <DropdownMenuSubTrigger className="cursor-pointer">{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56 p-0 text-xs shadow-lg">
        {/* Search Bar (Sticky at top) */}
        <div className="sticky top-0 z-10 border-b bg-popover p-1.5">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2 size-3 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-7 w-full rounded-md border bg-muted/40 pl-7 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Scrollable list of items */}
        <div className="max-h-56 overflow-y-auto overscroll-contain p-1">
          {allowNone && (
            <DropdownMenuItem
              disabled={!currentValue}
              onClick={() => onSelect("")}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="italic text-muted-foreground">None (Unassigned)</span>
            </DropdownMenuItem>
          )}

          {filtered.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">No matches found</div>
          ) : (
            filtered.map((item) => {
              const isCurrent = currentValue === item.value || currentValue === item.key;
              return (
                <DropdownMenuItem
                  key={item.key}
                  disabled={isCurrent}
                  onClick={() => onSelect(item.value)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{item.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] text-muted-foreground ml-1.5 shrink-0">
                      (current)
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
