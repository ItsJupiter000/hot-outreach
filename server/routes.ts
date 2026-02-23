import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sendEmail } from "./mailService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Templates
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
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  app.delete(api.templates.delete.path, async (req, res) => {
    await storage.deleteTemplate(req.params.id);
    res.status(204).end();
  });

  // Applications
  app.get(api.applications.list.path, async (req, res) => {
    let applications = await storage.getApplications();
    const search = req.query.search;
    const status = req.query.status;
    
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      applications = applications.filter(a => 
        a.companyName.toLowerCase().includes(s) || a.email.toLowerCase().includes(s)
      );
    }
    
    if (status && typeof status === 'string') {
      applications = applications.filter(a => a.status === status);
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
          field: err.errors[0].path.join('.'),
        });
      }
      if (err.message === "Application not found") {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Send Email
  app.post(api.email.send.path, async (req, res) => {
    try {
      const input = api.email.send.input.parse(req.body);
      
      const isDuplicate = await storage.checkDuplicateSend(input.companyName, input.email);
      if (isDuplicate) {
        return res.status(429).json({ message: "An email was already sent to this company/email within the last 24 hours." });
      }

      const template = await storage.getTemplate(input.templateId);
      if (!template) {
        return res.status(400).json({ message: "Template not found" });
      }

      // Dynamic variable injection
      const myName = process.env.MY_NAME || "Your Name";
      const myRole = process.env.MY_ROLE || "Software Engineer";
      
      const injectVariables = (text: string) => {
        return text
          .replace(/\{\{companyName\}\}/g, input.companyName)
          .replace(/\{\{myName\}\}/g, myName)
          .replace(/\{\{myRole\}\}/g, myRole)
          .replace(/\{\{customMessage\}\}/g, input.customMessage || "");
      };

      const finalSubject = injectVariables(template.subject);
      const finalHtml = injectVariables(template.content);

      // Attempt to send email
      try {
         await sendEmail(input.email, finalSubject, finalHtml);
      } catch (emailErr) {
         console.error("Email send failed:", emailErr);
         return res.status(500).json({ message: "Failed to send email. Check SMTP credentials." });
      }

      // Save application record
      const now = new Date().toISOString();
      const appRecord = await storage.createApplication({
        companyName: input.companyName,
        email: input.email,
        templateId: input.templateId,
        status: "Applied",
        sentAt: now,
        updatedAt: now,
        notes: input.customMessage ? `Custom message included: ${input.customMessage}` : undefined
      });

      res.status(201).json(appRecord);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  return httpServer;
}
