// ============================================
// src/code-execution/calculators/CostCalculator.ts
// Dynamic Cost Calculations with Breakdown
// ============================================

import {
  CostCalculationInput,
  CostCalculationResult,
  CostBreakdownItem,
  TimelineResult,
} from '../types';

export class CostCalculator {
  private baseHourlyRate: number = 150;

  private readonly complexityMultipliers = {
    low: 0.8,
    medium: 1,
    high: 1.3,
  };

  private readonly projectTypeMultipliers = {
    website: 1,
    mobile_app: 1.2,
    ecommerce: 1.3,
    api: 0.9,
    custom: 1.1,
  };

  // Feature hours database
  private featureHours: Record<string, number> = {
    // Authentication
    user_registration: 8,
    social_login: 12,
    two_factor_auth: 16,
    password_reset: 6,
    email_verification: 4,

    // Payment
    stripe_integration: 20,
    paypal_integration: 18,
    subscription_billing: 24,
    invoice_generation: 12,
    refund_processing: 8,

    // UI/UX
    responsive_design: 16,
    dark_mode: 12,
    custom_animations: 20,
    accessibility_compliance: 24,
    multi_language: 16,

    // Admin
    user_management: 20,
    analytics_dashboard: 32,
    content_moderation: 16,
    role_permissions: 24,
    audit_logging: 12,

    // API
    rest_api: 24,
    graphql_api: 32,
    api_documentation: 12,
    rate_limiting: 8,
    webhooks: 16,

    // Database
    data_modeling: 20,
    migration_strategy: 12,
    backup_system: 16,
    caching_layer: 16,
    data_export: 12,

    // Communication
    email_notifications: 12,
    sms_notifications: 16,
    push_notifications: 20,
    in_app_messaging: 24,
    real_time_chat: 40,

    // Performance
    cdn_integration: 8,
    image_optimization: 12,
    lazy_loading: 8,
    server_side_rendering: 24,
    code_splitting: 12,

    // Media
    file_upload: 12,
    image_processing: 16,
    video_streaming: 32,
    pdf_generation: 16,
    document_preview: 12,

    // Social
    social_sharing: 8,
    comments_system: 20,
    likes_favorites: 12,
    user_profiles: 24,
    follow_system: 20,

    // Booking
    appointment_scheduling: 32,
    calendar_integration: 24,
    availability_management: 16,

    // Mobile
    react_native_app: 160,
    pwa: 24,
  };

  // Feature dependencies
  private featureDependencies: Record<string, string[]> = {
    social_login: ['user_registration'],
    two_factor_auth: ['user_registration'],
    subscription_billing: ['stripe_integration'],
    role_permissions: ['user_management'],
    real_time_chat: ['user_registration', 'websocket_setup'],
    push_notifications: ['user_registration'],
    video_streaming: ['file_upload'],
    calendar_integration: ['appointment_scheduling'],
  };

  constructor(baseHourlyRate?: number) {
    if (baseHourlyRate) {
      this.baseHourlyRate = baseHourlyRate;
    }
  }

  /**
   * Calculate project cost with detailed breakdown
   */
  calculate(input: CostCalculationInput): CostCalculationResult {
    const {
      projectType,
      features,
      complexity = 'medium',
      teamSize = 2,
      hourlyRate = this.baseHourlyRate,
    } = input;

    // Get complexity and project type multipliers
    const complexityMult = this.complexityMultipliers[complexity];
    const projectMult = this.projectTypeMultipliers[projectType];

    // Calculate breakdown for each feature
    const breakdown: CostBreakdownItem[] = [];
    const processedFeatures = new Set<string>();

    for (const feature of features) {
      this.calculateFeatureCost(
        feature,
        hourlyRate,
        complexityMult,
        projectMult,
        breakdown,
        processedFeatures
      );
    }

    // Calculate totals
    const total = breakdown.reduce((sum, item) => sum + item.subtotal, 0);
    // Add contingency (15%)
    const contingency = total * 0.15;
    const finalTotal = total + contingency;

    // Generate timeline
    const timeline = this.generateTimeline(breakdown, teamSize);

    // Generate assumptions
    const assumptions = [
      `Base hourly rate: $${hourlyRate}`,
      `Project type: ${projectType} (${projectMult}x multiplier)`,
      `Complexity: ${complexity} (${complexityMult}x multiplier)`,
      `Team size: ${teamSize} developers`,
      `15% contingency buffer included`,
      `Assumes 40 hours per week per developer`,
    ];

    // Calculate confidence based on known features
    const knownFeatures = features.filter(f => this.featureHours[f] !== undefined);
    const confidence = knownFeatures.length / features.length;

    return {
      total: Math.round(finalTotal),
      breakdown,
      timeline,
      assumptions,
      confidence,
    };
  }

