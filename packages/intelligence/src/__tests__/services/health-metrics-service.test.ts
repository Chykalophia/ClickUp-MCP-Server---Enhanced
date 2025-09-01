import { HealthMetricsService, HealthMetricsInput } from '../../services/health-metrics-service';
import { TestDataGenerator } from '../../utils/test-data-generator';

describe('HealthMetricsService', () => {
  let service: HealthMetricsService;

  beforeEach(() => {
    service = new HealthMetricsService();
  });

  describe('calculateHealthScore', () => {
    it('should calculate health metrics with valid input', () => {
      const mockTasks = TestDataGenerator.generateMockTasks(5);
      const mockUsers = TestDataGenerator.generateMockUsers(3);
      
      const input: HealthMetricsInput = {
        tasks: mockTasks as any,
        workspaceId: 'test-workspace',
        teamMembers: mockUsers.map(u => ({ id: parseInt(u.id.split('_')[1]), username: u.username, email: u.email }))
      };

      const result = service.calculateHealthScore(input);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.taskCompletionRate).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.velocityTrend).toBeDefined();
      expect(result.workloadDistribution).toBeDefined();
      expect(result.dependencyHealth).toBeDefined();
    });

    it('should handle empty task list', () => {
      const input: HealthMetricsInput = {
        tasks: [],
        workspaceId: 'test-workspace',
        teamMembers: []
      };

      const result = service.calculateHealthScore(input);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.taskCompletionRate).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should identify overdue tasks correctly', () => {
      const overdueTasks = TestDataGenerator.generateOverdueTasks(3);
      const tasks = [
        ...TestDataGenerator.generateMockTasks(2),
        ...overdueTasks
      ];

      const input: HealthMetricsInput = {
        tasks: tasks as any,
        workspaceId: 'test-workspace'
      };

      const result = service.calculateHealthScore(input);

      expect(result.overdueTasksCount).toBeGreaterThan(0);
      expect(result.riskFactors).toBeInstanceOf(Array);
    });

    it('should calculate healthy project metrics', () => {
      const healthyTasks = TestDataGenerator.generateHealthyTasks(5);

      const input: HealthMetricsInput = {
        tasks: healthyTasks as any,
        workspaceId: 'test-workspace'
      };

      const result = service.calculateHealthScore(input);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.taskCompletionRate).toBeGreaterThanOrEqual(0);
    });

    it('should generate appropriate recommendations', () => {
      const mockTasks = TestDataGenerator.generateMockTasks(10);

      const input: HealthMetricsInput = {
        tasks: mockTasks as any,
        workspaceId: 'test-workspace'
      };

      const result = service.calculateHealthScore(input);

      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('analyzeRisks', () => {
    it('should analyze risks from health metrics', () => {
      const mockTasks = TestDataGenerator.generateMockTasks(5);
      const input: HealthMetricsInput = {
        tasks: mockTasks as any,
        workspaceId: 'test-workspace'
      };

      const healthMetrics = service.calculateHealthScore(input);
      const risks = service.analyzeRisks(healthMetrics);

      expect(risks).toBeInstanceOf(Array);
      risks.forEach(risk => {
        expect(risk.level).toMatch(/^(low|medium|high|critical)$/);
        expect(risk.category).toMatch(/^(timeline|workload|quality|dependencies|velocity)$/);
        expect(risk.description).toBeDefined();
        expect(risk.impact).toBeDefined();
        expect(risk.recommendation).toBeDefined();
        expect(risk.confidence).toBeGreaterThanOrEqual(0);
        expect(risk.confidence).toBeLessThanOrEqual(100);
      });
    });
  });
});
