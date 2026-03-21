import cron from "node-cron";
import { storage } from "./storage";
import { sendEmail } from "./mailService";

export async function sendSingleFollowUp(app: any) {
  const settings = await storage.getSettings();
  const templateId = app.followUpTemplateId || settings.followUpTemplateId;
  
  if (!templateId) {
    console.warn(`Follow-up service: No template configured for app ${app.id} (global or individual).`);
    return;
  }

  const template = await storage.getTemplate(templateId);
  if (!template) {
    console.warn(`Follow-up service: Template ${templateId} not found, skipping.`);
    return;
  }

  const myName = process.env.MY_NAME || "Your Name";
  const myRole = process.env.MY_ROLE || "Software Engineer";

  const injectVariables = (text: string) =>
    text
      .replace(/\{\{companyName\}\}/g, app.companyName)
      .replace(/\{\{myName\}\}/g, myName)
      .replace(/\{\{myRole\}\}/g, myRole)
      .replace(/\{\{customMessage\}\}/g, "");

  const subject = injectVariables(template.subject);
  const html = injectVariables(template.content);

  // Attach default resume if available
  let attachments: { filename: string; content: Buffer }[] = [];
  try {
    const resumeDoc = await storage.getDefaultDocument("Resume");
    if (resumeDoc?.filePath) {
      const fileResp = await fetch(resumeDoc.filePath);
      if (fileResp.ok) {
        const buffer = Buffer.from(await fileResp.arrayBuffer());
        attachments = [{ filename: resumeDoc.fileName, content: buffer }];
      }
    }
  } catch (e) {
    console.error("Follow-up service: Could not fetch resume attachment:", e);
  }

  await sendEmail(app.email, subject, html, attachments as any);
  await storage.markFollowUpSent(app.id);
  await storage.updateApplication(app.id, { status: "Follow-up Sent" });
  console.log(`Follow-up service: Sent follow-up to ${app.email} for ${app.companyName}.`);
}

export async function processFollowUps() {
  try {
    const duApps = await storage.getApplicationsDueForFollowUp();
    if (duApps.length === 0) {
      return;
    }
    console.log(`Follow-up cron: Found ${duApps.length} follow-up(s) to send.`);

    for (const app of duApps) {
      try {
        await sendSingleFollowUp(app);
      } catch (err) {
        console.error(`Follow-up cron: Failed to send follow-up for app ${app.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Follow-up cron: Error during follow-up processing:", err);
  }
}
