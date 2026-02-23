import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useTemplates } from "@/hooks/use-templates";
import { useSendEmail } from "@/hooks/use-email";
import { Send, Loader2, Sparkles, Building2, User, Mail, PenTool, FileText } from "lucide-react";

export default function Dashboard() {
  const { data: templates = [], isLoading: isLoadingTemplates } = useTemplates();
  const { mutate: sendEmail, isPending } = useSendEmail();

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    templateId: "",
    customMessage: "",
  });

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === form.templateId), 
  [templates, form.templateId]);

  const previewContent = useMemo(() => {
    if (!selectedTemplate) return "Select a template to view the preview.";
    
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
    
    sendEmail(form, {
      onSuccess: () => {
        setForm({ companyName: "", email: "", templateId: "", customMessage: "" });
      }
    });
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">New Outreach</h1>
        <p className="text-muted-foreground mt-2">Compose and send personalized job application emails.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-card border border-border/50 space-y-5">
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
                <Building2 className="w-4 h-4 text-primary" /> Company Name
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={e => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-primary" /> Recipient Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="recruiter@acme.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
                <FileText className="w-4 h-4 text-primary" /> Template
              </label>
              <div className="relative">
                <select
                  required
                  value={form.templateId}
                  onChange={e => setForm(prev => ({ ...prev, templateId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
                <PenTool className="w-4 h-4 text-primary" /> Custom Message (Optional)
              </label>
              <textarea
                value={form.customMessage}
                onChange={e => setForm(prev => ({ ...prev, customMessage: e.target.value }))}
                placeholder="Add a personal touch to this specific application..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending || !form.templateId}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

        {/* Live Preview Section */}
        <div className="lg:col-span-7">
          <div className="sticky top-8 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* macOS window header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-auto text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Live Preview
              </div>
            </div>
            
            {/* Email Metadata */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-4 text-sm mb-2">
                <span className="text-slate-400 w-12">To:</span>
                <span className="text-slate-900 font-medium">{form.email || "recruiter@company.com"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400 w-12">Subj:</span>
                <span className="text-slate-900 font-medium">
                  {selectedTemplate 
                    ? selectedTemplate.subject.replace(/\{\{companyName\}\}/g, form.companyName || "[Company Name]") 
                    : "Select a template"}
                </span>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 p-6 bg-white overflow-y-auto prose prose-slate prose-sm max-w-none">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : selectedTemplate ? (
                <div 
                  className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <Mail className="w-12 h-12 text-slate-200" />
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
