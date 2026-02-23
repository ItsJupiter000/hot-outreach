import { Application, InsertTemplate, Template, UpdateApplication } from "@shared/schema";
import { JsonDB } from "./jsonDB";
import { randomUUID } from "crypto";

export interface IStorage {
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;

  // Applications
  getApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  createApplication(app: Omit<Application, "id" | "history">): Promise<Application>;
  updateApplication(id: string, updates: UpdateApplication): Promise<Application>;
  checkDuplicateSend(companyName: string, email: string): Promise<boolean>;
}

export class JsonStorage implements IStorage {
  private templatesDb: JsonDB<Template[]>;
  private applicationsDb: JsonDB<Application[]>;

  constructor() {
    const defaultTemplates: Template[] = [
      {
        id: randomUUID(),
        name: "Cold Outreach",
        subject: "Exploring Engineering Opportunities at {{companyName}}",
        content: "<p>Hi Team,</p><p>I'm {{myName}}, a {{myRole}} with a passion for building great products. I've been following {{companyName}} and love what you're doing.</p><p>{{customMessage}}</p><p>Best,<br/>{{myName}}</p>"
      },
      {
        id: randomUUID(),
        name: "Job Application",
        subject: "Application for {{myRole}} position at {{companyName}}",
        content: "<p>Hello,</p><p>I recently applied for the {{myRole}} role at {{companyName}}. I wanted to follow up and express my strong interest.</p><p>{{customMessage}}</p><p>Regards,<br/>{{myName}}</p>"
      }
    ];
    this.templatesDb = new JsonDB("templates.json", defaultTemplates);
    this.applicationsDb = new JsonDB("applications.json", []);
  }

  async getTemplates(): Promise<Template[]> {
    return await this.templatesDb.read();
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.id === id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const templates = await this.getTemplates();
    const newTemplate: Template = { ...insertTemplate, id: randomUUID() };
    templates.push(newTemplate);
    await this.templatesDb.write(templates);
    return newTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    let templates = await this.getTemplates();
    templates = templates.filter((t) => t.id !== id);
    await this.templatesDb.write(templates);
  }

  async getApplications(): Promise<Application[]> {
    return await this.applicationsDb.read();
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const apps = await this.getApplications();
    return apps.find((a) => a.id === id);
  }

  async createApplication(appData: Omit<Application, "id" | "history">): Promise<Application> {
    const apps = await this.getApplications();
    const newApp: Application = {
      ...appData,
      id: randomUUID(),
      history: [{ status: appData.status, date: appData.updatedAt }],
    };
    apps.push(newApp);
    await this.applicationsDb.write(apps);
    return newApp;
  }

  async updateApplication(id: string, updates: UpdateApplication): Promise<Application> {
    const apps = await this.getApplications();
    const index = apps.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Application not found");

    const app = apps[index];
    const now = new Date().toISOString();

    if (updates.status && updates.status !== app.status) {
      app.status = updates.status;
      app.history.push({ status: updates.status, date: now });
    }
    if (updates.notes !== undefined) {
      app.notes = updates.notes;
    }
    app.updatedAt = now;

    await this.applicationsDb.write(apps);
    return app;
  }

  async checkDuplicateSend(companyName: string, email: string): Promise<boolean> {
    const apps = await this.getApplications();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return apps.some(
      (a) =>
        a.companyName.toLowerCase() === companyName.toLowerCase() &&
        a.email.toLowerCase() === email.toLowerCase() &&
        new Date(a.sentAt) > oneDayAgo
    );
  }
}

export const storage = new JsonStorage();
