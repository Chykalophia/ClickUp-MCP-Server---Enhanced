/* eslint-disable no-console, max-len */
/**
 * Capacity Modeling Service
 * 
 * Advanced capacity modeling for sprint planning with availability factors,
 * focus factors, and skill-based capacity adjustments.
 * 
 * @version 4.0.0
 * @since Phase 1.2 - Smart Sprint Planner
 */

import { z } from 'zod';

// Input/Output Schemas
export const TeamMemberSchema = z.object({
  userId: z.string().describe('ClickUp user ID'),
  name: z.string().describe('Team member name'),
  role: z.string().describe('Primary role (e.g., Frontend, Backend, QA, DevOps)'),
  skills: z.array(z.string()).describe('Technical skills and competencies'),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead']).describe('Experience level'),
  historicalVelocity: z.number().optional().describe('Personal historical velocity (story points per sprint)'),
  availabilityHours: z.number().min(0).max(40).describe('Available hours per week'),
  focusFactor: z.number().min(0).max(1).default(0.75).describe('Focus factor (0-1, typical 0.7-0.8)')
});

export const CapacityConstraintSchema = z.object({
  type: z.enum(['pto', 'meeting', 'training', 'support', 'other']).describe('Type of capacity constraint'),
  userId: z.string().describe('Affected team member'),
  startDate: z.string().describe('Start date (ISO format)'),
  endDate: z.string().describe('End date (ISO format)'),
  hoursImpact: z.number().min(0).describe('Hours of capacity reduction'),
  description: z.string().describe('Description of constraint')
});

export const SkillRequirementSchema = z.object({
  skill: z.string().describe('Required skill'),
  importance: z.enum(['required', 'preferred', 'nice-to-have']).describe('Importance level'),
  estimatedHours: z.number().min(0).describe('Estimated hours requiring this skill')
});

export const CapacityModelingInputSchema = z.object({
  teamId: z.string().describe('ClickUp team ID'),
  sprintStartDate: z.string().describe('Sprint start date (ISO format)'),
  sprintEndDate: z.string().describe('Sprint end date (ISO format)'),
  teamMembers: z.array(TeamMemberSchema).describe('Team member details'),
  constraints: z.array(CapacityConstraintSchema).default([]).describe('Capacity constraints'),
  skillRequirements: z.array(SkillRequirementSchema).default([]).describe('Sprint skill requirements'),
  includeBufferTime: z.boolean().default(true).describe('Include buffer time for unexpected work'),
  bufferPercentage: z.number().min(0).max(0.5).default(0.15).describe('Buffer percentage (0-0.5)')
});

export const IndividualCapacitySchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.string(),
  baseCapacity: z.object({
    totalHours: z.number().describe('Total available hours'),
    storyPointCapacity: z.number().describe('Estimated story point capacity')
  }),
  adjustedCapacity: z.object({
    availableHours: z.number().describe('Hours after constraints'),
    focusHours: z.number().describe('Hours after focus factor'),
    effectiveStoryPoints: z.number().describe('Effective story point capacity')
  }),
  constraints: z.array(z.object({
    type: z.string(),
    impact: z.number().describe('Hours lost to constraint'),
    description: z.string()
  })),
  skillMatch: z.object({
    primarySkills: z.array(z.string()).describe('Skills matching sprint requirements'),
    skillUtilization: z.number().min(0).max(1).describe('Percentage of capacity using primary skills'),
    crossTrainingOpportunities: z.array(z.string()).describe('Skills that could be developed')
  }),
  recommendations: z.array(z.string()).describe('Capacity optimization recommendations')
});

export const TeamCapacitySchema = z.object({
  totalCapacity: z.object({
    totalHours: z.number().describe('Total team hours available'),
    effectiveHours: z.number().describe('Effective hours after all adjustments'),
    storyPointCapacity: z.number().describe('Total story point capacity'),
    confidenceLevel: z.number().min(0).max(1).describe('Confidence in capacity estimate')
  }),
  skillCapacity: z.array(z.object({
    skill: z.string(),
    availableHours: z.number().describe('Hours available for this skill'),
    teamMembers: z.array(z.string()).describe('Team members with this skill'),
    utilizationRate: z.number().min(0).max(1).describe('Expected utilization rate')
  })),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    impact: z.string(),
    mitigation: z.string()
  })),
  recommendations: z.array(z.object({
    type: z.enum(['capacity', 'skills', 'planning', 'process']),
    priority: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    description: z.string(),
    expectedBenefit: z.string()
  }))
});

