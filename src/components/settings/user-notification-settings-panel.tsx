import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Mail,
  Send,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Clock,
  Timer,
  Zap,
  ShieldCheck,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as api from "@/lib/api";
import {
  createDefaultUserNotificationSettings,
  type UserNotificationSettings,
  type NotificationDeliveryMode,
} from "@/lib/notification-settings";
import { cn } from "@/lib/utils";

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

export function UserNotificationSettingsPanel({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName?: string;
}) {
  const queryClient = useQueryClient();

  const {
    data: serverSettings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-notification-settings", userEmail],
    queryFn: () => api.getUserNotificationSettings(userEmail),
    enabled: Boolean(userEmail),
  });

  const [formState, setFormState] = useState<UserNotificationSettings>(() =>
    createDefaultUserNotificationSettings(userEmail, userEmail),
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (serverSettings) {
      setFormState(serverSettings);
      setHasChanges(false);
    }
  }, [serverSettings]);

  const saveMutation = useMutation({
    mutationFn: (updated: UserNotificationSettings) =>
      api.saveUserNotificationSettings(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-notification-settings", userEmail],
      });
      setHasChanges(false);
      toast.success("Personal notification settings saved to Frappe CRM!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      toast.error(msg);
    },
  });

  const handleToggleMaster = (checked: boolean) => {
    setFormState((prev) => ({ ...prev, enabled: checked }));
    setHasChanges(true);
  };

  const handleToggleEvent = (
    key: keyof UserNotificationSettings["events"],
    checked: boolean,
  ) => {
    setFormState((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: checked,
      },
    }));
    setHasChanges(true);
  };

  const applyPreset = (preset: "all" | "stageOnly" | "salesPipeline" | "none") => {
    setFormState((prev) => {
      let events = { ...prev.events };
      switch (preset) {
        case "all":
          events = {
            dealStageChange: true,
            dealUpdates: true,
            quotations: true,
            salesOrders: true,
            leads: true,
            tasks: true,
            otherRecords: true,
          };
          break;
        case "stageOnly":
          events = {
            dealStageChange: true,
            dealUpdates: false,
            quotations: false,
            salesOrders: false,
            leads: false,
            tasks: false,
            otherRecords: false,
          };
          break;
        case "salesPipeline":
          events = {
            dealStageChange: true,
            dealUpdates: true,
            quotations: true,
            salesOrders: true,
            leads: false,
            tasks: false,
            otherRecords: false,
          };
          break;
        case "none":
          events = {
            dealStageChange: false,
            dealUpdates: false,
            quotations: false,
            salesOrders: false,
            leads: false,
            tasks: false,
            otherRecords: false,
          };
          break;
      }
      return { ...prev, events };
    });
    setHasChanges(true);
    toast.success(`Preset applied: ${preset}`);
  };

  const handleResetDefaults = () => {
    const defaults = createDefaultUserNotificationSettings(userEmail, userEmail);
    setFormState(defaults);
    setHasChanges(true);
    toast.info("Settings reset to defaults. Click Save to persist.");
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const target = formState.email || userEmail;
      await api.sendUserTestNotification(target, userName);
      toast.success(`Test email dispatched to ${target}! Check your inbox.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send test email";
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const displayName = userName || userEmail.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center shadow-2xs space-y-3">
        <Loader2 className="size-6 animate-spin mx-auto text-primary" />
        <p className="text-xs text-muted-foreground">
          Loading personal notification preferences from Frappe CRM...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-destructive font-medium text-sm">
          <AlertCircle className="size-4" />
          <span>Failed to load preferences from CRM Backend</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Network error"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-8 text-xs gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="size-4 shrink-0" />
            <span className="leading-relaxed">
              You have unsaved changes in your personal notification settings.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(formState)}
            disabled={saveMutation.isPending}
            className="h-8 text-[11px] px-3 shrink-0"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <Check className="size-3.5 mr-1" />
            )}
            Save Now
          </Button>
        </div>
      )}

      {/* User Identity & Master Alert Card */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </h3>
                <Badge
                  variant={formState.enabled ? "default" : "secondary"}
                  className="text-[10px] h-4 font-normal"
                >
                  {formState.enabled ? "Alerts Active" : "Alerts Muted"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                {formState.email || userEmail}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <Label
              htmlFor="user-master-switch"
              className="text-xs font-semibold cursor-pointer text-muted-foreground"
            >
              Email Alerts
            </Label>
            <Switch
              id="user-master-switch"
              checked={formState.enabled}
              onCheckedChange={handleToggleMaster}
            />
          </div>
        </div>
      </div>

      {/* Recipient Email Destination */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            Notification Recipient Addresses
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Where your personal notification alerts should be delivered.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="primary-email" className="text-xs font-medium text-foreground">
              Primary Notification Email
            </Label>
            <Input
              id="primary-email"
              type="email"
              value={formState.email}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, email: e.target.value }));
                setHasChanges(true);
              }}
              placeholder={userEmail}
              className="h-8 text-xs bg-muted/20"
            />
            <p className="text-[10px] text-muted-foreground">
              Defaults to your login email address.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alt-email" className="text-xs font-medium text-foreground">
              Secondary / Alternate CC (Optional)
            </Label>
            <Input
              id="alt-email"
              type="email"
              value={formState.alternateEmail || ""}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, alternateEmail: e.target.value }));
                setHasChanges(true);
              }}
              placeholder="e.g. personal@example.com"
              className="h-8 text-xs bg-muted/20"
            />
            <p className="text-[10px] text-muted-foreground">
              Optional secondary address to be CC&apos;d on all your alerts.
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Timing & Mode */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Delivery Timing &amp; Frequency
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Choose whether you receive alerts immediately or batched as a digest.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-normal">
            {formState.deliveryMode === "instant"
              ? "Zero Delay"
              : formState.deliveryMode === "scheduled"
                ? `Daily ${formState.scheduledTime || "09:00"}`
                : `Every ${formatInterval(formState.intervalMinutes || 60)}`}
          </Badge>
        </div>

        <RadioGroup
          value={formState.deliveryMode}
          onValueChange={(val) => {
            setFormState((prev) => ({
              ...prev,
              deliveryMode: val as NotificationDeliveryMode,
            }));
            setHasChanges(true);
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
        >
          {/* Instant */}
          <label
            htmlFor="timing-user-instant"
            className={cn(
              "flex flex-col justify-between p-3.5 rounded-lg border cursor-pointer transition-all",
              formState.deliveryMode === "instant"
                ? "border-emerald-500/70 bg-emerald-500/5 shadow-2xs"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5 text-emerald-500" />
                  Instant Alerts
                </span>
                <RadioGroupItem value="instant" id="timing-user-instant" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Receive an immediate email whenever an event occurs on your records.
              </p>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time delivery
            </div>
          </label>

          {/* Daily Scheduled */}
          <label
            htmlFor="timing-user-scheduled"
            className={cn(
              "flex flex-col justify-between p-3.5 rounded-lg border cursor-pointer transition-all",
              formState.deliveryMode === "scheduled"
                ? "border-blue-500/70 bg-blue-500/5 shadow-2xs"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-blue-500" />
                  Daily Digest
                </span>
                <RadioGroupItem value="scheduled" id="timing-user-scheduled" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Bundle your notifications into a single daily summary at a fixed time.
              </p>
            </div>
            <div className="mt-2.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              Daily summary window
            </div>
          </label>

          {/* Periodic Interval */}
          <label
            htmlFor="timing-user-interval"
            className={cn(
              "flex flex-col justify-between p-3.5 rounded-lg border cursor-pointer transition-all",
              formState.deliveryMode === "interval"
                ? "border-amber-500/70 bg-amber-500/5 shadow-2xs"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Timer className="size-3.5 text-amber-500" />
                  Periodic Interval
                </span>
                <RadioGroupItem value="interval" id="timing-user-interval" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Receive batched notifications every hour or chosen interval.
              </p>
            </div>
            <div className="mt-2.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              Periodic batch window
            </div>
          </label>
        </RadioGroup>

        {formState.deliveryMode === "scheduled" && (
          <div className="p-3.5 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label htmlFor="user-scheduled-time" className="text-xs font-semibold">
                  Daily Delivery Time
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Your daily summary will be sent at this time.
                </p>
              </div>
              <Input
                id="user-scheduled-time"
                type="time"
                value={formState.scheduledTime || "09:00"}
                onChange={(e) => {
                  setFormState((prev) => ({ ...prev, scheduledTime: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-32 h-8 text-xs bg-background"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-blue-500/20">
              <span className="text-[10px] text-muted-foreground mr-1">Quick Select:</span>
              {[
                { label: "08:00 AM (Morning)", value: "08:00" },
                { label: "09:00 AM (Start of Day)", value: "09:00" },
                { label: "01:00 PM (Midday)", value: "13:00" },
                { label: "06:00 PM (End of Day)", value: "18:00" },
              ].map((chip) => (
                <Button
                  key={chip.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormState((prev) => ({ ...prev, scheduledTime: chip.value }));
                    setHasChanges(true);
                  }}
                  className={cn(
                    "h-6 text-[11px] px-2 py-0 bg-background cursor-pointer",
                    formState.scheduledTime === chip.value &&
                      "border-blue-500 bg-blue-500/15 text-blue-600 font-semibold",
                  )}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {formState.deliveryMode === "interval" && (
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label htmlFor="user-interval-select" className="text-xs font-semibold">
                  Batching Interval
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Choose how frequently updates are bundled and emailed.
                </p>
              </div>
              <Select
                value={String(formState.intervalMinutes || 60)}
                onValueChange={(val) => {
                  setFormState((prev) => ({
                    ...prev,
                    intervalMinutes: Number(val),
                  }));
                  setHasChanges(true);
                }}
              >
                <SelectTrigger id="user-interval-select" className="w-48 h-8 text-xs bg-background">
                  <SelectValue placeholder="Select interval..." />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="15">Every 15 Minutes</SelectItem>
                  <SelectItem value="30">Every 30 Minutes</SelectItem>
                  <SelectItem value="60">Every 1 Hour (Recommended)</SelectItem>
                  <SelectItem value="120">Every 2 Hours</SelectItem>
                  <SelectItem value="240">Every 4 Hours</SelectItem>
                  <SelectItem value="720">Every 12 Hours</SelectItem>
                  <SelectItem value="1440">Every 24 Hours (Daily)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Event Subscriptions */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Event Notifications Subscriptions
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select which commercial events trigger an email alert for you.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
                <SlidersHorizontal className="size-3 text-muted-foreground" />
                <span>Presets</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem onClick={() => applyPreset("all")} className="cursor-pointer">
                Enable All Events
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyPreset("stageOnly")} className="cursor-pointer">
                Deal Stage Changes Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyPreset("salesPipeline")} className="cursor-pointer">
                Sales Pipeline (Deals &amp; Orders)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => applyPreset("none")}
                className="cursor-pointer text-muted-foreground"
              >
                Disable All Events
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2.5 pt-1">
          {/* Deal Stage Changes */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/25 bg-primary/5">
            <Checkbox
              id="user-event-stage"
              checked={formState.events.dealStageChange}
              onCheckedChange={(c) => handleToggleEvent("dealStageChange", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-stage"
                className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-2"
              >
                <span>Deal Stage Transitions</span>
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                >
                  High Priority
                </Badge>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Highlighted notifications when a Deal is marked Won, Lost, or moves between stages.
              </p>
            </div>
          </div>

          {/* Deal Updates */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
            <Checkbox
              id="user-event-deal-updates"
              checked={formState.events.dealUpdates}
              onCheckedChange={(c) => handleToggleEvent("dealUpdates", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-deal-updates"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Deal Updates &amp; Products
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When deal valuation, products, revenue, or milestones are updated.
              </p>
            </div>
          </div>

          {/* Quotations */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
            <Checkbox
              id="user-event-quotations"
              checked={formState.events.quotations}
              onCheckedChange={(c) => handleToggleEvent("quotations", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-quotations"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Quotations Created &amp; Submitted
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When a formal quotation is drafted, sent, or submitted in ERP.
              </p>
            </div>
          </div>

          {/* Sales Orders */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
            <Checkbox
              id="user-event-orders"
              checked={formState.events.salesOrders}
              onCheckedChange={(c) => handleToggleEvent("salesOrders", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-orders"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Sales Orders Booked &amp; Submitted
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When commercial sales orders are confirmed or executed.
              </p>
            </div>
          </div>

          {/* Leads */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
            <Checkbox
              id="user-event-leads"
              checked={formState.events.leads}
              onCheckedChange={(c) => handleToggleEvent("leads", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-leads"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Leads Created &amp; Converted
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When a new prospective lead arrives or is converted to an organization.
              </p>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
            <Checkbox
              id="user-event-tasks"
              checked={formState.events.tasks}
              onCheckedChange={(c) => handleToggleEvent("tasks", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-tasks"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Tasks Assigned &amp; Reminders
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When follow-ups, calls, and action items are scheduled or assigned to you.
              </p>
            </div>
          </div>

          {/* Other Records */}
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
            <Checkbox
              id="user-event-other"
              checked={formState.events.otherRecords}
              onCheckedChange={(c) => handleToggleEvent("otherRecords", Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label
                htmlFor="user-event-other"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                Organizations, Contacts, Notes &amp; Comments
              </Label>
              <p className="text-[11px] text-muted-foreground">
                When client profiles are updated or internal team comments are recorded.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Self-Action Delivery Preference */}
      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="notify-own-actions-toggle"
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              Notify on My Own Changes
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Send me an email copy when I edit records myself (leave off to only receive alerts
              when colleagues make changes).
            </p>
          </div>
          <Switch
            id="notify-own-actions-toggle"
            checked={formState.notifyOwnActions}
            onCheckedChange={(checked) => {
              setFormState((prev) => ({ ...prev, notifyOwnActions: checked }));
              setHasChanges(true);
            }}
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/70 bg-card shadow-2xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendTestEmail}
            disabled={isSendingTest || !formState.enabled}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            {isSendingTest ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5 text-muted-foreground" />
            )}
            <span>Send Test Email to Me</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="h-8 text-xs gap-1 text-muted-foreground cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>Reset Defaults</span>
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => saveMutation.mutate(formState)}
          disabled={saveMutation.isPending}
          className="h-8 text-xs gap-1.5 font-semibold cursor-pointer shadow-xs"
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          <span>Save Preferences</span>
        </Button>
      </div>
    </div>
  );
}
