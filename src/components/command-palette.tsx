import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  Columns3,
  FileText,
  LayoutDashboard,
  PhoneCall,
  Plus,
  ShoppingCart,
  StickyNote,
  Target,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  function handleSelect(to: string) {
    onOpenChange(false);
    void navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search modules..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect("/dashboard")} className="gap-2 cursor-pointer">
            <LayoutDashboard className="size-4 text-primary" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/leads")} className="gap-2 cursor-pointer">
            <Target className="size-4 text-primary" />
            <span>Leads</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/deals")} className="gap-2 cursor-pointer">
            <Columns3 className="size-4 text-primary" />
            <span>Deals & Pipelines</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/quotations")}
            className="gap-2 cursor-pointer"
          >
            <FileText className="size-4 text-primary" />
            <span>Quotations</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/sales-orders")}
            className="gap-2 cursor-pointer"
          >
            <ShoppingCart className="size-4 text-primary" />
            <span>Sales Orders</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/organizations")}
            className="gap-2 cursor-pointer"
          >
            <Building2 className="size-4 text-primary" />
            <span>Organizations</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/contacts")} className="gap-2 cursor-pointer">
            <Users className="size-4 text-primary" />
            <span>Contacts</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/activities")}
            className="gap-2 cursor-pointer"
          >
            <CalendarClock className="size-4 text-primary" />
            <span>Activities & Tasks</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/notes")} className="gap-2 cursor-pointer">
            <StickyNote className="size-4 text-primary" />
            <span>Notes</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/calls")} className="gap-2 cursor-pointer">
            <PhoneCall className="size-4 text-primary" />
            <span>Call Logs</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect("/leads")} className="gap-2 cursor-pointer">
            <Plus className="size-4 text-muted-foreground" />
            <span>Create New Lead</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/deals")} className="gap-2 cursor-pointer">
            <Plus className="size-4 text-muted-foreground" />
            <span>Create New Deal</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/quotations")}
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4 text-muted-foreground" />
            <span>Create New Quotation</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("/organizations")}
            className="gap-2 cursor-pointer"
          >
            <Plus className="size-4 text-muted-foreground" />
            <span>Create New Organization</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
