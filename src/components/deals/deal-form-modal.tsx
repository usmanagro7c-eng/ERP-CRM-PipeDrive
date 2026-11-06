import { useEffect, useState } from "react";
import { Loader2, Maximize2, Minimize2, X, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveDeal, dealStatusesOptions } from "@/hooks/use-deals";
import { useCrmUsers } from "@/hooks/use-dashboard";
import { orgListOptions } from "@/hooks/use-organizations";
import { contactListOptions } from "@/hooks/use-contacts";
import { type FrappeDocTypeMeta } from "@/lib/frappe-meta";

interface DealFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  deal?: Record<string, unknown> | null;
  /** Optional initial field values */
  initialValues?: Record<string, unknown> | null;
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
const TERRITORIES = [
  "All Territories",
  "Pakistan",
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
];

interface FormDataState {
  // Org
  organization: string;
  website: string;
  territory: string;
  annual_revenue: string;
  company_description: string;
  no_of_employees: string;
  industry: string;
  // Person
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  gender: string;
  // Deal
  status: string;
  deal_owner: string;
}

const defaultFormData: FormDataState = {
  organization: "",
  website: "",
  territory: "",
  annual_revenue: "PKR 0.00",
  company_description: "",
  no_of_employees: "1-10",
  industry: "",
  salutation: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile_no: "",
  gender: "",
  status: "Qualification",
  deal_owner: "",
};

