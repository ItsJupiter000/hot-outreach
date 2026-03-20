import cron from "node-cron";
import { storage } from "./storage";
import { sendEmail } from "./mailService";

async function processFollowUps() {
  console.log("Follow-up cron: Checking for due follow-ups...");
  try {
    const duApps = await storage.getApplicationsDueForFollowUp();
    if (duApps.length === 0) {
      console.log("Follow-up cron: No follow-ups due.");
      return;
    }
    console.log(`Follow-up cron: Found ${duApps.length} follow-up(s) to send.`);

    const myName = process.env.MY_NAME || "Your Name";
    const myRole = process.env.MY_ROLE || "Software Engineer";

    for (const app of duApps) {
      try {
        if (!app.followUpTemplateId) continue;

        const template = await storage.getTemplate(app.followUpTemplateId);
        if (!template) {
          console.warn(`Follow-up cron: Template ${app.followUpTemplateId} not found for app ${app.id}, skipping.`);
          continue;
        }

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
          console.error("Follow-up cron: Could not fetch resume attachment:", e);
        }

        await sendEmail(app.email, subject, html, attachments as any);
        await storage.markFollowUpSent(app.id);
        await storage.updateApplication(app.id, { status: "Follow-up Sent" });
        console.log(`Follow-up cron: Sent follow-up to ${app.email} for ${app.companyName}.`);
      } catch (err) {
        console.error(`Follow-up cron: Failed to send follow-up for app ${app.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Follow-up cron: Error during follow-up processing:", err);
  }
}

export function startFollowUpCron() {
  // Run immediately on startup to catch any missed follow-ups
  setTimeout(() => processFollowUps(), 10000);

  // Then run every hour at the top of the hour
  cron.schedule("0 * * * *", () => {
    console.log("Follow-up cron: Running hourly check...");
    processFollowUps();
  });

  console.log("Follow-up cron: Scheduler started (runs every hour).");
}
