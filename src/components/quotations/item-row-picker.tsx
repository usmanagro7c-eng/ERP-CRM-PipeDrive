import { Plus, Trash2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { itemsListOptions } from "@/hooks/use-quotations";
import type { QuotationItem } from "@/lib/api";

interface ItemRowPickerProps {
  items: QuotationItem[];
  onChange: (items: QuotationItem[]) => void;
}

export function ItemRowPicker({ items, onChange }: ItemRowPickerProps) {
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
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No items added yet. Click &ldquo;Add Item&rdquo; to add products or services to this quotation.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((row, index) => {
            const currentItem = catalogItems.find((c) => c.name === row.item_code);
            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 rounded-lg border bg-card/60 p-3 shadow-xs"
              >
                {/* Item Select */}
                <div className="w-full sm:w-[220px] shrink-0">
                  <label className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Item
                  </label>
                  <Select
                    value={row.item_code}
                    onValueChange={(val) => handleUpdateItem(index, { item_code: val })}
                  >
                    <SelectTrigger className="h-9 w-full text-xs">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogItems.map((c) => (
                        <SelectItem key={c.name} value={c.name} className="text-xs">
                          {c.item_name || c.name} ({c.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Item Name / Description Preview */}
                <div className="hidden sm:block flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {row.item_name || currentItem?.item_name || row.item_code}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Code: {row.item_code}
                  </div>
                </div>

                {/* Qty */}
                <div className="w-20 shrink-0">
                  <label className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Qty
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={row.qty}
                    onChange={(e) =>
                      handleUpdateItem(index, { qty: Math.max(1, Number(e.target.value)) })
                    }
                    placeholder="Qty"
                    className="h-9 text-xs text-center"
                    aria-label="Quantity"
                  />
                </div>

                {/* Rate (PKR) */}
                <div className="w-28 shrink-0">
                  <label className="text-[11px] font-medium text-muted-foreground sm:hidden">
                    Rate (PKR)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={row.rate}
                    onChange={(e) =>
                      handleUpdateItem(index, { rate: Math.max(0, Number(e.target.value)) })
                    }
                    placeholder="Rate"
                    className="h-9 text-xs text-right"
                    aria-label="Rate"
                  />
                </div>

                {/* Amount */}
                <div className="w-24 shrink-0 text-right font-medium text-xs">
                  <span className="text-[10px] text-muted-foreground sm:hidden mr-1">Amount:</span>
                  PKR {Number(row.amount || row.qty * row.rate).toLocaleString()}
                </div>

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive shrink-0 self-end sm:self-center"
                  onClick={() => handleRemoveItem(index)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
