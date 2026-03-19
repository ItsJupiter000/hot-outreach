import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTemplates } from "@/hooks/use-templates";
import { useSendEmail } from "@/hooks/use-email";
import { useQuery } from "@tanstack/react-query";
import { Document } from "@shared/schema";
import { Send, Loader2, Sparkles, Building2, User, Mail, PenTool, FileText, FileUp, Star } from "lucide-react";

export default function Dashboard() {
  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplates();
  const { mutate: sendEmail, isPending } = useSendEmail();

  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Only resumes for the dropdown
  const resumes = useMemo(() => documents.filter(d => d.type === "Resume"), [documents]);
  const defaultResume = useMemo(() => resumes.find(d => d.isDefault), [resumes]);
  const defaultTemplate = useMemo(() => templates.find(t => t.isDefault), [templates]);

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    templateId: "",
    resumeId: "",
    customMessage: "",
  });

  // Auto-select defaults once they load
  useEffect(() => {
    if (defaultTemplate && !form.templateId) {
      setForm(prev => ({ ...prev, templateId: defaultTemplate.id }));
    }
  }, [defaultTemplate]);

  useEffect(() => {
    if (defaultResume && !form.resumeId) {
      setForm(prev => ({ ...prev, resumeId: defaultResume.id }));
    }
  }, [defaultResume]);

  const selectedTemplate = useMemo(() =>
    templates.find(t => t.id === form.templateId),
  [templates, form.templateId]);

  const selectedResume = useMemo(() =>
    resumes.find(r => r.id === form.resumeId),
  [resumes, form.resumeId]);

  const previewContent = useMemo(() => {
    if (!selectedTemplate) return "";
    let content = selectedTemplate.content;
    content = content.replace(/\{\{companyName\}\}/g, form.companyName || "[Company Name]");
    content = content.replace(/\{\{customMessage\}\}/g, form.customMessage || "[Your custom message will appear here if provided]");
    content = content.replace(/\{\{myName\}\}/g, "[Your Name]");
    content = content.replace(/\{\{myRole\}\}/g, "[Your Role]");
    return content;
  }, [selectedTemplate, form.companyName, form.customMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.email || !form.templateId) return;

    sendEmail(
      { ...form, resumeId: form.resumeId || undefined },
      {
        onSuccess: () => {
          setForm(prev => ({
            ...prev,
            companyName: "",
            email: "",
            customMessage: "",
          }));
        },
      }
    );
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all";
  const labelClass = "text-sm font-medium flex items-center gap-2 text-foreground/80";

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">New Outreach</h1>
          <p className="text-muted-foreground mt-2">Compose and send personalized job application emails.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        {/* Form */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-5 md:p-6 shadow-card border border-border/50 space-y-5">

            {/* Company */}
            <div className="space-y-2">
              <label className={labelClass}>
                <Building2 className="w-4 h-4 text-primary" /> Company Name
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className={labelClass}>
                <User className="w-4 h-4 text-primary" /> Recipient Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="recruiter@acme.com"
                className={inputClass}
              />
            </div>

            {/* Template Dropdown */}
            <div className="space-y-2">
              <label className={labelClass}>
                <FileText className="w-4 h-4 text-primary" /> Email Template
              </label>
              <div className="relative">
                <select
                  required
                  value={form.templateId}
                  onChange={e => setForm(prev => ({ ...prev, templateId: e.target.value }))}
                  className={`${inputClass} appearance-none cursor-pointer`}
                  disabled={isLoadingTemplates}
                >
                  <option value="" disabled>
                    {isLoadingTemplates ? "Loading templates..." : "Select a template..."}
                  </option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.isDefault ? " ★ (default)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              {selectedTemplate?.isDefault && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary" /> Default template auto-selected
                </p>
              )}
            </div>

            {/* Resume Dropdown */}
            <div className="space-y-2">
              <label className={labelClass}>
                <FileUp className="w-4 h-4 text-primary" /> Resume to Attach
              </label>
              <div className="relative">
                <select
                  value={form.resumeId}
                  onChange={e => setForm(prev => ({ ...prev, resumeId: e.target.value }))}
                  className={`${inputClass} appearance-none cursor-pointer`}
                  disabled={isLoadingDocuments}
                >
                  <option value="">
                    {isLoadingDocuments
                      ? "Loading resumes..."
                      : resumes.length === 0
                      ? "No resumes uploaded yet"
                      : "None (no attachment)"}
                  </option>
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.isDefault ? " ★ (default)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              {selectedResume?.isDefault && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <Star className="w-3 h-3 fill-primary" /> Default resume auto-selected
                </p>
              )}
              {resumes.length === 0 && !isLoadingDocuments && (
                <p className="text-xs text-muted-foreground">
                  Upload a resume in the <a href="/documents" className="text-primary underline">Documents</a> section.
                </p>
              )}
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <label className={labelClass}>
                <PenTool className="w-4 h-4 text-primary" /> Custom Message <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={form.customMessage}
                onChange={e => setForm(prev => ({ ...prev, customMessage: e.target.value }))}
                placeholder="Add a personal touch to this specific application..."
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isPending || !form.templateId}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Outreach Email
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-7">
          <div className="sticky top-8 bg-card rounded-2xl border border-border shadow-card overflow-hidden flex flex-col h-[600px]">
            {/* macOS window chrome */}
            <div className="bg-muted border-b border-border px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-auto text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Live Preview
              </div>
            </div>

            {/* Email headers */}
            <div className="px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-4 text-sm mb-2">
                <span className="text-muted-foreground w-16">To:</span>
                <span className="text-foreground font-medium">{form.email || "recruiter@company.com"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm mb-2">
                <span className="text-muted-foreground w-16">Subject:</span>
                <span className="text-foreground font-medium">
                  {selectedTemplate
                    ? selectedTemplate.subject.replace(/\{\{companyName\}\}/g, form.companyName || "[Company Name]")
                    : "Select a template"}
                </span>
              </div>
              {selectedResume && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground w-16">Attach:</span>
                  <span className="text-foreground text-xs flex items-center gap-1">
                    <FileUp className="w-3 h-3 text-primary" /> {selectedResume.name}
                  </span>
                </div>
              )}
            </div>

            {/* Email body */}
            <div className="flex-1 p-6 bg-card overflow-y-auto prose prose-slate dark:prose-invert prose-sm max-w-none">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : selectedTemplate ? (
                <div
                  className="whitespace-pre-wrap text-foreground leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                  <Mail className="w-12 h-12 text-muted" />
                  <p>Your email preview will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
