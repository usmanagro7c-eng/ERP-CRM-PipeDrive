import { useState, useMemo } from "react";
import { Plus, Trash2, Package, Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { itemsListOptions } from "@/hooks/use-quotations";
import type { QuotationItem, Item } from "@/lib/api";

interface ItemRowPickerProps {
  items: QuotationItem[];
  onChange: (items: QuotationItem[]) => void;
  currency?: string | undefined;
}

function SearchableItemSelect({
  value,
  catalogItems,
  onSelect,
  placeholder = "Select item...",
}: {
  value: string;
  catalogItems: Item[];
  onSelect: (itemCode: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedItem = catalogItems.find((c) => c.name === value);
  const label = selectedItem
    ? `${selectedItem.item_name || selectedItem.name} (${selectedItem.name})`
    : value || placeholder;

  const filtered = useMemo(() => {
    if (!query.trim()) return catalogItems.slice(0, 100);
    const q = query.toLowerCase();
    return catalogItems
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.item_name && c.item_name.toLowerCase().includes(q)) ||
          (c.item_group && c.item_group.toLowerCase().includes(q)),
      )
      .slice(0, 100);
  }, [catalogItems, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs font-normal bg-background px-2.5 hover:bg-muted/30 border-muted-foreground/20 rounded-md cursor-pointer truncate"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] sm:w-[360px] p-0 shadow-lg" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search items by name or code..."
            value={query}
            onValueChange={setQuery}
            className="h-8.5 text-xs"
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                No matching items found.
              </CommandEmpty>
            ) : (
              <CommandGroup heading={`Items (${filtered.length})`}>
                {filtered.map((item) => {
                  const isSelected = item.name === value;
                  return (
                    <CommandItem
                      key={item.name}
                      value={item.name}
                      onSelect={() => {
                        onSelect(item.name);
                        setOpen(false);
                      }}
                      className="text-xs cursor-pointer flex items-center justify-between py-1.5 px-2"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-medium text-foreground truncate">
                          {item.item_name || item.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.name}
                          {item.standard_rate ? ` • PKR ${Number(item.standard_rate).toLocaleString()}` : ""}
                        </span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ItemRowPicker({ items, onChange, currency = "PKR" }: ItemRowPickerProps) {
  const { data: catalogItems = [] } = useQuery(itemsListOptions());

  function handleAddItem() {
    const firstItem = catalogItems[0];
    const newItem: QuotationItem = {
      item_code: firstItem?.name || "",
      item_name: firstItem?.item_name || firstItem?.name || "",
      qty: 1,
      rate: Number(firstItem?.standard_rate) || 0,
      discount_percentage: 0,
      amount: Number(firstItem?.standard_rate) || 0,
    };
    onChange([...items, newItem]);
  }

  function handleRemoveItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleUpdateItem(index: number, patch: Partial<QuotationItem>) {
    const next = [...items];
    const current = next[index];
    if (!current) return;

    const updated = { ...current, ...patch };

    // Auto-update item_name and standard_rate when item_code changes
    if (patch.item_code) {
      const match = catalogItems.find((ci) => ci.name === patch.item_code);
      if (match) {
        updated.item_name = match.item_name || match.name;
        if (match.standard_rate && Number(match.standard_rate) > 0) {
          updated.rate = Number(match.standard_rate);
        }
      }
    }

    const qty = Number(updated.qty) || 0;
    const rate = Number(updated.rate) || 0;
    const discount = Number(updated.discount_percentage) || 0;
    updated.amount = Math.round(qty * rate * (1 - discount / 100));

    next[index] = updated;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Package className="size-4 text-primary" />
          <span>Line Items ({items.length})</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="h-8 gap-1.5 text-xs"
        >
          <Plus className="size-3.5" />
          <span>Add Item</span>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground bg-muted/20">
          No items added yet. Click &ldquo;Add Item&rdquo; to add products or services.
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table (sm+) */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-border bg-card shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground text-[11px] font-semibold">
                <tr>
                  <th className="w-10 py-2.5 px-3 text-center">#</th>
                  <th className="py-2.5 px-3 text-left min-w-[200px]">Item</th>
                  <th className="w-24 py-2.5 px-3 text-center">Qty</th>
                  <th className="w-32 py-2.5 px-3 text-right">Rate ({currency})</th>
                  <th className="w-32 py-2.5 px-3 text-right">Amount ({currency})</th>
                  <th className="w-10 py-2.5 px-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((row, index) => {
                  return (
                    <tr key={index} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <SearchableItemSelect
                            value={row.item_code}
                            catalogItems={catalogItems}
                            onSelect={(val) => handleUpdateItem(index, { item_code: val })}
                          />
                          {row.item_name && row.item_name !== row.item_code && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-[240px] pl-0.5">
                              {row.item_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min={1}
                          value={row.qty || ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            handleUpdateItem(index, { qty: val });
                          }}
                          onBlur={() => {
                            if (!row.qty || row.qty < 1) {
                              handleUpdateItem(index, { qty: 1 });
                            }
                          }}
                          className="h-8 text-xs text-center font-medium bg-background"
                          aria-label="Quantity"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min={0}
                          value={row.rate || ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : Number(e.target.value);
                            handleUpdateItem(index, { rate: Math.max(0, val) });
                          }}
                          className="h-8 text-xs text-right font-medium bg-background"
                          aria-label="Rate"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-xs whitespace-nowrap text-foreground">
                        {currency} {Number(row.amount || row.qty * row.rate).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive cursor-pointer rounded-md"
                          onClick={() => handleRemoveItem(index)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (<sm) */}
          <div className="space-y-3 sm:hidden">
            {items.map((row, index) => {
              return (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <span className="text-xs font-semibold text-muted-foreground font-mono">
                      Item #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={() => handleRemoveItem(index)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Item Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Select Product
                    </label>
                    <SearchableItemSelect
                      value={row.item_code}
                      catalogItems={catalogItems}
                      onSelect={(val) => handleUpdateItem(index, { item_code: val })}
                    />
                    {row.item_name && row.item_name !== row.item_code && (
                      <div className="text-[11px] text-muted-foreground truncate pl-0.5">
                        {row.item_name}
                      </div>
                    )}
                  </div>

                  {/* Qty & Rate Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={row.qty || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          handleUpdateItem(index, { qty: val });
                        }}
                        onBlur={() => {
                          if (!row.qty || row.qty < 1) {
                            handleUpdateItem(index, { qty: 1 });
                          }
                        }}
                        className="h-8 text-xs bg-background text-center font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Rate ({currency})
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={row.rate || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          handleUpdateItem(index, { rate: Math.max(0, val) });
                        }}
                        className="h-8 text-xs bg-background text-right font-medium"
                      />
                    </div>
                  </div>

                  {/* Row Subtotal */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold text-foreground">
                      {currency} {Number(row.amount || row.qty * row.rate).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
