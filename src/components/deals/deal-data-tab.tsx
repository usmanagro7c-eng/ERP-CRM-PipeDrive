import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  RotateCcw,
  ExternalLink,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { itemsListOptions } from "@/hooks/use-quotations";
import { cn } from "@/lib/utils";

interface ProductRow {
  id: string;
  item: string;
  rate: number;
  qty: number;
}

interface DealDataTabProps {
  deal: Record<string, unknown>;
  users?: Array<{ name: string; full_name?: string; email?: string }>;
  onOpenModal?: () => void;
  onSave?: (updated: Record<string, unknown>) => Promise<void>;
  onReload?: () => void;
}

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const INDUSTRIES = [
  "Accounting",
  "Advertising",
  "Aerospace",
  "Agriculture",
  "Airline",
  "Apparel & Accessories",
  "Automotive",
  "Banking",
  "Biotechnology",
  "Chemical",
  "Computer",
  "Consulting",
  "Consumer Products",
  "Defense",
  "Education",
  "Electronics",
  "Energy",
  "Financial Services",
  "Food & Beverage",
  "Healthcare",
  "Hospitality",
  "Insurance",
  "Manufacturing",
  "Media",
  "Pharmaceuticals",
  "Real Estate",
  "Retail",
  "Technology",
  "Telecommunications",
  "Transportation",
  "Other",
];
const TERRITORIES = [
  "All Territories",
  "Pakistan",
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
];

interface FormDetails {
  organization: string;
  company_description: string;
  industry: string;
  no_of_employees: string;
  annual_revenue: string;
  website: string;
  closed_date: string;
  next_step: string;
  territory: string;
  probability: string;
  deal_owner: string;
}

