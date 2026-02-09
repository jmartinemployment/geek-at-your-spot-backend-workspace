// ============================================
// src/code-execution/calculators/FeasibilityChecker.ts
// Technical Feasibility Checks & Risk Assessment
// ============================================

import {
  FeasibilityCheckInput,
  FeasibilityResult,
  FeasibilityRisk,
  FeasibilityRecommendation,
} from '../types';

export class FeasibilityChecker {
  // Technology compatibility matrix
  private readonly technologyCompatibility: Record<string, string[]> = {
    react: ['node', 'express', 'nextjs', 'typescript', 'tailwind'],
    angular: ['node', 'express', 'typescript', 'rxjs'],
    vue: ['node', 'express', 'nuxtjs', 'typescript'],
    nextjs: ['react', 'typescript', 'vercel'],
    node: ['express', 'nestjs', 'postgresql', 'mongodb', 'redis'],
    express: ['node', 'postgresql', 'mongodb', 'jwt'],
    nestjs: ['node', 'typescript', 'postgresql', 'mongodb'],
    postgresql: ['node', 'prisma', 'typeorm'],
    mongodb: ['node', 'mongoose'],
    prisma: ['postgresql', 'mysql', 'mongodb', 'typescript'],
    redis: ['node', 'express', 'nestjs'],
    aws: ['s3', 'ec2', 'lambda', 'rds'],
    docker: ['kubernetes', 'aws', 'gcp'],
  };

  // Complexity scores for features
  private readonly featureComplexity: Record<string, number> = {
    user_registration: 3,
    social_login: 5,
    two_factor_auth: 7,
    real_time_chat: 9,
    video_streaming: 10,
    payment_integration: 8,
    subscription_billing: 9,
    api_integration: 6,
    data_migration: 7,
    machine_learning: 10,
    blockchain: 10,
    ar_vr: 10,
  };

  // Team experience multipliers
  private readonly experienceMultipliers = {
    junior: 1.5,
    mid: 1,
    senior: 0.8,
  };

  /**
   * Check technical feasibility of a project
   */
  check(input: FeasibilityCheckInput): FeasibilityResult {
    const risks: FeasibilityRisk[] = [];
    const recommendations: FeasibilityRecommendation[] = [];

    // Check technology compatibility
    const techRisks = this.checkTechnologyCompatibility(input.technologies);
    risks.push(...techRisks);

    // Check feature complexity
    const complexityRisks = this.checkFeatureComplexity(input.features);
    risks.push(...complexityRisks);

    // Check constraints
    if (input.constraints) {
      const constraintRisks = this.checkConstraints(input);
      risks.push(...constraintRisks);
    }

    // Check project type feasibility
    const projectRisks = this.checkProjectType(input.projectType, input.features);
    risks.push(...projectRisks);

    // Generate recommendations
    const techRecommendations = this.generateTechnologyRecommendations(input);
    recommendations.push(...techRecommendations);

    const processRecommendations = this.generateProcessRecommendations(risks);
    recommendations.push(...processRecommendations);

    // Calculate overall score (0-100)
    const overallScore = this.calculateFeasibilityScore(risks, input);

    // Determine if feasible
    const feasible = overallScore >= 60;

    // Identify technical constraints
    const technicalConstraints = this.identifyTechnicalConstraints(input);

    // Suggest alternatives if not feasible
    const alternativeApproaches = feasible
      ? undefined
      : this.suggestAlternativeApproaches(input, risks);

    return {
      feasible,
      overallScore,
      risks: [...risks].sort((a, b) => {
        const levelOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return levelOrder[b.level] - levelOrder[a.level];
      }),
      recommendations: [...recommendations].sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      technicalConstraints,
      alternativeApproaches,
    };
  }

