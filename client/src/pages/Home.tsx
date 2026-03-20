import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useApplications } from "@/hooks/use-applications";
import { Application } from "@shared/schema";
import { format, isToday } from "date-fns";
import {
  Send,
  Eye,
  MessageSquare,
  Clock,
  Activity,
  ExternalLink,
  LayoutDashboard,
  FileText,
  Files,
  BarChart2,
  ListTodo
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: applications = [] } = useApplications({});

  // --- Today's Analysis ---
  const todayApps = useMemo(() => {
    const sentToday: Application[] = [];
    const openedToday: Application[] = [];
    const repliedToday: Application[] = [];
    const followupToday: Application[] = [];
    const uniqueTodayIds = new Set<string>();
    const todayActivityList: { app: Application; action: string; time: Date; icon: any; color: string }[] = [];

    applications.forEach(app => {
      let activityAdded = false;

      // Check Sent
      if (isToday(new Date(app.sentAt))) {
        sentToday.push(app);
        todayActivityList.push({ app, action: "Sent outreach", time: new Date(app.sentAt), icon: Send, color: "text-indigo-500" });
        uniqueTodayIds.add(app.id);
        activityAdded = true;
      }

      // Check Follow-up
      if (app.followUpSentAt && isToday(new Date(app.followUpSentAt))) {
        followupToday.push(app);
        todayActivityList.push({ app, action: "Sent follow-up", time: new Date(app.followUpSentAt), icon: Clock, color: "text-orange-500" });
        uniqueTodayIds.add(app.id);
      }

      // Check History
      if (app.history) {
        app.history.forEach(h => {
          if (isToday(new Date(h.date))) {
            if (h.status === "Opened") {
              openedToday.push(app);
              todayActivityList.push({ app, action: "Email opened", time: new Date(h.date), icon: Eye, color: "text-cyan-500" });
              uniqueTodayIds.add(app.id);
            }
            if (h.status === "Replied") {
              repliedToday.push(app);
              todayActivityList.push({ app, action: "Received reply", time: new Date(h.date), icon: MessageSquare, color: "text-purple-500" });
              uniqueTodayIds.add(app.id);
            }
          }
        });
      }

      // Fallback if updated today but not caught by above (e.g., offer/interview)
      if (!activityAdded && isToday(new Date(app.updatedAt)) && !uniqueTodayIds.has(app.id)) {
        todayActivityList.push({ app, action: `Status changed to ${app.status}`, time: new Date(app.updatedAt), icon: Activity, color: "text-emerald-500" });
        uniqueTodayIds.add(app.id);
      }
    });

    todayActivityList.sort((a, b) => b.time.getTime() - a.time.getTime());

    return { sentToday, openedToday, repliedToday, followupToday, todayActivityList };
  }, [applications]);

  const [showToday, setShowToday] = useState(true);

  // Quick Action Cards
  const navCards = [
    {
      title: "New Outreach",
      description: "Compose and send personalized job application emails.",
      icon: Send,
      href: "/new",
      color: "bg-indigo-100 text-indigo-600 border-indigo-200",
      iconColor: "text-indigo-600"
    },
    {
      title: "Applications",
      description: "View and manage all your sent applications and statuses.",
      icon: LayoutDashboard,
      href: "/applications",
      color: "bg-blue-100 text-blue-600 border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      title: "Analytics",
      description: "Track your funnel conversions and metrics over time.",
      icon: BarChart2,
      href: "/analytics",
      color: "bg-emerald-100 text-emerald-600 border-emerald-200",
      iconColor: "text-emerald-600"
    },
    {
      title: "Follow-ups",
      description: "Configure automated emails to bump inactive threads.",
      icon: Clock,
      href: "/followup",
      color: "bg-orange-100 text-orange-600 border-orange-200",
      iconColor: "text-orange-600"
    },
    {
      title: "Templates",
      description: "Manage your reusable email templates and variables.",
      icon: FileText,
      href: "/templates",
      color: "bg-purple-100 text-purple-600 border-purple-200",
      iconColor: "text-purple-600"
    },
    {
      title: "Documents",
      description: "Upload resumes and default attachments.",
      icon: Files,
      href: "/documents",
      color: "bg-cyan-100 text-cyan-600 border-cyan-200",
      iconColor: "text-cyan-600"
    }
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Welcome to Hot Outreach</h1>
        <p className="text-muted-foreground mt-2">Your personal CRM for automated job applications.</p>
      </div>

      {/* Quick Access Grid */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {navCards.map((card) => (
          <div
            key={card.title}
            onClick={() => setLocation(card.href)}
            className="group relative bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 transform translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Send className="w-4 h-4 ml-0.5" />
              </div>
            </div>
            
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${card.color}`}>
              <card.icon className={`w-6 h-6 ${card.iconColor}`} />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-1">{card.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* Today's Summary Section */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Today's Activity</h2>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none" onClick={() => setShowToday(!showToday)}>
          <div className="flex flex-wrap gap-4 md:gap-8 flex-1">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 text-indigo-600 rounded-xl p-2.5"><Send className="w-5 h-5" /></div>
              <div>
                <p className="text-lg font-bold leading-none">{todayApps.sentToday.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Sent Today</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="bg-cyan-100 text-cyan-600 rounded-xl p-2.5"><Eye className="w-5 h-5" /></div>
              <div>
                <p className="text-lg font-bold leading-none">{todayApps.openedToday.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Opened Today</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 text-purple-600 rounded-xl p-2.5"><MessageSquare className="w-5 h-5" /></div>
              <div>
                <p className="text-lg font-bold leading-none">{todayApps.repliedToday.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Replies Today</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 text-orange-600 rounded-xl p-2.5"><Clock className="w-5 h-5" /></div>
              <div>
                <p className="text-lg font-bold leading-none">{todayApps.followupToday.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Follow-ups Today</p>
              </div>
            </div>
          </div>
          <button className="text-xs font-semibold text-primary px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors whitespace-nowrap self-start md:self-auto">
            {showToday ? "Hide Details" : "View Details"}
          </button>
        </div>

        {/* Expandable Feed */}
        {showToday && (
          <div className="mt-6 pt-5 border-t border-border/50 animate-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold mb-4 text-foreground/80 flex items-center justify-between">
              <span>Detailed Timeline</span>
              <span className="text-xs font-normal text-muted-foreground">Ordered strictly by time</span>
            </h3>
            
            {todayApps.todayActivityList.length === 0 ? (
              <div className="text-center py-8">
                <ListTodo className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No activity yet today</p>
                <p className="text-xs text-muted-foreground mt-1">Time to send out some new applications!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2 pb-2">
                {todayApps.todayActivityList.map((act, i) => (
                  <div key={i} className="flex items-center gap-3 bg-background border border-border shadow-sm rounded-xl p-3 hover:border-primary/40 hover:shadow-md transition-all group">
                    <act.icon className={`w-5 h-5 shrink-0 ${act.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{act.app.companyName}</p>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">{act.action}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold text-muted-foreground/80">{format(act.time, "h:mm a")}</p>
                      <a
                        href={`https://mail.google.com/mail/u/0/#search/to:${act.app.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-0.5 mt-0.5 hover:underline"
                      >
                        Email <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
