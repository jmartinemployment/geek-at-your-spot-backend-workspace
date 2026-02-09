import { Resend } from 'resend';
import { render } from '@react-email/render';
import ContactFormEmail from '../emails/templates/ContactFormEmail';
import { logger } from '../utils/logger';

// Lazy initialization - only create Resend when actually sending email
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured in environment variables');
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  phone?: string;
  company?: string;
}

export async function sendContactEmail(data: ContactFormData) {
  try {
    logger.info('Starting email send process');
    
    const toEmails = (process.env.TO_EMAIL ?? '').split(',').map(email => email.trim());
    
    logger.info('Email configuration', { from: process.env.FROM_EMAIL, to: toEmails });

    const emailHtml = await render(
      ContactFormEmail({
        name: data.name,
        email: data.email,
        message: data.message,
        phone: data.phone,
        company: data.company,
      })
    );

    const textContent = generatePlainText(data);

    const resend = getResend(); // Get Resend instance lazily
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: toEmails,
      subject: `New Contact Form Submission from ${data.name}`,
      html: emailHtml,
      text: textContent,
      replyTo: data.email,
    });
    
    if (result.error) {
      logger.error('Resend API error', { error: result.error });
      throw new Error(result.error.message);
    }
    
    logger.info('Email sent successfully', { id: result.data?.id });

    return { success: true, id: result.data?.id };
  } catch (error) {
    logger.error('Error sending email', { error });
    throw error;
  }
}

function generatePlainText(data: ContactFormData): string {
  let text = `New Contact Form Submission\n\n`;
  text += `Name: ${data.name}\n`;
  text += `Email: ${data.email}\n`;
  
  if (data.phone) {
    text += `Phone: ${data.phone}\n`;
  }
  
  if (data.company) {
    text += `Company: ${data.company}\n`;
  }
  
  text += `\nMessage:\n${data.message}\n\n`;
  text += `---\nSent from Geek @ Your Spot Contact Form\n`;
  text += `${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`;
  
  return text;
}