  /**
   * Check technology compatibility
   */
  private checkTechnologyCompatibility(technologies: string[]): FeasibilityRisk[] {
    const risks: FeasibilityRisk[] = [];

    for (let i = 0; i < technologies.length; i++) {
      const tech1 = technologies[i].toLowerCase();

      for (let j = i + 1; j < technologies.length; j++) {
        const tech2 = technologies[j].toLowerCase();

        // Check if technologies are compatible
        const compatible1 = this.technologyCompatibility[tech1]?.includes(tech2);
        const compatible2 = this.technologyCompatibility[tech2]?.includes(tech1);

        if (!compatible1 && !compatible2) {
          // Check for known conflicts
          const hasConflict = this.hasKnownConflict(tech1, tech2);

          if (hasConflict) {
            risks.push({
              level: 'high',
              category: 'Technology Compatibility',
              description: `${tech1} and ${tech2} may have compatibility issues`,
              impact: 'Integration challenges, potential architecture redesign',
              mitigation: `Consider using adapters or middleware, or choose alternative technologies`,
            });
          }
        }
      }
    }

    return risks;
  }

  /**
   * Check known technology conflicts
   */
  private hasKnownConflict(tech1: string, tech2: string): boolean {
    const conflicts = [
      ['angular', 'react'],
      ['angular', 'vue'],
      ['react', 'vue'],
      ['mysql', 'mongodb'], // Not a conflict but requires careful consideration
    ];

    return conflicts.some(
      ([t1, t2]) =>
        (tech1.includes(t1) && tech2.includes(t2)) ||
        (tech1.includes(t2) && tech2.includes(t1))
    );
  }

  /**
   * Check feature complexity
   */
  private checkFeatureComplexity(features: string[]): FeasibilityRisk[] {
    const risks: FeasibilityRisk[] = [];

    // Calculate average complexity
    let totalComplexity = 0;
    let complexFeatures = 0;

    for (const feature of features) {
      const featureLower = feature.toLowerCase().replaceAll(' ', '_');
      const complexity = this.featureComplexity[featureLower] || 5;

      totalComplexity += complexity;

      if (complexity >= 8) {
        complexFeatures++;
        risks.push({
          level: complexity >= 9 ? 'high' : 'medium',
          category: 'Feature Complexity',
          description: `${feature} is highly complex (complexity: ${complexity}/10)`,
          impact: 'Extended development time, potential technical challenges',
          mitigation: 'Break into smaller features, consider third-party solutions, allocate senior developers',
        });
      }
    }

    const avgComplexity = totalComplexity / features.length;

    if (avgComplexity > 7) {
      risks.push({
        level: 'high',
        category: 'Overall Complexity',
        description: `High average feature complexity (${avgComplexity.toFixed(1)}/10)`,
        impact: 'Project may exceed estimates, higher risk of delays',
        mitigation: 'Phased approach, prioritize MVP features, increase team size',
      });
    }

    if (complexFeatures > 3) {
      risks.push({
        level: 'medium',
        category: 'Feature Complexity',
        description: `${complexFeatures} highly complex features in single project`,
        impact: 'Increased risk of technical debt and quality issues',
        mitigation: 'Dedicate specialized team members, increase testing efforts',
      });
    }

    return risks;
  }

