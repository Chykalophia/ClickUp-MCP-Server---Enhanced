// Core interfaces for resource optimization
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  skills: Skill[];
  capacity: number; // hours per week
  currentWorkload: number; // hours currently assigned
  availability: Availability;
  preferences: WorkPreferences;
  performanceMetrics: PerformanceMetrics;
  burnoutRisk: BurnoutRiskLevel;
}

export interface Skill {
  name: string;
  proficiency: number; // 1-10 scale
  category: SkillCategory;
  yearsExperience: number;
  lastUsed: Date;
  certifications: string[];
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  estimatedEffort: number; // hours
  requiredSkills: RequiredSkill[];
  priority: number; // 1-4
  complexity: number; // 1-10
  deadline?: Date;
  dependencies: string[];
  currentAssignee?: string;
}

export interface RequiredSkill {
  name: string;
  minimumProficiency: number;
  importance: SkillImportance;
  isRequired: boolean;
}

export interface WorkloadAnalysis {
  teamId: string;
  analysisDate: Date;
  totalCapacity: number;
  utilizedCapacity: number;
  utilizationRate: number;
  memberAnalysis: MemberWorkloadAnalysis[];
  bottlenecks: ResourceBottleneck[];
  recommendations: string[];
  balanceScore: number; // 0-100
  riskLevel: RiskLevel;
}

export interface MemberWorkloadAnalysis {
  memberId: string;
  memberName: string;
  capacity: number;
  currentWorkload: number;
  utilizationRate: number;
  skillUtilization: SkillUtilization[];
  burnoutRisk: BurnoutRiskLevel;
  workloadTrend: WorkloadTrend;
  recommendations: string[];
}

export interface AssignmentPlan {
  planId: string;
  createdDate: Date;
  assignments: TaskAssignment[];
  balanceScore: number; // 0-100
  skillMatchScore: number; // 0-100
  capacityUtilization: number; // percentage
  alternativeOptions: AssignmentOption[];
  confidence: number; // 0-1
  estimatedImpact: AssignmentImpact;
}

export interface TaskAssignment {
  taskId: string;
  assigneeId: string;
  assigneeName: string;
  skillMatch: SkillMatchAnalysis;
  workloadImpact: WorkloadImpact;
  confidence: number;
  reasoning: string[];
  alternatives: AlternativeAssignment[];
}

export interface BurnoutRisk {
  memberId: string;
  riskLevel: BurnoutRiskLevel;
  riskFactors: BurnoutRiskFactor[];
  earlyWarningSignals: WarningSignal[];
  recommendations: BurnoutPrevention[];
  timeToAction: number; // days
  confidence: number;
}

export interface CapacityForecast {
  teamId: string;
  forecastPeriod: ForecastPeriod;
  projectedCapacity: ProjectedCapacity[];
  bottleneckPredictions: BottleneckPrediction[];
  resourceNeeds: ResourceNeed[];
  recommendations: CapacityRecommendation[];
  confidence: number;
}

export interface ResourceRecommendations {
  immediate: ImmediateAction[];
  shortTerm: ShortTermAction[];
  longTerm: LongTermAction[];
  hiring: HiringRecommendation[];
  training: TrainingRecommendation[];
  processImprovements: ProcessImprovement[];
}

// Supporting types and enums
/* eslint-disable no-unused-vars */
export enum SkillCategory {
  TECHNICAL = 'technical',
  BUSINESS = 'business',
  COMMUNICATION = 'communication',
  LEADERSHIP = 'leadership',
  DOMAIN = 'domain'
}

export enum SkillImportance {
  CRITICAL = 'critical',
  IMPORTANT = 'important',
  NICE_TO_HAVE = 'nice_to_have'
}

export enum BurnoutRiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
/* eslint-enable no-unused-vars */

export interface Availability {
  hoursPerWeek: number;
  workingDays: number[];
  timeZone: string;
  vacationDays: Date[];
  unavailablePeriods: UnavailablePeriod[];
}

export interface WorkPreferences {
  preferredTaskTypes: string[];
  learningGoals: string[];
  avoidTaskTypes: string[];
  workingStyle: WorkingStyle;
  collaborationPreference: CollaborationPreference;
}

export interface PerformanceMetrics {
  taskCompletionRate: number;
  averageTaskTime: number;
  qualityScore: number;
  collaborationScore: number;
  learningVelocity: number;
  burnoutIndicators: BurnoutIndicator[];
}

export interface SkillUtilization {
  skillName: string;
  utilizationRate: number;
  growthOpportunity: number;
  lastUsed: Date;
}

