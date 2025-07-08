import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || 'LivePrompt AI <noreply@marketing.liveprompt.ai>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      attachments: options.attachments
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export { resend };