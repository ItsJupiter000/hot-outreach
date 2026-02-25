import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTemplates, useCreateTemplate, useDeleteTemplate } from "@/hooks/use-templates";
import { Modal } from "@/components/ui/Modal";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";

export default function Templates() {
  const { data: templates = [], isLoading } = useTemplates();
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", content: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate(form, {
      onSuccess: () => {
        setCreateModal(false);
        setForm({ name: "", subject: "", content: "" });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplate(id);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground mt-2">Manage your outreach content and variables.</p>
        </div>
        <button 
          onClick={() => setCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 w-full md:w-auto"
        >
          <Plus className="w-5 h-5" /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-card rounded-2xl p-6 shadow-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col group">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => handleDelete(template.id)}
                  disabled={isDeleting}
                  className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{template.name}</h3>
              <p className="text-sm font-medium text-slate-500 mb-4 line-clamp-1">Subj: {template.subject}</p>
              
              <div className="flex-1 bg-slate-50 rounded-xl p-4 text-sm text-slate-600 line-clamp-4 relative overflow-hidden">
                {template.content}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
              </div>
            </div>
          ))}

          {templates.length === 0 && (
             <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
               <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
               <h3 className="text-lg font-semibold text-slate-700">No templates found</h3>
               <p className="text-slate-500 mt-1">Create your first template to get started.</p>
             </div>
          )}
        </div>
      )}

      <Modal 
        isOpen={createModal} 
        onClose={() => setCreateModal(false)}
        title="Create New Template"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Template Name</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Standard Cold Outreach"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email Subject</label>
            <input
              required
              value={form.subject}
              onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g. Inquiry regarding Software Engineer role at {{companyName}}"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <p className="text-xs text-slate-500">Supports: {'{{companyName}}'}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email Body</label>
            <textarea
              required
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Hi Team, I'm reaching out..."
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none font-sans"
            />
            <p className="text-xs text-slate-500">
              Available variables: {'{{companyName}}'}, {'{{myName}}'}, {'{{myRole}}'}, {'{{customMessage}}'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 font-semibold bg-primary text-white rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:transform-none transition-all flex items-center gap-2"
            >
              {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Template"}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
