import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ExternalLink, Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RecordDataTabProps {
  data: Record<string, unknown>;
  users?: Array<{ name: string; full_name?: string; email?: string }>;
  onOpenModal?: () => void;
  onSave?: (updated: Record<string, unknown>) => Promise<void>;
}

const SALUTATIONS = ["Mr", "Ms", "Mx", "Dr", "Mrs", "Madam", "Miss", "Master", "Prof"];
const SOURCES = [
  "Email",
  "Existing Customer",
  "Reference",
  "Advertisement",
  "Cold Calling",
  "Exhibition",
  "Supplier Reference",
  "Mass Mailing",
  "Campaign",
  "Walk In",
  "Facebook",
  "Website",
  "WhatsApp",
];
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
  "Manufacturing",
  "Other",
];
const TERRITORIES = ["All Territories", "Pakistan", "Punjab", "Sindh", "KPK", "Balochistan"];

interface FormState {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  organization: string;
  company_description: string;
  website: string;
  territory: string;
  industry: string;
  no_of_employees: string;
  job_title: string;
  source: string;
  lead_owner: string;
}

export function RecordDataTab({ data, users = [], onOpenModal, onSave }: RecordDataTabProps) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [personOpen, setPersonOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const initialValues: FormState = useMemo(
    () => ({
      salutation: String(data["salutation"] || ""),
      first_name: String(data["first_name"] || ""),
      last_name: String(data["last_name"] || ""),
      email: String(data["email"] || ""),
      mobile_no: String(data["mobile_no"] || data["phone"] || ""),
      organization: String(data["organization_name"] || data["organization"] || ""),
      company_description: String(data["company_description"] || ""),
      website: String(data["website"] || ""),
      territory: String(data["territory"] || ""),
      industry: String(data["industry"] || ""),
      no_of_employees: String(data["no_of_employees"] || ""),
      job_title: String(data["job_title"] || ""),
      source: String(data["source"] || ""),
      lead_owner: String(data["lead_owner"] || data["owner"] || ""),
    }),
    [data],
  );

  const [formState, setFormState] = useState<FormState>(initialValues);

  // Re-sync if data changes from server
  useEffect(() => {
    setFormState(initialValues);
  }, [initialValues]);

  // Track if modified
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some(
      (key) => formState[key as keyof FormState] !== initialValues[key as keyof FormState],
    );
  }, [formState, initialValues]);

  const handleChange = (field: keyof FormState, val: string) => {
    setFormState((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    if (!onSave || !isDirty) return;
    setIsSaving(true);
    try {
      await onSave(formState as unknown as Record<string, unknown>);
      toast.success("Saved successfully");
    } catch {
      toast.error("Failed to save data");
    } finally {
      setIsSaving(false);
    }
  };

  // Products child table if available
  const rawProducts = Array.isArray(data["products"])
    ? (data["products"] as Record<string, unknown>[])
    : [];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-1 sm:px-4 max-w-5xl">
      {/* Top Header: Data on left, Edit icon + Save button on right matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Data</h2>
        <div className="flex items-center gap-2">
          {onOpenModal && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenModal}
              className="h-7 w-7 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground border-border/60 cursor-pointer"
              title="Open in modal"
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

      {/* Sections Container */}
      <div className="space-y-6 pb-12">
        {/* Section: Details (3-Column Layout) */}
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
              {/* Column 1: Organization, Company Description, Industry, No. of Employees */}
              <div className="flex flex-col gap-4">
                {/* Organization */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Organization</label>
                  <Input
                    value={formState.organization}
                    onChange={(e) => handleChange("organization", e.target.value)}
                    placeholder="Organization"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Company Description */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Company Description</label>
                  <Textarea
                    value={formState.company_description}
                    onChange={(e) => handleChange("company_description", e.target.value)}
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
                    value={formState.industry || undefined}
                    onValueChange={(val) => handleChange("industry", val)}
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
                    value={formState.no_of_employees || undefined}
                    onValueChange={(val) => handleChange("no_of_employees", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="No. of Employees" />
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
              </div>

              {/* Column 2: Website, Job Title */}
              <div className="flex flex-col gap-4">
                {/* Website */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Website</label>
                  <Input
                    value={formState.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="Website"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Job Title */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Job Title</label>
                  <Input
                    value={formState.job_title}
                    onChange={(e) => handleChange("job_title", e.target.value)}
                    placeholder="Job Title"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>

              {/* Column 3: Territory, Source, Lead Owner */}
              <div className="flex flex-col gap-4">
                {/* Territory */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Territory</label>
                  <Select
                    value={formState.territory || undefined}
                    onValueChange={(val) => handleChange("territory", val)}
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

                {/* Source */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Source</label>
                  <Select
                    value={formState.source || undefined}
                    onValueChange={(val) => handleChange("source", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {SOURCES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Owner */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Lead Owner</label>
                  <Select
                    value={formState.lead_owner || undefined}
                    onValueChange={(val) => handleChange("lead_owner", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="Lead Owner" />
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

        {/* Section: Person (3-Column Layout with Divider) */}
        <Collapsible
          open={personOpen}
          onOpenChange={setPersonOpen}
          className="border-t border-border/60 pt-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 text-base font-medium text-foreground cursor-pointer hover:text-foreground/80">
              <span>Person</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200 text-muted-foreground",
                  !personOpen && "-rotate-90",
                )}
              />
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              {/* Column 1: Salutation, Email */}
              <div className="flex flex-col gap-4">
                {/* Salutation */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Salutation</label>
                  <Select
                    value={formState.salutation || undefined}
                    onValueChange={(val) => handleChange("salutation", val)}
                  >
                    <SelectTrigger className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                      <SelectValue placeholder="Salutation" />
                    </SelectTrigger>
                    <SelectContent>
                      {SALUTATIONS.map((sal) => (
                        <SelectItem key={sal} value={sal} className="text-xs cursor-pointer">
                          {sal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Email</label>
                  <Input
                    value={formState.email}
                    type="email"
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Email"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>

              {/* Column 2: First Name *, Mobile No. */}
              <div className="flex flex-col gap-4">
                {/* First Name * */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formState.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    placeholder="First Name"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Mobile No. */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Mobile No.</label>
                  <Input
                    value={formState.mobile_no}
                    onChange={(e) => handleChange("mobile_no", e.target.value)}
                    placeholder="Mobile No."
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>

              {/* Column 3: Last Name */}
              <div className="flex flex-col gap-4">
                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground block">Last Name</label>
                  <Input
                    value={formState.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    placeholder="Last Name"
                    className="h-7 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Optional Products Child Table if record has products */}
        {rawProducts.length > 0 && (
          <div className="border-t border-border/60 pt-5 space-y-3">
            <h3 className="text-base font-medium text-foreground">Products</h3>
            <div className="rounded-lg border border-border/60 overflow-hidden bg-card/40">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent text-xs">
                    <TableHead className="h-8">Item</TableHead>
                    <TableHead className="h-8 w-24 text-right">Qty</TableHead>
                    <TableHead className="h-8 w-32 text-right">Rate</TableHead>
                    <TableHead className="h-8 w-32 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawProducts.map((p, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-medium py-2">
                        {String(p["item_name"] || p["item_code"] || "Item")}
                      </TableCell>
                      <TableCell className="text-right py-2">{Number(p["qty"]) || 1}</TableCell>
                      <TableCell className="text-right py-2">
                        ₨ {(Number(p["rate"]) || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right py-2 font-semibold">
                        ₨ {(Number(p["amount"]) || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
