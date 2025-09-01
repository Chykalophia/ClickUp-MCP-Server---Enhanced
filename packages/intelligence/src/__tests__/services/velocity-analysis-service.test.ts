import { VelocityAnalysisService } from '../../services/velocity-analysis-service';
import { TestDataGenerator } from '../../utils/test-data-generator';

describe('VelocityAnalysisService', () => {
  let service: VelocityAnalysisService;

  beforeEach(() => {
    service = new VelocityAnalysisService();
  });

  describe('analyzeVelocity', () => {
    it('should analyze velocity with valid input', async () => {
      const input = {
        teamId: 'test-team-123',
        lookbackPeriod: 8,
        includePartialSprints: false,
        adjustForTeamChanges: true,
        seasonalAdjustment: true
      };

      const result = await service.analyzeVelocity(input);

      expect(result).toBeDefined();
      expect(result.teamId).toBe(input.teamId);
      expect(result.analysisDate).toBeDefined();
      expect(result.historicalTrends).toBeInstanceOf(Array);
      expect(result.currentVelocity).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
    });

    it('should handle empty historical data', async () => {
      const input = {
        teamId: 'empty-team-123',
        lookbackPeriod: 4,
        seasonalAdjustment: false,
        includePartialSprints: false,
        adjustForTeamChanges: false
      };

      const result = await service.analyzeVelocity(input);

      expect(result).toBeDefined();
      expect(result.historicalTrends).toBeInstanceOf(Array);
      expect(result.currentVelocity).toBeDefined();
      expect(result.prediction).toBeDefined();
    });

    it('should validate input parameters', async () => {
      const invalidInput = {
        teamId: '',
        lookbackPeriod: 100, // Invalid: exceeds max of 52
        seasonalAdjustment: false,
        includePartialSprints: false,
        adjustForTeamChanges: false
      };

      await expect(service.analyzeVelocity(invalidInput)).rejects.toThrow();
    });

    it('should generate velocity predictions', async () => {
      const input = {
        teamId: 'prediction-team-123',
        lookbackPeriod: 12,
        seasonalAdjustment: true,
        includePartialSprints: false,
        adjustForTeamChanges: false
      };

      const result = await service.analyzeVelocity(input);

      expect(result.prediction).toBeDefined();
      expect(result.prediction.predictedVelocity).toBeGreaterThanOrEqual(0);
      expect(result.prediction.confidenceInterval).toBeDefined();
      expect(result.prediction.confidenceInterval.lower).toBeLessThanOrEqual(result.prediction.confidenceInterval.upper);
      expect(result.prediction.factors).toBeInstanceOf(Array);
    });

    it('should provide actionable recommendations', async () => {
      const input = {
        teamId: 'recommendations-team-123',
        lookbackPeriod: 6
      };

      const result = await service.analyzeVelocity(input);

      expect(result.recommendations).toBeInstanceOf(Array);
      result.recommendations.forEach(rec => {
        expect(rec.category).toBeDefined();
        expect(rec.priority).toMatch(/^(low|medium|high|critical)$/);
        expect(rec.description).toBeDefined();
        expect(rec.impact).toBeDefined();
        expect(rec.effort).toBeDefined();
      });
    });
  });
});
