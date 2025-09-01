import { ClickUpTask, ProjectHealthMetrics } from '../types';

describe('Shared Types', () => {
  describe('ClickUpTask', () => {
    it('should define the correct task structure', () => {
      const mockTask: ClickUpTask = {
        id: 'task-123',
        name: 'Test Task',
        status: 'pending',
        priority: 3,
        assignees: ['user-1'],
        created_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
        time_estimate: 3600000,
        time_spent: 1800000,
        tags: ['test'],
        custom_fields: []
      };

      expect(mockTask.id).toBeDefined();
      expect(mockTask.name).toBeDefined();
      expect(mockTask.status).toBeDefined();
      expect(typeof mockTask.priority).toBe('number');
      expect(Array.isArray(mockTask.assignees)).toBe(true);
      expect(Array.isArray(mockTask.tags)).toBe(true);
      expect(Array.isArray(mockTask.custom_fields)).toBe(true);
    });
  });

  describe('ProjectHealthMetrics', () => {
    it('should define the correct health metrics structure', () => {
      const mockMetrics: ProjectHealthMetrics = {
        overallScore: 85,
        taskCompletionRate: 0.9,
        overdueTasksCount: 2,
        blockedTasksCount: 1,
        averageTaskAge: 5.5,
        teamVelocity: 25,
        riskFactors: ['High workload on key team member'],
        recommendations: ['Consider redistributing tasks']
      };

      expect(typeof mockMetrics.overallScore).toBe('number');
      expect(typeof mockMetrics.taskCompletionRate).toBe('number');
      expect(typeof mockMetrics.overdueTasksCount).toBe('number');
      expect(typeof mockMetrics.blockedTasksCount).toBe('number');
      expect(typeof mockMetrics.averageTaskAge).toBe('number');
      expect(typeof mockMetrics.teamVelocity).toBe('number');
      expect(Array.isArray(mockMetrics.riskFactors)).toBe(true);
      expect(Array.isArray(mockMetrics.recommendations)).toBe(true);
    });
  });
});