  /**
   * Calculate cost for a single feature (with dependencies)
   */
  private calculateFeatureCost(
    feature: string,
    hourlyRate: number,
    complexityMult: number,
    projectMult: number,
    breakdown: CostBreakdownItem[],
    processedFeatures: Set<string>
  ): void {
    // Skip if already processed
    if (processedFeatures.has(feature)) {
      return;
    }

    // Check if feature exists
    const hours = this.featureHours[feature];
    if (!hours) {
      // Unknown feature - estimate based on name
      const estimatedHours = this.estimateUnknownFeature(feature);
      breakdown.push({
        category: 'Custom Feature',
        description: feature.replaceAll('_', ' '),
        hours: estimatedHours,
        rate: hourlyRate,
        subtotal: Math.round(estimatedHours * hourlyRate * complexityMult * projectMult),
        dependencies: [],
      });
      processedFeatures.add(feature);
      return;
    }

    // Process dependencies first
    const dependencies = this.featureDependencies[feature] || [];
    for (const dep of dependencies) {
      this.calculateFeatureCost(
        dep,
        hourlyRate,
        complexityMult,
        projectMult,
        breakdown,
        processedFeatures
      );
    }

    // Calculate feature cost
    const subtotal = Math.round(hours * hourlyRate * complexityMult * projectMult);

    breakdown.push({
      category: this.categorizeFeature(feature),
      description: feature.replaceAll('_', ' '),
      hours,
      rate: hourlyRate,
      subtotal,
      dependencies,
    });

    processedFeatures.add(feature);
  }

  /**
   * Estimate hours for unknown features
   */
  private estimateUnknownFeature(feature: string): number {
    const name = feature.toLowerCase();

    if (name.includes('simple') || name.includes('basic')) return 8;
    if (name.includes('complex') || name.includes('advanced')) return 32;
    if (name.includes('integration')) return 20;
    if (name.includes('dashboard') || name.includes('panel')) return 24;
    if (name.includes('notification')) return 16;
    if (name.includes('authentication') || name.includes('auth')) return 16;

    // Default estimate
    return 16;
  }

  /**
   * Categorize feature by name
   */
  private categorizeFeature(feature: string): string {
    const name = feature.toLowerCase();

    if (name.includes('auth') || name.includes('login') || name.includes('register')) {
      return 'Authentication & Security';
    }
    if (name.includes('payment') || name.includes('stripe') || name.includes('paypal')) {
      return 'Payment Processing';
    }
    if (name.includes('api') || name.includes('webhook')) {
      return 'API & Integration';
    }
    if (name.includes('admin') || name.includes('management') || name.includes('dashboard')) {
      return 'Admin & Management';
    }
    if (name.includes('notification') || name.includes('email') || name.includes('sms')) {
      return 'Communication';
    }
    if (name.includes('ui') || name.includes('design') || name.includes('responsive')) {
      return 'UI/UX';
    }
    if (name.includes('database') || name.includes('data') || name.includes('migration')) {
      return 'Database & Data';
    }
    if (name.includes('performance') || name.includes('cache') || name.includes('optimization')) {
      return 'Performance';
    }
    if (name.includes('social') || name.includes('share') || name.includes('follow')) {
      return 'Social Features';
    }
    if (name.includes('file') || name.includes('upload') || name.includes('media')) {
      return 'Media Handling';
    }

    return 'Custom Development';
  }

