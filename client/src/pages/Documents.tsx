import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, DocumentType } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FileUp, Trash2, CheckCircle2, FileText, Files } from "lucide-react";
import { format } from "date-fns";

export default function Documents() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("Resume");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Success", description: "Document uploaded successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Deleted", description: "Document removed" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/documents/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Success", description: "Default document updated" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", docType);
    formData.append("name", file.name);

    try {
      await uploadMutation.mutateAsync(formData);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to upload document" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Documents Management</h1>
          <p className="text-muted-foreground mt-2">Upload and manage your resumes, cover letters, and portfolios.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
          <select 
            value={docType}
            onChange={e => setDocType(e.target.value as DocumentType)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all w-full"
          >
            <option value="Resume">Resume</option>
            <option value="Cover Letter">Cover Letter</option>
            <option value="Portfolio">Portfolio</option>
            <option value="Other">Other</option>
          </select>
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            <span>Upload</span>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Files className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400">No documents uploaded yet. Upload your first resume above!</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-card rounded-2xl border border-border/50 p-5 shadow-card hover:shadow-lg transition-all group relative">
              {doc.isDefault && (
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-10">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className="bg-slate-100 p-3 rounded-xl text-slate-400 group-hover:text-primary transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate mb-1">{doc.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-600 uppercase">{doc.type}</span>
                    <span>•</span>
                    <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                {!doc.isDefault ? (
                  <button 
                    onClick={() => setDefaultMutation.mutate(doc.id)}
                    className="flex-1 text-xs font-semibold text-primary hover:bg-primary/5 py-2 rounded-lg transition-colors"
                  >
                    Set as Default
                  </button>
                ) : (
                  <span className="flex-1 text-xs font-semibold text-emerald-600 py-2">Default {doc.type}</span>
                )}
                <button 
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this document?")) {
                      deleteMutation.mutate(doc.id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
