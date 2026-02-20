export async function sendEmail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "no-reply@example.com";
  const secure = process.env.SMTP_SECURE === "true";

  if (host && port && user && pass) {
    type NodemailerLike = {
      createTransport: (options: unknown) => {
        sendMail: (options: { from?: string; to: string; subject?: string; text?: string; html?: string }) => Promise<unknown>;
      };
    };
    type NodemailerModule = { default?: NodemailerLike } | NodemailerLike | null;
    const mod = (await import("nodemailer").catch(() => null)) as NodemailerModule;
    const nodemailer: NodemailerLike = (mod && "default" in mod && mod.default) ? mod.default : (mod as NodemailerLike);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, text });
  } else {
    console.log(`[DEV-EMAIL] To: ${to}\nSubject: ${subject}\n\n${text}`);
  }
}