  /**
   * Check constraints
   */
  private checkConstraints(input: FeasibilityCheckInput): FeasibilityRisk[] {
    const risks: FeasibilityRisk[] = [];
    const { constraints } = input;

    if (!constraints) return risks;

    // Check budget constraints
    if (constraints.budget) {
      const estimatedCost = this.estimateCost(input);

      if (estimatedCost > constraints.budget * 1.2) {
        risks.push({
          level: 'critical',
          category: 'Budget',
          description: `Estimated cost ($${estimatedCost}) significantly exceeds budget ($${constraints.budget})`,
          impact: 'Project not viable without scope reduction',
          mitigation: 'Reduce feature scope, phased delivery, increase budget',
        });
      } else if (estimatedCost > constraints.budget) {
        risks.push({
          level: 'high',
          category: 'Budget',
          description: `Estimated cost ($${estimatedCost}) exceeds budget ($${constraints.budget})`,
          impact: 'May need to cut features or increase budget',
          mitigation: 'Prioritize MVP features, negotiate budget increase',
        });
      }
    }

    // Check timeline constraints
    if (constraints.timeline) {
      const estimatedWeeks = this.estimateTimeline(input);

      if (estimatedWeeks > constraints.timeline * 1.5) {
        risks.push({
          level: 'critical',
          category: 'Timeline',
          description: `Estimated timeline (${estimatedWeeks} weeks) far exceeds constraint (${constraints.timeline} weeks)`,
          impact: 'Timeline not achievable without major scope reduction',
          mitigation: 'Significantly reduce scope, increase team size, phased delivery',
        });
      } else if (estimatedWeeks > constraints.timeline) {
        risks.push({
          level: 'high',
          category: 'Timeline',
          description: `Estimated timeline (${estimatedWeeks} weeks) exceeds constraint (${constraints.timeline} weeks)`,
          impact: 'May miss deadline or require scope reduction',
          mitigation: 'Increase team size, prioritize critical features, parallel development',
        });
      }
    }

    // Check team experience
    if (constraints.teamExperience === 'junior') {
      risks.push({
        level: 'medium',
        category: 'Team Experience',
        description: 'Junior team may struggle with complex features',
        impact: 'Extended development time, higher defect rate',
        mitigation: 'Provide mentorship, simplify architecture, increase code review',
      });
    }

    return risks;
  }

  /**
   * Check project type feasibility
   */
  private checkProjectType(projectType: string, features: string[]): FeasibilityRisk[] {
    const risks: FeasibilityRisk[] = [];

    // Check if features are appropriate for project type
    if (projectType === 'website') {
      const mobileFeatures = features.filter(f =>
        f.toLowerCase().includes('mobile') ||
        f.toLowerCase().includes('app store')
      );

      if (mobileFeatures.length > 0) {
        risks.push({
          level: 'medium',
          category: 'Project Type Mismatch',
          description: 'Mobile-specific features in website project',
          impact: 'Features may not be applicable or need adaptation',
          mitigation: 'Consider PWA or separate mobile app',
        });
      }
    }

    return risks;
  }

  /**
   * Generate technology recommendations
   */
  private generateTechnologyRecommendations(input: FeasibilityCheckInput): FeasibilityRecommendation[] {
    const recommendations: FeasibilityRecommendation[] = [];

    // Check if missing essential technologies
    const hasDatabase = input.technologies.some(t =>
      ['postgresql', 'mysql', 'mongodb', 'sqlite'].includes(t.toLowerCase())
    );

    if (!hasDatabase && input.features.length > 5) {
      recommendations.push({
        priority: 'high',
        category: 'Technology Stack',
        recommendation: 'Add database technology to stack',
        rationale: 'Project with multiple features requires persistent data storage',
        estimatedImpact: 'Improved data management and scalability',
      });
    }

    // Check for authentication features
    const hasAuth = input.features.some(f =>
      f.toLowerCase().includes('auth') || f.toLowerCase().includes('login')
    );

    if (hasAuth && !input.technologies.some(t => t.toLowerCase().includes('jwt'))) {
      recommendations.push({
        priority: 'medium',
        category: 'Security',
        recommendation: 'Add JWT or similar authentication library',
        rationale: 'Authentication features require secure token management',
        estimatedImpact: 'Secure user authentication system',
      });
    }

    return recommendations;
  }

