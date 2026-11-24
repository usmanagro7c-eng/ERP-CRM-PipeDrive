import { useState, useEffect, useMemo, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Mail,
  Plus,
  Send,
  Trash2,
  Users,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Settings as SettingsIcon,
  ChevronDown,
  MoreVertical,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon,
  Laptop,
  Palette,
  User,
  Sparkles,
  Server,
  LogOut,
  Layers,
  Network,
  GitBranch,
  Eye,
  ExternalLink,
  Clock,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCrmUsers } from "@/hooks/use-dashboard";
import { sessionQueryOptions, logout, SESSION_QUERY_KEY } from "@/lib/auth-client";
import * as api from "@/lib/api";
import { HierarchyTreePicker } from "@/components/settings/hierarchy-tree-picker";
import { readStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function SettingsSection({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  badge,
  className,
  headerRight,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(!isMobile ? true : defaultOpen);
  }, [defaultOpen, isMobile]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cn("rounded-xl border border-border/70 bg-card shadow-2xs", className)}>
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex-1 min-w-0 text-left cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-primary shrink-0">{icon}</span>
                <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
                {badge}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground shrink-0 transition-transform sm:hidden ml-auto",
                    open && "rotate-180",
                  )}
                />
              </div>
              {description ? (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
              ) : null}
            </button>
          </CollapsibleTrigger>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
        <CollapsibleContent forceMount className="data-[state=closed]:hidden sm:!block">
          <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · AgroCRM" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: crmUsers = [], isLoading: isLoadingUsers } = useCrmUsers();

  const isSystemUser = Boolean(session?.isSystemUser);

  const [activeTab, setActiveTab] = useState<"appearance" | "notifications" | "account">(
    isSystemUser ? "notifications" : "appearance",
  );

  useEffect(() => {
    if (session && !session.isSystemUser && activeTab === "notifications") {
      setActiveTab("appearance");
    }
  }, [session, activeTab]);

  const [currentTheme, setCurrentTheme] = useState<Theme>("light");
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Server-backed notification settings & hierarchy tree (fetched ONLY for System Users)
  const {
    data: serverData,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["crm-notification-settings"],
    queryFn: api.getNotificationSettings,
    enabled: isSystemUser,
  });

  const [formState, setFormState] = useState<api.ServerNotificationSettings>({
    enabled: 1,
    mode: "All Ancestors",
    selected_nodes: [],
    include_actor: 0,
    extra_emails: "",
    app_base_url: typeof window !== "undefined" && window.location?.origin ? window.location.origin : "",
    deal_stage_change: 1,
    deal_updates: 1,
    leads: 1,
    tasks: 1,
    quotations: 1,
    sales_orders: 1,
    other_records: 1,
    delivery_mode: "instant",
    scheduled_time: "09:00",
    interval_minutes: 60,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [previewActor, setPreviewActor] = useState<string>("");

  useEffect(() => {
    if (serverData?.settings) {
      setFormState({
        ...serverData.settings,
        selected_nodes: Array.isArray(serverData.settings.selected_nodes)
          ? serverData.settings.selected_nodes
          : [],
        delivery_mode: serverData.settings.delivery_mode || "instant",
        scheduled_time: serverData.settings.scheduled_time || "09:00",
        interval_minutes: serverData.settings.interval_minutes ? Number(serverData.settings.interval_minutes) : 60,
      });
    }
  }, [serverData]);

  // Live Recipient Preview Query
  const effectivePreviewActor = previewActor || (session?.user ?? "");
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    isFetching: isFetchingPreview,
  } = useQuery({
    queryKey: [
      "preview-notification-recipients",
      formState.mode,
      formState.selected_nodes,
      formState.mode === "Selected Nodes" ? null : effectivePreviewActor,
      formState.include_actor,
      formState.extra_emails,
    ],
    queryFn: () =>
      api.previewNotificationRecipients({
        mode: formState.mode,
        selected_nodes: formState.selected_nodes,
        ...(formState.mode === "Selected Nodes" ? {} : { user: effectivePreviewActor }),
      }),
    enabled: Boolean(serverData),
    staleTime: 500,
  });

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<api.ServerNotificationSettings>) =>
      api.saveNotificationSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-notification-settings"] });
      setHasChanges(false);
      toast.success("Notification settings saved successfully!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      toast.error(msg);
    },
  });

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setCurrentTheme(stored);
    } else if (typeof document !== "undefined") {
      setCurrentTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
    try {
      setCompactMode(window.localStorage.getItem("agrocrm.compact_mode") === "true");
      setAnimationsEnabled(window.localStorage.getItem("agrocrm.animations") !== "false");
    } catch {}
  }, []);

  const handleThemeChange = (mode: Theme) => {
    setCurrentTheme(mode);
    setTheme(mode);
    toast.success(`Theme switched to ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`);
  };

  const handleToggleCompact = (checked: boolean) => {
    setCompactMode(checked);
    try {
      window.localStorage.setItem("agrocrm.compact_mode", String(checked));
    } catch {}
    toast.success(checked ? "Compact density enabled" : "Standard density enabled");
  };

  const handleToggleAnimations = (checked: boolean) => {
    setAnimationsEnabled(checked);
    try {
      window.localStorage.setItem("agrocrm.animations", String(checked));
    } catch {}
    toast.success(checked ? "Animations enabled" : "Reduced animations mode enabled");
  };

  const handleToggleMaster = (checked: boolean) => {
    setFormState((prev) => ({ ...prev, enabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleModeChange = (mode: "Direct Parent" | "All Ancestors" | "Selected Nodes") => {
    setFormState((prev) => ({ ...prev, mode }));
    setHasChanges(true);
  };

  const handleToggleEvent = (key: keyof api.ServerNotificationSettings, checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      [key]: checked ? 1 : 0,
    }));
    setHasChanges(true);
  };

  const applyPreset = (preset: "all" | "stageOnly" | "salesPipeline" | "none") => {
    setFormState((prev) => {
      switch (preset) {
        case "all":
          return {
            ...prev,
            deal_stage_change: 1,
            deal_updates: 1,
            quotations: 1,
            sales_orders: 1,
            leads: 1,
            tasks: 1,
            other_records: 1,
          };
        case "stageOnly":
          return {
            ...prev,
            deal_stage_change: 1,
            deal_updates: 0,
            quotations: 0,
            sales_orders: 0,
            leads: 0,
            tasks: 0,
            other_records: 0,
          };
        case "salesPipeline":
          return {
            ...prev,
            deal_stage_change: 1,
            deal_updates: 1,
            quotations: 1,
            sales_orders: 1,
            leads: 0,
            tasks: 0,
            other_records: 0,
          };
        case "none":
          return {
            ...prev,
            deal_stage_change: 0,
            deal_updates: 0,
            quotations: 0,
            sales_orders: 0,
            leads: 0,
            tasks: 0,
            other_records: 0,
          };
      }
    });
    setHasChanges(true);
    toast.success(`Preset applied: ${preset}`);
  };

  const handleSave = () => {
    saveMutation.mutate(formState);
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await api.sendTestNotification();
      if (res.count > 0) {
        toast.success(`Test email sent to ${res.count} recipient(s): ${res.recipients.join(", ")}`);
      } else {
        toast.info("Test notification triggered (no recipients resolved for your account).");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send test email";
      toast.error(msg);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const res = await api.processNotificationQueue();
      if (res.status === "instant_mode") {
        toast.info("Instant Mode is active — notifications are dispatched on-change without queueing.");
      } else if (res.dispatched > 0) {
        toast.success(`Queue processed: ${res.dispatched} pending notification(s) dispatched to Email Queue.`);
      } else if (res.status === "not_due") {
        toast.info("Queue checked: Scheduled time or interval has not arrived yet.");
      } else if (res.status === "empty_queue") {
        toast.info("Queue checked: No pending notifications waiting in queue.");
      } else {
        toast.info(`Queue checked: Status '${res.status}'.`);
      }
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to process notification queue";
      toast.error(msg);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    queryClient.clear();
    await navigate({ to: "/login" });
  };

  // Distinct actors available for preview
  const previewActorOptions = useMemo(() => {
    const list: Array<{ label: string; email: string }> = [];
    const seen = new Set<string>();

    if (serverData?.tree) {
      for (const node of serverData.tree) {
        if (node.email && !seen.has(node.email.toLowerCase())) {
          seen.add(node.email.toLowerCase());
          list.push({ label: `${node.label} (${node.email})`, email: node.email });
        }
      }
    }

    for (const u of crmUsers) {
      if (u.email && !seen.has(u.email.toLowerCase())) {
        seen.add(u.email.toLowerCase());
        list.push({ label: `${u.full_name || u.name} (${u.email})`, email: u.email });
      }
    }

    return list;
  }, [serverData?.tree, crmUsers]);
  const userName = session?.name || session?.user || "User";
  const userEmail = session?.user || (session as Record<string, unknown> | undefined)?.["email"] as string || "admin";

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b border-border/70 bg-card/40 px-3 py-4 sm:px-8 sm:py-5 backdrop-blur-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-w-4xl mx-auto">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <SettingsIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Settings</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Customize appearance, notifications, and account preferences.
              </p>
            </div>
          </div>
          {isSystemUser && activeTab === "notifications" && (
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestEmail}
                disabled={isSendingTest || !formState.enabled}
                className="h-9 sm:h-8 text-xs gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                {isSendingTest ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5 text-muted-foreground" />
                )}
                <span>Test Email</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-9 sm:h-8 text-xs gap-1.5 cursor-pointer shadow-xs w-full sm:w-auto font-semibold"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                <span>Save</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-3 sm:p-8 max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
        {isSystemUser && hasChanges && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="size-4 shrink-0" />
              <span className="leading-relaxed">Unsaved changes. Save to apply.</span>
            </div>
            <Button size="sm" onClick={handleSave} className="h-8 text-[11px] px-3 shrink-0">
              Save
            </Button>
          </div>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList
            className={cn(
              "grid w-full sm:max-w-md h-10 sm:h-9 bg-muted/50 p-1 rounded-lg",
              isSystemUser ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {isSystemUser && (
              <TabsTrigger value="notifications" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 cursor-pointer px-1">
                <Bell className="size-3.5 shrink-0" />
                <span className="truncate">Notifications</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="appearance" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 cursor-pointer px-1">
              <Palette className="size-3.5 shrink-0" />
              <span className="truncate">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 cursor-pointer px-1">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NOTIFICATIONS (System Users Only) */}
          {isSystemUser && (
            <TabsContent value="notifications" className="space-y-3 sm:space-y-4 mt-4">
            {isLoadingSettings ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center shadow-2xs space-y-3">
                <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">
                  Loading hierarchy notification settings...
                </p>
              </div>
            ) : settingsError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertCircle className="size-4" />
                  <span>Failed to load notification settings from CRM Backend</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settingsError instanceof Error ? settingsError.message : "Network error"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSettings()}
                  className="h-8 text-xs gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Retry</span>
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Bell className="size-4 text-primary shrink-0" />
                        <h2 className="text-sm font-semibold text-foreground">Hierarchy Email Notifications</h2>
                        <Badge variant={formState.enabled ? "default" : "secondary"} className="text-[10px] h-4 font-normal">
                          {formState.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Dispatch emails to hierarchy recipients on record changes.</p>
                    </div>
                    <Switch id="master-toggle" checked={Boolean(formState.enabled)} onCheckedChange={handleToggleMaster} />
                  </div>
                </div>

                <SettingsSection
                  title="Delivery Timing"
                  description="Choose instant, daily, or interval email dispatch."
                  icon={<Clock className="size-4" />}
                  defaultOpen
                  badge={
                    (formState.delivery_mode || "instant") === "instant" ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-normal"><Zap className="size-3" />Instant</Badge>
                    ) : formState.delivery_mode === "scheduled" ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-normal"><Clock className="size-3" />{formState.scheduled_time || "09:00"}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-normal"><Timer className="size-3" />{formatInterval(formState.interval_minutes || 60)}</Badge>
                    )
                  }
                >
                  <div className="space-y-4 pt-4">

                  <RadioGroup
                    value={formState.delivery_mode || "instant"}
                    onValueChange={(val) => {
                      setFormState((prev) => ({
                        ...prev,
                        delivery_mode: val as api.NotificationDeliveryMode,
                      }));
                      setHasChanges(true);
                    }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {/* Mode 1: Instant / Real-Time */}
                    <label
                      htmlFor="timing-instant"
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        (formState.delivery_mode || "instant") === "instant"
                          ? "border-emerald-500/70 bg-emerald-500/5 shadow-2xs"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Zap className="size-3.5 text-emerald-500" />
                            Instant (Real-Time)
                          </span>
                          <RadioGroupItem value="instant" id="timing-instant" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Email is dispatched immediately on any change. Every update or stage change triggers an instant email alert.
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Zero delay dispatch
                      </div>
                    </label>

                    {/* Mode 2: Daily Scheduled Time */}
                    <label
                      htmlFor="timing-scheduled"
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        formState.delivery_mode === "scheduled"
                          ? "border-blue-500/70 bg-blue-500/5 shadow-2xs"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Clock className="size-3.5 text-blue-500" />
                            Daily Scheduled Time
                          </span>
                          <RadioGroupItem value="scheduled" id="timing-scheduled" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Set the time at which all emails are sent. Pick a fixed daily time for the digest.
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        <span>Fixed daily window</span>
                      </div>
                    </label>

                    {/* Mode 3: Periodic Time Interval */}
                    <label
                      htmlFor="timing-interval"
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        formState.delivery_mode === "interval"
                          ? "border-amber-500/70 bg-amber-500/5 shadow-2xs"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Timer className="size-3.5 text-amber-500" />
                            Periodic Time Interval
                          </span>
                          <RadioGroupItem value="interval" id="timing-interval" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Set the interval after which emails are sent (e.g. every 1 or 2 hours).
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        <span>Batched periodic window</span>
                      </div>
                    </label>
                  </RadioGroup>

                  {/* Sub-config Panel based on selected mode */}
                  {formState.delivery_mode === "scheduled" && (
                    <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="scheduled-time" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Clock className="size-3.5 text-blue-500" />
                            Set Daily Delivery Time (HH:MM)
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            All accumulated updates will be bundled and emailed daily at this exact time.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            id="scheduled-time"
                            type="time"
                            value={formState.scheduled_time || "09:00"}
                            onChange={(e) => {
                              setFormState((prev) => ({ ...prev, scheduled_time: e.target.value }));
                              setHasChanges(true);
                            }}
                            className="w-32 h-8 text-xs font-mono bg-background"
                          />
                        </div>
                      </div>

                      {/* Quick time selection chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-blue-500/20">
                        <span className="text-[11px] text-muted-foreground mr-1">Quick Select:</span>
                        {[
                          { label: "08:00 AM (Morning)", value: "08:00" },
                          { label: "09:00 AM (Workday Start)", value: "09:00" },
                          { label: "01:00 PM (Midday)", value: "13:00" },
                          { label: "06:00 PM (EOD Wrap-up)", value: "18:00" },
                          { label: "09:00 PM (Night Digest)", value: "21:00" },
                        ].map((chip) => (
                          <Button
                            key={chip.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormState((prev) => ({ ...prev, scheduled_time: chip.value }));
                              setHasChanges(true);
                            }}
                            className={cn(
                              "h-6 text-[11px] px-2 py-0 border-border/80 bg-background cursor-pointer",
                              formState.scheduled_time === chip.value && "border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold",
                            )}
                          >
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {formState.delivery_mode === "interval" && (
                    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="interval-minutes" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Timer className="size-3.5 text-amber-500" />
                            Set Batch Interval Period
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Changes occurring within this duration will be batched into a summary and sent every elapsed cycle.
                          </p>
                        </div>
                        <Select
                          value={String(formState.interval_minutes || 60)}
                          onValueChange={(val) => {
                            setFormState((prev) => ({ ...prev, interval_minutes: Number(val) }));
                            setHasChanges(true);
                          }}
                        >
                          <SelectTrigger id="interval-minutes" className="w-48 h-8 text-xs bg-background cursor-pointer">
                            <SelectValue placeholder="Select interval..." />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="15">Every 15 Minutes</SelectItem>
                            <SelectItem value="30">Every 30 Minutes</SelectItem>
                            <SelectItem value="60">Every 1 Hour (Recommended)</SelectItem>
                            <SelectItem value="120">Every 2 Hours</SelectItem>
                            <SelectItem value="240">Every 4 Hours</SelectItem>
                            <SelectItem value="480">Every 8 Hours</SelectItem>
                            <SelectItem value="720">Every 12 Hours</SelectItem>
                            <SelectItem value="1440">Every 24 Hours (Daily)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quick Interval Selection Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-500/20">
                        <span className="text-[11px] text-muted-foreground mr-1">Quick Presets:</span>
                        {[
                          { label: "15 min", value: 15 },
                          { label: "30 min", value: 30 },
                          { label: "1 hour", value: 60 },
                          { label: "2 hours", value: 120 },
                          { label: "4 hours", value: 240 },
                          { label: "12 hours", value: 720 },
                        ].map((chip) => (
                          <Button
                            key={chip.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormState((prev) => ({ ...prev, interval_minutes: chip.value }));
                              setHasChanges(true);
                            }}
                            className={cn(
                              "h-6 text-[11px] px-2 py-0 border-border/80 bg-background cursor-pointer",
                              Number(formState.interval_minutes) === chip.value && "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold",
                            )}
                          >
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Queue:</span>
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {formState.delivery_mode === "scheduled"
                          ? `Daily ${formState.scheduled_time || "09:00"}`
                          : formState.delivery_mode === "interval"
                            ? `Every ${formatInterval(formState.interval_minutes || 60)}`
                            : "Instant"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                      <Button type="button" variant="outline" size="sm" onClick={handleProcessQueue} disabled={isProcessingQueue} className="h-9 sm:h-8 text-xs gap-1.5 w-full sm:w-auto">
                        {isProcessingQueue ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3 text-muted-foreground" />}
                        <span>Process Queue</span>
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={handleSendTestEmail} disabled={isSendingTest || !formState.enabled} className="h-9 sm:h-8 text-xs gap-1.5 w-full sm:w-auto">
                        {isSendingTest ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3 text-muted-foreground" />}
                        <span>Test Dispatch</span>
                      </Button>
                    </div>
                  </div>
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="Recipient Resolution"
                  description="Choose how recipients are resolved from CRM Sales Hierarchy."
                  icon={<Network className="size-4" />}
                  defaultOpen
                >
                  <div className="space-y-4 pt-4">

                  <RadioGroup
                    value={formState.mode}
                    onValueChange={(val) =>
                      handleModeChange(val as "Direct Parent" | "All Ancestors" | "Selected Nodes")
                    }
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {/* Mode 1: All Ancestors */}
                    <label
                      htmlFor="mode-all-ancestors"
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        formState.mode === "All Ancestors"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Layers className="size-3.5 text-primary" />
                            All Ancestors
                          </span>
                          <RadioGroupItem value="All Ancestors" id="mode-all-ancestors" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Alerts traverse upward through the entire hierarchy chain to all parent
                          leaders up to root.
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] mt-3 self-start font-normal border-primary/30 text-primary"
                      >
                        Default Recommendation
                      </Badge>
                    </label>

                    {/* Mode 2: Direct Parent */}
                    <label
                      htmlFor="mode-direct-parent"
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        formState.mode === "Direct Parent"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <GitBranch className="size-3.5 text-primary" />
                            Direct Parent Only
                          </span>
                          <RadioGroupItem value="Direct Parent" id="mode-direct-parent" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Alerts go strictly to the immediate manager / parent node of whoever
                          modified the record.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-3 self-start font-normal">
                        Single Step
                      </Badge>
                    </label>

                    {/* Mode 3: Selected Nodes */}
                    <label
                      htmlFor="mode-selected-nodes"
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-lg border cursor-pointer transition-all",
                        formState.mode === "Selected Nodes"
                          ? "border-primary bg-primary/5 shadow-2xs"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Users className="size-3.5 text-primary" />
                            Selected Nodes
                          </span>
                          <RadioGroupItem value="Selected Nodes" id="mode-selected-nodes" />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Alerts go only to explicitly ticked hierarchy nodes, regardless of who
                          modified the record.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-3 self-start font-normal">
                        Custom Team
                      </Badge>
                    </label>
                  </RadioGroup>
                  </div>
                </SettingsSection>

                {formState.mode === "Selected Nodes" && (
                  <SettingsSection
                    title="Selected Recipients"
                    description="Pick specific hierarchy nodes to receive alerts."
                    icon={<Users className="size-4" />}
                    defaultOpen
                  >
                    <div className="pt-4">
                      <HierarchyTreePicker
                        nodes={serverData?.tree || []}
                        selectedNodes={formState.selected_nodes || []}
                        onChange={(nodes) => {
                          setFormState((prev) => ({ ...prev, selected_nodes: nodes }));
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </SettingsSection>
                )}

                <SettingsSection
                  title="Recipient Preview"
                  description="Verify who receives notifications for the current configuration."
                  icon={<Eye className="size-4" />}
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-4">
                    {formState.mode !== "Selected Nodes" && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <Label htmlFor="preview-actor" className="text-xs text-muted-foreground shrink-0">Simulate Actor:</Label>
                        <Select value={effectivePreviewActor} onValueChange={(val) => setPreviewActor(val)}>
                          <SelectTrigger id="preview-actor" className="h-9 sm:h-8 text-xs w-full sm:w-auto sm:min-w-[220px]">
                            <SelectValue placeholder="Select user..." />
                          </SelectTrigger>
                          <SelectContent className="text-xs max-h-60">
                            {previewActorOptions.map((opt) => (
                              <SelectItem key={opt.email} value={opt.email}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-primary" />
                        Resolved Target Recipients
                        {isFetchingPreview && (
                          <Loader2 className="size-3 animate-spin text-muted-foreground ml-1" />
                        )}
                      </span>
                      <Badge variant="outline" className="text-[11px] h-5">
                        {previewData?.count ?? 0} recipient{previewData?.count === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    {isLoadingPreview ? (
                      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Resolving hierarchy nodes...</span>
                      </div>
                    ) : (previewData?.recipients?.length ?? 0) === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        {formState.mode === "Selected Nodes"
                          ? "No nodes selected. Tick nodes in the hierarchy tree above to receive emails."
                          : "No parent leader recipients resolved for this actor. Check if the actor is mapped in CRM Sales Hierarchy."}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {previewData?.recipients.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="text-xs px-2.5 py-1 bg-background border border-border/70 text-foreground font-mono flex items-center gap-1.5"
                          >
                            <Mail className="size-3 text-muted-foreground" />
                            <span>{email}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="Delivery & Links"
                  description="Configure actor copy, CCs, and AgroCRM base URL."
                  icon={<SlidersHorizontal className="size-4" />}
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-4">
                    {/* Include Actor Switch */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60 bg-muted/10">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="include-actor"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Include Actor in Email Delivery
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Also send a copy of the notification email to the person who created or
                          edited the record.
                        </p>
                      </div>
                      <Switch
                        id="include-actor"
                        checked={Boolean(formState.include_actor)}
                        onCheckedChange={(checked) => {
                          setFormState((prev) => ({ ...prev, include_actor: checked ? 1 : 0 }));
                          setHasChanges(true);
                        }}
                      />
                    </div>

                    {/* Extra Emails */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="extra-emails"
                        className="text-xs font-semibold text-foreground"
                      >
                        Additional Notification CCs (comma-separated)
                      </Label>
                      <Input
                        id="extra-emails"
                        placeholder="e.g. notifications@example.com, auditor@example.com"
                        value={formState.extra_emails || ""}
                        onChange={(e) => {
                          setFormState((prev) => ({ ...prev, extra_emails: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="h-8 text-xs bg-muted/20"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        These email addresses will always be copied on every alert regardless of
                        hierarchy resolution.
                      </p>
                    </div>

                    {/* Base URL */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="app-base-url"
                        className="text-xs font-semibold text-foreground"
                      >
                        AgroCRM Application Base URL
                      </Label>
                      <Input
                        id="app-base-url"
                        placeholder={typeof window !== "undefined" ? window.location.origin : "https://your-crm-domain.com"}
                        value={formState.app_base_url || ""}
                        onChange={(e) => {
                          setFormState((prev) => ({ ...prev, app_base_url: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="h-8 text-xs bg-muted/20 font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Used to construct the &quot;Open in AgroCRM&quot; action button link inside
                        email notifications.
                      </p>
                    </div>
                  </div>
                </SettingsSection>

                <SettingsSection
                  title="Event Triggers"
                  description="Select which events dispatch notifications."
                  icon={<ShieldCheck className="size-4" />}
                  defaultOpen={false}
                  headerRight={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
                          <SlidersHorizontal className="size-3 text-muted-foreground" />
                          <span className="hidden sm:inline">Presets</span>
                          <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 text-xs">
                        <DropdownMenuItem onClick={() => applyPreset("all")} className="cursor-pointer">Enable All Events</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset("stageOnly")} className="cursor-pointer">Deal Stage Changes Only</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset("salesPipeline")} className="cursor-pointer">Sales Pipeline (Deals &amp; Orders)</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => applyPreset("none")} className="cursor-pointer text-muted-foreground">Disable All Events</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                >
                  <div className="space-y-3 pt-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <Checkbox
                        id="event-stage"
                        checked={Boolean(formState.deal_stage_change)}
                        onCheckedChange={(c) => handleToggleEvent("deal_stage_change", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-stage"
                          className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-2"
                        >
                          <span>Deal Stage Changes</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          >
                            High Priority
                          </Badge>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Send highlighted email whenever a Deal changes stage (e.g. Won, Lost,
                          Negotiation).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="event-deals"
                        checked={Boolean(formState.deal_updates)}
                        onCheckedChange={(c) => handleToggleEvent("deal_updates", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-deals"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Deal Updates &amp; Products
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When a Deal is created, line items/products modified, or deal
                          value/revenue updated.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="event-quotations"
                        checked={Boolean(formState.quotations)}
                        onCheckedChange={(c) => handleToggleEvent("quotations", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-quotations"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Quotations Created &amp; Submitted
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When a Quotation is created from a Deal or submitted in ERP Backend.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="event-orders"
                        checked={Boolean(formState.sales_orders)}
                        onCheckedChange={(c) => handleToggleEvent("sales_orders", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-orders"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Sales Orders Created &amp; Submitted
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When a Sales Order is created from a Quotation/Deal or submitted.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="event-leads"
                        checked={Boolean(formState.leads)}
                        onCheckedChange={(c) => handleToggleEvent("leads", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-leads"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Leads Created &amp; Converted
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When a new lead arrives or is converted into an organization/deal.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="event-tasks"
                        checked={Boolean(formState.tasks)}
                        onCheckedChange={(c) => handleToggleEvent("tasks", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-tasks"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Tasks Created &amp; Assigned
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When follow-up tasks, calls, or to-dos are created or assigned.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                      <Checkbox
                        id="event-other"
                        checked={Boolean(formState.other_records)}
                        onCheckedChange={(c) => handleToggleEvent("other_records", Boolean(c))}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="event-other"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Organizations, Contacts, Tasks, Notes &amp; Comments
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          When customer contacts, organizations, notes, or tasks are modified or
                          comments added.
                        </p>
                      </div>
                    </div>
                  </div>
                </SettingsSection>
              </>
            )}
          </TabsContent>
          )}

          {/* TAB 2: APPEARANCE & DARK MODE */}
          <TabsContent value="appearance" className="space-y-3 sm:space-y-4 mt-4">
            {/* Theme Selector Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="size-4 text-primary" />
                  Color Theme (Dark Mode / Light Mode)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose how AgroCRM looks on your screen. Switch between light, dark, or
                  system-matching themes.
                </p>
              </div>

              {/* Theme Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Light Mode Card */}
                <div
                  onClick={() => handleThemeChange("light")}
                  className={cn(
                    "rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 bg-white text-slate-900 shadow-2xs",
                    currentTheme === "light"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Sun className="size-4" />
                    </div>
                    {currentTheme === "light" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Light Mode</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Clean daylight theme with crisp contrast and white backgrounds.
                    </div>
                  </div>
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => handleThemeChange("dark")}
                  className={cn(
                    "rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 bg-slate-950 text-slate-100 shadow-2xs",
                    currentTheme === "dark"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-slate-800 hover:border-slate-700",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Moon className="size-4" />
                    </div>
                    {currentTheme === "dark" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">Dark Mode</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Sleek dark theme that is gentle on your eyes in low-light settings.
                    </div>
                  </div>
                </div>

                {/* System Default Card */}
                <div
                  onClick={() => handleThemeChange("system")}
                  className={cn(
                    "rounded-xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 bg-card text-foreground shadow-2xs",
                    currentTheme === "system"
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-border/80",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                      <Laptop className="size-4" />
                    </div>
                    {currentTheme === "system" && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5 px-1.5">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold">System Default</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Syncs automatically with your computer or phone OS preference.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SettingsSection title="Display Preferences" description="Adjust density and visual feedback." icon={<Layers className="size-4" />} defaultOpen={false}>
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60">
                  <div className="space-y-0.5">
                    <Label htmlFor="compact-mode-toggle" className="text-xs font-semibold cursor-pointer">Compact Table Density</Label>
                    <p className="text-[11px] text-muted-foreground">Show more rows per screen in tables.</p>
                  </div>
                  <Checkbox id="compact-mode-toggle" checked={compactMode} onCheckedChange={(c) => handleToggleCompact(Boolean(c))} className="size-5" />
                </div>
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60">
                  <div className="space-y-0.5">
                    <Label htmlFor="anim-toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      <Sparkles className="size-3 text-amber-500" />
                      <span>Confetti & Animations</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Celebrate won deals with animations.</p>
                  </div>
                  <Checkbox id="anim-toggle" checked={animationsEnabled} onCheckedChange={(c) => handleToggleAnimations(Boolean(c))} className="size-5" />
                </div>
              </div>
            </SettingsSection>
          </TabsContent>

          {/* TAB 3: ACCOUNT & WORKSPACE */}
          <TabsContent value="account" className="space-y-3 sm:space-y-4 mt-4">
            <SettingsSection title="Account Profile" description="Your active session and user credentials." icon={<User className="size-4" />} defaultOpen>
              <div className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20 shrink-0">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{userName}</div>
                      <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">● Active Session</Badge>
                        <Badge variant="secondary" className="text-[10px] h-4">System User</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="h-9 sm:h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer w-full sm:w-auto">
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="System & Integration Status" description="Operational status of CRM and ERP integrations." icon={<Server className="size-4" />} defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">CRM Backend</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Operational</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Deals, leads, contacts, activities, and email dispatch.</p>
                </div>
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">ERP Backend</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Operational</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Quotations, sales orders, items, and company accounts.</p>
                </div>
              </div>
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
