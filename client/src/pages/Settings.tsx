import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTheme } from "@/components/theme-provider";
import { BellRing, Clock, Save, Trash2, ShieldCheck, MailSearch, CalendarClock, MousePointer2, Loader2, Sun, Moon, Monitor, RefreshCcw, Sparkles, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { settings, isLoading: isLoadingSettings, updateSettings, isUpdating, syncFeature, isSyncing } = useSettings();
  
  // Local Settings State
  const [enableNotifications, setEnableNotifications] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    const savedNotifs = localStorage.getItem("hot_outreach_notifications");
    if (savedNotifs) setEnableNotifications(savedNotifs === "true");
  }, []);

  const handleSave = () => {
    localStorage.setItem("hot_outreach_notifications", enableNotifications.toString());
    
    toast({
      title: "Tactical Preferences Updated",
      description: "Local display parameters have been recalibrated.",
    });
  };

  const handleClearCache = () => {
    if (confirm("Are you sure you want to clear your local preferences cache? This will not delete your applications from the database.")) {
      localStorage.removeItem("hot_outreach_notifications");
      toast({
        title: "Matrix Reset",
        description: "Local application preferences have been purged.",
        variant: "destructive"
      });
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-display font-black text-foreground tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground mt-2 font-medium italic">Fine-tune your outreach engine for maximum efficiency.</p>
        </motion.div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8 pb-32 max-w-4xl"
      >
        {/* Appearance Settings */}
        <motion.div variants={item} className="bg-card rounded-[2.5rem] border border-border/60 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="font-black text-sm uppercase tracking-widest text-foreground">Visual Interface</h2>
          </div>
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Atmosphere</p>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Select your preferred tactical overlay.</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                {[
                  { id: 'light', icon: Sun, label: 'Solar' },
                  { id: 'dark', icon: Moon, label: 'Lunar' },
                  { id: 'system', icon: Monitor, label: 'Auto' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === t.id ? 'bg-white dark:bg-slate-800 text-primary shadow-xl shadow-slate-200 dark:shadow-none scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <t.icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Management */}
        <motion.div variants={item} className="bg-card rounded-[2.5rem] border border-border/60 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Sliders className="w-5 h-5" />
              </div>
              <h2 className="font-black text-sm uppercase tracking-widest text-foreground">Core Subsystems</h2>
            </div>
            {(isUpdating || isSyncing) && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          </div>
          <div className="p-8 space-y-10">
            {/* Follow-ups */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                    <CalendarClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Sequence Automation</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest leading-relaxed max-w-sm">Automatically deploy follow-up payloads based on timing parameters.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => syncFeature("followUps")}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all border border-primary/10 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Force Sync
                  </button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.followUpsEnabled ?? true}
                      disabled={isLoadingSettings}
                      onChange={(e) => updateSettings({ followUpsEnabled: e.target.checked })}
                    />
                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
              </div>
              <div className="sm:pl-16 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interval Window:</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800 shadow-inner focus-within:border-primary transition-colors">
                    <input 
                      type="number"
                      value={settings?.followUpIntervalMinutes ?? 60}
                      onChange={(e) => updateSettings({ followUpIntervalMinutes: parseInt(e.target.value) || 1 })}
                      className="w-12 bg-transparent text-center text-xs font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="ml-2 text-[9px] text-slate-400 uppercase font-black tracking-tighter">Minutes</span>
                  </div>
                </div>
                {settings?.lastFollowUpAt && (
                  <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Last Engagement: {new Date(settings.lastFollowUpAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800/50" />

            {/* Scheduled Sending */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/50">
                    <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Tactical Queue</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest leading-relaxed max-w-sm">Buffer outbound operations for precision timing.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => syncFeature("scheduling")}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all border border-primary/10 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Force Sync
                  </button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.schedulingEnabled ?? true}
                      disabled={isLoadingSettings}
                      onChange={(e) => updateSettings({ schedulingEnabled: e.target.checked })}
                    />
                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
              </div>
              <div className="sm:pl-16 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Flush Interval:</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800 shadow-inner focus-within:border-primary transition-colors">
                    <input 
                      type="number"
                      value={settings?.schedulingIntervalMinutes ?? 360}
                      onChange={(e) => updateSettings({ schedulingIntervalMinutes: parseInt(e.target.value) || 1 })}
                      className="w-12 bg-transparent text-center text-xs font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="ml-2 text-[9px] text-slate-400 uppercase font-black tracking-tighter">Minutes</span>
                  </div>
                </div>
                {settings?.lastSchedulingAt && (
                  <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Last Flush: {new Date(settings.lastSchedulingAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800/50" />

            {/* Reply Polling */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                    <MailSearch className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Inbox Recon</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest leading-relaxed max-w-sm">Real-time IMAP polling for incoming intelligence and signals.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => syncFeature("replyPolling")}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all border border-primary/10 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> Force Sync
                  </button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings?.replyPollingEnabled ?? true}
                      disabled={isLoadingSettings}
                      onChange={(e) => updateSettings({ replyPollingEnabled: e.target.checked })}
                    />
                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
              </div>
              <div className="sm:pl-16 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Polling Frequency:</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-800 shadow-inner focus-within:border-primary transition-colors">
                    <input 
                      type="number"
                      value={settings?.replyPollingIntervalMinutes ?? 5}
                      onChange={(e) => updateSettings({ replyPollingIntervalMinutes: parseInt(e.target.value) || 1 })}
                      className="w-12 bg-transparent text-center text-xs font-black text-slate-900 dark:text-white focus:outline-none"
                    />
                    <span className="ml-2 text-[9px] text-slate-400 uppercase font-black tracking-tighter">Minutes</span>
                  </div>
                </div>
                {settings?.lastReplyPollingAt && (
                  <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Last Extraction: {new Date(settings.lastReplyPollingAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Custom Application Defaults */}
        <motion.div variants={item} className="bg-card rounded-[2.5rem] border border-border/60 overflow-hidden shadow-sm">
           <div className="px-8 py-6 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <BellRing className="w-5 h-5" />
            </div>
            <h2 className="font-black text-sm uppercase tracking-widest text-foreground">Operational Feedback</h2>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Status Feedbacks</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest leading-relaxed max-w-sm">Dispatch tactical overlays for real-time mission updates.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={enableNotifications}
                  onChange={() => setEnableNotifications(!enableNotifications)}
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>
          </div>
          
          <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-border/60 flex justify-end">
            <button 
              onClick={handleSave}
              className="group flex items-center gap-3 px-8 py-3.5 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:-translate-y-1 active:translate-y-0"
            >
              <Save className="w-4 h-4" /> Save Tactics
            </button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={item} className="bg-card rounded-[2.5rem] border border-red-100 dark:border-red-900/20 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/10">
            <h2 className="font-black text-sm uppercase tracking-widest text-red-600 dark:text-red-400">Restricted Protocols</h2>
          </div>
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="font-black text-red-600 dark:text-red-400 uppercase tracking-tight">Flush Interface Cache</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest leading-relaxed max-w-sm">Reset the tactical matrix to factory parameters. Operational data remains intact.</p>
              </div>
              <button 
                onClick={handleClearCache}
                className="flex items-center justify-center gap-3 px-6 py-3 border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" /> Initiate Purge
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
