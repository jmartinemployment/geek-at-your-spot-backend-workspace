import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Link,
} from '@react-email/components';

export interface ContactFormEmailProps {
  name: string;
  email: string;
  message: string;
  phone?: string;
  company?: string;
}

export default function ContactFormEmail({
  name,
  email,
  message,
  phone,
  company,
}: ContactFormEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New contact form submission from {name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerText}>
              📧 New Contact Form Submission
            </Heading>
          </Section>

          <Section style={content}>
            <Section style={fieldSection}>
              <Text style={label}>Name</Text>
              <Text style={value}>{name}</Text>
            </Section>

            <Section style={fieldSection}>
              <Text style={label}>Email</Text>
              <Link href={`mailto:${email}`} style={emailLink}>
                {email}
              </Link>
            </Section>

            {phone && (
              <Section style={fieldSection}>
                <Text style={label}>Phone</Text>
                <Text style={value}>{phone}</Text>
              </Section>
            )}

            {company && (
              <Section style={fieldSection}>
                <Text style={label}>Company</Text>
                <Text style={value}>{company}</Text>
              </Section>
            )}

            <Hr style={divider} />

            <Section style={fieldSection}>
              <Text style={label}>Message</Text>
              <Text style={messageText}>{message}</Text>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Sent from Geek @ Your Spot Contact Form
            </Text>
            <Text style={footerText}>
              {new Date().toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginTop: '32px',
  marginBottom: '32px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
};

const header = {
  backgroundColor: '#0d6efd',
  padding: '24px',
  borderRadius: '8px 8px 0 0',
};

const headerText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '24px 32px',
};

const fieldSection = {
  marginBottom: '20px',
};

const label = {
  color: '#6c757d',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const value = {
  color: '#212529',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const emailLink = {
  color: '#0d6efd',
  fontSize: '16px',
  textDecoration: 'none',
};

const messageText = {
  color: '#212529',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const divider = {
  borderColor: '#dee2e6',
  margin: '24px 0',
};

const footer = {
  padding: '0 32px 24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6c757d',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
};
