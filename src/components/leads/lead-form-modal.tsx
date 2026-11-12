import { useEffect, useState } from "react";
import { Loader2, Maximize2, Minimize2, X, User as UserIcon } from "lucide-react";
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
import { useSaveLead, leadStatusesOptions } from "@/hooks/use-leads";
import { useCrmUsers } from "@/hooks/use-dashboard";
import { useQuery } from "@tanstack/react-query";
import { type FrappeDocTypeMeta } from "@/lib/frappe-meta";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  lead?: Record<string, unknown> | null;
  /** Optional initial field values (e.g. preset status when adding from a Kanban column) */
  initialValues?: Record<string, unknown> | null;
  /** Optional callback to convert lead to deal */
  onConvert?: (lead: Record<string, unknown>) => void;
}

const SALUTATIONS = ["Mr", "Ms", "Mx", "Dr", "Mrs", "Madam", "Miss", "Master", "Prof"];
const GENDERS = [
  "Male",
  "Female",
  "Other",
  "Transgender",
  "Genderqueer",
  "Non-Conforming",
  "Prefer not to say",
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

interface FormDataState {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  gender: string;
  organization: string;
  territory: string;
  website: string;
  annual_revenue: string;
  company_description: string;
  no_of_employees: string;
  industry: string;
  status: string;
  lead_owner: string;
}

const defaultFormData: FormDataState = {
  salutation: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile_no: "",
  gender: "",
  organization: "",
  territory: "",
  website: "",
  annual_revenue: "",
  company_description: "",
  no_of_employees: "",
  industry: "",
  status: "New",
  lead_owner: "",
};

export function LeadFormModal({ open, onOpenChange, lead, initialValues }: LeadFormModalProps) {
  const isEdit = Boolean(lead);
  const docName = lead ? String(lead["name"]) : undefined;
  const saveMutation = useSaveLead();

  const { data: statuses = [] } = useQuery(leadStatusesOptions());
  const { data: users = [] } = useCrmUsers();

  const [formData, setFormData] = useState<FormDataState>(defaultFormData);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state whenever modal opens or target changes
  useEffect(() => {
    if (open) {
      if (lead) {
        setFormData({
          salutation: String(lead["salutation"] || ""),
          first_name: String(lead["first_name"] || ""),
          last_name: String(lead["last_name"] || ""),
          email: String(lead["email"] || ""),
          mobile_no: String(lead["mobile_no"] || lead["phone"] || ""),
          gender: String(lead["gender"] || ""),
          organization: String(lead["organization_name"] || lead["organization"] || ""),
          territory: String(lead["territory"] || ""),
          website: String(lead["website"] || ""),
          annual_revenue: String(lead["annual_revenue"] || "0"),
          company_description: String(lead["company_description"] || ""),
          no_of_employees: String(lead["no_of_employees"] || ""),
          industry: String(lead["industry"] || ""),
          status: String(lead["status"] || "New"),
          lead_owner: String(lead["lead_owner"] || lead["owner"] || ""),
        });
      } else {
        const defaultOwner = users.find((u) => u.session_user)?.name || users[0]?.name || "";
        const defaultStatus = String(initialValues?.["status"] || "New");
        setFormData({
          ...defaultFormData,
          status: defaultStatus,
          lead_owner: defaultOwner,
        });
      }
    }
  }, [open, lead, initialValues, users]);

  const handleChange = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "email") {
        const email = value.trim().toLowerCase();
        if (email && email === (prev.lead_owner || "").trim().toLowerCase()) {
          next.lead_owner = "";
        }
      }
      if (field === "lead_owner") {
        const owner = value.trim().toLowerCase();
        if (owner && owner === (prev.email || "").trim().toLowerCase()) {
          // keep selection but warn handled at submit
        }
      }
      return next;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      toast.error("Please provide First Name");
      return;
    }
    if (
      formData.lead_owner.trim() &&
      formData.email.trim() &&
      formData.lead_owner.trim().toLowerCase() === formData.email.trim().toLowerCase()
    ) {
      toast.error(
        "Lead Owner cannot be the same as the Lead Email Address. Please choose a different owner.",
      );
      return;
    }

    const payload: Record<string, unknown> = {
      salutation: formData.salutation || null,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim() || null,
      email: formData.email.trim() || null,
      mobile_no: formData.mobile_no.trim() || null,
      gender: formData.gender || null,
      organization: formData.organization.trim() || null,
      territory: formData.territory.trim() || null,
      website: formData.website.trim() || null,
      annual_revenue: Number(formData.annual_revenue) || 0,
      company_description: formData.company_description.trim() || null,
      no_of_employees: formData.no_of_employees || null,
      industry: formData.industry || null,
      status: formData.status || "New",
      lead_owner: formData.lead_owner || null,
    };

    try {
      await saveMutation.mutateAsync({
        name: docName,
        values: payload,
      });
      toast.success(isEdit ? "Lead updated successfully" : "Lead created successfully");
      onOpenChange(false);
    } catch {
      // toast shown by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`p-0 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullscreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none"
            : "w-[95vw] sm:max-w-3xl max-h-[90vh] rounded-lg border border-border bg-card"
        }`}
      >
        {/* Modal Header Matching Frappe CRM */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Lead" : "Create Lead"}
          </DialogTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen((p) => !p)}
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              title={isFullscreen ? "Minimize" : "Maximize"}
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
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Modal Form Body: Exact Frappe CRM 2-Column Grid */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Row 1: Salutation | Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Salutation</Label>
              <Select
                value={formData.salutation || undefined}
                onValueChange={(val) => handleChange("salutation", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Email"
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Row 2: First Name * | Mobile No. */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                placeholder="First Name"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Mobile No.</Label>
              <Input
                value={formData.mobile_no}
                onChange={(e) => handleChange("mobile_no", e.target.value)}
                placeholder="Mobile No."
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Row 3: Last Name | Gender */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Last Name</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                placeholder="Last Name"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Gender</Label>
              <Select
                value={formData.gender || undefined}
                onValueChange={(val) => handleChange("gender", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs cursor-pointer">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 4: Organization | Territory */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Organization</Label>
              <Input
                value={formData.organization}
                onChange={(e) => handleChange("organization", e.target.value)}
                placeholder="Organization"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Territory</Label>
              <Input
                value={formData.territory}
                onChange={(e) => handleChange("territory", e.target.value)}
                placeholder="Territory"
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Row 5: Website | Annual Revenue */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="Website"
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Annual Revenue</Label>
              <Input
                type="number"
                value={formData.annual_revenue}
                onChange={(e) => handleChange("annual_revenue", e.target.value)}
                placeholder="PKR 0.00"
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Row 6: Company Description | No. of Employees */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Company Description</Label>
              <Textarea
                rows={2}
                value={formData.company_description}
                onChange={(e) => handleChange("company_description", e.target.value)}
                placeholder="Company Description"
                className="text-xs bg-background resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Company description discovered by Domain Enrichment.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">No. of Employees</Label>
              <Select
                value={formData.no_of_employees || undefined}
                onValueChange={(val) => handleChange("no_of_employees", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
                  <SelectValue placeholder="Select range..." />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_RANGES.map((rng) => (
                    <SelectItem key={rng} value={rng} className="text-xs cursor-pointer">
                      {rng}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 7: Industry | Status * */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Industry</Label>
              <Select
                value={formData.industry || undefined}
                onValueChange={(val) => handleChange("industry", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status || "New"}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs cursor-pointer">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 8: Lead Owner */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-foreground">Lead Owner</Label>
              <Select
                value={formData.lead_owner || undefined}
                onValueChange={(val) => handleChange("lead_owner", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
                  <SelectValue placeholder="Select Lead Owner" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {users.map((u) => (
                    <SelectItem key={u.name} value={u.name} className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold">
                          {(u.full_name || u.name).charAt(0)}
                        </div>
                        <span>{u.full_name || u.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modal Footer: Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-8 px-4 text-xs font-medium cursor-pointer"
            >
              {saveMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              <span>{isEdit ? "Save Changes" : "Create"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
