import { ImapFlow } from "imapflow";
import { storage } from "./storage";

export async function pollInbox() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "imap.gmail.com"; // Assuming gmail/similar by default

  if (!user || !pass) {
    console.log("IMAP: Missing SMTP_USER or SMTP_PASS, skipping inbox poll.");
    return;
  }

  // usually imap host is imap.domain.com if smtp is smtp.domain.com
  let imapHost = host;
  if (imapHost.startsWith("smtp.")) {
    imapHost = imapHost.replace("smtp.", "imap.");
  }

  const client = new ImapFlow({
    host: imapHost,
    port: 993,
    secure: true,
    auth: {
      user,
      pass,
    },
    logger: false, // Set to true for debugging IMAP connection
  });

  try {
    await client.connect();
    
    // Select and lock the Inbox
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Find all unseen messaging (or recent messages)
      // Searching only unseen is highly efficient
      const messages = client.fetch({ seen: false }, { envelope: true });
      
      const allApps = await storage.getApplications();
      // only consider active applications
      const activeApps = allApps.filter(a => a.status === "Applied" || a.status === "Opened");
      
      for await (const message of messages) {
        if (!message.envelope) continue;
        const fromAddrs = message.envelope.from;
        if (!fromAddrs || fromAddrs.length === 0) continue;
        
        for (const addr of fromAddrs) {
          if (addr.address) {
            const incomingEmail = addr.address.toLowerCase();
            
            // Check if this email belongs to an active application
            const matchingApps = activeApps.filter(a => a.email.toLowerCase() === incomingEmail);
            
            for (const app of matchingApps) {
              await storage.updateApplication(app.id, { status: "Replied" });
              console.log(`IMAP: Detected reply from ${incomingEmail}. Updated App ${app.id} to Replied!`);
            }
          }
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("IMAP Polling Error:", err);
  } finally {
    try {
      await client.logout();
    } catch (e) {
      // ignore logout errors
    }
  }
}

export function startReplyPolling() {
  // Poll immediately on startup (after a slight delay to ensure DB is ready)
  setTimeout(() => {
    console.log("IMAP: Starting initial inbox poll...");
    pollInbox();
  }, 5000);

  // Then poll every 5 minutes
  const FIVE_MINUTES = 5 * 60 * 1000;
  setInterval(() => {
    console.log("IMAP: Running scheduled inbox poll...");
    pollInbox();
  }, FIVE_MINUTES);
}
