import { Resend } from 'resend';
import { render } from '@react-email/render';
import ContactFormEmail from './emails/templates/ContactFormEmail';

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
    console.log('📧 Starting email send process...');
    
    // Convert comma-separated TO_EMAIL into an array
    const toEmails = process.env.TO_EMAIL!.split(',').map(email => email.trim());
    
    console.log('📧 API Key exists:', !!process.env.RESEND_API_KEY);
    console.log('📧 FROM:', process.env.FROM_EMAIL);
    console.log('📧 TO (array):', toEmails);
    console.log('📧 Contact data:', data);

    // Render React component to HTML
    console.log('📧 Rendering email template...');
    const emailHtml = await render(
      ContactFormEmail({
        name: data.name,
        email: data.email,
        message: data.message,
        phone: data.phone,
        company: data.company,
      })
    );
    console.log('📧 Template rendered successfully, HTML length:', emailHtml.length);

    // Generate plain text version
    const textContent = generatePlainText(data);
    console.log('📧 Plain text generated, length:', textContent.length);

    console.log('�� Calling Resend API...');
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: toEmails, // Now it's an array!
      subject: `New Contact Form Submission from ${data.name}`,
      html: emailHtml,
      text: textContent,
      replyTo: data.email,
    });

    console.log('📧 Resend API response:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      throw new Error(result.error.message);
    }
    
    console.log('📧 Email sent successfully! ID:', result.data?.id);

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Error sending email:', error);
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