export interface WorkloadTrend {
  direction: TrendDirection;
  velocity: number;
  sustainabilityScore: number;
  projectedBurnout: Date | null;
}

export interface ResourceBottleneck {
  type: BottleneckType;
  severity: number; // 1-10
  affectedMembers: string[];
  estimatedImpact: number; // hours delayed
  suggestedActions: string[];
}

export interface SkillMatchAnalysis {
  overallMatch: number; // 0-100
  skillGaps: SkillGap[];
  learningOpportunities: LearningOpportunity[];
  overqualification: number; // 0-100
}

export interface WorkloadImpact {
  newUtilization: number;
  utilizationChange: number;
  burnoutRiskChange: BurnoutRiskLevel;
  capacityRemaining: number;
}

// Additional supporting interfaces
export interface AlternativeAssignment {
  assigneeId: string;
  assigneeName: string;
  skillMatch: number;
  workloadImpact: number;
  reasoning: string;
}

export interface AssignmentOption {
  optionId: string;
  assignments: TaskAssignment[];
  score: number;
  tradeoffs: string[];
}

export interface AssignmentImpact {
  teamBalance: number;
  skillDevelopment: number;
  deliveryRisk: number;
  memberSatisfaction: number;
}

export interface BurnoutRiskFactor {
  factor: string;
  severity: number;
  trend: TrendDirection;
  description: string;
}

export interface WarningSignal {
  signal: string;
  detected: Date;
  severity: number;
  description: string;
}

export interface BurnoutPrevention {
  action: string;
  priority: number;
  estimatedImpact: number;
  timeframe: string;
}

export interface ForecastPeriod {
  startDate: Date;
  endDate: Date;
  granularity: TimeGranularity;
}

export interface ProjectedCapacity {
  period: Date;
  totalCapacity: number;
  availableCapacity: number;
  utilizationRate: number;
}

export interface BottleneckPrediction {
  predictedDate: Date;
  type: BottleneckType;
  severity: number;
  affectedCapacity: number;
  mitigation: string[];
}

export interface ResourceNeed {
  skillRequired: string;
  urgency: number;
  duration: number; // weeks
  justification: string;
}

export interface CapacityRecommendation {
  type: RecommendationType;
  priority: number;
  description: string;
  estimatedImpact: number;
}

export interface ImmediateAction {
  action: string;
  priority: number;
  estimatedTime: number; // hours
  impact: string;
}

export interface ShortTermAction {
  action: string;
  timeframe: string;
  resources: string[];
  expectedOutcome: string;
}

export interface LongTermAction {
  action: string;
  timeframe: string;
  investment: number;
  expectedROI: number;
}

export interface HiringRecommendation {
  role: string;
  skills: string[];
  urgency: number;
  justification: string;
  estimatedCost: number;
}

export interface TrainingRecommendation {
  skill: string;
  targetMembers: string[];
  priority: number;
  estimatedDuration: number;
  expectedBenefit: string;
}

export interface ProcessImprovement {
  process: string;
  currentEfficiency: number;
  targetEfficiency: number;
  implementation: string;
}

// Enums for supporting types
/* eslint-disable no-unused-vars */
export enum WorkingStyle {
  FOCUSED = 'focused',
  COLLABORATIVE = 'collaborative',
  FLEXIBLE = 'flexible',
  STRUCTURED = 'structured'
}

export enum CollaborationPreference {
  INDIVIDUAL = 'individual',
  SMALL_TEAM = 'small_team',
  LARGE_TEAM = 'large_team',
  CROSS_FUNCTIONAL = 'cross_functional'
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export enum BottleneckType {
  SKILL_GAP = 'skill_gap',
  CAPACITY_OVERLOAD = 'capacity_overload',
  DEPENDENCY_CHAIN = 'dependency_chain',
  KNOWLEDGE_SILO = 'knowledge_silo'
}

export enum TimeGranularity {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly'
}

export enum RecommendationType {
  HIRING = 'hiring',
  TRAINING = 'training',
  REBALANCING = 'rebalancing',
  PROCESS_IMPROVEMENT = 'process_improvement'
}
/* eslint-enable no-unused-vars */

export interface UnavailablePeriod {
  startDate: Date;
  endDate: Date;
  reason: string;
}

export interface BurnoutIndicator {
  indicator: string;
  value: number;
  threshold: number;
  trend: TrendDirection;
}

export interface SkillGap {
  skill: string;
  required: number;
  current: number;
  gap: number;
  impact: number;
}

export interface LearningOpportunity {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  effort: number; // hours
  benefit: number;
}
