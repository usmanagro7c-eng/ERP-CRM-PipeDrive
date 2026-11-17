import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useLinkOptions } from "@/hooks/use-organizations";
import { stripHtml } from "@/lib/frappe-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TerritorySelectProps {
  /** Currently selected territory. Empty string clears the field. */
  value: string;
  onValueChange: (val: string) => void;
  /** Placeholder shown inside the trigger when empty. */
  placeholder?: string;
  /** Extra classes for the trigger button. */
  triggerClassName?: string;
  /** Extra classes for each option. */
  itemClassName?: string;
  /** Extra classes for the dropdown content. */
  contentClassName?: string;
  /** Disable the control while options are loading. */
  disabled?: boolean;
}

const CREATE_OPTION = "__create_territory__";

/**
 * Territory dropdown fed from the Frappe backend (`CRM Territory` doctype).
 * Prevents writing out-of-date or nonexistent territory values that Frappe
 * rejects with "Could not find Territory: ...".
 *
 * The currently saved value is always kept in the option list so a legacy
 * value can still be displayed/cleared instead of showing a blank.
 *
 * The last option is "+ Create territory…" — opens a small dialog that
 * creates the CRM Territory on the backend, refreshes the list, and
 * selects it, matching the UX of the custom status/stage pickers.
 */
export function TerritorySelect({
  value,
  onValueChange,
  placeholder = "Territory",
  triggerClassName,
  itemClassName,
  contentClassName,
  disabled,
}: TerritorySelectProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useLinkOptions("CRM Territory");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const options = (() => {
    const fetched = (data ?? []).map((t) => t.name);
    if (value && !fetched.includes(value)) return [value, ...fetched];
    return fetched;
  })();

  const effectivePlaceholder = isError ? "Territories unavailable" : placeholder;

  async function handleCreateTerritory() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.createTerritory(name);
      await queryClient.invalidateQueries({ queryKey: ["link-options", "CRM Territory"] });
      toast.success(`Territory "${name}" created`);
      setCreateOpen(false);
      setNewName("");
      onValueChange(name);
    } catch (err) {
      const message = stripHtml(err instanceof Error ? err.message : String(err));
      setCreateError(message || "Failed to create territory.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Select
        value={value || undefined}
        onValueChange={(val) => {
          if (val === CREATE_OPTION) {
            setNewName("");
            setCreateError(null);
            setCreateOpen(true);
            return;
          }
          onValueChange(val);
        }}
        disabled={disabled || (isLoading && options.length === 0)}
      >
        <SelectTrigger className={cn(triggerClassName)}>
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent className={cn(contentClassName)}>
          {isLoading && options.length === 0 ? (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading territories…
            </div>
          ) : (
            <>
              {options.length === 0 ? (
                <div className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  No territories configured yet.
                </div>
              ) : (
                options.map((t) => (
                  <SelectItem key={t} value={t} className={itemClassName}>
                    {t}
                  </SelectItem>
                ))
              )}
              <SelectItem
                value={CREATE_OPTION}
                className={cn(
                  "mt-1 border-t border-border/70 pt-2 text-xs cursor-pointer text-primary whitespace-nowrap flex-nowrap",
                  itemClassName,
                )}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Plus className="size-3.5 shrink-0" />
                  Create territory…
                </span>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (creating) return;
          setCreateOpen(open);
          if (!open) {
            setNewName("");
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="p-4">
          <DialogHeader>
            <DialogTitle>Create Territory</DialogTitle>
          </DialogHeader>
          <DialogDescription>Add a new territory to your CRM.</DialogDescription>
          <Input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setCreateError(null);
            }}
            placeholder="e.g. Pakistan"
            className="my-2"
            autoFocus
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateTerritory();
            }}
          />
          {createError && (
            <p role="alert" className="text-[11px] text-destructive font-medium">
              {createError}
            </p>
          )}
          <DialogFooter className="justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (creating) return;
                setCreateOpen(false);
                setNewName("");
                setCreateError(null);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateTerritory()}
              disabled={creating || !newName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
