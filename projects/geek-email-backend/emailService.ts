import { Resend } from 'resend';
import { render } from '@react-email/render';
import ContactFormEmail from './emails/templates/ContactFormEmail';
import { logger } from './utils/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Convert comma-separated TO_EMAIL into an array
    const toEmails = (process.env.TO_EMAIL ?? '').split(',').map(email => email.trim());

    logger.info('Email configuration', {
      apiKeyExists: !!process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL,
      to: toEmails,
      contactData: data
    });

    // Render React component to HTML
    logger.info('Rendering email template');
    const emailHtml = await render(
      ContactFormEmail({
        name: data.name,
        email: data.email,
        message: data.message,
        phone: data.phone,
        company: data.company,
      })
    );
    logger.info('Template rendered successfully', { htmlLength: emailHtml.length });

    // Generate plain text version
    const textContent = generatePlainText(data);
    logger.info('Plain text generated', { textLength: textContent.length });

    logger.info('Calling Resend API');
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: toEmails, // Now it's an array!
      subject: `New Contact Form Submission from ${data.name}`,
      html: emailHtml,
      text: textContent,
      replyTo: data.email,
    });

    logger.info('Resend API response', { result });
    
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

// Helper function to generate plain text version
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
