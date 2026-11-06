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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  contactDetailOptions,
  useSaveContact,
  useDeleteContact,
} from "@/hooks/use-contacts";
import { dealListOptions } from "@/hooks/use-deals";
import { ContactFormModal } from "@/components/contacts/contact-form-modal";
import { DealFormModal } from "@/components/deals/deal-form-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/contacts_/$contactId")({
  head: () => ({ meta: [{ title: "Contact Detail · AgroCRM" }] }),
  component: ContactDetailPage,
});

const SALUTATIONS = ["Mr", "Ms", "Mx", "Dr", "Mrs", "Madam", "Miss", "Master", "Prof"];
const GENDERS = ["Male", "Female", "Other"];

interface SidebarState {
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_no: string;
  gender: string;
  organization: string;
  designation: string;
  address: string;
}

const initialSidebarState: SidebarState = {
  salutation: "",
  first_name: "",
  last_name: "",
  email: "",
  mobile_no: "",
  gender: "",
  organization: "",
  designation: "",
  address: "",
};

function ContactDetailPage() {
  const { contactId } = Route.useParams();
  const navigate = useNavigate();

  const { data: contact, isLoading, refetch } = useQuery(contactDetailOptions(contactId));
  const saveMutation = useSaveContact();
  const deleteMutation = useDeleteContact();

  // Query all deals to link to this contact
  const { data: dealsData = [] } = useQuery(
    dealListOptions({ search: "", filters: [], start: 0, limit: 100, orderBy: "creation desc" }),
  );

  const [detailsOpen, setDetailsOpen] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);

  const [sidebarValues, setSidebarValues] = useState<SidebarState>(initialSidebarState);

  useEffect(() => {
    if (contact) {
      let primaryEmail = String(contact["email_id"] || contact["email"] || "");
      if (!primaryEmail && Array.isArray(contact["email_ids"])) {
        const first = (contact["email_ids"] as Array<Record<string, unknown>>)[0];
        primaryEmail = String(first?.["email_id"] || "");
      }

      let primaryPhone = String(contact["mobile_no"] || contact["phone"] || "");
      if (!primaryPhone && Array.isArray(contact["phone_nos"])) {
        const first = (contact["phone_nos"] as Array<Record<string, unknown>>)[0];
        primaryPhone = String(first?.["phone"] || "");
      }

      let company = String(contact["company_name"] || contact["organization"] || "");
      if (!company && Array.isArray(contact["links"])) {
        const first = (contact["links"] as Array<Record<string, unknown>>)[0];
        company = String(first?.["link_name"] || "");
      }

      setSidebarValues({
        salutation: String(contact["salutation"] || ""),
        first_name: String(contact["first_name"] || ""),
        last_name: String(contact["last_name"] || ""),
        email: primaryEmail,
        mobile_no: primaryPhone,
        gender: String(contact["gender"] || ""),
        organization: company,
        designation: String(contact["designation"] || contact["job_title"] || ""),
        address: String(contact["address"] || ""),
      });
    }
  }, [contact]);

  const contactName = useMemo(() => {
    if (!contact) return contactId;
    const full = String(contact["full_name"] || "");
    if (full.trim()) return full.trim();
    const combined = `${sidebarValues.first_name} ${sidebarValues.last_name}`.trim();
    return combined || contactId;
  }, [contact, contactId, sidebarValues.first_name, sidebarValues.last_name]);

  // Filter linked deals
  const linkedDeals = useMemo(() => {
    const allDeals = (dealsData as Array<Record<string, unknown>>) || [];
    return allDeals.filter((d) => {
      const dContact = String(d["contact"] || d["contact_person"] || "");
      const dEmail = String(d["email"] || "");
      const dOrg = String(d["organization"] || d["organization_name"] || "");
      if (dContact && (dContact === contactId || dContact.toLowerCase() === contactName.toLowerCase())) return true;
      if (sidebarValues.email && dEmail && dEmail.toLowerCase() === sidebarValues.email.toLowerCase()) return true;
      if (sidebarValues.organization && dOrg && dOrg.toLowerCase() === sidebarValues.organization.toLowerCase()) return true;
      return false;
    });
  }, [dealsData, contactId, contactName, sidebarValues.email, sidebarValues.organization]);

  async function handleFieldSave(fieldname: string, val: string) {
    if (!contact) return;
    const existing = String(contact[fieldname] || "");
    if (existing.trim() === val.trim()) return;

    try {
      await saveMutation.mutateAsync({
        name: contactId,
        values: { [fieldname]: val },
      });
      void refetch();
    } catch {
      // toast handled
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete contact "${contactName}"?`)) return;
    try {
      await deleteMutation.mutateAsync(contactId);
      void navigate({ to: "/contacts" });
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

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Contact not found</h2>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/contacts">Back to Contacts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] bg-background">
      {/* Top Header / Breadcrumbs & Action Bar Matching Frappe CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/60 backdrop-blur-xs">
        {/* Breadcrumb: Contacts / ☰ List / {contactName} */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Link to="/contacts" className="hover:text-foreground transition-colors font-medium">
            Contacts
          </Link>
          <span className="opacity-60">/</span>
          <Link to="/contacts" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <List className="size-3.5" />
            <span>List</span>
          </Link>
          <span className="opacity-60">/</span>
          <span className="font-semibold text-foreground truncate max-w-[240px]">
            {contactName}
          </span>
        </div>

        {/* Top Right Action: Solid Black "+ New Deal" Button matching Frappe CRM */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setDealModalOpen(true)}
            className="h-7 text-xs font-medium px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5 transition-colors"
          >
            <Plus className="size-3.5" />
            <span>New Deal</span>
          </Button>
        </div>
      </div>

      {/* Main 2-Column Layout matching Frappe CRM: Left Sidebar + Right Canvas */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* LEFT COLUMN: Sidebar (Details & Contact Attributes) */}
        <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card/30 p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto">
          {/* Avatar & Contact Name & Delete */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex size-12 items-center justify-center rounded-full bg-neutral-800 text-neutral-200 font-bold text-lg shadow-xs shrink-0 select-none">
                <span>{contactName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-base text-foreground truncate">{contactName}</h2>
                {sidebarValues.designation && (
                  <p className="text-xs text-muted-foreground truncate">{sidebarValues.designation}</p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/60 cursor-pointer"
              title="Delete Contact"
            >
              <Trash2 className="size-3.5 mr-1" />
              <span>Delete</span>
            </Button>
          </div>

          {/* Collapsible Details Section with Key-Value Rows matching Frappe CRM */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between w-full text-xs font-semibold text-foreground">
              <CollapsibleTrigger className="flex items-center gap-1.5 cursor-pointer hover:text-foreground/80">
                <ChevronDown className={cn("size-3.5 transition-transform", !detailsOpen && "-rotate-90")} />
                <span>Details</span>
              </CollapsibleTrigger>
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded hover:bg-secondary/50"
                title="Edit Contact in Modal"
              >
                <ExternalLink className="size-3.5" />
              </button>
            </div>

            <CollapsibleContent className="space-y-2 pt-2 text-xs">
              {/* Salutation */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Salutation</span>
                <Select
                  value={sidebarValues.salutation || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, salutation: val }));
                    void handleFieldSave("salutation", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Add Salutation... ▾" />
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

              {/* First Name */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">First Name</span>
                <Input
                  value={sidebarValues.first_name}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, first_name: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("first_name", e.target.value)}
                  placeholder="Add First Name..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Last Name */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Last Name</span>
                <Input
                  value={sidebarValues.last_name}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, last_name: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("last_name", e.target.value)}
                  placeholder="Add Last Name..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Email Address */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Email Address</span>
                <div className="flex items-center min-w-0">
                  <Input
                    type="email"
                    value={sidebarValues.email}
                    onChange={(e) => setSidebarValues((p) => ({ ...p, email: e.target.value }))}
                    onBlur={(e) => void handleFieldSave("email_id", e.target.value)}
                    placeholder="Add Email Address..."
                    className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                  />
                  {sidebarValues.email && (
                    <a
                      href={`mailto:${sidebarValues.email}`}
                      className="ml-1 p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                      title="Send email"
                    >
                      <Mail className="size-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Mobile Number */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Mobile Number</span>
                <div className="flex items-center min-w-0">
                  <Input
                    type="tel"
                    value={sidebarValues.mobile_no}
                    onChange={(e) => setSidebarValues((p) => ({ ...p, mobile_no: e.target.value }))}
                    onBlur={(e) => void handleFieldSave("mobile_no", e.target.value)}
                    placeholder="Add Mobile Number..."
                    className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                  />
                  {sidebarValues.mobile_no && (
                    <a
                      href={`tel:${sidebarValues.mobile_no}`}
                      className="ml-1 p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                      title="Call phone"
                    >
                      <Phone className="size-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Gender */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Gender</span>
                <Select
                  value={sidebarValues.gender || undefined}
                  onValueChange={(val) => {
                    setSidebarValues((p) => ({ ...p, gender: val }));
                    void handleFieldSave("gender", val);
                  }}
                >
                  <SelectTrigger className="h-6 w-full justify-between border-0 bg-transparent px-1 py-0 text-xs text-foreground shadow-none hover:bg-muted/40 focus:ring-0 focus:bg-background rounded">
                    <SelectValue placeholder="Add Gender... ▾" />
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

              {/* Organization */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Organization</span>
                <Input
                  value={sidebarValues.organization}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, organization: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("company_name", e.target.value)}
                  placeholder="Add Organization..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Designation */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Designation</span>
                <Input
                  value={sidebarValues.designation}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, designation: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("designation", e.target.value)}
                  placeholder="Add Designation..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>

              {/* Address */}
              <div className="grid grid-cols-[100px_1fr] items-center gap-1 text-xs py-0.5">
                <span className="text-muted-foreground truncate">Address</span>
                <Input
                  value={sidebarValues.address}
                  onChange={(e) => setSidebarValues((p) => ({ ...p, address: e.target.value }))}
                  onBlur={(e) => void handleFieldSave("address", e.target.value)}
                  placeholder="Add Address..."
                  className="h-6 w-full border-0 bg-transparent px-1 py-0 text-xs text-foreground placeholder:text-muted-foreground/60 hover:bg-muted/40 focus:ring-1 focus:ring-ring focus:bg-background rounded shadow-none"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* RIGHT COLUMN: Canvas with "Deals {count}" Tab matching Frappe CRM */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Tab Header Bar */}
          <div className="flex items-center border-b border-border/70 px-6 bg-card/20 shrink-0">
            <button
              className="flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 border-primary text-foreground -mb-px"
            >
              <Briefcase className="size-3.5" />
              <span>Deals</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground font-mono">
                {linkedDeals.length}
              </span>
            </button>
          </div>

          {/* Deals Tab Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {linkedDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary/60 text-muted-foreground/50 mb-3">
                  <Briefcase className="size-7 stroke-[1.3]" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No Deals Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Use New Deal to create a deal for this contact.
                </p>
                <Button
                  size="sm"
                  onClick={() => setDealModalOpen(true)}
                  className="mt-4 h-7 text-xs px-3 rounded-md bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs gap-1.5"
                >
                  <Plus className="size-3" />
                  <span>New Deal</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {linkedDeals.map((deal) => {
                  const dealId = String(deal["name"] || "");
                  const title = String(
                    deal["deal_name"] ||
                    deal["organization_name"] ||
                    deal["organization"] ||
                    dealId,
                  );
                  const status = String(deal["status"] || "Qualification");
                  const value = Number(deal["annual_revenue"] || deal["deal_value"] || 0);
                  const closeDate = String(deal["closed_date"] || deal["expected_closing"] || "");

                  return (
                    <Link
                      key={dealId}
                      to="/deals/$dealId"
                      params={{ dealId }}
                      className="group flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                          <Briefcase className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {title}
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {dealId}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            {value > 0 && (
                              <span className="font-medium text-foreground">
                                PKR {value.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {closeDate && <span>Closing: {closeDate}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-2 bg-secondary/80 text-foreground border-border/60"
                        >
                          ● {status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      <ContactFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        contact={contact}
        onSuccess={() => void refetch()}
      />

      {/* New Deal Modal linked to this contact */}
      <DealFormModal
        open={dealModalOpen}
        onOpenChange={setDealModalOpen}
        initialValues={{
          contact: contactId,
          organization: sidebarValues.organization,
        }}
      />
    </div>
  );
}
