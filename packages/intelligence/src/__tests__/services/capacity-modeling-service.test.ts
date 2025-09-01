import { CapacityModelingService } from '../../services/capacity-modeling-service';
import { TestDataGenerator } from '../../utils/test-data-generator';

describe('CapacityModelingService', () => {
  let service: CapacityModelingService;

  beforeEach(() => {
    service = new CapacityModelingService();
  });

  describe('modelCapacity', () => {
    it('should model team capacity correctly', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(3);
      
      const input = {
        teamId: 'test-team-123',
        sprintStartDate: new Date().toISOString(),
        sprintEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        teamMembers: mockUsers.map(user => ({
          userId: user.id,
          name: user.username,
          role: user.role,
          skills: user.skills || ['javascript'],
          experienceLevel: 'mid' as const,
          availabilityHours: user.capacity || 40,
          focusFactor: 0.75
        })),
        constraints: [],
        skillRequirements: [],
        includeBufferTime: true,
        bufferPercentage: 0.15
      };

      const result = await service.modelCapacity(input);

      expect(result).toBeDefined();
      expect(result.teamId).toBe(input.teamId);
      expect(result.sprintPeriod).toBeDefined();
      expect(result.sprintPeriod.workingDays).toBeGreaterThan(0);
      expect(result.individualCapacities).toBeInstanceOf(Array);
      expect(result.individualCapacities.length).toBe(mockUsers.length);
      expect(result.teamCapacity).toBeDefined();
      expect(result.teamCapacity.totalHours).toBeGreaterThan(0);
      expect(result.teamCapacity.effectiveHours).toBeGreaterThan(0);
      expect(result.teamCapacity.storyPointCapacity).toBeGreaterThan(0);
      expect(result.capacityUtilization).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle team with constraints', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(2);
      
      const input = {
        teamId: 'constrained-team-123',
        sprintStartDate: new Date().toISOString(),
        sprintEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        teamMembers: mockUsers.map(user => ({
          userId: user.id,
          name: user.username,
          role: user.role,
          skills: user.skills || ['javascript'],
          experienceLevel: 'senior' as const,
          availabilityHours: 40,
          focusFactor: 0.8
        })),
        constraints: [
          {
            type: 'pto' as const,
            userId: mockUsers[0].id,
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
            hoursImpact: 16,
            description: 'Vacation time'
          }
        ],
        skillRequirements: [
          {
            skill: 'javascript',
            importance: 'required' as const,
            estimatedHours: 40
          }
        ]
      };

      const result = await service.modelCapacity(input);

      expect(result).toBeDefined();
      expect(result.teamCapacity.totalHours).toBeGreaterThan(0);
      expect(result.capacityUtilization.riskFactors).toBeInstanceOf(Array);
      expect(result.capacityUtilization.recommendations).toBeInstanceOf(Array);
    });

    it('should handle empty team', async () => {
      const input = {
        teamId: 'empty-team-123',
        sprintStartDate: new Date().toISOString(),
        sprintEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        teamMembers: [],
        constraints: [],
        skillRequirements: []
      };

      const result = await service.modelCapacity(input);

      expect(result).toBeDefined();
      expect(result.teamCapacity.totalHours).toBe(0);
      expect(result.teamCapacity.effectiveHours).toBe(0);
      expect(result.teamCapacity.storyPointCapacity).toBe(0);
      expect(result.individualCapacities).toEqual([]);
    });

    it('should validate input parameters', async () => {
      const invalidInput = {
        teamId: '',
        sprintStartDate: 'invalid-date',
        sprintEndDate: new Date().toISOString(),
        teamMembers: [],
        bufferPercentage: 1.5 // Invalid: exceeds max of 0.5
      };

      await expect(service.modelCapacity(invalidInput)).rejects.toThrow();
    });

    it('should calculate skill-based capacity correctly', async () => {
      const mockUsers = TestDataGenerator.generateMockUsers(3);
      
      const input = {
        teamId: 'skill-based-team-123',
        sprintStartDate: new Date().toISOString(),
        sprintEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        teamMembers: mockUsers.map((user, index) => ({
          userId: user.id,
          name: user.username,
          role: user.role,
          skills: index === 0 ? ['react', 'javascript'] : ['node.js', 'javascript'],
          experienceLevel: 'mid' as const,
          availabilityHours: 40,
          focusFactor: 0.75
        })),
        skillRequirements: [
          {
            skill: 'react',
            importance: 'required' as const,
            estimatedHours: 20
          },
          {
            skill: 'node.js',
            importance: 'preferred' as const,
            estimatedHours: 15
          }
        ]
      };

      const result = await service.modelCapacity(input);

      expect(result).toBeDefined();
      expect(result.teamCapacity.skillCapacity).toBeInstanceOf(Array);
      expect(result.teamCapacity.skillCapacity.length).toBeGreaterThan(0);
      
      result.teamCapacity.skillCapacity.forEach(skillCap => {
        expect(skillCap.skill).toBeDefined();
        expect(skillCap.availableHours).toBeGreaterThanOrEqual(0);
        expect(skillCap.teamMembers).toBeInstanceOf(Array);
        expect(skillCap.utilizationRate).toBeGreaterThanOrEqual(0);
        expect(skillCap.utilizationRate).toBeLessThanOrEqual(1);
      });
    });
  });
});
