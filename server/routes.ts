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
import { scheduledService } from "./scheduledService";
import { processFollowUps, sendSingleFollowUp } from "./followUpService";
import { pollInbox } from "./imapService";
import { randomUUID } from "crypto";
import { SendEmailRequest } from "@shared/schema";

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

  // ─── Settings ─────────────────────────────────────────────────────────────

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/settings/sync", async (req, res) => {
    try {
      const { feature } = req.body;
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers.host || "localhost";

      if (feature === "scheduling") {
        await runScheduledSends(protocol as string, host as string);
      } else if (feature === "followUps") {
        await processFollowUps();
      } else if (feature === "replyPolling") {
        await pollInbox();
      } else {
        return res.status(400).json({ message: "Invalid feature" });
      }

      res.json({ message: `${feature} sync completed` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/applications/follow-ups-due", async (req, res) => {
    try {
      const apps = await storage.getApplicationsDueForFollowUp();
      res.json(apps);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/applications/:id/followup/send", async (req, res) => {
    try {
      const app = await storage.getApplication(req.params.id);
      if (!app) return res.status(404).json({ message: "Application not found" });
      await sendSingleFollowUp(app);
      res.json({ message: "Follow-up sent successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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

  // ─── Scheduled Emails ────────────────────────────────────────────────────────
  app.get("/api/scheduled", async (req, res) => {
    try {
      const scheduled = await scheduledService.getAll();
      res.json(scheduled);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  app.delete("/api/scheduled/:id", async (req, res) => {
    try {
      await scheduledService.remove(req.params.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  app.post("/api/scheduled/:id/send", async (req, res) => {
    try {
      const all = await scheduledService.getAll();
      const email = all.find(e => e.id === req.params.id);
      if (!email) return res.status(404).json({ message: "Scheduled email not found" });

      await executeEmailSend(email, email.protocol || "http", email.host || "localhost");
      await scheduledService.remove(req.params.id);
      res.json({ message: "Sent successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  app.patch("/api/applications/:id/followup", async (req, res) => {
    try {
      const schema = z.object({
        templateId: z.string().uuid().nullable(),
        days: z.number().int().min(1).max(30).nullable(),
      });
      const { templateId, days } = schema.parse(req.body);
      const app = await storage.updateFollowUp(req.params.id, templateId, days);
      res.json(app);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  // ─── Tracking ────────────────────────────────────────────────────────────

  app.get("/api/track/open/:id", async (req, res) => {
    try {
      const appRecord = await storage.getApplication(req.params.id);
      if (appRecord && appRecord.status === "Applied") {
        console.log("Application opened");
        await storage.updateApplication(req.params.id, { status: "Opened" });
      }
    } catch (e) {
      console.error("Tracking pixel error:", e);
    }
    // Return 1x1 transparent GIF
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": pixel.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.end(pixel);
  });

async function executeEmailSend(
  input: SendEmailRequest,
  protocol: string,
  host: string
) {
  const isDuplicate = await storage.checkDuplicateSend(input.companyName, input.email);
  if (isDuplicate) {
    throw new Error("An email was already sent to this company/email within the last 24 hours.");
  }

  const template = await storage.getTemplate(input.templateId);
  if (!template) {
    throw new Error("Template not found");
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
  let attachments: { filename: string; content: Buffer }[] = [];
  try {
    let resumeDoc = input.resumeId
      ? await storage.getDocument(input.resumeId)
      : await storage.getDefaultDocument("Resume");

    if (resumeDoc?.filePath) {
      const fileResp = await fetch(resumeDoc.filePath);
      if (fileResp.ok) {
        const buffer = Buffer.from(await fileResp.arrayBuffer());
        attachments = [{ filename: resumeDoc.fileName, content: buffer }];
      }
    }
  } catch (err) {
    console.error("Failed to fetch resume attachment:", err);
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
    followUpTemplateId: input.followUpTemplateId ?? null,
    followUpDays: input.followUpDays ?? null,
  });

  const trackingUrl = `${protocol}://${host}/api/track/open/${appRecord.id}`;
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;" />`;
  const htmlWithTracking = finalHtml + trackingPixel;

  try {
    await sendEmail(input.email, finalSubject, htmlWithTracking, attachments as any);
  } catch (emailErr) {
    console.error("Email send failed:", emailErr);
    await storage.deleteApplication(appRecord.id);
    throw new Error("Failed to send email. Check SMTP credentials.");
  }
  return appRecord;
}

  // ─── Send Email ───────────────────────────────────────────────────────────

  app.post(api.email.send.path, async (req, res) => {
    try {
      const input = api.email.send.input.parse(req.body);
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers.host || "localhost";

      if (input.scheduledFor && new Date(input.scheduledFor).getTime() > Date.now()) {
        await scheduledService.add({
          id: randomUUID(),
          ...input,
          scheduledFor: input.scheduledFor as string,
          protocol: protocol as string,
          host: host as string
        });
        return res.status(202).json({ message: "Email scheduled successfully" });
      }

      const appRecord = await executeEmailSend(input, protocol as string, host as string);
      res.status(201).json(appRecord);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: err.message || "Internal Error" });
    }
  });

  async function runScheduledSends(protocol: string, host: string) {
    try {
      const dueEmails = await scheduledService.popDueEmails();
      if (dueEmails.length > 0) {
        console.log(`Heartbeat: Sending ${dueEmails.length} scheduled emails.`);
      }
      for (const email of dueEmails) {
        try {
          await executeEmailSend(email, email.protocol || protocol, email.host || host);
        } catch(e) {
          console.error(`Error sending scheduled email to ${email.email}:`, e);
        }
      }
      await storage.updateSettings({ lastSchedulingAt: new Date().toISOString() });
    } catch(err) {
      console.error("Error processing scheduled emails:", err);
    }
  }

  // Heartbeat interval (1 minute) to check dynamic timing
  setInterval(async () => {
    try {
      const settings = await storage.getSettings();
      const now = Date.now();

      // 1. Scheduled Sending
      if (settings.schedulingEnabled) {
        const lastRun = settings.lastSchedulingAt ? new Date(settings.lastSchedulingAt).getTime() : 0;
        const intervalMs = settings.schedulingIntervalMinutes * 60 * 1000;
        if (now - lastRun >= intervalMs) {
          await runScheduledSends("http", "localhost");
        }
      }

      // 2. Follow-ups
      if (settings.followUpsEnabled) {
        const lastRun = settings.lastFollowUpAt ? new Date(settings.lastFollowUpAt).getTime() : 0;
        const intervalMs = settings.followUpIntervalMinutes * 60 * 1000;
        if (now - lastRun >= intervalMs) {
          await processFollowUps();
          await storage.updateSettings({ lastFollowUpAt: new Date().toISOString() });
        }
      }

      // 3. IMAP Polling
      if (settings.replyPollingEnabled) {
        const lastRun = settings.lastReplyPollingAt ? new Date(settings.lastReplyPollingAt).getTime() : 0;
        const intervalMs = settings.replyPollingIntervalMinutes * 60 * 1000;
        if (now - lastRun >= intervalMs) {
          await pollInbox();
          await storage.updateSettings({ lastReplyPollingAt: new Date().toISOString() });
        }
      }
    } catch (err) {
      console.error("Heartbeat Error:", err);
    }
  }, 60000);

  return httpServer;
}
