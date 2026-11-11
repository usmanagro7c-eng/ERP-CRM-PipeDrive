import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  ChevronDown,
  ExternalLink,
  List,
  Loader2,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  orgDetailOptions,
  useSaveOrganization,
  useDeleteOrganization,
} from "@/hooks/use-organizations";
import { dealListOptions } from "@/hooks/use-deals";
import { contactListOptions } from "@/hooks/use-contacts";
import { OrgFormModal } from "@/components/organizations/org-form-modal";
import { DealFormModal } from "@/components/deals/deal-form-modal";
import { ContactFormModal } from "@/components/contacts/contact-form-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/organizations/$orgId")({
  head: () => ({ meta: [{ title: "Organization Detail · AgroCRM" }] }),
  component: OrganizationDetailPage,
});

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const TERRITORIES = [
  "All Territories",
  "Pakistan",
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
];
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

interface SidebarState {
  organization_name: string;
  company_description: string;
  website: string;
  territory: string;
  industry: string;
  no_of_employees: string;
  address: string;
}

const initialSidebarState: SidebarState = {
  organization_name: "",
  company_description: "",
  website: "",
  territory: "",
  industry: "",
  no_of_employees: "",
  address: "",
};

function OrganizationDetailPage() {
  const { orgId } = Route.useParams();
  const navigate = useNavigate();

  const { data: organization, isLoading, refetch } = useQuery(orgDetailOptions(orgId));
  const saveMutation = useSaveOrganization();
  const deleteMutation = useDeleteOrganization();

  // Query all deals to link to this organization
  const { data: dealsData = [] } = useQuery(
    dealListOptions({ search: "", filters: [], start: 0, limit: 100, orderBy: "creation desc" }),
  );

  // Query all contacts to link to this organization
  const { data: contactsData = [] } = useQuery(
    contactListOptions({ search: "", filters: [], start: 0, limit: 100, orderBy: "creation desc" }),
  );

  const [detailsOpen, setDetailsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"deals" | "contacts">("deals");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const [sidebarValues, setSidebarValues] = useState<SidebarState>(initialSidebarState);

  useEffect(() => {
    if (organization) {
      setSidebarValues({
        organization_name: String(organization["organization_name"] || organization["name"] || ""),
        company_description: String(organization["company_description"] || ""),
        website: String(organization["website"] || ""),
        territory: String(organization["territory"] || ""),
        industry: String(organization["industry"] || ""),
        no_of_employees: String(organization["no_of_employees"] || ""),
        address: String(organization["address"] || ""),
      });
    }
  }, [organization]);

  const orgName =
    String(organization?.["organization_name"] || organization?.["name"] || orgId);

  // Linked Deals: match by organization ID or Name
  const linkedDeals = useMemo(() => {
    const list = Array.isArray(dealsData) ? dealsData : [];
    return list.filter((deal) => {
      const dealOrg = String(deal["organization"] || "").trim().toLowerCase();
      const dealOrgName = String(deal["organization_name"] || "").trim().toLowerCase();
      const currentId = orgId.trim().toLowerCase();
      const currentName = orgName.trim().toLowerCase();
      return (
        dealOrg === currentId ||
        dealOrg === currentName ||
        dealOrgName === currentId ||
        dealOrgName === currentName
      );
    });
  }, [dealsData, orgId, orgName]);

  // Linked Contacts: match by company_name or organization
  const linkedContacts = useMemo(() => {
    const list = Array.isArray(contactsData) ? contactsData : [];
    return list.filter((c) => {
      const company = String(c["company_name"] || c["organization"] || "").trim().toLowerCase();
      const currentId = orgId.trim().toLowerCase();
      const currentName = orgName.trim().toLowerCase();
      return company === currentId || company === currentName;
    });
  }, [contactsData, orgId, orgName]);

  function handleFieldChange(fieldname: keyof SidebarState, value: string) {
    setSidebarValues((prev) => ({ ...prev, [fieldname]: value }));
  }

  async function handleFieldBlur(fieldname: keyof SidebarState) {
    if (!organization) return;
    const val = sidebarValues[fieldname];
    const existing = String(organization[fieldname] || "");
    if (existing.trim() === val.trim()) return;

    try {
      await saveMutation.mutateAsync({
        name: orgId,
        values: { [fieldname]: val },
      });
      void refetch();
    } catch {
      // toast handled by hook
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete organization "${orgName}"?`)) return;
    try {
      await deleteMutation.mutateAsync(orgId);
      void navigate({ to: "/organizations" });
    } catch {
      // handled
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Organization not found</h2>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/organizations">Back to Organizations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Top Header / Breadcrumbs & Action Bar Matching Frappe CRM */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 sm:px-6 py-2.5 backdrop-blur-xs shrink-0 gap-3 min-h-[48px]">
        {/* Breadcrumb: Organizations / ☰ List / {orgName} */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 shrink-0">
          <Link to="/organizations" className="hover:text-foreground transition-colors font-medium shrink-0">
            Organizations
          </Link>
          <span className="opacity-60">/</span>
          <Link to="/organizations" className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span className="opacity-60">/</span>
          <span className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
            {orgName}
          </span>
        </div>

        {/* Top Right Actions: Enrich + Solid Black "+ New Deal" Button matching Frappe CRM */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Organization domain enrichment triggered")}
            className="h-7 text-xs font-medium px-3 rounded-md border-border/60 cursor-pointer gap-1.5 transition-colors shrink-0"
          >
            <Sparkles className="size-3.5 text-muted-foreground" />
            <span>Enrich</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setDealModalOpen(true)}
            className="h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors shrink-0"
          >
            <Plus className="size-3.5" />
            <span>New Deal</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Layout matching Frappe CRM: Left Sidebar + Right Canvas */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* LEFT COLUMN: Sidebar (Details & Organization Attributes) */}
        <div className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-border bg-card/30 p-4 sm:p-5 lg:w-80 lg:border-b-0 lg:border-r">
          {/* Avatar & Organization Name & Delete */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex size-12 items-center justify-center rounded-full bg-neutral-800 text-neutral-200 font-bold text-lg shadow-xs shrink-0 select-none">
                <span>{orgName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base text-foreground truncate">{orgName}</h2>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/60 cursor-pointer"
              title="Delete Organization"
            >
              <Trash2 className="size-3.5 mr-1" />
              <span>Delete</span>
            </Button>
          </div>

          {/* Collapsible: Details */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-foreground/80 cursor-pointer"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      !detailsOpen && "-rotate-90",
                    )}
                  />
                  <span>Details</span>
                </button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditModalOpen(true)}
                className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Edit Organization in dialog"
              >
                <ExternalLink className="size-3.5" />
              </Button>
            </div>

            <CollapsibleContent className="space-y-3.5 pt-1">
              {/* Organization Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">Organization Name</label>
                <Input
                  value={sidebarValues.organization_name}
                  onChange={(e) => handleFieldChange("organization_name", e.target.value)}
                  onBlur={() => handleFieldBlur("organization_name")}
                  className="h-7 text-xs bg-transparent border-border/40 focus:bg-background"
                />
              </div>

              {/* Company Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">Company Description</label>
                <Textarea
                  value={sidebarValues.company_description}
                  onChange={(e) => handleFieldChange("company_description", e.target.value)}
                  onBlur={() => handleFieldBlur("company_description")}
                  rows={2}
                  className="text-xs bg-transparent border-border/40 focus:bg-background resize-none"
                />
              </div>

              {/* Website */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">Website</label>
                <Input
                  value={sidebarValues.website}
                  onChange={(e) => handleFieldChange("website", e.target.value)}
                  onBlur={() => handleFieldBlur("website")}
                  className="h-7 text-xs bg-transparent border-border/40 focus:bg-background"
                />
              </div>

              {/* Territory */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">Territory</label>
                <Select
                  value={sidebarValues.territory || ""}
                  onValueChange={(val) => {
                    handleFieldChange("territory", val);
                    void saveMutation.mutateAsync({
                      name: orgId,
                      values: { territory: val },
                    }).then(() => refetch());
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-transparent border-border/40 cursor-pointer">
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

              {/* Industry */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">Industry</label>
                <Select
                  value={sidebarValues.industry || ""}
                  onValueChange={(val) => {
                    handleFieldChange("industry", val);
                    void saveMutation.mutateAsync({
                      name: orgId,
                      values: { industry: val },
                    }).then(() => refetch());
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-transparent border-border/40 cursor-pointer">
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
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">No. of Employees</label>
                <Select
                  value={sidebarValues.no_of_employees || ""}
                  onValueChange={(val) => {
                    handleFieldChange("no_of_employees", val);
                    void saveMutation.mutateAsync({
                      name: orgId,
                      values: { no_of_employees: val },
                    }).then(() => refetch());
                  }}
                >
                  <SelectTrigger className="h-7 text-xs bg-transparent border-border/40 cursor-pointer">
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

              {/* Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-normal text-muted-foreground">Address</label>
                <Input
                  value={sidebarValues.address}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  onBlur={() => handleFieldBlur("address")}
                  className="h-7 text-xs bg-transparent border-border/40 focus:bg-background"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* RIGHT COLUMN: Canvas with Deals & Contacts Tabs */}
        <div className="flex-none lg:flex-1 flex flex-col overflow-y-auto p-4 sm:p-6">
          {/* Top Tabs: Deals {count} & Contacts {count} */}
          <div className="flex items-center gap-4 sm:gap-6 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("deals")}
              className={cn(
                "text-xs font-semibold pb-1 cursor-pointer transition-colors border-b-2 -mb-[13px]",
                activeTab === "deals"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Deals <span className="ml-1 text-muted-foreground font-normal">{linkedDeals.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className={cn(
                "text-xs font-semibold pb-1 cursor-pointer transition-colors border-b-2 -mb-[13px]",
                activeTab === "contacts"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Contacts <span className="ml-1 text-muted-foreground font-normal">{linkedContacts.length}</span>
            </button>
          </div>

          {/* Deals Tab Body */}
          {activeTab === "deals" && (
            <div className="pt-8">
              {linkedDeals.length === 0 ? (
                /* Empty state matching Frappe CRM */
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
                    <Briefcase className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">No Deals Found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Use New Deal to create a deal for this organization.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setDealModalOpen(true)}
                    className="mt-4 h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
                  >
                    <Plus className="size-3.5" />
                    <span>New Deal</span>
                  </Button>
                </div>
              ) : (
                /* Deals List Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {linkedDeals.map((deal) => {
                    const dealName = String(deal["name"] || "");
                    const orgTitle = String(deal["organization_name"] || deal["organization"] || dealName);
                    const status = String(deal["status"] || "Qualification");
                    const amount = Number(deal["annual_revenue"] || deal["deal_value"] || 0);
                    return (
                      <Link
                        key={dealName}
                        to="/deals/$dealId"
                        params={{ dealId: dealName }}
                        className="p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors flex flex-col gap-2 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {orgTitle}
                          </h4>
                          <Badge variant="outline" className="text-[11px] font-normal shrink-0">
                            {status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <span className="font-mono text-[11px]">{dealName}</span>
                          <span className="font-semibold text-foreground">
                            {amount > 0 ? `PKR ${amount.toLocaleString()}` : "PKR 0.00"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab Body */}
          {activeTab === "contacts" && (
            <div className="pt-8">
              {linkedContacts.length === 0 ? (
                /* Empty state matching Frappe CRM */
                <div className="flex flex-col items-center justify-center text-center py-20">
                  <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
                    <Users className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">No Contacts Found</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    No contacts have been added for this organization yet.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setContactModalOpen(true)}
                    className="mt-4 h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
                  >
                    <Plus className="size-3.5" />
                    <span>New Contact</span>
                  </Button>
                </div>
              ) : (
                /* Contacts List Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {linkedContacts.map((contact) => {
                    const cName = String(contact["first_name"] || contact["name"] || "Contact");
                    const email = String(contact["email_id"] || contact["email"] || "");
                    const mobile = String(contact["mobile_no"] || contact["phone"] || "");
                    const designation = String(contact["designation"] || "");
                    return (
                      <Link
                        key={String(contact["name"])}
                        to="/contacts/$contactId"
                        params={{ contactId: String(contact["name"]) }}
                        className="p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-full bg-neutral-800 text-neutral-200 font-semibold text-xs flex items-center justify-center shrink-0">
                            {cName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                              {cName}
                            </h4>
                            {designation && (
                              <p className="text-[11px] text-muted-foreground truncate">{designation}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-muted-foreground shrink-0">
                          {email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              <span className="truncate max-w-[140px]">{email}</span>
                            </span>
                          )}
                          {mobile && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              <span>{mobile}</span>
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialog Modals */}
      <OrgFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        organization={organization}
        onSuccess={() => void refetch()}
      />

      <DealFormModal
        open={dealModalOpen}
        onOpenChange={setDealModalOpen}
        initialValues={{ organization: orgName }}
      />

      <ContactFormModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        initialValues={{ company_name: orgName }}
      />
    </div>
  );
}