export const CapacityModelingResultSchema = z.object({
  teamId: z.string(),
  sprintPeriod: z.object({
    startDate: z.string(),
    endDate: z.string(),
    workingDays: z.number()
  }),
  individualCapacities: z.array(IndividualCapacitySchema),
  teamCapacity: TeamCapacitySchema,
  capacityUtilization: z.object({
    planned: z.number().min(0).max(1).describe('Planned utilization rate'),
    optimal: z.number().min(0).max(1).describe('Optimal utilization rate (70-85%)'),
    riskLevel: z.enum(['low', 'medium', 'high']).describe('Risk level based on utilization')
  }),
  metadata: z.object({
    calculatedAt: z.string().describe('Calculation timestamp'),
    dataQuality: z.number().min(0).max(1).describe('Quality of input data'),
    assumptions: z.array(z.string()).describe('Key assumptions made in calculations')
  })
});

export type CapacityModelingInput = z.infer<typeof CapacityModelingInputSchema>;
export type CapacityModelingResult = z.infer<typeof CapacityModelingResultSchema>;
export type TeamMember = z.infer<typeof TeamMemberSchema>;
export type IndividualCapacity = z.infer<typeof IndividualCapacitySchema>;
export type TeamCapacity = z.infer<typeof TeamCapacitySchema>;

/**
 * Advanced capacity modeling service for accurate sprint planning
 */
export class CapacityModelingService {
  private readonly OPTIMAL_UTILIZATION_MIN = 0.70;
  private readonly OPTIMAL_UTILIZATION_MAX = 0.85;
  private readonly DEFAULT_STORY_POINTS_PER_HOUR = 0.5; // Conservative estimate
  private readonly EXPERIENCE_MULTIPLIERS = {
    'junior': 0.7,
    'mid': 1.0,
    'senior': 1.3,
    'lead': 1.5
  };

  /**
   * Models team capacity for sprint planning
   */
  async modelCapacity(input: CapacityModelingInput): Promise<CapacityModelingResult> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = CapacityModelingInputSchema.parse(input);
      
      // Calculate working days in sprint
      const workingDays = this.calculateWorkingDays(
        validatedInput.sprintStartDate,
        validatedInput.sprintEndDate
      );
      
      // Calculate individual capacities
      const individualCapacities = await this.calculateIndividualCapacities(
        validatedInput.teamMembers,
        validatedInput.constraints,
        validatedInput.skillRequirements,
        workingDays
      );
      
      // Calculate team capacity
      const teamCapacity = this.calculateTeamCapacity(
        individualCapacities,
        validatedInput.skillRequirements,
        validatedInput.includeBufferTime,
        validatedInput.bufferPercentage
      );
      
      // Analyze capacity utilization
      const capacityUtilization = this.analyzeCapacityUtilization(teamCapacity);
      
      // Generate metadata
      const metadata = this.generateMetadata(validatedInput, startTime);
      
      const result: CapacityModelingResult = {
        teamId: validatedInput.teamId,
        sprintPeriod: {
          startDate: validatedInput.sprintStartDate,
          endDate: validatedInput.sprintEndDate,
          workingDays
        },
        individualCapacities,
        teamCapacity,
        capacityUtilization,
        metadata
      };
      
