import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTemplates, useCreateTemplate, useDeleteTemplate, useUpdateTemplate } from "@/hooks/use-templates";
import { Modal } from "@/components/ui/Modal";
import { Template } from "@shared/schema";
import { Plus, Trash2, FileText, Loader2, Star, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TemplateForm = { name: string; subject: string; content: string };
const emptyForm: TemplateForm = { name: "", subject: "", content: "" };

const inputClass = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";

function TemplateFormFields({
  form,
  setForm,
}: {
  form: TemplateForm;
  setForm: (f: TemplateForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Template Name</label>
        <input
          required
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Standard Cold Outreach"
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email Subject</label>
        <input
          required
          value={form.subject}
          onChange={e => setForm({ ...form, subject: e.target.value })}
          placeholder="e.g. Exploring opportunities at {{companyName}}"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">Supports: {"{{companyName}}"}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email Body</label>
        <textarea
          required
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          placeholder="Hi Team, I'm reaching out about..."
          rows={10}
          className={`${inputClass} resize-none font-sans`}
        />
        <p className="text-xs text-muted-foreground">
          Variables: {"{{companyName}}"}, {"{{myName}}"}, {"{{myRole}}"}, {"{{customMessage}}"}
        </p>
      </div>
    </div>
  );
}

export default function Templates() {
  const { data: templates = [], isLoading } = useTemplates();
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const { mutate: deleteTemplate } = useDeleteTemplate();
  const { toast } = useToast();

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/templates/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Success", description: "Default template updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to set default template.", variant: "destructive" });
    },
  });

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<TemplateForm>(emptyForm);

  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [editForm, setEditForm] = useState<TemplateForm>(emptyForm);

  const openEdit = (t: Template) => {
    setEditTarget(t);
    setEditForm({ name: t.name, subject: t.subject, content: t.content });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate(createForm, {
      onSuccess: () => {
        setCreateModal(false);
        setCreateForm(emptyForm);
      },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    updateTemplate({ id: editTarget.id, data: editForm }, {
      onSuccess: () => setEditTarget(null),
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
          <p className="text-muted-foreground mt-2">Manage your outreach content. Mark one as default to auto-select it in new outreach.</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 w-full md:w-auto"
        >
          <Plus className="w-5 h-5" /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-card rounded-2xl p-6 shadow-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col group relative">
              {template.isDefault && (
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg z-10" title="Default template">
                  <Star className="w-4 h-4 fill-current" />
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                  <button
                    onClick={() => openEdit(template)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Edit Template"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-1">{template.name}</h3>
              <p className="text-sm font-medium text-muted-foreground mb-4 line-clamp-1">Subj: {template.subject}</p>

              <div className="flex-1 bg-muted rounded-xl p-4 text-sm text-muted-foreground line-clamp-4 relative overflow-hidden mb-4">
                {template.content.replace(/<[^>]+>/g, " ")}
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none" />
              </div>

              <div className="pt-3 border-t border-border">
                {!template.isDefault ? (
                  <button
                    onClick={() => setDefaultMutation.mutate(template.id)}
                    disabled={setDefaultMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5 py-2 rounded-lg transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Set as Default
                  </button>
                ) : (
                  <span className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary py-2">
                    <Star className="w-3.5 h-3.5 fill-primary" />
                    Default Template
                  </span>
                )}
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No templates found</h3>
              <p className="text-muted-foreground mt-1">Create your first template to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create New Template">
        <form onSubmit={handleCreate} className="space-y-4">
          <TemplateFormFields form={createForm} setForm={setCreateForm} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setCreateModal(false)}
              className="px-4 py-2.5 font-medium text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-2.5 font-semibold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:transform-none transition-all flex items-center gap-2"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Template"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Template">
        <form onSubmit={handleEdit} className="space-y-4">
          <TemplateFormFields form={editForm} setForm={setEditForm} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="px-4 py-2.5 font-medium text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2.5 font-semibold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:transform-none transition-all flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
