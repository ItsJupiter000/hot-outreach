import { z } from "zod";

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"), // HTML content with variables
});

export type Template = z.infer<typeof TemplateSchema>;
export type InsertTemplate = Omit<Template, "id">;

export const ApplicationHistorySchema = z.object({
  status: z.string(),
  date: z.string(), // ISO string
});

export type ApplicationHistory = z.infer<typeof ApplicationHistorySchema>;

export const ApplicationStatusEnum = z.enum(["Applied", "Replied", "Interview", "Rejected", "Offer", "No Response"]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  templateId: z.string().uuid(),
  status: ApplicationStatusEnum.default("Applied"),
  sentAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
  notes: z.string().optional(),
  history: z.array(ApplicationHistorySchema),
});

export type Application = z.infer<typeof ApplicationSchema>;
export type UpdateApplication = Partial<Pick<Application, "status" | "notes">>;

export const DocumentTypeEnum = z.enum(["Resume", "Cover Letter", "Portfolio", "Other"]);
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  type: DocumentTypeEnum,
  filePath: z.string(),
  fileName: z.string(),
  isDefault: z.boolean().default(false),
  createdAt: z.string(),
});

export type Document = z.infer<typeof DocumentSchema>;
export type InsertDocument = Omit<Document, "id" | "createdAt">;

export const SendEmailRequestSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  templateId: z.string().uuid(),
  customMessage: z.string().optional(),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