  /**
   * Generate project timeline
   */
  private generateTimeline(
    breakdown: CostBreakdownItem[],
    teamSize: number
  ): TimelineResult {
    const totalHours = breakdown.reduce((sum, item) => sum + item.hours, 0);

    // Calculate working days (40 hours per week per developer)
    const hoursPerWeek = 40 * teamSize;
    const developmentWeeks = Math.ceil(totalHours / hoursPerWeek);

    // Add testing and deployment time (25% of development)
    const testingWeeks = Math.ceil(developmentWeeks * 0.25);
    const totalWeeks = developmentWeeks + testingWeeks;
    const totalDays = totalWeeks * 5; // 5 working days per week

    // Create phases
    const phases = [
      {
        phase: 'Phase 1: Setup & Core Development',
        description: 'Project setup, database design, core features',
        durationWeeks: Math.ceil(developmentWeeks * 0.4),
        startWeek: 1,
        endWeek: Math.ceil(developmentWeeks * 0.4),
        tasks: [],
        dependencies: [],
        milestones: ['Project setup complete', 'Core features implemented'],
      },
      {
        phase: 'Phase 2: Feature Development',
        description: 'Advanced features, integrations',
        durationWeeks: Math.ceil(developmentWeeks * 0.4),
        startWeek: Math.ceil(developmentWeeks * 0.4) + 1,
        endWeek: Math.ceil(developmentWeeks * 0.8),
        tasks: [],
        dependencies: ['Phase 1: Setup & Core Development'],
        milestones: ['All features implemented', 'Integration complete'],
      },
      {
        phase: 'Phase 3: Testing & Refinement',
        description: 'QA testing, bug fixes, optimization',
        durationWeeks: Math.ceil(developmentWeeks * 0.2),
        startWeek: Math.ceil(developmentWeeks * 0.8) + 1,
        endWeek: developmentWeeks,
        tasks: [],
        dependencies: ['Phase 2: Feature Development'],
        milestones: ['Testing complete', 'Ready for deployment'],
      },
      {
        phase: 'Phase 4: Deployment & Launch',
        description: 'Production deployment, monitoring setup',
        durationWeeks: testingWeeks,
        startWeek: developmentWeeks + 1,
        endWeek: totalWeeks,
        tasks: [],
        dependencies: ['Phase 3: Testing & Refinement'],
        milestones: ['Production deployment', 'Project launch'],
      },
    ];

    // Identify critical path (features with most dependencies)
    const criticalPath = breakdown
      .filter(item => item.dependencies && item.dependencies.length > 0)
      .sort((a, b) => (b.dependencies?.length || 0) - (a.dependencies?.length || 0))
      .slice(0, 3)
      .map(item => item.description);

    const warnings: string[] = [];
    if (totalWeeks > 24) {
      warnings.push('Project duration exceeds 6 months - consider phased delivery');
    }
    if (teamSize < 2) {
      warnings.push('Single developer may face bottlenecks - consider adding team members');
    }

    return {
      totalWeeks,
      totalDays,
      phases,
      criticalPath,
      warnings,
    };
  }

  /**
   * Compare different scenarios
   */
  compareScenarios(
    baseInput: CostCalculationInput,
    scenarios: Array<Partial<CostCalculationInput>>
  ): Array<{ name: string; result: CostCalculationResult }> {
    return scenarios.map((scenario, index) => ({
      name: `Scenario ${index + 1}`,
      result: this.calculate({ ...baseInput, ...scenario }),
    }));
  }

  /**
   * Get feature hours
   */
  getFeatureHours(feature: string): number {
    return this.featureHours[feature] || this.estimateUnknownFeature(feature);
  }

  /**
   * Get feature dependencies
   */
  getFeatureDependencies(feature: string): string[] {
    return this.featureDependencies[feature] || [];
  }

  /**
   * Update base hourly rate
   */
  setBaseHourlyRate(rate: number): void {
    this.baseHourlyRate = rate;
  }

  /**
   * Get base hourly rate
   */
  getBaseHourlyRate(): number {
    return this.baseHourlyRate;
  }

  /**
   * Add custom feature
   */
  addCustomFeature(feature: string, hours: number, dependencies?: string[]): void {
    this.featureHours[feature] = hours;
    if (dependencies) {
      this.featureDependencies[feature] = dependencies;
    }
  }

  /**
   * Get all available features
   */
  getAllFeatures(): string[] {
    return Object.keys(this.featureHours);
  }
}
