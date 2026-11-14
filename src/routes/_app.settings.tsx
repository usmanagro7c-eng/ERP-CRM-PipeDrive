import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  getNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
  type NotificationEvents,
} from "@/lib/notification-settings";
import { sendTestNotification } from "@/lib/change-notifications";
import {
  readStoredTheme,
  setTheme,
  type Theme,
} from "@/lib/theme";
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

  const [activeTab, setActiveTab] = useState<"appearance" | "notifications" | "account">("notifications");
  const [currentTheme, setCurrentTheme] = useState<Theme>("light");
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [newEmail, setNewEmail] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(getNotificationSettings());
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
    setSettings((prev) => ({ ...prev, enabled: checked }));
    setHasChanges(true);
  };

  const handleToggleEvent = (key: keyof NotificationEvents, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: checked,
      },
    }));
    setHasChanges(true);
  };

  const applyPreset = (preset: "all" | "stageOnly" | "salesPipeline" | "none") => {
    setSettings((prev) => {
      let events: NotificationEvents;
      switch (preset) {
        case "all":
          events = {
            dealStageChange: true,
            dealUpdates: true,
            quotations: true,
            salesOrders: true,
            leads: true,
            otherRecords: true,
          };
          toast.success("Enabled all notification events");
          break;
        case "stageOnly":
          events = {
            dealStageChange: true,
            dealUpdates: false,
            quotations: false,
            salesOrders: false,
            leads: false,
            otherRecords: false,
          };
          toast.success("Set preset: Deal Stage Changes Only");
          break;
        case "salesPipeline":
          events = {
            dealStageChange: true,
            dealUpdates: true,
            quotations: true,
            salesOrders: true,
            leads: false,
            otherRecords: false,
          };
          toast.success("Set preset: Sales Pipeline Events");
          break;
        case "none":
          events = {
            dealStageChange: false,
            dealUpdates: false,
            quotations: false,
            salesOrders: false,
            leads: false,
            otherRecords: false,
          };
          toast.info("Disabled all notification events");
          break;
      }
      return { ...prev, events };
    });
    setHasChanges(true);
  };

  const handleToggleUserEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setSettings((prev) => {
      const exists = prev.recipients.map((r) => r.toLowerCase()).includes(trimmed);
      const updated = exists
        ? prev.recipients.filter((r) => r.toLowerCase() !== trimmed)
        : [...prev.recipients, trimmed];
      return { ...prev, recipients: updated };
    });
    setHasChanges(true);
  };

  const handleSelectAllUsers = () => {
    const allUserEmails = crmUsers
      .map((u) => u.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e && e.includes("@")));
    setSettings((prev) => {
      const merged = Array.from(new Set([...prev.recipients, ...allUserEmails]));
      return { ...prev, recipients: merged };
    });
    setHasChanges(true);
    toast.success("Added all active CRM users to recipients");
  };

  const handleDeselectAllUsers = () => {
    const allUserEmails = new Set(
      crmUsers
        .map((u) => u.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e && e.includes("@"))),
    );
    setSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => !allUserEmails.has(r.toLowerCase())),
    }));
    setHasChanges(true);
    toast.info("Deselected all system CRM users");
  };

  const handleAddCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (settings.recipients.map((r) => r.toLowerCase()).includes(trimmed)) {
      toast.info("This email is already in the recipient list");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      recipients: [...prev.recipients, trimmed],
    }));
    setNewEmail("");
    setHasChanges(true);
    toast.success(`Added ${trimmed} to recipients`);
  };

  const handleRemoveRecipient = (email: string) => {
    setSettings((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r.toLowerCase() !== email.toLowerCase()),
    }));
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    setHasChanges(true);
    toast.info("Notification settings reset to defaults");
  };

  const handleClearAllRecipients = () => {
    setSettings((prev) => ({ ...prev, recipients: [] }));
    setHasChanges(true);
    toast.info("Cleared all notification recipients");
  };

  const handleSave = () => {
    saveNotificationSettings(settings);
    setHasChanges(false);
    toast.success("Settings saved successfully!");
  };

  const handleSendTestEmail = async () => {
    if (settings.recipients.length === 0) {
      toast.error("Please add at least one recipient email before sending a test");
      return;
    }
    setIsSendingTest(true);
    try {
      await sendTestNotification(settings.recipients);
      toast.success(`Test email dispatched to ${settings.recipients.join(", ")}`);
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

  // Selected system users count
  const selectedCrmUsersCount = useMemo(() => {
    const recipientSet = new Set(settings.recipients.map((r) => r.toLowerCase()));
    return crmUsers.filter((u) => u.email && recipientSet.has(u.email.toLowerCase())).length;
  }, [crmUsers, settings.recipients]);

  const filteredCrmUsers = useMemo(() => {
    if (!userSearch.trim()) return crmUsers;
    const term = userSearch.toLowerCase();
    return crmUsers.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.name && u.name.toLowerCase().includes(term)),
    );
  }, [crmUsers, userSearch]);

  const userName = session?.name || session?.user || "User";
  const userEmail = session?.user || "admin@agrovisions.pk";

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
                Customize appearance, manage automated notifications, and review system configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "notifications" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestEmail}
                disabled={isSendingTest || settings.recipients.length === 0}
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
              className="h-8 text-xs gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer shadow-xs"
            >
              <Check className="size-3.5" />
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
            {/* Master Toggle Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Automated Change Notifications
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically dispatch an email notification to configured recipients whenever a deal,
                    quotation, sales order, or lead is created, updated, or moved between stages.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="master-toggle"
                    checked={settings.enabled}
                    onCheckedChange={handleToggleMaster}
                    className="size-5"
                  />
                  <Label htmlFor="master-toggle" className="text-xs font-semibold cursor-pointer">
                    {settings.enabled ? "Active" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Recipients Configuration Card */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    Notification Recipients
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure the recipient email addresses that receive real-time notifications on updates and stage changes.
                  </p>
                </div>

                {/* Quick Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <MoreVertical className="size-3.5 text-muted-foreground" />
                      <span>Options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 text-xs">
                    <DropdownMenuItem onClick={handleSelectAllUsers} className="cursor-pointer">
                      <Users className="size-3.5 mr-2 text-primary" />
                      <span>Select All CRM Users</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDeselectAllUsers} className="cursor-pointer">
                      <RotateCcw className="size-3.5 mr-2 text-muted-foreground" />
                      <span>Deselect All CRM Users</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleResetToDefaults} className="cursor-pointer">
                      <RotateCcw className="size-3.5 mr-2" />
                      <span>Reset to Defaults</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleClearAllRecipients}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-3.5 mr-2" />
                      <span>Clear All Recipients</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Active Recipients Chips */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground block mb-2">
                  Active Recipients ({settings.recipients.length})
                </Label>
                {settings.recipients.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-lg border border-dashed">
                    No recipients configured yet. Select system users or add custom email addresses below.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {settings.recipients.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-muted/80 text-foreground border border-border/60"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(email)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer ml-1"
                          title="Remove recipient"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Controls Bar: System Users Dropdown & Custom Email Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
                {/* System Users Multi-Select Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoadingUsers || crmUsers.length === 0}
                      className="h-8 text-xs gap-2 justify-between min-w-[210px] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Users className="size-3.5 text-primary shrink-0" />
                        <span>
                          {isLoadingUsers
                            ? "Loading users..."
                            : `System Users (${selectedCrmUsersCount}/${crmUsers.length})`}
                        </span>
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs font-semibold flex items-center justify-between">
                      <span>Select System CRM Users</span>
                      <Badge variant="outline" className="text-[10px] h-4 font-normal">
                        {selectedCrmUsersCount} selected
                      </Badge>
                    </DropdownMenuLabel>
                    <div className="p-2 border-b border-border/50">
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="h-7 text-xs bg-muted/30"
                      />
                    </div>
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] border-b border-border/40 bg-muted/20">
                      <button
                        type="button"
                        onClick={handleSelectAllUsers}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllUsers}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                    <div className="py-1">
                      {filteredCrmUsers.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center italic">
                          No users match your search.
                        </div>
                      ) : (
                        filteredCrmUsers.map((user) => {
                          const userEmail = (user.email || "").trim().toLowerCase();
                          if (!userEmail) return null;
                          const isChecked = settings.recipients
                            .map((r) => r.toLowerCase())
                            .includes(userEmail);

                          return (
                            <DropdownMenuCheckboxItem
                              key={user.name}
                              checked={isChecked}
                              onCheckedChange={() => handleToggleUserEmail(userEmail)}
                              className="cursor-pointer text-xs py-2"
                            >
                              <div className="flex flex-col min-w-0 ml-1">
                                <span className="font-medium text-foreground truncate">
                                  {user.full_name || user.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {userEmail}
                                </span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          );
                        })
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add Custom Email Field */}
                <form onSubmit={handleAddCustomEmail} className="flex gap-2 flex-1 items-center">
                  <Input
                    type="email"
                    placeholder="Add custom email (e.g. manager@agrovisions.pk)..."
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-8 text-xs bg-muted/30 flex-1 min-w-[200px]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={!newEmail.trim()}
                    className="h-8 text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="size-3.5" />
                    <span>Add</span>
                  </Button>
                </form>
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
                    <DropdownMenuItem onClick={() => applyPreset("all")} className="cursor-pointer">
                      <span>Enable All Events</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyPreset("stageOnly")} className="cursor-pointer">
                      <span>Deal Stage Changes Only</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => applyPreset("salesPipeline")} className="cursor-pointer">
                      <span>Sales Pipeline (Deals & Orders)</span>
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
                    checked={settings.events.dealStageChange}
                    onCheckedChange={(c) => handleToggleEvent("dealStageChange", Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="event-stage"
                      className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-2"
                    >
                      <span>Deal Stage Changes</span>
                      <Badge variant="outline" className="text-[10px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        High Priority
                      </Badge>
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Send highlighted email with banner whenever a Deal changes stage (e.g. Won, Lost, Negotiation).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                  <Checkbox
                    id="event-deals"
                    checked={settings.events.dealUpdates}
                    onCheckedChange={(c) => handleToggleEvent("dealUpdates", Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="event-deals" className="text-xs font-semibold text-foreground cursor-pointer">
                      Deal Updates & Products
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When a Deal is created, line items/products modified, or deal value/revenue updated.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                  <Checkbox
                    id="event-quotations"
                    checked={settings.events.quotations}
                    onCheckedChange={(c) => handleToggleEvent("quotations", Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="event-quotations" className="text-xs font-semibold text-foreground cursor-pointer">
                      Quotations Created & Submitted
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When a Quotation is created from a Deal or submitted in ERPNext.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                  <Checkbox
                    id="event-orders"
                    checked={settings.events.salesOrders}
                    onCheckedChange={(c) => handleToggleEvent("salesOrders", Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="event-orders" className="text-xs font-semibold text-foreground cursor-pointer">
                      Sales Orders Created & Submitted
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When a Sales Order is created from a Quotation/Deal or submitted.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                  <Checkbox
                    id="event-leads"
                    checked={settings.events.leads}
                    onCheckedChange={(c) => handleToggleEvent("leads", Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="event-leads" className="text-xs font-semibold text-foreground cursor-pointer">
                      Leads Created & Converted
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When a new lead arrives or is converted into an organization/deal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg border border-border/60">
                  <Checkbox
                    id="event-other"
                    checked={settings.events.otherRecords}
                    onCheckedChange={(c) => handleToggleEvent("otherRecords", Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="event-other" className="text-xs font-semibold text-foreground cursor-pointer">
                      Organizations, Contacts, Tasks, Notes & Comments
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When customer contacts, organizations, notes, or tasks are modified or comments added.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                  Choose how AgroCRM looks on your screen. Switch between light, dark, or system-matching themes.
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
                    <Label htmlFor="compact-mode-toggle" className="text-xs font-semibold cursor-pointer">
                      Compact Table Density
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Reduces vertical padding in tables to show more deals and quotations per screen.
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
                    <Label htmlFor="anim-toggle" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
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
                      <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
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
                    <span className="text-xs font-semibold text-foreground">Frappe CRM Backend</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                      Operational
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hosts Deals, Leads, Organizations, Contacts, Activities, and Communication Email dispatcher.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">ERPNext Backend</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
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