  /**
   * Generate process recommendations
   */
  private generateProcessRecommendations(risks: FeasibilityRisk[]): FeasibilityRecommendation[] {
    const recommendations: FeasibilityRecommendation[] = [];

    const highRisks = risks.filter(r => r.level === 'high' || r.level === 'critical');

    if (highRisks.length > 3) {
      recommendations.push({
        priority: 'high',
        category: 'Project Management',
        recommendation: 'Implement risk mitigation plan',
        rationale: `${highRisks.length} high-priority risks identified`,
        estimatedImpact: 'Reduced project risk, better predictability',
      });
    }

    if (highRisks.some(r => r.category === 'Feature Complexity')) {
      recommendations.push({
        priority: 'high',
        category: 'Development Process',
        recommendation: 'Adopt phased delivery approach',
        rationale: 'Complex features benefit from iterative development',
        estimatedImpact: 'Faster time to market, reduced technical risk',
      });
    }

    return recommendations;
  }

  /**
   * Calculate feasibility score (0-100)
   */
  private calculateFeasibilityScore(risks: FeasibilityRisk[], input: FeasibilityCheckInput): number {
    let score = 100;

    // Deduct points for risks
    for (const risk of risks) {
      switch (risk.level) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }

    // Adjust for team experience
    if (input.constraints?.teamExperience === 'senior') {
      score += 10;
    } else if (input.constraints?.teamExperience === 'junior') {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify technical constraints
   */
  private identifyTechnicalConstraints(input: FeasibilityCheckInput): string[] {
    const constraints: string[] = [];

    // Check for specialized requirements
    if (input.features.some(f => f.toLowerCase().includes('real-time'))) {
      constraints.push('Requires WebSocket or similar real-time communication');
    }

    if (input.features.some(f => f.toLowerCase().includes('video'))) {
      constraints.push('Requires video processing infrastructure and CDN');
    }

    if (input.features.some(f => f.toLowerCase().includes('payment'))) {
      constraints.push('Requires PCI compliance and secure payment processing');
    }

    if (input.features.some(f => f.toLowerCase().includes('mobile'))) {
      constraints.push('Requires mobile development expertise and app store accounts');
    }

    return constraints;
  }

  /**
   * Suggest alternative approaches
   */
  private suggestAlternativeApproaches(
    input: FeasibilityCheckInput,
    risks: FeasibilityRisk[]
  ): string[] {
    const alternatives: string[] = [];

    if (risks.some(r => r.category === 'Budget' && r.level === 'critical')) {
      alternatives.push(
        'Phased MVP approach: Launch with core features, add advanced features later',
        'Use no-code/low-code platforms for initial version',
      );
    }

    if (risks.some(r => r.category === 'Feature Complexity')) {
      alternatives.push(
        'Leverage third-party services for complex features (e.g., Stripe for payments, Twilio for SMS)',
        'Consider open-source solutions to accelerate development',
      );
    }

    if (risks.some(r => r.category === 'Timeline')) {
      alternatives.push(
        'Increase team size to parallelize development',
        'Reduce feature scope to meet timeline',
      );
    }

    return alternatives;
  }

  /**
   * Estimate cost (rough estimate)
   */
  private estimateCost(input: FeasibilityCheckInput): number {
    const baseRate = 150; // $150/hour
    let totalHours = 0;

    for (const feature of input.features) {
      const featureLower = feature.toLowerCase().replaceAll(' ', '_');
      const complexity = this.featureComplexity[featureLower] || 5;
      const hours = complexity * 10; // Rough estimate
      totalHours += hours;
    }

    // Apply team experience multiplier
    const experienceMult = input.constraints?.teamExperience
      ? this.experienceMultipliers[input.constraints.teamExperience]
      : 1;

    return Math.round(totalHours * baseRate * experienceMult);
  }

  /**
   * Estimate timeline (rough estimate in weeks)
   */
  private estimateTimeline(input: FeasibilityCheckInput): number {
    const totalHours = input.features.length * 40; // Rough estimate
    const teamSize = 2;
    const hoursPerWeek = 40 * teamSize;

    const weeks = Math.ceil(totalHours / hoursPerWeek);

    // Apply team experience multiplier
    const experienceMult = input.constraints?.teamExperience
      ? this.experienceMultipliers[input.constraints.teamExperience]
      : 1;

    return Math.ceil(weeks * experienceMult);
  }
}