export function DealDataTab({
  deal,
  users = [],
  onOpenModal,
  onSave,
  onReload,
}: DealDataTabProps) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [productsOpen, setProductsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Available Frappe items for product row picker
  const { data: availableItems = [] } = useQuery(itemsListOptions());

  // Details initial state
  const initialDetails: FormDetails = useMemo(() => {
    const rawRevenue = deal["annual_revenue"] || deal["deal_value"] || "";
    const revStr = rawRevenue !== "" && rawRevenue !== null && rawRevenue !== undefined
      ? String(rawRevenue)
      : "";

    const rawProb = deal["probability"] || "";
    const probStr = rawProb !== "" && rawProb !== null && rawProb !== undefined
      ? String(rawProb)
      : "";

    return {
      organization: String(deal["organization_name"] || deal["organization"] || ""),
      company_description: String(deal["company_description"] || ""),
      industry: String(deal["industry"] || ""),
      no_of_employees: String(deal["no_of_employees"] || "1-10"),
      annual_revenue: revStr,
      website: String(deal["website"] || ""),
      closed_date: String(deal["closed_date"] || deal["expected_closing"] || ""),
      next_step: String(deal["next_step"] || ""),
      territory: String(deal["territory"] || ""),
      probability: probStr,
      deal_owner: String(deal["deal_owner"] || deal["owner"] || ""),
    };
  }, [deal]);

  // Initial products
  const initialProducts: ProductRow[] = useMemo(() => {
    const raw = Array.isArray(deal["products"])
      ? (deal["products"] as Array<Record<string, unknown>>)
      : Array.isArray(deal["items"])
        ? (deal["items"] as Array<Record<string, unknown>>)
        : [];

    return raw.map((item, idx) => ({
      id: String(item["name"] || item["id"] || `item-${idx}`),
      item: String(item["item"] || item["item_code"] || item["item_name"] || ""),
      rate: Number(item["rate"] || item["price_list_rate"] || 0),
      qty: Number(item["qty"] || 1),
    }));
  }, [deal]);

  const [details, setDetails] = useState<FormDetails>(initialDetails);
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);

  useEffect(() => {
    setDetails(initialDetails);
  }, [initialDetails]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Check if dirty
  const isDirty = useMemo(() => {
    const detailsDirty = Object.keys(initialDetails).some(
      (k) => details[k as keyof FormDetails] !== initialDetails[k as keyof FormDetails],
    );
    const productsDirty = JSON.stringify(products) !== JSON.stringify(initialProducts);
    return detailsDirty || productsDirty;
  }, [details, initialDetails, products, initialProducts]);

  const handleDetailChange = (field: keyof FormDetails, val: string) => {
    setDetails((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddProductRow = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        item: "",
        rate: 0,
        qty: 1,
      },
    ]);
  };

  const handleRemoveProductRow = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleProductRowChange = (id: string, field: "item" | "rate" | "qty", val: string | number) => {
    setProducts((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "item") {
          const itemCode = String(val);
          // If available item found, fill standard rate
          const matchedItem = availableItems.find(
            (it) => it.item_code === itemCode || it.item_name === itemCode,
          );
          return {
            ...row,
            item: itemCode,
            rate: matchedItem?.standard_rate ? Number(matchedItem.standard_rate) : row.rate,
          };
        }
        return {
          ...row,
          [field]: Number(val) || 0,
        };
      }),
    );
  };

  // Calculate totals
  const totalAmount = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.rate) || 0) * (Number(p.qty) || 1), 0);
  }, [products]);

  const handleSave = async () => {
    if (!onSave || !isDirty) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        organization: details.organization,
        organization_name: details.organization,
        company_description: details.company_description,
        industry: details.industry,
        no_of_employees: details.no_of_employees,
        annual_revenue: details.annual_revenue ? Number(details.annual_revenue) || details.annual_revenue : 0,
        website: details.website,
        closed_date: details.closed_date,
        next_step: details.next_step,
        territory: details.territory,
        probability: details.probability ? Number(details.probability) || details.probability : 0,
        deal_owner: details.deal_owner,
        products: products.map((p) => ({
          item: p.item,
          rate: p.rate,
          qty: p.qty,
          amount: p.rate * p.qty,
        })),
      };
      await onSave(payload);
      toast.success("Deal data saved successfully");
    } catch {
      toast.error("Failed to save deal data");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-1 sm:px-6 max-w-5xl">
      {/* Top Header: Data on left, Reload & Save on right matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Data</h2>
        <div className="flex items-center gap-2">
          {onReload && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onReload}
              className="h-7 w-7 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground border-border/60 cursor-pointer"
              title="Reload data"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
          {onOpenModal && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenModal}
              className="h-7 w-7 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground border-border/60 cursor-pointer"
              title="Open deal edit modal"
            >
              <ExternalLink className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
            className={cn(
              "h-7 text-xs px-3 rounded-md transition-colors cursor-pointer",
              isDirty
                ? "bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black font-semibold shadow-xs"
                : "bg-secondary/40 text-muted-foreground opacity-50 cursor-not-allowed",
            )}
          >
            {isSaving && <Loader2 className="size-3 animate-spin mr-1" />}
            <span>Save</span>
          </Button>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 pb-12">
        {/* SECTION 1: DETAILS (3 Columns) */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="space-y-3">
          <div className="flex items-center justify-between pt-2">
            <CollapsibleTrigger className="flex items-center gap-2 text-base font-medium text-foreground cursor-pointer hover:text-foreground/80">
              <span>Details</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200 text-muted-foreground",
                  !detailsOpen && "-rotate-90",
                )}
              />
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              {/* Column 1: Organization, Company Description, Industry, No. of Employees, Annual Revenue */}
              <div className="flex flex-col gap-4">
                {/* Organization */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Organization</label>
                  <Input
                    value={details.organization}
                    onChange={(e) => handleDetailChange("organization", e.target.value)}
                    placeholder="Organization"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Company Description */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Company Description</label>
                  <Textarea
                    value={details.company_description}
                    onChange={(e) => handleDetailChange("company_description", e.target.value)}
                    placeholder="Company Description"
                    rows={3}
                    className="text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground/75 leading-tight">
                    Company description discovered by Domain Enrichment.
                  </p>
                </div>

                {/* Industry */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Industry</label>
                  <Select
                    value={details.industry || undefined}
                    onValueChange={(val) => handleDetailChange("industry", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind} className="text-xs cursor-pointer">
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* No. of Employees */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">No. of Employees</label>
                  <Select
                    value={details.no_of_employees || undefined}
                    onValueChange={(val) => handleDetailChange("no_of_employees", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="1-10" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_RANGES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs cursor-pointer">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Annual Revenue */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Annual Revenue</label>
                  <Input
                    value={details.annual_revenue}
                    onChange={(e) => handleDetailChange("annual_revenue", e.target.value)}
                    placeholder="PKR 0.00"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>

              {/* Column 2: Website, Closed Date, Next Step */}
              <div className="flex flex-col gap-4">
                {/* Website */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Website</label>
                  <Input
                    value={details.website}
                    onChange={(e) => handleDetailChange("website", e.target.value)}
                    placeholder="Website"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Closed Date */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Closed Date</label>
                  <Input
                    type="date"
                    value={details.closed_date}
                    onChange={(e) => handleDetailChange("closed_date", e.target.value)}
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Next Step */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Next Step</label>
                  <Input
                    value={details.next_step}
                    onChange={(e) => handleDetailChange("next_step", e.target.value)}
                    placeholder="Next Step"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>

              {/* Column 3: Territory, Probability, Deal Owner */}
              <div className="flex flex-col gap-4">
                {/* Territory */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Territory</label>
                  <Select
                    value={details.territory || undefined}
                    onValueChange={(val) => handleDetailChange("territory", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="Territory" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERRITORIES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs cursor-pointer">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Probability */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Probability</label>
                  <Input
                    value={details.probability}
                    onChange={(e) => handleDetailChange("probability", e.target.value)}
                    placeholder="10.000%"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Deal Owner */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Deal Owner</label>
                  <Select
                    value={details.deal_owner || undefined}
                    onValueChange={(val) => handleDetailChange("deal_owner", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="Deal Owner" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {users.map((u) => (
                        <SelectItem key={u.name} value={u.name} className="text-xs cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                              {(u.full_name || u.name).charAt(0).toUpperCase()}
                            </div>
                            <span>{u.full_name || u.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* SECTION 2: PRODUCTS (Collapsible Child Table matching Frappe CRM) */}
        <Collapsible open={productsOpen} onOpenChange={setProductsOpen} className="border-t border-border/60 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 text-base font-medium text-foreground cursor-pointer hover:text-foreground/80">
              <span>Products</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200 text-muted-foreground",
                  !productsOpen && "-rotate-90",
                )}
              />
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-3 pt-1">
            {/* Products Table */}
            <div className="rounded-lg border border-border/70 overflow-hidden bg-card/40">
              <div className="grid grid-cols-[36px_40px_1fr_140px_100px_40px] items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/60 text-xs font-medium text-muted-foreground">
                <div className="flex items-center justify-center">
                  <input type="checkbox" className="rounded border-border size-3.5" />
                </div>
                <div>No.</div>
                <div>Product</div>
                <div>Rate *</div>
                <div>Qty</div>
                <div />
              </div>

              {products.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No Data
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {products.map((row, index) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[36px_40px_1fr_140px_100px_40px] items-center gap-2 px-3 py-2 text-xs hover:bg-muted/20"
                    >
                      <div className="flex items-center justify-center">
                        <input type="checkbox" className="rounded border-border size-3.5" />
                      </div>
                      <div className="text-muted-foreground font-mono">{index + 1}</div>
                      <div>
                        {availableItems.length > 0 ? (
                          <Select
                            value={row.item || undefined}
                            onValueChange={(val) => handleProductRowChange(row.id, "item", val)}
                          >
                            <SelectTrigger className="h-7 text-xs bg-background">
                              <SelectValue placeholder="Select Product..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {availableItems.map((it) => (
                                <SelectItem key={it.name} value={it.item_code || it.name || ""} className="text-xs">
                                  {it.item_name || it.item_code || it.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={row.item}
                            onChange={(e) => handleProductRowChange(row.id, "item", e.target.value)}
                            placeholder="Product Name"
                            className="h-7 text-xs bg-background"
                          />
                        )}
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={row.rate}
                          onChange={(e) => handleProductRowChange(row.id, "rate", e.target.value)}
                          placeholder="Rate"
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={row.qty}
                          onChange={(e) => handleProductRowChange(row.id, "qty", e.target.value)}
                          placeholder="Qty"
                          min={1}
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveProductRow(row.id)}
                          className="size-6 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Row Button */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddProductRow}
                className="h-7 text-xs gap-1.5 bg-secondary/50 text-foreground hover:bg-secondary cursor-pointer"
              >
                <Plus className="size-3" />
                <span>Add Row</span>
              </Button>
            </div>

            {/* Section 3: Totals matching Frappe CRM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/40 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground block">Total</label>
                <Input
                  disabled
                  value={`PKR ${totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  className="h-7 text-xs bg-secondary/20 text-foreground font-medium border-border/50 cursor-not-allowed opacity-90"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground block">Net Total</label>
                <Input
                  disabled
                  value={`PKR ${totalAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  className="h-7 text-xs bg-secondary/20 text-foreground font-medium border-border/50 cursor-not-allowed opacity-90"
                />
                <p className="text-[11px] text-muted-foreground/75 leading-tight">
                  Total after discount
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
