import ContactFormEmail from './templates/ContactFormEmail';

// Sample data for preview
const sampleData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '(555) 123-4567',
  company: 'Acme Corporation',
  message: 'Hi! I\'m interested in learning more about your web development services. I need help building a custom React application for my business.\n\nCan we schedule a call this week?',
};

export default ContactFormEmail(sampleData);
