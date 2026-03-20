import { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApplications } from "@/hooks/use-applications";
import { Application } from "@shared/schema";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { ExternalLink, TrendingUp, Mail, Eye, MessageSquare, Briefcase, Trophy, AlertCircle, Clock, Send, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLOR: Record<string, string> = {
  Applied: "#6366f1",
  Opened: "#06b6d4",
  "Follow-up Sent": "#f97316",
  Replied: "#a855f7",
  Interview: "#f59e0b",
  Offer: "#10b981",
  Rejected: "#ef4444",
  "No Response": "#94a3b8",
};

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "All time", days: 0 },
];

function Metric({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function pct(num: number, denom: number) {
  if (!denom) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}

export default function Analytics() {
  const { data: allApps = [], isLoading } = useApplications({});
  const [rangeDays, setRangeDays] = useState(14);

  // Filter apps by range
  const apps: Application[] = useMemo(() => {
    if (!rangeDays) return allApps;
    const cutoff = subDays(new Date(), rangeDays);
    return allApps.filter(a => isAfter(new Date(a.sentAt), cutoff));
  }, [allApps, rangeDays]);

  // ─── Funnel data ────────────────────────────────────────────────────────────
  const total = apps.length;
  const opened = apps.filter(a => ["Opened", "Replied", "Interview", "Offer", "Follow-up Sent"].includes(a.status)).length;
  const replied = apps.filter(a => ["Replied", "Interview", "Offer"].includes(a.status)).length;
  const interview = apps.filter(a => ["Interview", "Offer"].includes(a.status)).length;
  const offer = apps.filter(a => a.status === "Offer").length;

  const funnelSteps = [
    { label: "Sent", value: total, pct: "100%", color: "#6366f1", bg: "bg-indigo-100 text-indigo-600" },
    { label: "Opened", value: opened, pct: pct(opened, total), color: "#06b6d4", bg: "bg-cyan-100 text-cyan-600" },
    { label: "Replied", value: replied, pct: pct(replied, total), color: "#a855f7", bg: "bg-purple-100 text-purple-600" },
    { label: "Interview", value: interview, pct: pct(interview, total), color: "#f59e0b", bg: "bg-amber-100 text-amber-600" },
    { label: "Offer 🎉", value: offer, pct: pct(offer, total), color: "#10b981", bg: "bg-emerald-100 text-emerald-600" },
  ];

  // ─── Day-wise chart ─────────────────────────────────────────────────────────
  const days = rangeDays || 30;
  const dailyData = useMemo(() => {
    return Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const day = startOfDay(subDays(new Date(), Math.min(days, 30) - 1 - i));
      const dayApps = allApps.filter(a =>
        startOfDay(new Date(a.sentAt)).getTime() === day.getTime()
      );
      return {
        date: format(day, "MMM d"),
        Sent: dayApps.length,
        Opened: dayApps.filter(a => ["Opened", "Replied", "Interview", "Offer"].includes(a.status)).length,
        "Replied": dayApps.filter(a => ["Replied", "Interview", "Offer"].includes(a.status)).length,
        "Follow-up": dayApps.filter(a => a.status === "Follow-up Sent").length,
      };
    });
  }, [allApps, days]);

  // ─── Status distribution pie ─────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    apps.forEach(a => { map[a.status] = (map[a.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [apps]);

  // ─── Activity feed — recent apps sorted newest first ──────────────────────
  const recentApps = useMemo(() =>
    [...apps].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).slice(0, 20),
    [apps]
  );

  // ─── Best day to send (by weekday reply rate) ─────────────────────────────
  const weekdayStats = useMemo(() => {
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const stats = DAYS.map(d => ({ day: d, sent: 0, replied: 0 }));
    allApps.forEach(a => {
      const wd = new Date(a.sentAt).getDay();
      stats[wd].sent++;
      if (["Replied", "Interview", "Offer"].includes(a.status)) stats[wd].replied++;
    });
    return stats.map(s => ({ ...s, rate: s.sent ? (s.replied / s.sent) * 100 : 0 }));
  }, [allApps]);

  const statusActivityMap: Record<string, { icon: React.ElementType; color: string; badge: string }> = {
    Applied:       { icon: Send, color: "text-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
    Opened:        { icon: Eye, color: "text-cyan-500", badge: "bg-cyan-100 text-cyan-700" },
    "Follow-up Sent": { icon: Clock, color: "text-orange-500", badge: "bg-orange-100 text-orange-700" },
    Replied:       { icon: MessageSquare, color: "text-purple-500", badge: "bg-purple-100 text-purple-700" },
    Interview:     { icon: Briefcase, color: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
    Offer:         { icon: Trophy, color: "text-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
    Rejected:      { icon: AlertCircle, color: "text-red-500", badge: "bg-red-100 text-red-700" },
    "No Response": { icon: Mail, color: "text-slate-400", badge: "bg-slate-100 text-slate-600" },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-xl shadow-xl px-4 py-3 text-sm">
        <p className="font-semibold mb-2 text-foreground">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-bold text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your outreach performance at a glance.</p>
        </div>
        {/* Range toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {RANGE_OPTIONS.map(r => (
            <button
              key={r.label}
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                rangeDays === r.days
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Metric Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric icon={Send} label="Total Sent" value={total} sub={`${rangeDays || "All"} days`} color="bg-indigo-100 text-indigo-600" />
        <Metric icon={Eye} label="Open Rate" value={pct(opened, total)} sub={`${opened} opened`} color="bg-cyan-100 text-cyan-600" />
        <Metric icon={MessageSquare} label="Reply Rate" value={pct(replied, total)} sub={`${replied} replied`} color="bg-purple-100 text-purple-600" />
        <Metric icon={Briefcase} label="Interview Rate" value={pct(interview, total)} sub={`${interview} interviews`} color="bg-amber-100 text-amber-600" />
      </div>

      {/* ─── Funnel ────────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Conversion Funnel
        </h2>
        <div className="flex items-end gap-2 flex-wrap">
          {funnelSteps.map((step, i) => {
            const widthPct = total ? Math.max((step.value / total) * 100, step.value > 0 ? 5 : 0) : 0;
            return (
              <div key={step.label} className="flex-1 min-w-[60px]">
                {/* Bar */}
                <div className="relative h-40 flex items-end">
                  <div
                    className="w-full rounded-t-xl transition-all duration-700"
                    style={{
                      height: `${Math.max(widthPct, step.value > 0 ? 8 : 0)}%`,
                      background: step.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
                {/* Label */}
                <div className="mt-2 text-center">
                  <p className="text-xl font-bold text-foreground">{step.value}</p>
                  <p className="text-xs text-muted-foreground">{step.label}</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${step.bg}`}>
                    {step.pct}
                  </span>
                </div>

                {/* Arrow between steps */}
                {i < funnelSteps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 text-muted-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Day-wise Area Chart + Pie side by side ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Daily Activity</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {[
                  { id: "Sent", color: "#6366f1" },
                  { id: "Opened", color: "#06b6d4" },
                  { id: "Replied", color: "#a855f7" },
                  { id: "Follow-up", color: "#f97316" },
                ].map(({ id, color }) => (
                  <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Sent" stroke="#6366f1" fill="url(#grad-Sent)" strokeWidth={2} />
              <Area type="monotone" dataKey="Opened" stroke="#06b6d4" fill="url(#grad-Opened)" strokeWidth={2} />
              <Area type="monotone" dataKey="Replied" stroke="#a855f7" fill="url(#grad-Replied)" strokeWidth={2} />
              <Area type="monotone" dataKey="Follow-up" stroke="#f97316" fill="url(#grad-Follow-up)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {[["Sent","#6366f1"],["Opened","#06b6d4"],["Replied","#a855f7"],["Follow-up","#f97316"]].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color as string }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Status Pie */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Status Breakdown</h2>
          {statusCounts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusCounts.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLOR[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusCounts.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[s.name] || "#94a3b8" }} />
                      {s.name}
                    </span>
                    <span className="font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Best Day to Send ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-4">Best Day to Send (Reply Rate by Weekday)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekdayStats} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, "Reply Rate"]}
              content={<CustomTooltip />}
            />
            <Bar dataKey="rate" name="Reply Rate %" fill="#a855f7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Activity Feed ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Recent Applications</h2>
          <span className="text-xs text-muted-foreground">Click email to open in Gmail</span>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
        ) : recentApps.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No applications found for this period.</div>
        ) : (
          <div className="divide-y divide-border">
            {recentApps.map(app => {
              const meta = statusActivityMap[app.status] ?? statusActivityMap["No Response"];
              const Icon = meta.icon;
              return (
                <div key={app.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-muted/30 transition-colors group">
                  <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{app.companyName}</p>
                    <a
                      href={`https://mail.google.com/mail/u/0/#search/to:${app.email}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 opacity-80 group-hover:opacity-100"
                    >
                      {app.email} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${meta.badge}`}>
                    {app.status}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                    {format(new Date(app.sentAt), "MMM d, yyyy")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
