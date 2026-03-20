import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTemplates } from "@/hooks/use-templates";
import { useApplications } from "@/hooks/use-applications";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Application } from "@shared/schema";
import {
  Clock,
  FileText,
  ToggleLeft,
  ToggleRight,
  Save,
  Loader2,
  Zap,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const LS_KEY = "followup_global_settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as { enabled: boolean; templateId: string; days: number };
  } catch {}
  return { enabled: false, templateId: "", days: 4 };
}

export default function FollowUp() {
  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplates();
  const { data: applications = [], isLoading: isLoadingApps } = useApplications({});
  const { toast } = useToast();

  const [settings, setSettings] = useState(loadSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Persist to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateAll = useMutation({
    mutationFn: async ({ templateId, days }: { templateId: string | null; days: number | null }) => {
      const activeApps = applications.filter(
        (a: Application) => a.status === "Applied" || a.status === "Opened" || a.status === "Follow-up Sent"
      );
      await Promise.all(
        activeApps.map((app: Application) =>
          apiRequest("PATCH", `/api/applications/${app.id}/followup`, { templateId, days })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    },
  });

  const handleSave = async () => {
    if (settings.enabled && !settings.templateId) {
      toast({ title: "Select a template", description: "Please choose a follow-up template first.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateAll.mutateAsync(
        settings.enabled
          ? { templateId: settings.templateId, days: settings.days }
          : { templateId: null, days: null }
      );
      toast({
        title: settings.enabled ? "Follow-ups scheduled!" : "Follow-ups disabled",
        description: settings.enabled
          ? `All active applications will receive a follow-up after ${settings.days} day${settings.days !== 1 ? "s" : ""}.`
          : "Follow-up emails have been cancelled for all active applications.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to apply settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const activeApps = applications.filter(
    (a: Application) => a.status === "Applied" || a.status === "Opened"
  );
  const scheduledApps = applications.filter(
    (a: Application) => !!(a as any).followUpTemplateId && !(a as any).followUpSentAt
  );
  const sentApps = applications.filter((a: Application) => a.status === "Follow-up Sent");

  const selectedTemplate = templates.find(t => t.id === settings.templateId);

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Follow-up Sequences</h1>
        <p className="text-muted-foreground mt-2">
          Configure a global follow-up email that automatically goes out to all active applications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 rounded-xl p-2.5"><Clock className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeApps.length}</p>
            <p className="text-xs text-muted-foreground">Active apps</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-amber-100 text-amber-600 rounded-xl p-2.5"><RefreshCw className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{scheduledApps.length}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-600 rounded-xl p-2.5"><CheckCircle2 className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{sentApps.length}</p>
            <p className="text-xs text-muted-foreground">Follow-ups sent</p>
          </div>
        </div>
      </div>

      {/* Global config card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-8">
        {/* Header with master toggle */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary rounded-xl p-2.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Global Follow-up</h2>
              <p className="text-xs text-muted-foreground">Applies to all active applications at once</p>
            </div>
          </div>

          {/* Big toggle */}
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            className="flex items-center gap-2 transition-colors"
          >
            {settings.enabled ? (
              <>
                <ToggleRight className="w-12 h-12 text-primary" />
                <span className="text-base font-bold text-primary">ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-12 h-12 text-muted-foreground" />
                <span className="text-base font-bold text-muted-foreground">OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Settings body */}
        <div className={`px-6 py-6 space-y-6 transition-opacity duration-200 ${!settings.enabled ? "opacity-40 pointer-events-none" : ""}`}>

          {/* Template selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Follow-up Email Template
            </label>
            <div className="relative">
              <select
                value={settings.templateId}
                onChange={e => setSettings(s => ({ ...s, templateId: e.target.value }))}
                className={`${inputClass} appearance-none cursor-pointer`}
                disabled={isLoadingTemplates || !settings.enabled}
              >
                <option value="">Select a template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.isDefault ? " ★ (default)" : ""}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">
                Subject preview: <span className="italic">{selectedTemplate.subject}</span>
              </p>
            )}
          </div>

          {/* Day slider */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Send after (days with no reply)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={14}
                value={settings.days}
                onChange={e => setSettings(s => ({ ...s, days: Number(e.target.value) }))}
                className="flex-1 accent-primary h-2"
                disabled={!settings.enabled}
              />
              <span className="text-lg font-bold text-primary w-20 text-center">
                {settings.days} day{settings.days !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              If the recipient hasn't replied after {settings.days} day{settings.days !== 1 ? "s" : ""}, a follow-up will be sent.
            </p>
          </div>
        </div>

        {/* Save / Apply button */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {settings.enabled
              ? `Will apply to ${activeApps.length} active application${activeApps.length !== 1 ? "s" : ""}.`
              : "Toggle on to schedule follow-up emails."}
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {settings.enabled ? "Apply to All Applications" : "Disable Follow-ups"}
          </button>
        </div>
      </div>

      {/* Scheduled list */}
      {scheduledApps.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-foreground text-sm">Scheduled Follow-ups</h3>
          </div>
          <div className="divide-y divide-border">
            {scheduledApps.map((app: Application) => {
              const due = (app as any).followUpDays
                ? new Date(new Date(app.sentAt).getTime() + (app as any).followUpDays * 86400000)
                : null;
              return (
                <div key={app.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{app.companyName}</p>
                    <p className="text-sm text-muted-foreground">{app.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-600">
                      {due ? `Due ${format(due, "MMM d, yyyy")}` : "Pending"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent {format(new Date(app.sentAt), "MMM d")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}
