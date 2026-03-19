import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { supabase } from "./supabaseClient";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendEmail } from "./mailService";
import path from "path";
import multer from "multer";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Ensure local uploads dir exists as fallback
  const localUploadsDir = path.join("persistent_data", "uploads");
  if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  app.get(api.documents.list.path, async (req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  app.post(api.documents.create.path, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const type = req.body.type || "Resume";
      const name = req.body.name || req.file.originalname;
      const fileName = req.file.originalname;
      const storagePath = `${Date.now()}-${fileName}`;

      // Upload file buffer to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        return res.status(500).json({ message: "File upload failed: " + uploadError.message });
      }

      // Get the public URL
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
      const filePath = urlData.publicUrl;

      const doc = await storage.createDocument({
        name,
        type,
        filePath,
        fileName,
        isDefault: req.body.isDefault === "true",
      });

      res.status(201).json(doc);
    } catch (err: any) {
      console.error("Document upload error:", err);
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.documents.setDefault.path, async (req, res) => {
    try {
      const doc = await storage.setDefaultDocument(req.params.id);
      res.json(doc);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  });

  // ─── Templates ────────────────────────────────────────────────────────────

  app.get(api.templates.list.path, async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.post(api.templates.create.path, async (req, res) => {
    try {
      const input = api.templates.create.input.parse(req.body);
      const template = await storage.createTemplate(input);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const input = api.templates.create.input.parse(req.body);
      const template = await storage.updateTemplate(req.params.id, input);
      res.json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete(api.templates.delete.path, async (req, res) => {
    await storage.deleteTemplate(req.params.id);
    res.status(204).end();
  });

  app.post("/api/templates/:id/default", async (req, res) => {
    try {
      const template = await storage.setDefaultTemplate(req.params.id);
      res.json(template);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  });

  // ─── Applications ──────────────────────────────────────────────────────────

  app.get(api.applications.list.path, async (req, res) => {
    let applications = await storage.getApplications();
    const search = req.query.search;
    const status = req.query.status;

    if (search && typeof search === "string") {
      const s = search.toLowerCase();
      applications = applications.filter(
        (a) => a.companyName.toLowerCase().includes(s) || a.email.toLowerCase().includes(s)
      );
    }

    if (status && typeof status === "string") {
      applications = applications.filter((a) => a.status === status);
    }

    res.json(applications);
  });

  app.patch(api.applications.update.path, async (req, res) => {
    try {
      const input = api.applications.update.input.parse(req.body);
      const appRecord = await storage.updateApplication(req.params.id, input);
      res.json(appRecord);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      if (err.message === "Application not found") {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete(api.applications.delete.path, async (req, res) => {
    await storage.deleteApplication(req.params.id);
    res.status(204).end();
  });

  // ─── Send Email ───────────────────────────────────────────────────────────

  app.post(api.email.send.path, async (req, res) => {
    try {
      const input = api.email.send.input.parse(req.body);

      const isDuplicate = await storage.checkDuplicateSend(input.companyName, input.email);
      if (isDuplicate) {
        return res.status(429).json({
          message: "An email was already sent to this company/email within the last 24 hours.",
        });
      }

      const template = await storage.getTemplate(input.templateId);
      if (!template) {
        return res.status(400).json({ message: "Template not found" });
      }

      const myName = process.env.MY_NAME || "Your Name";
      const myRole = process.env.MY_ROLE || "Software Engineer";

      const injectVariables = (text: string) =>
        text
          .replace(/\{\{companyName\}\}/g, input.companyName)
          .replace(/\{\{myName\}\}/g, myName)
          .replace(/\{\{myRole\}\}/g, myRole)
          .replace(/\{\{customMessage\}\}/g, input.customMessage || "");

      const finalSubject = injectVariables(template.subject);
      const finalHtml = injectVariables(template.content);

      // Fetch selected or default resume and download file for attachment
      try {
        let resumeDoc = input.resumeId
          ? await storage.getDocument(input.resumeId)
          : await storage.getDefaultDocument("Resume");
        let attachments: { filename: string; content: Buffer }[] = [];

        if (resumeDoc?.filePath) {
          const fileResp = await fetch(resumeDoc.filePath);
          if (fileResp.ok) {
            const buffer = Buffer.from(await fileResp.arrayBuffer());
            attachments = [{ filename: resumeDoc.fileName, content: buffer }];
          }
        }

        await sendEmail(input.email, finalSubject, finalHtml, attachments as any);
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
        return res.status(500).json({ message: "Failed to send email. Check SMTP credentials." });
      }

      const now = new Date().toISOString();
      const appRecord = await storage.createApplication({
        companyName: input.companyName,
        email: input.email,
        templateId: input.templateId,
        status: "Applied",
        sentAt: now,
        updatedAt: now,
        notes: input.customMessage ? `Custom message: ${input.customMessage}` : undefined,
      });

      res.status(201).json(appRecord);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}
