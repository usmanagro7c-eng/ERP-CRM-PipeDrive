import { useEffect, useState } from "react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveOrganization } from "@/hooks/use-organizations";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface OrgFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  organization?: Record<string, unknown> | null;
  /** Optional initial field values */
  initialValues?: Record<string, unknown> | null;
  onSuccess?: (savedOrg: Record<string, unknown>) => void;
}

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const TERRITORIES = ["All Territories", "Pakistan", "Punjab", "Sindh", "KPK", "Balochistan"];
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

interface FormState {
  organization_name: string;
  website: string;
  company_description: string;
  annual_revenue: string;
  territory: string;
  no_of_employees: string;
  industry: string;
  address: string;
}

const defaultFormState: FormState = {
  organization_name: "",
  website: "",
  company_description: "",
  annual_revenue: "",
  territory: "",
  no_of_employees: "",
  industry: "",
  address: "",
};

export function OrgFormModal({
  open,
  onOpenChange,
  organization,
  initialValues,
  onSuccess,
}: OrgFormModalProps) {
  const isEdit = Boolean(organization);
  const saveMutation = useSaveOrganization();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [errors, setErrors] = useState<{ organization_name?: string }>({});

  useEffect(() => {
    if (open) {
      if (organization) {
        setForm({
          organization_name: String(
            organization["organization_name"] || organization["name"] || "",
          ),
          website: String(organization["website"] || ""),
          company_description: String(organization["company_description"] || ""),
          annual_revenue: String(organization["annual_revenue"] || ""),
          territory: String(organization["territory"] || ""),
          no_of_employees: String(organization["no_of_employees"] || ""),
          industry: String(organization["industry"] || ""),
          address: String(organization["address"] || ""),
        });
      } else if (initialValues) {
        setForm({
          ...defaultFormState,
          organization_name: String(
            initialValues["organization_name"] || initialValues["name"] || "",
          ),
          website: String(initialValues["website"] || ""),
          company_description: String(initialValues["company_description"] || ""),
          annual_revenue: String(initialValues["annual_revenue"] || ""),
          territory: String(initialValues["territory"] || ""),
          no_of_employees: String(initialValues["no_of_employees"] || ""),
          industry: String(initialValues["industry"] || ""),
          address: String(initialValues["address"] || ""),
        });
      } else {
        setForm(defaultFormState);
      }
      setErrors({});
    }
  }, [open, organization, initialValues]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "organization_name" && value.trim()) {
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.organization_name.trim()) {
      setErrors({ organization_name: "Organization Name is required" });
      toast.error("Please enter Organization Name");
      return;
    }

    const payload: Record<string, unknown> = {
      organization_name: form.organization_name.trim(),
      website: form.website.trim() || undefined,
      company_description: form.company_description.trim() || undefined,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) || 0 : undefined,
      territory: form.territory || undefined,
      no_of_employees: form.no_of_employees || undefined,
      industry: form.industry || undefined,
      address: form.address.trim() || undefined,
    };

    try {
      const result = await saveMutation.mutateAsync({
        name: organization ? String(organization["name"]) : undefined,
        values: payload,
      });
      onSuccess?.(result ?? payload);
      onOpenChange(false);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 gap-0 overflow-hidden bg-background text-foreground transition-all duration-200 border-border/70 shadow-2xl flex flex-col",
          isFullscreen
            ? "max-w-none w-screen h-screen rounded-none"
            : "sm:max-w-xl w-full rounded-xl max-h-[90vh]",
        )}
      >
        {/* Header matching Frappe CRM: Title on left, Maximize + Single Close on right */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 flex flex-row items-center justify-between shrink-0 space-y-0">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            {isEdit ? "Edit Organization" : "New Organization"}
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              title={isFullscreen ? "Restore window" : "Maximize window"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body Form matching Frappe CRM */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Organization Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.organization_name}
                onChange={(e) => handleChange("organization_name", e.target.value)}
                placeholder="Organization Name"
                className={cn(
                  "h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md",
                  errors.organization_name && "border-destructive focus-visible:ring-destructive",
                )}
                autoFocus
              />
              {errors.organization_name && (
                <p className="text-[11px] text-destructive">{errors.organization_name}</p>
              )}
            </div>

            {/* 2-Column Section: Website + Description / Annual Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                {/* Website */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="Website"
                    className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>

                {/* Company Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">
                    Company Description
                  </Label>
                  <Textarea
                    value={form.company_description}
                    onChange={(e) => handleChange("company_description", e.target.value)}
                    placeholder="Company Description"
                    rows={3}
                    className="text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground/75 leading-tight">
                    Company description discovered by Domain Enrichment.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Annual Revenue */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">
                    Annual Revenue
                  </Label>
                  <Input
                    value={form.annual_revenue}
                    onChange={(e) => handleChange("annual_revenue", e.target.value)}
                    placeholder="PKR 0.00"
                    className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Territory */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Territory</Label>
              <Select
                value={form.territory || undefined}
                onValueChange={(val) => handleChange("territory", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
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

            {/* 2-Column Section: No. of Employees & Industry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  No. of Employees
                </Label>
                <Select
                  value={form.no_of_employees || undefined}
                  onValueChange={(val) => handleChange("no_of_employees", val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                    <SelectValue placeholder="Select range..." />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Industry</Label>
                <Select
                  value={form.industry || undefined}
                  onValueChange={(val) => handleChange("industry", val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
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
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Address</Label>
              <Input
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Address"
                className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
              />
            </div>
          </div>

          {/* Footer with Solid Black Create Button matching Frappe CRM */}
          <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-8 px-5 rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium text-xs cursor-pointer shadow-xs transition-colors"
            >
              {saveMutation.isPending && <Loader2 className="size-3 animate-spin mr-1.5" />}
              <span>{isEdit ? "Save" : "Create"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
