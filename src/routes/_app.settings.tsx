import { useState, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · AgroCRM" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions());
  const { data: crmUsers = [], isLoading: isLoadingUsers } = useCrmUsers();

  const [activeTab, setActiveTab] = useState<"appearance" | "notifications" | "account">(
    "notifications",
  );
  const [currentTheme, setCurrentTheme] = useState<Theme>("light");
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Server-backed notification settings & hierarchy tree
  const {
    data: serverData,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["crm-notification-settings"],
    queryFn: api.getNotificationSettings,
  });

  const [formState, setFormState] = useState<api.ServerNotificationSettings>({
    enabled: 1,
    mode: "All Ancestors",
    selected_nodes: [],
    include_actor: 0,
    extra_emails: "",
    app_base_url: typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://pipedrive-crm.usman-agro7c.workers.dev",
    deal_stage_change: 1,
    deal_updates: 1,
    leads: 1,
    tasks: 1,
    quotations: 1,
    sales_orders: 1,
    other_records: 1,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewActor, setPreviewActor] = useState<string>("");

  useEffect(() => {
    if (serverData?.settings) {
      setFormState({
        ...serverData.settings,
        selected_nodes: Array.isArray(serverData.settings.selected_nodes)
          ? serverData.settings.selected_nodes
          : [],
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
      <div className="border-b border-border bg-card px-4 sm:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <SettingsIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize appearance, manage automated notifications, and review system
                configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "notifications" && (
              <Button
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
                <span>Send Test Email</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="h-8 text-xs gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              <span>Save Settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        {hasChanges && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>You have unsaved changes. Click &quot;Save Settings&quot; to apply.</span>
            </div>
            <Button size="sm" onClick={handleSave} className="h-6 text-[11px] px-2.5">
              Save Now
            </Button>
          </div>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 max-w-md h-9 bg-muted/60 p-1">
            <TabsTrigger value="notifications" className="text-xs gap-1.5 cursor-pointer">
              <Bell className="size-3.5" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs gap-1.5 cursor-pointer">
              <Palette className="size-3.5" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="text-xs gap-1.5 cursor-pointer">
              <User className="size-3.5" />
              <span>Account</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NOTIFICATIONS */}
          <TabsContent value="notifications" className="space-y-6 mt-4">
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
                  <span>Failed to load notification settings from Frappe CRM</span>
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
                {/* Master Toggle Card */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bell className="size-4 text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">
                          Hierarchy Email Notifications
                        </h2>
                        <Badge
                          variant={formState.enabled ? "default" : "secondary"}
                          className="text-[10px] h-4 font-normal"
                        >
                          {formState.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Automatically dispatch emails strictly to parent nodes in the CRM Sales
                        Hierarchy when records are created, updated, or stage-shifted.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="master-toggle"
                        checked={Boolean(formState.enabled)}
                        onCheckedChange={handleToggleMaster}
                      />
                    </div>
                  </div>
                </div>

                {/* Hierarchy Routing Mode Card */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Network className="size-4 text-primary" />
                      Recipient Resolution Mode
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how the CRM resolves recipients from the &quot;CRM Sales
                      Hierarchy&quot; tree.
                    </p>
                  </div>

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

                {/* Tree Picker (shown only when Selected Nodes is chosen) */}
                {formState.mode === "Selected Nodes" && (
                  <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                    <div className="border-b border-border/60 pb-3">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        Select Hierarchy Recipient Nodes
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tick the hierarchy branches and individuals who will receive automated alert
                        emails.
                      </p>
                    </div>

                    <HierarchyTreePicker
                      nodes={serverData?.tree || []}
                      selectedNodes={formState.selected_nodes || []}
                      onChange={(nodes) => {
                        setFormState((prev) => ({ ...prev, selected_nodes: nodes }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                )}

                {/* Live Recipient Preview Card */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Eye className="size-4 text-primary" />
                        Live Recipient Preview
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Test and verify which emails will be dispatched under the current
                        configuration.
                      </p>
                    </div>

                    {/* Actor selector for All Ancestors / Direct Parent */}
                    {formState.mode !== "Selected Nodes" && (
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Label
                          htmlFor="preview-actor"
                          className="text-xs text-muted-foreground shrink-0"
                        >
                          Simulate Actor:
                        </Label>
                        <Select
                          value={effectivePreviewActor}
                          onValueChange={(val) => setPreviewActor(val)}
                        >
                          <SelectTrigger id="preview-actor" className="h-8 text-xs min-w-[200px]">
                            <SelectValue placeholder="Select user..." />
                          </SelectTrigger>
                          <SelectContent className="text-xs max-h-60">
                            {previewActorOptions.map((opt) => (
                              <SelectItem key={opt.email} value={opt.email}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

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

                {/* Additional Delivery Options Card */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-primary" />
                      Delivery &amp; Link Settings
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure actor copies, fallback CC addresses, and application link domains.
                    </p>
                  </div>

                  <div className="space-y-4">
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
                        placeholder="e.g. notifications@agrovisions.pk, auditor@agrovisions.pk"
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
                        placeholder="https://pipedrive-crm.usman-agro7c.workers.dev"
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
                </div>

                {/* Event Triggers Card */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        Event Triggers
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select which system events automatically dispatch notifications.
                      </p>
                    </div>

                    {/* Event Presets Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
                        >
                          <SlidersHorizontal className="size-3 text-muted-foreground" />
                          <span>Event Presets</span>
                          <ChevronDown className="size-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 text-xs">
                        <DropdownMenuItem
                          onClick={() => applyPreset("all")}
                          className="cursor-pointer"
                        >
                          <span>Enable All Events</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => applyPreset("stageOnly")}
                          className="cursor-pointer"
                        >
                          <span>Deal Stage Changes Only</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => applyPreset("salesPipeline")}
                          className="cursor-pointer"
                        >
                          <span>Sales Pipeline (Deals &amp; Orders)</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => applyPreset("none")}
                          className="cursor-pointer text-muted-foreground"
                        >
                          <span>Disable All Events</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3 pt-1">
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
                          When a Quotation is created from a Deal or submitted in ERPNext.
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
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 2: APPEARANCE & DARK MODE */}
          <TabsContent value="appearance" className="space-y-6 mt-4">
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

            {/* Display & Density Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Display Preferences
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjust data density and visual feedback across tables and forms.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="compact-mode-toggle"
                      className="text-xs font-semibold cursor-pointer"
                    >
                      Compact Table Density
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Reduces vertical padding in tables to show more deals and quotations per
                      screen.
                    </p>
                  </div>
                  <Checkbox
                    id="compact-mode-toggle"
                    checked={compactMode}
                    onCheckedChange={(c) => handleToggleCompact(Boolean(c))}
                    className="size-5"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/60">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="anim-toggle"
                      className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="size-3 text-amber-500" />
                      <span>Confetti & Animations</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Play congratulatory animations when marking a deal as Won.
                    </p>
                  </div>
                  <Checkbox
                    id="anim-toggle"
                    checked={animationsEnabled}
                    onCheckedChange={(c) => handleToggleAnimations(Boolean(c))}
                    className="size-5"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: ACCOUNT & WORKSPACE */}
          <TabsContent value="account" className="space-y-6 mt-4">
            {/* User Profile Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Account Profile
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your current active session and system user credentials.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{userName}</div>
                    <div className="text-xs text-muted-foreground">{userEmail}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                      >
                        ● Active Session
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        System User
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer self-start sm:self-auto"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>

            {/* System & Architecture Status Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  System & Integration Status
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Operational status of CRM and ERPNext multi-backend integrations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Frappe CRM Backend
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                    >
                      Operational
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hosts Deals, Leads, Organizations, Contacts, Activities, and Communication Email
                    dispatcher.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">ERPNext Backend</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                    >
                      Operational
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hosts Quotations, Sales Orders, Item master catalog, and company accounts.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
