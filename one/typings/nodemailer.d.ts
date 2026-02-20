declare module "nodemailer" {
  interface SendMailOptions {
    from?: string;
    to: string;
    subject?: string;
    text?: string;
    html?: string;
  }
  interface Transporter {
    sendMail(options: SendMailOptions): Promise<unknown>;
  }
  function createTransport(options: unknown): Transporter;
  const nodemailer: {
    createTransport: typeof createTransport;
  };
  export { createTransport, Transporter, SendMailOptions };
  export default nodemailer;
}

