export interface RequirementField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'array' | 'object' | 'boolean';
  description: string;
}

export interface ServiceRequirements {
  serviceType: string;
  fields: RequirementField[];
}

export const requirementsSchema: Record<string, ServiceRequirements> = {
  web_development: {
    serviceType: 'web_development',
    fields: [
      // Platform & Infrastructure
      { key: 'projectType', label: 'Project Type', required: true, type: 'string', 
        description: 'e-commerce, business site, portfolio, web app, etc.' },
      { key: 'platform', label: 'Platform/CMS', required: true, type: 'string', 
        description: 'WordPress, Shopify, custom build, etc.' },
      { key: 'hosting', label: 'Hosting', required: true, type: 'string', 
        description: 'client provides, we provide, or specific host' },
      { key: 'domain', label: 'Domain Status', required: true, type: 'string', 
        description: 'existing domain, need to purchase, or TBD' },
      
      // Features & Functionality
      { key: 'features', label: 'Key Features', required: true, type: 'array', 
        description: 'specific features with implementation details' },
      { key: 'integrations', label: 'Third-party Integrations', required: false, type: 'array', 
        description: 'payment processors, CRMs, email tools, analytics' },
      
      // Design & Content
      { key: 'designStyle', label: 'Design Style', required: true, type: 'string', 
        description: 'modern, classic, minimalist, professional, etc.' },
      { key: 'designReferences', label: 'Reference Sites', required: false, type: 'array', 
        description: 'URLs of sites they like for inspiration' },
      { key: 'contentStatus', label: 'Content Readiness', required: true, type: 'string', 
        description: 'have content ready, need copywriting help, or TBD' },
      
      // Access & Credentials
      { key: 'existingSite', label: 'Existing Site', required: true, type: 'string', 
        description: 'URL if exists, migration needed, or greenfield' },
      { key: 'accessNeeded', label: 'Access Requirements', required: true, type: 'array', 
        description: 'hosting credentials, domain registrar, etc.' },
      
      // Timeline & Budget
      { key: 'timeline', label: 'Desired Timeline', required: true, type: 'string', 
        description: 'launch date or duration in weeks/months' },
      { key: 'budget', label: 'Budget Range', required: true, type: 'object', 
        description: 'min and max budget or fixed amount' }
    ]
  },
  
  marketing: {
    serviceType: 'marketing',
    fields: [
      { key: 'serviceType', label: 'Marketing Service', required: true, type: 'string', 
        description: 'SEO, content creation, social media, email marketing, ads' },
      { key: 'currentState', label: 'Current Marketing', required: true, type: 'string', 
        description: 'what they currently do or have' },
      { key: 'goals', label: 'Marketing Goals', required: true, type: 'array', 
        description: 'increase traffic, generate leads, brand awareness, etc.' },
      { key: 'targetAudience', label: 'Target Audience', required: true, type: 'string', 
        description: 'who they are trying to reach' },
      { key: 'websiteUrl', label: 'Website URL', required: false, type: 'string', 
        description: 'their website if applicable' },
      { key: 'competitorUrls', label: 'Competitors', required: false, type: 'array', 
        description: 'competitor websites for analysis' },
      { key: 'timeline', label: 'Timeline', required: true, type: 'string', 
        description: 'campaign duration or ongoing' },
      { key: 'budget', label: 'Budget', required: true, type: 'object', 
        description: 'monthly or project budget' }
    ]
  },
  
  analytics: {
    serviceType: 'analytics',
    fields: [
      { key: 'analysisType', label: 'Analysis Type', required: true, type: 'string', 
        description: 'revenue analysis, customer insights, forecasting, etc.' },
      { key: 'dataSource', label: 'Data Source', required: true, type: 'string', 
        description: 'QuickBooks, Excel, Shopify, custom database, etc.' },
      { key: 'dataAccess', label: 'Data Access Method', required: true, type: 'string', 
        description: 'API access, file export, screen share, etc.' },
      { key: 'analysisGoals', label: 'Specific Questions', required: true, type: 'array', 
        description: 'what questions they want answered' },
      { key: 'timeframe', label: 'Historical Timeframe', required: true, type: 'string', 
        description: 'how much historical data to analyze' },
      { key: 'deliverableFormat', label: 'Deliverable Format', required: true, type: 'string', 
        description: 'dashboard, report, presentation, etc.' },
      { key: 'timeline', label: 'Timeline', required: true, type: 'string', 
        description: 'one-time or recurring analysis' },
      { key: 'budget', label: 'Budget', required: true, type: 'object', 
        description: 'project or monthly budget' }
    ]
  },
  
  website_analytics: {
    serviceType: 'website_analytics',
    fields: [
      { key: 'websiteUrl', label: 'Website URL', required: true, type: 'string', 
        description: 'the website to analyze' },
      { key: 'analyticsAccess', label: 'Analytics Tool Access', required: true, type: 'string', 
        description: 'Google Analytics, Ahrefs, or other tool access' },
      { key: 'concerns', label: 'Performance Concerns', required: true, type: 'array', 
        description: 'slow loading, high bounce rate, low conversions, etc.' },
      { key: 'currentMetrics', label: 'Current Metrics', required: false, type: 'object', 
        description: 'traffic, bounce rate, conversion rate if known' },
      { key: 'goals', label: 'Optimization Goals', required: true, type: 'array', 
        description: 'improve speed, reduce bounce, increase conversions' },
      { key: 'siteAccess', label: 'Website Access', required: true, type: 'string', 
        description: 'CMS access, FTP, or read-only' },
      { key: 'timeline', label: 'Timeline', required: true, type: 'string', 
        description: 'urgency and duration' },
      { key: 'budget', label: 'Budget', required: true, type: 'object', 
        description: 'budget range for optimization' }
    ]
  }
};

export function getRequiredFields(serviceType: string): RequirementField[] {
  const schema = requirementsSchema[serviceType];
  return schema ? schema.fields.filter(f => f.required) : [];
}

export function getAllFields(serviceType: string): RequirementField[] {
  const schema = requirementsSchema[serviceType];
  return schema ? schema.fields : [];
}
