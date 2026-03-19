import { Application, InsertTemplate, Template, UpdateApplication, Document, InsertDocument } from "@shared/schema";
import { supabase } from "./supabaseClient";
import { randomUUID } from "crypto";

export interface IStorage {
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  setDefaultTemplate(id: string): Promise<Template>;

  // Applications
  getApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  createApplication(app: Omit<Application, "id" | "history">): Promise<Application>;
  updateApplication(id: string, updates: UpdateApplication): Promise<Application>;
  deleteApplication(id: string): Promise<void>;
  checkDuplicateSend(companyName: string, email: string): Promise<boolean>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDefaultDocument(type: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  setDefaultDocument(id: string): Promise<Document>;
}

function mapRowToTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    content: row.content,
    isDefault: row.is_default ?? false,
  };
}

function mapRowToApplication(row: any): Application {
  return {
    id: row.id,
    companyName: row.company_name,
    email: row.email,
    templateId: row.template_id,
    status: row.status,
    sentAt: typeof row.sent_at === "string" ? row.sent_at : new Date(row.sent_at).toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date(row.updated_at).toISOString(),
    notes: row.notes ?? undefined,
    history: Array.isArray(row.history) ? row.history : [],
  };
}

function mapRowToDocument(row: any): Document {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    filePath: row.file_path,
    fileName: row.file_name,
    isDefault: row.is_default,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
  };
}

export class SupabaseStorage implements IStorage {
  // ─── Templates ──────────────────────────────────────────────────────────────

  async getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase.from("templates").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRowToTemplate);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const { data, error } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRowToTemplate(data) : undefined;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    // If no templates exist yet, make this one the default
    const existing = await this.getTemplates();
    const isFirst = existing.length === 0;
    const { data, error } = await supabase
      .from("templates")
      .insert({ id: randomUUID(), ...insertTemplate, is_default: isFirst })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToTemplate(data);
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async setDefaultTemplate(id: string): Promise<Template> {
    const template = await this.getTemplate(id);
    if (!template) throw new Error("Template not found");
    // Clear all defaults
    await supabase.from("templates").update({ is_default: false }).neq("id", "none");
    // Set new default
    const { data, error } = await supabase
      .from("templates")
      .update({ is_default: true })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToTemplate(data);
  }

  // ─── Applications ────────────────────────────────────────────────────────────

  async getApplications(): Promise<Application[]> {
    const { data, error } = await supabase.from("applications").select("*").order("sent_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRowToApplication);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const { data, error } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRowToApplication(data) : undefined;
  }

  async createApplication(appData: Omit<Application, "id" | "history">): Promise<Application> {
    const id = randomUUID();
    const history = [{ status: appData.status, date: appData.sentAt }];

    const { data, error } = await supabase
      .from("applications")
      .insert({
        id,
        company_name: appData.companyName,
        email: appData.email,
        template_id: appData.templateId,
        status: appData.status,
        sent_at: appData.sentAt,
        updated_at: appData.updatedAt,
        notes: appData.notes ?? null,
        history,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToApplication(data);
  }

  async updateApplication(id: string, updates: UpdateApplication): Promise<Application> {
    const existing = await this.getApplication(id);
    if (!existing) throw new Error("Application not found");

    const now = new Date().toISOString();
    const newHistory = [...existing.history];

    if (updates.status && updates.status !== existing.status) {
      newHistory.push({ status: updates.status, date: now });
    }

    const { data, error } = await supabase
      .from("applications")
      .update({
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
        updated_at: now,
        history: newHistory,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToApplication(data);
  }

  async deleteApplication(id: string): Promise<void> {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async checkDuplicateSend(companyName: string, email: string): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .ilike("company_name", companyName)
      .ilike("email", email)
      .gte("sent_at", oneDayAgo);
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  async getDocuments(): Promise<Document[]> {
    const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRowToDocument);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRowToDocument(data) : undefined;
  }

  async getDefaultDocument(type: string): Promise<Document | undefined> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("type", type)
      .eq("is_default", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRowToDocument(data) : undefined;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    // If this is marked as default (or first of its type), clear existing defaults
    if (doc.isDefault) {
      await supabase.from("documents").update({ is_default: false }).eq("type", doc.type);
    } else {
      // Check if any of same type already exist; if not, make this default
      const { data: existing } = await supabase.from("documents").select("id").eq("type", doc.type);
      if (!existing || existing.length === 0) {
        doc = { ...doc, isDefault: true };
      }
    }

    const id = randomUUID();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        id,
        name: doc.name,
        type: doc.type,
        file_path: doc.filePath,
        file_name: doc.fileName,
        is_default: doc.isDefault,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToDocument(data);
  }

  async deleteDocument(id: string): Promise<void> {
    // Also delete the file from Supabase Storage
    const doc = await this.getDocument(id);
    if (doc?.filePath) {
      // file_path stores the storage path e.g. "documents/filename.pdf"
      const storagePath = doc.filePath.replace(/^documents\//, "");
      await supabase.storage.from("documents").remove([storagePath]);
    }
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async setDefaultDocument(id: string): Promise<Document> {
    const doc = await this.getDocument(id);
    if (!doc) throw new Error("Document not found");

    // Clear existing defaults for same type
    await supabase.from("documents").update({ is_default: false }).eq("type", doc.type);

    const { data, error } = await supabase
      .from("documents")
      .update({ is_default: true })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapRowToDocument(data);
  }
}

export const storage = new SupabaseStorage();
