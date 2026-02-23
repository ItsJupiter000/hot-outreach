import nodemailer from "nodemailer";

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
};

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  const fromName = process.env.MY_NAME || "Job Bot";
  const fromEmail = process.env.MY_EMAIL || process.env.SMTP_USER || "bot@local.dev";

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  return info;
}
