import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronsUpDown,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useConvertLeadToDeal, errorMessage } from "@/hooks/use-leads";
import { dealStatusesOptions, lostReasonsOptions } from "@/hooks/use-deals";
import { useLinkOptions } from "@/hooks/use-organizations";
import { cn } from "@/lib/utils";

const FALLBACK_REASONS = [
  "Pricing",
  "Competition",
  "Budget Constraints",
  "Missing Features",
  "Long Sales Cycle",
  "No Decision-Maker",
  "Unresponsive Prospect",
  "Poor Fit",
  "Other",
];

interface ConvertLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Record<string, unknown> | null;
}

function getDefaultCloseDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0] ?? "";
}

export function ConvertLeadModal({
  open,
  onOpenChange,
  lead,
}: ConvertLeadModalProps) {
  const navigate = useNavigate();
  const convertMutation = useConvertLeadToDeal();

  const { data: dealStatuses = [] } = useQuery(dealStatusesOptions());
  const { data: orgOptions = [], isLoading: orgsLoading } =
    useLinkOptions("CRM Organization");

  // Lead display properties
  const leadName = useMemo(() => {
    if (!lead) return "";
    const directName = String(lead["lead_name"] ?? "").trim();
    if (directName) return directName;
    const first = String(lead["first_name"] ?? "").trim();
    const last = String(lead["last_name"] ?? "").trim();
    const combined = `${first} ${last}`.trim();
    return combined || String(lead["name"] ?? "");
  }, [lead]);

  const leadEmail = String(lead?.["email"] ?? "");
  const leadPhone = String(lead?.["mobile_no"] ?? lead?.["phone"] ?? "");
  const leadOrg = String(lead?.["organization"] ?? "");

  // Form State
  const [dealTitle, setDealTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [dealValue, setDealValue] = useState<string>("");
  const [stage, setStage] = useState("Qualification");
  const [expectedCloseDate, setExpectedCloseDate] = useState(getDefaultCloseDate);
  const [lostReason, setLostReason] = useState("");
  const [lostNotes, setLostNotes] = useState("");
  const [orgComboboxOpen, setOrgComboboxOpen] = useState(false);

  const lostReasonsQuery = useQuery(lostReasonsOptions());
  const lostReasons = useMemo(() => {
    if (lostReasonsQuery.data && lostReasonsQuery.data.length > 0) {
      return lostReasonsQuery.data.map((r) => r.name);
    }
    return FALLBACK_REASONS;
  }, [lostReasonsQuery.data]);

  const isLost = stage.toLowerCase() === "lost";
  const isLostOther = isLost && lostReason === "Other";

  // Re-seed form when modal opens with a lead
  useEffect(() => {
    if (open && lead) {
      const initialTitle = leadOrg
        ? `${leadOrg} - Deal`
        : leadName
          ? `${leadName} Deal`
          : "New Deal";
      setDealTitle(initialTitle);

      // Check if lead.organization exists in orgOptions
      setOrganization(leadOrg || "");

      const rev = lead["annual_revenue"];
      setDealValue(rev ? String(rev) : "");

      const firstStage =
        dealStatuses.length > 0 && dealStatuses[0]
          ? dealStatuses[0].name
          : "Qualification";
      setStage(firstStage);

      setExpectedCloseDate(getDefaultCloseDate());
      setLostReason("");
      setLostNotes("");
    }
  }, [open, lead, leadName, leadOrg, dealStatuses]);

  // If orgOptions loads later and leadOrg is present, auto-select if matching
  useEffect(() => {
    if (leadOrg && !organization && orgOptions.some((o) => o.name === leadOrg)) {
      setOrganization(leadOrg);
    }
  }, [leadOrg, organization, orgOptions]);

  async function handleConvert() {
    if (!lead) return;

    const trimmedTitle = dealTitle.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a Deal Name.");
      return;
    }

    const trimmedOrg = organization.trim();
    if (!trimmedOrg) {
      toast.error("Please select an Organization for the Deal.");
      return;
    }

    try {
      const dealValues: Record<string, unknown> = {
        deal_name: trimmedTitle,
        organization: trimmedOrg,
        status: stage,
      };

      if (isLost) {
        const trimmedReason = lostReason.trim();
        if (!trimmedReason) {
          toast.error("Please specify a reason for losing the deal.");
          return;
        }
        dealValues["lost_reason"] = trimmedReason;

        if (isLostOther) {
          const trimmedNotes = lostNotes.trim();
          if (!trimmedNotes) {
            toast.error("Please provide additional notes for reason 'Other'.");
            return;
          }
          dealValues["lost_notes"] = trimmedNotes;
        }
      }

      if (dealValue && !Number.isNaN(Number(dealValue))) {
        dealValues["deal_value"] = Number(dealValue);
      }

      if (expectedCloseDate) {
        dealValues["expected_closure_date"] = expectedCloseDate;
      }

      const result = await convertMutation.mutateAsync({
        leadName: String(lead["name"]),
        dealValues,
      });

      const createdDealName = String(
        result.deal["name"] || result.deal["deal_name"] || trimmedTitle,
      );

      toast.success(`Lead successfully converted to deal: ${createdDealName}`, {
        description: "Status updated to Converted and Deal added to Pipeline.",
        action: {
          label: "View Deals",
          onClick: () => {
            void navigate({ to: "/deals" });
          },
        },
      });

      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Briefcase className="size-5" />
            <DialogTitle>Convert Lead to Deal</DialogTitle>
          </div>
          <DialogDescription>
            Create an active pipeline Deal from this Lead and mark the Lead as Converted.
          </DialogDescription>
        </DialogHeader>

        {/* Lead Summary Header Card */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              {leadName}
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              {String(lead["name"])}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {leadOrg && (
              <span className="flex items-center gap-1">
                <Building2 className="size-3" />
                {leadOrg}
              </span>
            )}
            {leadEmail && (
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                {leadEmail}
              </span>
            )}
            {leadPhone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {leadPhone}
              </span>
            )}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3.5 py-1">
          {/* Deal Name */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-title" className="text-xs font-semibold">
              Deal Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deal-title"
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              placeholder="e.g. Acme Corp Deal"
              className="h-9 text-sm"
              disabled={convertMutation.isPending}
            />
          </div>

          {/* Organization Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>
                Organization <span className="text-destructive">*</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Required by CRM Deal
              </span>
            </Label>
            <Popover open={orgComboboxOpen} onOpenChange={setOrgComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={orgComboboxOpen}
                  className="w-full h-9 justify-between font-normal text-sm"
                  disabled={convertMutation.isPending}
                >
                  <span className="truncate">
                    {organization || (
                      <span className="text-muted-foreground">
                        {orgsLoading ? "Loading organizations..." : "Select organization..."}
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search organization..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-2 text-center text-xs">
                        No organization found.
                        {dealTitle && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-7 text-xs text-primary"
                            onClick={() => {
                              setOrganization(leadOrg || dealTitle);
                              setOrgComboboxOpen(false);
                            }}
                          >
                            Use "{leadOrg || dealTitle}"
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading="Organizations">
                      {orgOptions.map((org) => (
                        <CommandItem
                          key={org.name}
                          value={org.name}
                          onSelect={() => {
                            setOrganization(org.name);
                            setOrgComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              organization === org.name ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{org.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Deal Stage and Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deal Stage</Label>
              <Select
                value={stage}
                onValueChange={setStage}
                disabled={convertMutation.isPending}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {dealStatuses.map((st) => (
                    <SelectItem key={st.name} value={st.name}>
                      {st.deal_status || st.name}
                    </SelectItem>
                  ))}
                  {dealStatuses.length === 0 && (
                    <SelectItem value="Qualification">Qualification</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deal-value" className="text-xs font-semibold">
                Deal Value
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="deal-value"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className="pl-8 h-9 text-sm"
                  disabled={convertMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Lost Reason if stage is Lost */}
          {isLost && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertCircle className="size-4" />
                <span>Deal Loss Details (Required by Frappe CRM)</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lost-reason" className="text-xs font-semibold">
                  Reason for losing deal <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={lostReason}
                  onValueChange={setLostReason}
                  disabled={convertMutation.isPending}
                >
                  <SelectTrigger id="lost-reason" className="h-9 text-sm bg-background">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lostReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLostOther && (
                <div className="space-y-1.5">
                  <Label htmlFor="lost-notes" className="text-xs font-semibold">
                    Lost Notes <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="lost-notes"
                    value={lostNotes}
                    onChange={(e) => setLostNotes(e.target.value)}
                    placeholder="Please explain why the deal was lost..."
                    className="text-xs min-h-[60px] bg-background"
                    disabled={convertMutation.isPending}
                  />
                </div>
              )}
            </div>
          )}

          {/* Expected Close Date */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-close-date" className="text-xs font-semibold flex items-center gap-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              Expected Close Date
            </Label>
            <Input
              id="deal-close-date"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="h-9 text-sm"
              disabled={convertMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConvert()}
            disabled={convertMutation.isPending}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {convertMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Briefcase className="size-4" />
                Create Deal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