      return CapacityModelingResultSchema.parse(result);
      
    } catch (error) {
      console.error('[CapacityModelingService] Modeling failed:', error);
      throw new Error(`Capacity modeling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates individual team member capacities
   */
  private async calculateIndividualCapacities(
    teamMembers: TeamMember[],
    constraints: any[],
    skillRequirements: any[],
    workingDays: number
  ): Promise<IndividualCapacity[]> {
    return teamMembers.map(member => {
      // Calculate base capacity
      const totalHours = member.availabilityHours * (workingDays / 5); // Assuming 5-day work week
      const experienceMultiplier = this.EXPERIENCE_MULTIPLIERS[member.experienceLevel];
      const baseStoryPointCapacity = totalHours * this.DEFAULT_STORY_POINTS_PER_HOUR * experienceMultiplier;
      
      // Apply constraints
      const memberConstraints = constraints.filter(c => c.userId === member.userId);
      const constraintHours = memberConstraints.reduce((sum, c) => sum + c.hoursImpact, 0);
      const availableHours = Math.max(0, totalHours - constraintHours);
      
      // Apply focus factor
      const focusHours = availableHours * member.focusFactor;
      const effectiveStoryPoints = focusHours * this.DEFAULT_STORY_POINTS_PER_HOUR * experienceMultiplier;
      
      // Analyze skill match
      const skillMatch = this.analyzeSkillMatch(member, skillRequirements);
      
      // Generate recommendations
      const recommendations = this.generateIndividualRecommendations(
        member,
        memberConstraints,
        skillMatch,
        availableHours,
        focusHours
      );
      
      return {
        userId: member.userId,
        name: member.name,
        role: member.role,
        baseCapacity: {
          totalHours: Math.round(totalHours * 100) / 100,
          storyPointCapacity: Math.round(baseStoryPointCapacity * 100) / 100
        },
        adjustedCapacity: {
          availableHours: Math.round(availableHours * 100) / 100,
          focusHours: Math.round(focusHours * 100) / 100,
          effectiveStoryPoints: Math.round(effectiveStoryPoints * 100) / 100
        },
        constraints: memberConstraints.map(c => ({
          type: c.type,
          impact: c.hoursImpact,
          description: c.description
        })),
        skillMatch,
        recommendations
      };
    });
  }

  /**
   * Calculates team-level capacity metrics
   */
  private calculateTeamCapacity(
    individualCapacities: IndividualCapacity[],
    skillRequirements: any[],
    includeBuffer: boolean,
    bufferPercentage: number
  ): TeamCapacity {
    // Aggregate team totals
    const totalHours = individualCapacities.reduce((sum, ic) => sum + ic.baseCapacity.totalHours, 0);
    const effectiveHours = individualCapacities.reduce((sum, ic) => sum + ic.adjustedCapacity.focusHours, 0);
    const rawStoryPointCapacity = individualCapacities.reduce((sum, ic) => sum + ic.adjustedCapacity.effectiveStoryPoints, 0);
    
    // Apply buffer if requested
    const storyPointCapacity = includeBuffer ? 
      rawStoryPointCapacity * (1 - bufferPercentage) : 
      rawStoryPointCapacity;
    
    // Calculate confidence level
    const confidenceLevel = this.calculateCapacityConfidence(individualCapacities);
    
    // Analyze skill capacity
    const skillCapacity = this.analyzeSkillCapacity(individualCapacities, skillRequirements);
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(individualCapacities, skillCapacity);
    
    // Generate team recommendations
    const recommendations = this.generateTeamRecommendations(
      individualCapacities,
      skillCapacity,
      riskFactors
    );
    
    return {
      totalCapacity: {
        totalHours: Math.round(totalHours * 100) / 100,
        effectiveHours: Math.round(effectiveHours * 100) / 100,
        storyPointCapacity: Math.round(storyPointCapacity * 100) / 100,
        confidenceLevel: Math.round(confidenceLevel * 100) / 100
      },
      skillCapacity,
      riskFactors,
      recommendations
    };
  }

  /**
   * Analyzes capacity utilization and risk levels
   */
  private analyzeCapacityUtilization(teamCapacity: TeamCapacity) {
    const effectiveCapacity = teamCapacity.totalCapacity.storyPointCapacity;
    
    // For this analysis, we'll assume a target sprint commitment
    // In a real implementation, this would come from sprint planning input
    const assumedSprintCommitment = effectiveCapacity * 0.8; // Conservative planning
    
    const planned = assumedSprintCommitment / effectiveCapacity;
    const optimal = (this.OPTIMAL_UTILIZATION_MIN + this.OPTIMAL_UTILIZATION_MAX) / 2;
    
    let riskLevel: 'low' | 'medium' | 'high';
    if (planned <= this.OPTIMAL_UTILIZATION_MAX) {
      riskLevel = 'low';
    } else if (planned <= 0.95) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }
    
    return {
      planned: Math.round(planned * 100) / 100,
      optimal: Math.round(optimal * 100) / 100,
      riskLevel
    };
  }

  /**
   * Helper methods
   */
  private calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  private analyzeSkillMatch(member: TeamMember, skillRequirements: any[]) {
    const memberSkills = member.skills.map(s => s.toLowerCase());
    const requiredSkills = skillRequirements.map(sr => sr.skill.toLowerCase());
    
    const primarySkills = member.skills.filter(skill => 
      requiredSkills.includes(skill.toLowerCase())
    );
    
    const skillUtilization = primarySkills.length > 0 ? 
      primarySkills.length / Math.max(member.skills.length, requiredSkills.length) : 0;
    
    const crossTrainingOpportunities = skillRequirements
      .filter(sr => !memberSkills.includes(sr.skill.toLowerCase()))
      .map(sr => sr.skill);
    
    return {
      primarySkills,
      skillUtilization: Math.round(skillUtilization * 100) / 100,
      crossTrainingOpportunities
    };
  }

  private generateIndividualRecommendations(
    member: TeamMember,
    constraints: any[],
    skillMatch: any,
    availableHours: number,
    focusHours: number
  ): string[] {
    const recommendations = [];
    
    // Low focus factor recommendation
    if (member.focusFactor < 0.7) {
      recommendations.push(`Consider investigating factors reducing ${member.name}'s focus factor (${(member.focusFactor * 100).toFixed(0)}%)`);
    }
    
    // High constraint impact
    const constraintImpact = constraints.reduce((sum, c) => sum + c.hoursImpact, 0);
    if (constraintImpact > availableHours * 0.3) {
      recommendations.push(`High constraint impact (${constraintImpact.toFixed(1)}h) - consider redistributing responsibilities`);
    }
    
    // Skill development opportunities
    if (skillMatch.crossTrainingOpportunities.length > 0) {
      recommendations.push(`Cross-training opportunities: ${skillMatch.crossTrainingOpportunities.slice(0, 2).join(', ')}`);
    }
    
    // Capacity optimization
    if (focusHours < member.availabilityHours * 0.6) {
      recommendations.push('Consider capacity optimization - current effective hours are below optimal range');
    }
    
    return recommendations;
  }

  private analyzeSkillCapacity(individualCapacities: IndividualCapacity[], skillRequirements: any[]) {
    const skillMap = new Map<string, { hours: number; members: string[] }>();
    
    // Initialize skill map
    skillRequirements.forEach(sr => {
      skillMap.set(sr.skill, { hours: 0, members: [] });
    });
    
    // Calculate available hours per skill
    individualCapacities.forEach(ic => {
      ic.skillMatch.primarySkills.forEach(skill => {
        const skillData = skillMap.get(skill);
        if (skillData) {
          skillData.hours += ic.adjustedCapacity.focusHours * ic.skillMatch.skillUtilization;
          skillData.members.push(ic.name);
        }
      });
    });
    
    return Array.from(skillMap.entries()).map(([skill, data]) => ({
      skill,
      availableHours: Math.round(data.hours * 100) / 100,
      teamMembers: [...new Set(data.members)], // Remove duplicates
      utilizationRate: Math.min(1.0, data.hours / (data.members.length * 40)) // Rough utilization estimate
    }));
  }

  private identifyRiskFactors(individualCapacities: IndividualCapacity[], skillCapacity: any[]) {
    const riskFactors = [];
    
    // Single point of failure risks
    const criticalSkills = skillCapacity.filter(sc => sc.teamMembers.length === 1);
    if (criticalSkills.length > 0) {
      riskFactors.push({
        factor: 'Single Point of Failure',
        severity: 'high' as const,
        impact: `${criticalSkills.length} critical skills have only one team member`,
        mitigation: 'Cross-train additional team members in critical skills'
      });
    }
    
    // Low capacity utilization
    const lowCapacityMembers = individualCapacities.filter(ic => 
      ic.adjustedCapacity.focusHours < ic.baseCapacity.totalHours * 0.6
    );
    if (lowCapacityMembers.length > 0) {
      riskFactors.push({
        factor: 'Underutilized Capacity',
        severity: 'medium' as const,
        impact: `${lowCapacityMembers.length} team members have significant capacity constraints`,
        mitigation: 'Review and optimize capacity constraints and focus factors'
      });
    }
    
    // Skill gaps
    const skillGaps = skillCapacity.filter(sc => sc.availableHours < 10); // Less than 10 hours available
    if (skillGaps.length > 0) {
      riskFactors.push({
        factor: 'Skill Capacity Gaps',
        severity: 'medium' as const,
        impact: `Limited capacity for ${skillGaps.map(sg => sg.skill).join(', ')}`,
        mitigation: 'Consider skill development or external resources'
      });
    }
    
    return riskFactors;
  }

  private generateTeamRecommendations(
    individualCapacities: IndividualCapacity[],
    skillCapacity: any[],
    riskFactors: any[]
  ) {
    const recommendations = [];
    
    // High-priority recommendations based on risk factors
    if (riskFactors.some(rf => rf.severity === 'high')) {
      recommendations.push({
        type: 'skills' as const,
        priority: 'high' as const,
        title: 'Address Critical Skill Dependencies',
        description: 'Implement cross-training program for critical skills with single points of failure',
        expectedBenefit: 'Reduce sprint risk by 30-50%'
      });
    }
    
    // Capacity optimization recommendations
    const totalEffectiveHours = individualCapacities.reduce((sum, ic) => sum + ic.adjustedCapacity.focusHours, 0);
    const totalAvailableHours = individualCapacities.reduce((sum, ic) => sum + ic.baseCapacity.totalHours, 0);
    const utilizationRate = totalEffectiveHours / totalAvailableHours;
    
    if (utilizationRate < 0.7) {
      recommendations.push({
        type: 'capacity' as const,
        priority: 'medium' as const,
        title: 'Optimize Team Capacity Utilization',
        description: `Current utilization is ${(utilizationRate * 100).toFixed(0)}%. Review constraints and focus factors.`,
        expectedBenefit: 'Increase effective capacity by 15-25%'
      });
    }
    
    // Planning recommendations
    recommendations.push({
      type: 'planning' as const,
      priority: 'medium' as const,
      title: 'Implement Capacity-Based Sprint Planning',
      description: 'Use calculated capacity metrics for more accurate sprint commitments',
      expectedBenefit: 'Improve sprint predictability by 20-30%'
    });
    
    return recommendations;
  }

  private calculateCapacityConfidence(individualCapacities: IndividualCapacity[]): number {
    // Factors affecting confidence:
    // - Data completeness (all team members have historical data)
    // - Constraint clarity (well-defined constraints)
    // - Skill match accuracy (clear skill requirements)
    
    let confidence = 0.8; // Base confidence
    
    // Adjust based on data quality
    const membersWithHistoricalData = individualCapacities.filter(ic => 
      ic.baseCapacity.storyPointCapacity > 0
    ).length;
    const dataCompleteness = membersWithHistoricalData / individualCapacities.length;
    confidence *= (0.7 + (dataCompleteness * 0.3)); // 70-100% based on data completeness
    
    // Adjust based on constraint impact variability
    const constraintVariability = this.calculateConstraintVariability(individualCapacities);
    confidence *= (1 - (constraintVariability * 0.2)); // Reduce confidence for high variability
    
    return Math.min(1.0, Math.max(0.3, confidence)); // Keep between 30-100%
  }

  private calculateConstraintVariability(individualCapacities: IndividualCapacity[]): number {
    const constraintImpacts = individualCapacities.map(ic => 
      ic.constraints.reduce((sum, c) => sum + c.impact, 0)
    );
    
    if (constraintImpacts.length === 0) return 0;
    
    const average = constraintImpacts.reduce((sum, impact) => sum + impact, 0) / constraintImpacts.length;
    const variance = constraintImpacts.reduce((sum, impact) => sum + Math.pow(impact - average, 2), 0) / constraintImpacts.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Normalize to 0-1 scale (high variability = closer to 1)
    return Math.min(1.0, standardDeviation / (average + 1));
  }

  private generateMetadata(input: CapacityModelingInput, _startTime: number) {
    const assumptions = [
      `Default story points per hour: ${this.DEFAULT_STORY_POINTS_PER_HOUR}`,
      `Experience multipliers applied: Junior (${this.EXPERIENCE_MULTIPLIERS.junior}x), Senior (${this.EXPERIENCE_MULTIPLIERS.senior}x)`,
      'Working days exclude weekends',
      `Buffer time ${input.includeBufferTime ? 'included' : 'excluded'} at ${(input.bufferPercentage * 100).toFixed(0)}%`
    ];
    
    // Assess data quality
    const hasHistoricalData = input.teamMembers.some(tm => tm.historicalVelocity !== undefined);
    const hasDetailedSkills = input.teamMembers.every(tm => tm.skills.length > 0);
    const hasConstraints = input.constraints.length > 0;
    
    let dataQuality = 0.6; // Base quality
    if (hasHistoricalData) dataQuality += 0.2;
    if (hasDetailedSkills) dataQuality += 0.1;
    if (hasConstraints) dataQuality += 0.1;
    
    return {
      calculatedAt: new Date().toISOString(),
      dataQuality: Math.round(dataQuality * 100) / 100,
      assumptions
    };
  }
}

/**
 * Factory function for creating CapacityModelingService instances
 */
export function createCapacityModelingService(): CapacityModelingService {
  return new CapacityModelingService();
}
