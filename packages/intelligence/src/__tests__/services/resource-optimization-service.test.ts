import { ResourceOptimizationService } from '../../services/resource-optimization-service-impl';
import { TestDataGenerator } from '../../utils/test-data-generator';
import { TeamMember, Task, SkillCategory, SkillImportance, BurnoutRiskLevel } from '../../services/resource-optimization-service';

describe('ResourceOptimizationService', () => {
  let service: ResourceOptimizationService;

  beforeEach(() => {
    service = new ResourceOptimizationService();
  });

  describe('analyzeWorkload', () => {
    it('should analyze team workload correctly', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(3);
      const mockTasks = TestDataGenerator.generateMockTasks(5);

      // Convert to expected format
      const teamMembers: TeamMember[] = mockUsers.map(user => ({
        id: user.id,
        name: user.username,
        email: user.email,
        skills: user.skills?.map(skill => ({
          name: skill,
          proficiency: 7,
          category: SkillCategory.TECHNICAL,
          yearsExperience: 3,
          lastUsed: new Date(),
          certifications: []
        })) || [],
        capacity: user.capacity || 40,
        currentWorkload: 30,
        availability: {
          hoursPerWeek: user.capacity || 40,
          workingDays: [1, 2, 3, 4, 5],
          unavailablePeriods: []
        },
        preferences: {
          preferredTaskTypes: ['development'],
          learningGoals: ['react'],
          workingStyle: 'focused' as any,
          collaborationPreference: 'small_team' as any
        },
        performanceMetrics: {
          taskCompletionRate: 0.9,
          averageTaskTime: 8,
          qualityScore: 8.5,
          velocityTrend: 'stable' as any
        },
        burnoutRisk: BurnoutRiskLevel.LOW
      }));

      const result = await service.analyzeWorkload(teamMembers);

      expect(result).toBeDefined();
      expect(result.teamId).toBeDefined();
      expect(result.totalCapacity).toBeGreaterThan(0);
      expect(result.utilizedCapacity).toBeGreaterThanOrEqual(0);
      expect(result.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(result.utilizationRate).toBeLessThanOrEqual(1);
      expect(result.memberAnalysis).toBeInstanceOf(Array);
      expect(result.memberAnalysis.length).toBe(teamMembers.length);
    });

    it('should handle empty team', async () => {
      const result = await service.analyzeWorkload([]);

      expect(result).toBeDefined();
      expect(result.totalCapacity).toBe(0);
      expect(result.utilizedCapacity).toBe(0);
      expect(result.utilizationRate).toBe(0);
      expect(result.memberAnalysis).toEqual([]);
    });
  });

  describe('optimizeAssignments', () => {
    it('should optimize task assignments', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(2);
      const mockTasks = TestDataGenerator.generateMockTasks(3);

      const teamMembers: TeamMember[] = mockUsers.map(user => ({
        id: user.id,
        name: user.username,
        email: user.email,
        skills: [{
          name: 'javascript',
          proficiency: 8,
          category: SkillCategory.TECHNICAL,
          yearsExperience: 3,
          lastUsed: new Date(),
          certifications: []
        }],
        capacity: 40,
        currentWorkload: 20,
        availability: {
          hoursPerWeek: 40,
          workingDays: [1, 2, 3, 4, 5],
          unavailablePeriods: []
        },
        preferences: {
          preferredTaskTypes: ['development'],
          learningGoals: [],
          workingStyle: 'focused' as any,
          collaborationPreference: 'individual' as any
        },
        performanceMetrics: {
          taskCompletionRate: 0.85,
          averageTaskTime: 6,
          qualityScore: 8,
          velocityTrend: 'stable' as any
        },
        burnoutRisk: BurnoutRiskLevel.LOW
      }));

      const tasks: Task[] = mockTasks.map(task => ({
        id: task.id,
        name: task.name,
        description: 'Test task',
        estimatedEffort: 8,
        requiredSkills: [{
          name: 'javascript',
          minimumProficiency: 5,
          importance: SkillImportance.IMPORTANT,
          isRequired: true
        }],
        priority: task.priority,
        complexity: 5,
        deadline: task.due_date ? new Date(task.due_date) : undefined,
        dependencies: [],
        currentAssignee: undefined
      }));

      const result = await service.optimizeAssignments(teamMembers, tasks);

      expect(result).toBeDefined();
      expect(result.planId).toBeDefined();
      expect(result.assignments).toBeInstanceOf(Array);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.unassignedTasks).toBeInstanceOf(Array);
    });
  });

  describe('assessBurnoutRisk', () => {
    it('should assess burnout risk for team members', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(3);
      
      const teamMembers: TeamMember[] = mockUsers.map(user => ({
        id: user.id,
        name: user.username,
        email: user.email,
        skills: [],
        capacity: 40,
        currentWorkload: 45, // Overloaded
        availability: {
          hoursPerWeek: 40,
          workingDays: [1, 2, 3, 4, 5],
          unavailablePeriods: []
        },
        preferences: {
          preferredTaskTypes: [],
          learningGoals: [],
          workingStyle: 'focused' as any,
          collaborationPreference: 'individual' as any
        },
        performanceMetrics: {
          taskCompletionRate: 0.7, // Lower performance
          averageTaskTime: 12, // Slower completion
          qualityScore: 6, // Lower quality
          velocityTrend: 'decreasing' as any
        },
        burnoutRisk: BurnoutRiskLevel.MODERATE
      }));

      const result = await service.assessBurnoutRisk(teamMembers);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(teamMembers.length);
      
      result.forEach(risk => {
        expect(risk.memberId).toBeDefined();
        expect(risk.riskLevel).toMatch(/^(low|moderate|high|critical)$/);
        expect(risk.riskFactors).toBeInstanceOf(Array);
        expect(risk.warningSignals).toBeInstanceOf(Array);
        expect(risk.preventionActions).toBeInstanceOf(Array);
      });
    });
  });

  describe('forecastCapacity', () => {
    it('should forecast team capacity', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(3);
      
      const teamMembers: TeamMember[] = mockUsers.map(user => ({
        id: user.id,
        name: user.username,
        email: user.email,
        skills: [],
        capacity: 40,
        currentWorkload: 30,
        availability: {
          hoursPerWeek: 40,
          workingDays: [1, 2, 3, 4, 5],
          unavailablePeriods: []
        },
        preferences: {
          preferredTaskTypes: [],
          learningGoals: [],
          workingStyle: 'focused' as any,
          collaborationPreference: 'individual' as any
        },
        performanceMetrics: {
          taskCompletionRate: 0.85,
          averageTaskTime: 8,
          qualityScore: 8,
          velocityTrend: 'stable' as any
        },
        burnoutRisk: BurnoutRiskLevel.LOW
      }));

      const forecastPeriod = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        granularity: 'weekly' as any
      };

      const result = await service.forecastCapacity(teamMembers, forecastPeriod);

      expect(result).toBeDefined();
      expect(result.teamId).toBeDefined();
      expect(result.forecastPeriod).toBeDefined();
      expect(result.projectedCapacity).toBeInstanceOf(Array);
      expect(result.bottleneckPredictions).toBeInstanceOf(Array);
      expect(result.resourceNeeds).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });
});
