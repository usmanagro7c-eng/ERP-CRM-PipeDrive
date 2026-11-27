import { useState, useEffect, useMemo, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Mail,
  Send,
  Users,
  AlertCircle,
  Loader2,
  Settings as SettingsIcon,
  ChevronDown,
  RotateCcw,
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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useCrmUsers } from "@/hooks/use-dashboard";
import { sessionQueryOptions, logout, SESSION_QUERY_KEY } from "@/lib/auth-client";
import * as api from "@/lib/api";
import { HierarchyTreePicker } from "@/components/settings/hierarchy-tree-picker";
import { UserNotificationSettingsPanel } from "@/components/settings/user-notification-settings-panel";
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
    "notifications",
  );
  const [adminNotificationView, setAdminNotificationView] = useState<"personal" | "system">("personal");

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
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [previewActor, setPreviewActor] = useState<string>("");

  useEffect(() => {
    if (serverData?.settings) {
      setFormState({
        enabled: serverData.settings.enabled,
        mode: serverData.settings.mode || "All Ancestors",
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
          {isSystemUser && activeTab === "notifications" && adminNotificationView === "system" && (
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
        {isSystemUser && activeTab === "notifications" && adminNotificationView === "system" && hasChanges && (
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
            className="grid w-full sm:max-w-md h-10 sm:h-9 bg-muted/50 p-1 rounded-lg grid-cols-3"
          >
            <TabsTrigger value="notifications" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 cursor-pointer px-1">
              <Bell className="size-3.5 shrink-0" />
              <span className="truncate">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 cursor-pointer px-1">
              <Palette className="size-3.5 shrink-0" />
              <span className="truncate">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 cursor-pointer px-1">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NOTIFICATIONS (Accessible to All Users) */}
          <TabsContent value="notifications" className="space-y-3 sm:space-y-4 mt-4">
            {/* Admin Segmented Sub-Navigation */}
            {isSystemUser && (
              <div className="flex items-center p-1 bg-muted/60 rounded-xl w-full sm:w-fit border border-border/70 mb-3 gap-1">
                <button
                  type="button"
                  onClick={() => setAdminNotificationView("personal")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex-1 sm:flex-initial justify-center",
                    adminNotificationView === "personal"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <User className="size-3.5" />
                  <span>My Preferences</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminNotificationView("system")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex-1 sm:flex-initial justify-center",
                    adminNotificationView === "system"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Network className="size-3.5 text-primary" />
                  <span>System Hierarchy Dispatch (Admin)</span>
                </button>
              </div>
            )}

            {(!isSystemUser || adminNotificationView === "personal") ? (
              <UserNotificationSettingsPanel userEmail={userEmail} userName={userName} />
            ) : isLoadingSettings ? (
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
              </>
            )}
          </TabsContent>

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
