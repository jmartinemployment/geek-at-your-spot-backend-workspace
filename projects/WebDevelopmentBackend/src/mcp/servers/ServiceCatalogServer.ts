// ============================================
// src/mcp/servers/ServiceCatalogServer.ts
// MCP Server: Service Catalog & Recommendations
// ============================================

import {
  MCPServer,
  MCPTool,
  MCPToolHandler,
  MCPExecutionContext,
  MCPToolResult,
  ServiceCatalogItem,
  ServiceSearchParams,
  ServiceRecommendationParams,
  ServicePackageParams,
  ServicePackageResult,
} from '../types';

export class ServiceCatalogServer implements MCPServer {
  name = 'ServiceCatalogServer';
  description = 'Access to service catalog, pricing information, and AI-powered service recommendations';
  tools: MCPTool[] = [];
  handlers: Map<string, MCPToolHandler> = new Map();

  private readonly serviceCatalog: ServiceCatalogItem[] = [
    {
      id: 'web-basic',
      name: 'Basic Website',
      category: 'web-development',
      description: '5-page responsive website with contact form and SEO basics',
      price_range: { min: 2500, max: 5000 },
      duration_weeks: 2,
      features: ['Responsive design', 'Contact form', 'SEO basics', 'Mobile friendly', '5 pages'],
      suitable_for: ['Small businesses', 'Portfolios', 'Landing pages'],
    },
    {
      id: 'web-advanced',
      name: 'Advanced Website',
      category: 'web-development',
      description: 'Custom website with CMS, user authentication, and advanced features',
      price_range: { min: 8000, max: 15000 },
      duration_weeks: 6,
      features: ['CMS integration', 'User authentication', 'Custom functionality', 'SEO optimization', 'Blog system'],
      suitable_for: ['Growing businesses', 'Content-heavy sites'],
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce Store',
      category: 'ecommerce',
      description: 'Full-featured online store with payment processing and inventory management',
      price_range: { min: 12000, max: 25000 },
      duration_weeks: 8,
      features: ['Product catalog', 'Shopping cart', 'Payment gateway', 'Order management', 'Inventory tracking'],
      suitable_for: ['Online retailers', 'Product-based businesses'],
    },
    {
      id: 'mobile-ios',
      name: 'iOS Mobile App',
      category: 'mobile-development',
      description: 'Native iOS application for iPhone and iPad',
      price_range: { min: 15000, max: 35000 },
      duration_weeks: 10,
      features: ['Native iOS', 'App Store submission', 'Push notifications', 'Offline support'],
      suitable_for: ['Businesses needing mobile presence', 'Startups'],
    },
    {
      id: 'mobile-android',
      name: 'Android Mobile App',
      category: 'mobile-development',
      description: 'Native Android application for phones and tablets',
      price_range: { min: 15000, max: 35000 },
      duration_weeks: 10,
      features: ['Native Android', 'Play Store submission', 'Push notifications', 'Offline support'],
      suitable_for: ['Businesses needing mobile presence', 'Startups'],
    },
    {
      id: 'api-development',
      name: 'Custom API Development',
      category: 'backend',
      description: 'RESTful API with authentication, database, and documentation',
      price_range: { min: 8000, max: 18000 },
      duration_weeks: 6,
      features: ['RESTful endpoints', 'Authentication', 'Database design', 'API documentation'],
      suitable_for: ['SaaS products', 'Mobile app backends', 'Integrations'],
    },
    {
      id: 'ui-design',
      name: 'UI/UX Design',
      category: 'design',
      description: 'Complete UI/UX design with wireframes, mockups, and prototypes',
      price_range: { min: 3000, max: 8000 },
      duration_weeks: 3,
      features: ['User research', 'Wireframes', 'High-fidelity mockups', 'Interactive prototype'],
      suitable_for: ['New products', 'Redesigns', 'Mobile apps'],
    },
    {
      id: 'branding',
      name: 'Brand Identity Package',
      category: 'design',
      description: 'Complete brand identity including logo, color palette, and style guide',
      price_range: { min: 2000, max: 6000 },
      duration_weeks: 2,
      features: ['Logo design', 'Color palette', 'Typography', 'Brand guidelines', 'Business cards'],
      suitable_for: ['New businesses', 'Rebranding'],
    },
    {
      id: 'consulting',
      name: 'Technical Consulting',
      category: 'consulting',
      description: 'Expert technical consulting and architecture planning',
      price_range: { min: 1500, max: 5000 },
      duration_weeks: 1,
      features: ['Architecture review', 'Technology recommendations', 'Best practices', 'Roadmap planning'],
      suitable_for: ['Complex projects', 'Technical decisions', 'Team guidance'],
    },
    {
      id: 'maintenance',
      name: 'Monthly Maintenance',
      category: 'support',
      description: 'Ongoing maintenance, updates, and support',
      price_range: { min: 500, max: 2000 },
      duration_weeks: 0,
      features: ['Bug fixes', 'Security updates', 'Content updates', 'Technical support'],
      suitable_for: ['Existing websites', 'Applications', 'E-commerce stores'],
    },
    {
      id: 'seo-optimization',
      name: 'SEO Optimization',
      category: 'marketing',
      description: 'Comprehensive SEO audit and optimization',
      price_range: { min: 2000, max: 5000 },
      duration_weeks: 4,
      features: ['SEO audit', 'Keyword research', 'On-page optimization', 'Technical SEO'],
      suitable_for: ['Existing websites', 'New launches', 'Content sites'],
    },
    {
      id: 'hosting-setup',
      name: 'Hosting & Deployment',
      category: 'infrastructure',
      description: 'Professional hosting setup and deployment configuration',
      price_range: { min: 1000, max: 3000 },
      duration_weeks: 1,
      features: ['Cloud hosting setup', 'SSL certificate', 'CDN configuration', 'Automated backups'],
      suitable_for: ['New projects', 'Migrations', 'Production deployments'],
    },
    {
      id: 'database-design',
      name: 'Database Design',
      category: 'backend',
      description: 'Custom database architecture and optimization',
      price_range: { min: 3000, max: 8000 },
      duration_weeks: 3,
      features: ['Schema design', 'Query optimization', 'Indexing strategy', 'Migration plan'],
      suitable_for: ['Complex data models', 'Performance optimization', 'Scaling'],
    },
    {
      id: 'integration',
      name: 'Third-Party Integrations',
      category: 'backend',
      description: 'Integration with external services and APIs',
      price_range: { min: 2000, max: 6000 },
      duration_weeks: 2,
      features: ['API integration', 'Webhook setup', 'Data synchronization', 'Testing'],
      suitable_for: ['Payment gateways', 'CRM systems', 'Marketing tools'],
    },
  ];

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    this.tools.push(
      {
        name: 'search_services',
        description: 'Search available services by keyword, category, or price range. Returns matching services with pricing and features.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for service name or description',
            },
            category: {
              type: 'string',
              enum: ['web-development', 'mobile-development', 'ecommerce', 'backend', 'design', 'consulting', 'support', 'marketing', 'infrastructure'],
              description: 'Filter by service category',
            },
            min_price: {
              type: 'number',
              description: 'Minimum price filter',
            },
            max_price: {
              type: 'number',
              description: 'Maximum price filter',
            },
          },
        },
      },
      {
        name: 'get_service_details',
        description: 'Get detailed information about a specific service including full feature list, pricing breakdown, and suitability.',
        input_schema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID (e.g., "web-basic", "ecommerce")',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'recommend_services',
        description: 'Get AI-powered service recommendations based on project description, budget, and priorities. Analyzes requirements and suggests best-fit services.',
        input_schema: {
          type: 'object',
          properties: {
            project_description: {
              type: 'string',
              description: 'Description of the project or requirements',
            },
            budget: {
              type: 'number',
              description: 'Available budget',
            },
            timeline: {
              type: 'number',
              description: 'Target timeline in weeks',
            },
            priorities: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['cost', 'quality', 'speed'],
              },
              description: 'Prioritize factors (e.g., ["quality", "cost"])',
            },
          },
          required: ['project_description'],
        },
      },
      {
        name: 'calculate_service_package',
        description: 'Calculate total cost and timeline for a package of services. Includes discounts, tax calculations, and bundling benefits.',
        input_schema: {
          type: 'object',
          properties: {
            service_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of service IDs to include in package',
            },
            discount_code: {
              type: 'string',
              description: 'Optional discount code',
            },
          },
          required: ['service_ids'],
        },
      },
    );

    this.handlers.set('search_services', this.searchServices.bind(this));
    this.handlers.set('get_service_details', this.getServiceDetails.bind(this));
    this.handlers.set('recommend_services', this.recommendServices.bind(this));
    this.handlers.set('calculate_service_package', this.calculateServicePackage.bind(this));
  }

  async initialize(_context: MCPExecutionContext): Promise<void> {
    // No initialization needed for in-memory catalog
  }

  async healthCheck(): Promise<boolean> {
    return this.serviceCatalog.length > 0;
  }

  private async searchServices(
    params: ServiceSearchParams,
    _context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      let results = [...this.serviceCatalog];

      if (params.query) {
        const query = params.query.toLowerCase();
        results = results.filter(
          (service) =>
            service.name.toLowerCase().includes(query) ||
            service.description.toLowerCase().includes(query) ||
            service.features.some((f) => f.toLowerCase().includes(query))
        );
      }

      if (params.category) {
        results = results.filter((service) => service.category === params.category);
      }

      if (params.min_price !== undefined) {
        const minPrice = params.min_price;
        results = results.filter((service) => service.price_range.max >= minPrice);
      }
      if (params.max_price !== undefined) {
        const maxPrice = params.max_price;
        results = results.filter((service) => service.price_range.min <= maxPrice);
      }

      return {
        success: true,
        data: {
          services: results,
          total_found: results.length,
          query_params: params,
        },
        metadata: {
          source: 'service-catalog',
          cached: true,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to search services: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async getServiceDetails(
    params: { service_id: string },
    _context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const service = this.serviceCatalog.find((s) => s.id === params.service_id);

      if (!service) {
        return {
          success: false,
          error: `Service not found: ${params.service_id}`,
        };
      }

      return {
        success: true,
        data: service,
        metadata: {
          source: 'service-catalog',
          cached: true,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to get service details: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async recommendServices(
    params: ServiceRecommendationParams,
    _context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const { project_description, budget, timeline, priorities = ['quality'] } = params;

      const keywords = project_description.toLowerCase().split(/\s+/);

      const scoredServices = this.serviceCatalog.map((service) => {
        let score = 0;

        keywords.forEach((keyword) => {
          if (service.name.toLowerCase().includes(keyword)) score += 3;
          if (service.description.toLowerCase().includes(keyword)) score += 2;
          if (service.features.some((f) => f.toLowerCase().includes(keyword))) score += 1;
        });

        if (budget) {
          if (service.price_range.min <= budget && service.price_range.max >= budget) {
            score += 5;
          } else if (service.price_range.max <= budget) {
            score += 3;
          }
        }

        if (timeline && service.duration_weeks <= timeline) {
          score += 2;
        }

        if (priorities.includes('cost') && service.price_range.min < 5000) {
          score += 2;
        }
        if (priorities.includes('speed') && service.duration_weeks < 4) {
          score += 2;
        }
        if (priorities.includes('quality') && service.price_range.max > 10000) {
          score += 2;
        }

        return { ...service, score };
      });

      const recommendations = scoredServices
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ score, ...service }) => ({
          service,
          confidence: Math.min(score / 20, 1),
          reasons: this.generateReasons(service, params),
        }));

      return {
        success: true,
        data: {
          recommendations,
          total_analyzed: this.serviceCatalog.length,
        },
        metadata: {
          source: 'service-catalog',
          algorithm: 'keyword-matching',
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to recommend services: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async calculateServicePackage(
    params: ServicePackageParams,
    _context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    try {
      const { service_ids, discount_code } = params;

      const services = service_ids
        .map((id) => this.serviceCatalog.find((s) => s.id === id))
        .filter((s): s is ServiceCatalogItem => s !== undefined);

      if (services.length === 0) {
        return {
          success: false,
          error: 'No valid services found',
        };
      }

      const subtotal = services.reduce(
        (sum, service) => sum + (service.price_range.min + service.price_range.max) / 2,
        0
      );

      let discount = 0;
      if (discount_code === 'BUNDLE10' && services.length >= 2) {
        discount = subtotal * 0.1;
      } else if (discount_code === 'BUNDLE20' && services.length >= 3) {
        discount = subtotal * 0.2;
      }

      const taxRate = 0.08;
      const afterDiscount = subtotal - discount;
      const tax = afterDiscount * taxRate;
      const total = afterDiscount + tax;

      const estimatedDurationWeeks = services.reduce(
        (sum, service) => sum + service.duration_weeks,
        0
      );

      const result: ServicePackageResult = {
        services,
        subtotal,
        discount,
        tax,
        total,
        estimated_duration_weeks: estimatedDurationWeeks,
      };

      return {
        success: true,
        data: result,
        metadata: {
          source: 'service-catalog',
          discount_applied: discount > 0,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `Failed to calculate package: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private generateReasons(service: ServiceCatalogItem, params: ServiceRecommendationParams): string[] {
    const reasons: string[] = [];

    if (params.budget && service.price_range.max <= params.budget) {
      reasons.push('Fits within your budget');
    }

    if (params.timeline && service.duration_weeks <= params.timeline) {
      reasons.push('Can be completed within your timeline');
    }

    if (service.suitable_for.length > 0) {
      reasons.push(`Ideal for: ${service.suitable_for.join(', ')}`);
    }

    if (service.features.length >= 5) {
      reasons.push('Comprehensive feature set');
    }

    return reasons;
  }
}
