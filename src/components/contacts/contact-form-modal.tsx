import { useEffect, useState } from "react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveContact } from "@/hooks/use-contacts";
import { orgListOptions } from "@/hooks/use-organizations";
import type { FrappeDocTypeMeta } from "@/lib/frappe-meta";
import { cn } from "@/lib/utils";

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: FrappeDocTypeMeta;
  /** Existing doc when editing; null when creating. */
  contact?: Record<string, unknown> | null;
  /** Optional initial field values */
  initialValues?: Record<string, unknown> | null;
  onSuccess?: (savedContact: Record<string, unknown>) => void;
}

const SALUTATIONS = ["Mr", "Ms", "Mx", "Dr", "Mrs", "Madam", "Miss", "Master", "Prof"];
const GENDERS = ["Male", "Female", "Other"];

interface FormState {
  salutation: string;
  first_name: string;
  last_name: string;
  email_id: string;
  mobile_no: string;
  gender: string;
  company_name: string;
  designation: string;
  address: string;
}

const defaultFormState: FormState = {
  salutation: "",
  first_name: "",
  last_name: "",
  email_id: "",
  mobile_no: "",
  gender: "",
  company_name: "",
  designation: "",
  address: "",
};

export function ContactFormModal({
  open,
  onOpenChange,
  contact,
  initialValues,
  onSuccess,
}: ContactFormModalProps) {
  const isEdit = Boolean(contact);
  const saveMutation = useSaveContact();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Existing organizations for company picker
  const { data: existingOrgs = [] } = useQuery(
    orgListOptions({ search: "", filters: [], start: 0, limit: 100, orderBy: "creation desc" }),
  );

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [errors, setErrors] = useState<{ first_name?: string }>({});

  useEffect(() => {
    if (open) {
      if (contact) {
        // Find primary email
        let primaryEmail = String(contact["email_id"] || contact["email"] || "");
        if (!primaryEmail && Array.isArray(contact["email_ids"])) {
          const first = (contact["email_ids"] as Array<Record<string, unknown>>)[0];
          primaryEmail = String(first?.["email_id"] || "");
        }

        // Find primary phone
        let primaryPhone = String(contact["mobile_no"] || contact["phone"] || "");
        if (!primaryPhone && Array.isArray(contact["phone_nos"])) {
          const first = (contact["phone_nos"] as Array<Record<string, unknown>>)[0];
          primaryPhone = String(first?.["phone"] || "");
        }

        // Find linked company
        let company = String(contact["company_name"] || contact["organization"] || "");
        if (!company && Array.isArray(contact["links"])) {
          const first = (contact["links"] as Array<Record<string, unknown>>)[0];
          company = String(first?.["link_name"] || "");
        }

        setForm({
          salutation: String(contact["salutation"] || ""),
          first_name: String(contact["first_name"] || ""),
          last_name: String(contact["last_name"] || ""),
          email_id: primaryEmail,
          mobile_no: primaryPhone,
          gender: String(contact["gender"] || ""),
          company_name: company,
          designation: String(contact["designation"] || contact["job_title"] || ""),
          address: String(contact["address"] || ""),
        });
      } else if (initialValues) {
        setForm({
          ...defaultFormState,
          salutation: String(initialValues["salutation"] || ""),
          first_name: String(initialValues["first_name"] || ""),
          last_name: String(initialValues["last_name"] || ""),
          email_id: String(initialValues["email_id"] || initialValues["email"] || ""),
          mobile_no: String(initialValues["mobile_no"] || initialValues["phone"] || ""),
          gender: String(initialValues["gender"] || ""),
          company_name: String(
            initialValues["company_name"] || initialValues["organization"] || "",
          ),
          designation: String(initialValues["designation"] || ""),
          address: String(initialValues["address"] || ""),
        });
      } else {
        setForm(defaultFormState);
      }
      setErrors({});
    }
  }, [open, contact, initialValues]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "first_name" && value.trim()) {
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.first_name.trim()) {
      setErrors({ first_name: "First Name is required" });
      toast.error("Please enter First Name");
      return;
    }

    const payload: Record<string, unknown> = {
      salutation: form.salutation || undefined,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || undefined,
      email_id: form.email_id.trim() || undefined,
      mobile_no: form.mobile_no.trim() || undefined,
      gender: form.gender || undefined,
      company_name: form.company_name.trim() || undefined,
      designation: form.designation.trim() || undefined,
      address: form.address.trim() || undefined,
    };

    try {
      const result = await saveMutation.mutateAsync({
        name: contact ? String(contact["name"]) : undefined,
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
            : "sm:max-w-lg w-full rounded-xl max-h-[90vh]",
        )}
      >
        {/* Header matching Frappe CRM: Title on left, Maximize + Single Close on right */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 flex flex-row items-center justify-between shrink-0 space-y-0">
          <DialogTitle className="text-base font-semibold text-foreground tracking-tight">
            {isEdit ? "Edit Contact" : "New Contact"}
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
            {/* Salutation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Salutation</Label>
              <Select
                value={form.salutation || undefined}
                onValueChange={(val) => handleChange("salutation", val)}
              >
                <SelectTrigger className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
                  <SelectValue placeholder="Salutation" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {SALUTATIONS.map((sal) => (
                    <SelectItem key={sal} value={sal} className="text-xs cursor-pointer">
                      {sal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row: First Name & Last Name (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="First Name"
                  className={cn(
                    "h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md",
                    errors.first_name && "border-destructive focus-visible:ring-destructive",
                  )}
                  autoFocus
                />
                {errors.first_name && (
                  <p className="text-[11px] text-destructive">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Last Name"
                  className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Email Address</Label>
              <Input
                type="email"
                value={form.email_id}
                onChange={(e) => handleChange("email_id", e.target.value)}
                placeholder="Email Address"
                className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
              />
            </div>

            {/* Row: Mobile No & Gender (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Mobile No</Label>
                <Input
                  type="tel"
                  value={form.mobile_no}
                  onChange={(e) => handleChange("mobile_no", e.target.value)}
                  placeholder="Mobile No"
                  className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Gender</Label>
                <Select
                  value={form.gender || undefined}
                  onValueChange={(val) => handleChange("gender", val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md">
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

            {/* Company Name / Organization */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Company Name</Label>
              <Input
                value={form.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="Company Name"
                className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
                list="org-list-suggestions"
              />
              <datalist id="org-list-suggestions">
                {(existingOrgs as Array<Record<string, unknown>>).map((org) => {
                  const title = String(org["organization_name"] || org["name"]);
                  return <option key={String(org["name"])} value={title} />;
                })}
              </datalist>
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                placeholder="Designation"
                className="h-8 text-xs bg-secondary/30 hover:bg-secondary/50 focus:bg-background border-border/60 rounded-md"
              />
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
