import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApplications, useUpdateApplication } from "@/hooks/use-applications";
import { Application, ApplicationStatus } from "@shared/schema";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { Search, Filter, Loader2, Edit3, Save, Trash2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const statusColors: Record<ApplicationStatus, string> = {
  "Applied": "bg-blue-100 text-blue-700 border-blue-200",
  "Replied": "bg-purple-100 text-purple-700 border-purple-200",
  "Interview": "bg-amber-100 text-amber-700 border-amber-200",
  "Rejected": "bg-red-100 text-red-700 border-red-200",
  "Offer": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "No Response": "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Applications() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();
  
  const { data: applications = [], isLoading } = useApplications({ search, status: statusFilter });
  const { mutate: updateApp } = useUpdateApplication();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ title: "Deleted", description: "Application removed from history" });
    },
  });

  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; app: Application | null }>({ isOpen: false, app: null });
  const [editingNotes, setEditingNotes] = useState("");

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    updateApp({ id, updates: { status: newStatus } });
  };

  const openNotes = (app: Application) => {
    setEditingNotes(app.notes || "");
    setNotesModal({ isOpen: true, app });
  };

  const saveNotes = () => {
    if (notesModal.app) {
      updateApp({ id: notesModal.app.id, updates: { notes: editingNotes } });
      setNotesModal({ isOpen: false, app: null });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this application record?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Applications Tracking</h1>
          <p className="text-muted-foreground mt-2">Monitor and update your job outreach history.</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search companies..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full md:w-64 transition-all"
            />
          </div>
          
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none transition-all"
            >
              <option value="">All Statuses</option>
              {Object.keys(statusColors).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        {/* Mobile-friendly list view (hidden on desktop) */}
        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : applications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No applications found matching your criteria.
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{app.companyName}</h3>
                    <p className="text-sm text-slate-500">{app.email}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(app.id)}
                    className="p-2 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-slate-400">{format(new Date(app.sentAt), "MMM d, yyyy")}</span>
                  <div className="relative inline-block">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                      className={cn(
                        "appearance-none pl-3 pr-7 py-1 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none transition-all",
                        statusColors[app.status as ApplicationStatus] || statusColors["Applied"]
                      )}
                    >
                      {Object.keys(statusColors).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => openNotes(app)}
                  className="w-full text-center py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg border border-slate-100"
                >
                  View/Edit Notes
                </button>
              </div>
            ))
          )}
        </div>

        {/* Desktop-friendly table view (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border text-sm font-semibold text-slate-500">
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Sent Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No applications found matching your criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{app.companyName}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{app.email}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {format(new Date(app.sentAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className={cn(
                            "appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                            statusColors[app.status as ApplicationStatus] || statusColors["Applied"]
                          )}
                        >
                          {Object.keys(statusColors).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openNotes(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Notes
                      </button>
                      <button 
                        onClick={() => handleDelete(app.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={notesModal.isOpen} 
        onClose={() => setNotesModal({ isOpen: false, app: null })}
        title={`Notes: ${notesModal.app?.companyName}`}
        description="Update internal notes for this application."
      >
        <div className="space-y-4">
          <textarea
            value={editingNotes}
            onChange={(e) => setEditingNotes(e.target.value)}
            placeholder="E.g. Met recruiter at a job fair, follow up next Tuesday..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setNotesModal({ isOpen: false, app: null })}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveNotes}
              className="px-5 py-2 font-semibold bg-primary text-white rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Notes
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