export function DealFormModal({
  open,
  onOpenChange,
  deal,
  initialValues,
}: DealFormModalProps) {
  const isEdit = Boolean(deal);
  const saveMutation = useSaveDeal();
  const { data: users = [] } = useCrmUsers();
  const { data: stages = [] } = useQuery(dealStatusesOptions());

  // Existing records queries for toggles
  const { data: existingOrgs = [] } = useQuery(
    orgListOptions({ search: "", filters: [], start: 0, limit: 100, orderBy: "creation desc" }),
  );
  const { data: existingContacts = [] } = useQuery(
    contactListOptions({ search: "", filters: [], start: 0, limit: 100, orderBy: "creation desc" }),
  );

  const [chooseExistingOrg, setChooseExistingOrg] = useState(false);
  const [chooseExistingContact, setChooseExistingContact] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState("");
  const [selectedContactName, setSelectedContactName] = useState("");

  const [formData, setFormData] = useState<FormDataState>(defaultFormData);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state whenever modal opens
  useEffect(() => {
    if (open) {
      if (deal) {
        setFormData({
          organization: String(deal["organization_name"] || deal["organization"] || ""),
          website: String(deal["website"] || ""),
          territory: String(deal["territory"] || ""),
          annual_revenue: deal["annual_revenue"] ? `PKR ${Number(deal["annual_revenue"]).toLocaleString()}` : "PKR 0.00",
          company_description: String(deal["company_description"] || ""),
          no_of_employees: String(deal["no_of_employees"] || "1-10"),
          industry: String(deal["industry"] || ""),
          salutation: String(deal["salutation"] || ""),
          first_name: String(deal["first_name"] || ""),
          last_name: String(deal["last_name"] || ""),
          email: String(deal["email"] || ""),
          mobile_no: String(deal["mobile_no"] || deal["phone"] || ""),
          gender: String(deal["gender"] || ""),
          status: String(deal["status"] || "Qualification"),
          deal_owner: String(deal["deal_owner"] || deal["owner"] || ""),
        });
      } else {
        const defaultOwner = users.find((u) => u.session_user)?.name || users[0]?.name || "";
        const defaultStatus = String(initialValues?.["status"] || "Qualification");
        setFormData({
          ...defaultFormData,
          status: defaultStatus,
          deal_owner: defaultOwner,
        });
        setChooseExistingOrg(false);
        setChooseExistingContact(false);
        setSelectedOrgName("");
        setSelectedContactName("");
      }
    }
  }, [open, deal, initialValues, users]);

  const handleChange = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const orgValue = chooseExistingOrg ? selectedOrgName : formData.organization.trim();
    if (!orgValue) {
      toast.error("Please provide or select an Organization");
      return;
    }

    const cleanRevenue = Number(formData.annual_revenue.replace(/[^0-9.]/g, "")) || 0;

    const payload: Record<string, unknown> = {
      organization: orgValue,
      organization_name: orgValue,
      status: formData.status || "Qualification",
      deal_owner: formData.deal_owner || null,
      annual_revenue: cleanRevenue,
      territory: formData.territory || null,
      industry: formData.industry || null,
      no_of_employees: formData.no_of_employees || "1-10",
      website: formData.website || null,
      company_description: formData.company_description || null,
    };

    // If person details are filled or chosen
    if (chooseExistingContact && selectedContactName) {
      payload["contact"] = selectedContactName;
    } else if (formData.first_name.trim() || formData.email.trim()) {
      payload["salutation"] = formData.salutation || null;
      payload["first_name"] = formData.first_name.trim();
      payload["last_name"] = formData.last_name.trim() || null;
      payload["email"] = formData.email.trim() || null;
      payload["mobile_no"] = formData.mobile_no.trim() || null;
      payload["gender"] = formData.gender || null;
    }

    try {
      await saveMutation.mutateAsync({
        name: deal ? String(deal["name"]) : undefined,
        values: payload,
      });
      toast.success(isEdit ? "Deal updated successfully" : "Deal created successfully");
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
            : "w-[95vw] sm:max-w-3xl max-h-[92vh] rounded-lg border border-border bg-card"
        }`}
      >
        {/* Header Matching Frappe CRM */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit Deal" : "Create Deal"}
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
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
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

        {/* Modal Form Body matching Frappe CRM exact layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-3 space-y-6">
          {/* Top Toggles Row */}
          {!isEdit && (
            <div className="flex items-center gap-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-normal text-muted-foreground">Choose Existing Organization</span>
                <Switch
                  checked={chooseExistingOrg}
                  onCheckedChange={setChooseExistingOrg}
                  className="scale-90"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-normal text-muted-foreground">Choose Existing Contact</span>
                <Switch
                  checked={chooseExistingContact}
                  onCheckedChange={setChooseExistingContact}
                  className="scale-90"
                />
              </div>
            </div>
          )}

          {/* Section 1: Organization Details (3 Columns) */}
          <div>
            {chooseExistingOrg ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Select Existing Organization *</Label>
                <Select value={selectedOrgName} onValueChange={setSelectedOrgName}>
                  <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
                    <SelectValue placeholder="Select Organization..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {(existingOrgs as Array<Record<string, unknown>>).map((org) => {
                      const orgTitle = String(org["organization_name"] || org["name"]);
                      return (
                        <SelectItem key={String(org["name"])} value={orgTitle} className="text-xs cursor-pointer">
                          {orgTitle}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Column 1: Organization Name & Territory */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Organization Name</Label>
                    <Input
                      value={formData.organization}
                      onChange={(e) => handleChange("organization", e.target.value)}
                      placeholder="Organization Name"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Territory</Label>
                    <Select
                      value={formData.territory || undefined}
                      onValueChange={(val) => handleChange("territory", val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
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
                </div>

                {/* Column 2: Website, Annual Revenue, Company Description */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="Website"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Annual Revenue</Label>
                    <Input
                      value={formData.annual_revenue}
                      onChange={(e) => handleChange("annual_revenue", e.target.value)}
                      placeholder="Annual Revenue"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Company Description</Label>
                    <Textarea
                      value={formData.company_description}
                      onChange={(e) => handleChange("company_description", e.target.value)}
                      placeholder="Company Description"
                      rows={3}
                      className="text-xs bg-muted/30 border-muted-foreground/20 resize-none focus-visible:bg-background"
                    />
                    <p className="text-[11px] text-muted-foreground/75 leading-tight">
                      Company description discovered by Domain Enrichment.
                    </p>
                  </div>
                </div>

                {/* Column 3: No. of Employees & Industry */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">No. of Employees</Label>
                    <Select
                      value={formData.no_of_employees || undefined}
                      onValueChange={(val) => handleChange("no_of_employees", val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
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
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Industry</Label>
                    <Select
                      value={formData.industry || undefined}
                      onValueChange={(val) => handleChange("industry", val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
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
              </div>
            )}
          </div>

          {/* Section 2: Contact Details (3 Columns) */}
          <div>
            {chooseExistingContact ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Select Existing Contact</Label>
                <Select value={selectedContactName} onValueChange={setSelectedContactName}>
                  <SelectTrigger className="h-8 text-xs bg-background cursor-pointer">
                    <SelectValue placeholder="Select Contact..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {(existingContacts as Array<Record<string, unknown>>).map((c) => {
                      const name = String(c["first_name"] || c["name"] || "Contact");
                      const email = String(c["email"] || "");
                      return (
                        <SelectItem key={String(c["name"])} value={String(c["name"])} className="text-xs cursor-pointer">
                          {name} {email ? `(${email})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Column 1: Salutation & Primary email */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Salutation</Label>
                    <Select
                      value={formData.salutation || undefined}
                      onValueChange={(val) => handleChange("salutation", val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
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
                    <Label className="text-xs font-normal text-muted-foreground">Primary email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="Primary email"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                    />
                  </div>
                </div>

                {/* Column 2: First name & Primary mobile no */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">First name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      placeholder="First name"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Primary mobile no</Label>
                    <Input
                      value={formData.mobile_no}
                      onChange={(e) => handleChange("mobile_no", e.target.value)}
                      placeholder="Primary mobile no"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                    />
                  </div>
                </div>

                {/* Column 3: Last name & Gender */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Last name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      placeholder="Last name"
                      className="h-8 text-xs bg-muted/30 border-muted-foreground/20 focus-visible:bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Gender</Label>
                    <Select
                      value={formData.gender || undefined}
                      onValueChange={(val) => handleChange("gender", val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
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
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Status & Ownership (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => handleChange("status", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-foreground inline-block" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-foreground inline-block" />
                        <span>{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Deal Owner</Label>
              <Select
                value={formData.deal_owner || undefined}
                onValueChange={(val) => handleChange("deal_owner", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-muted/30 border-muted-foreground/20 cursor-pointer">
                  <SelectValue placeholder="Select Owner..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {users.map((u) => {
                    const displayName = u.full_name || u.name;
                    return (
                      <SelectItem key={u.name} value={u.name} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className="relative size-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-foreground flex items-center justify-center text-[10px] font-medium">
                            {displayName.charAt(0).toUpperCase()}
                            <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
                          </div>
                          <span>{displayName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="flex justify-end pt-2 pb-1">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-8 text-xs px-4 rounded-md font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer shadow-xs"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : null}
              <span>{isEdit ? "Save Changes" : "Create"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
