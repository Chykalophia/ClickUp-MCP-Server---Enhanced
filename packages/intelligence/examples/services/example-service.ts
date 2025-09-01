/**
 * Example Intelligence Service
 * 
 * Demonstrates how to create a service that integrates with ClickUp API
 * and provides intelligence analysis capabilities.
 */

interface AnalysisInput {
  workspaceId: string;
  timeframe: string;
  includeDetails: boolean;
}

interface AnalysisResult {
  score: number;
  insights: string[];
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }>;
}

export class ExampleIntelligenceService {
  private cache = new Map<string, { data: any; expires: number }>();
  
  /**
   * Performs comprehensive workspace analysis
   */
  async analyzeWorkspace(input: AnalysisInput): Promise<AnalysisResult> {
    // 1. Check cache first
    const cacheKey = this.generateCacheKey(input);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    // 2. Fetch data from ClickUp
    const workspaceData = await this.fetchWorkspaceData(input.workspaceId);
    
    // 3. Perform analysis
    const result = await this.performAnalysis(workspaceData, input);
    
    // 4. Cache result
    this.setCache(cacheKey, result, 3600); // 1 hour
    
    return result;
  }
  
  private async fetchWorkspaceData(workspaceId: string): Promise<any> {
    // Mock ClickUp API integration
    return {
      tasks: [
        { id: '1', status: 'completed', assignee: 'user1' },
        { id: '2', status: 'in_progress', assignee: 'user2' }
      ],
      teams: [
        { id: 'team1', members: ['user1', 'user2'], velocity: 45 }
      ]
    };
  }
  
  private async performAnalysis(data: any, input: AnalysisInput): Promise<AnalysisResult> {
    const completionRate = this.calculateCompletionRate(data.tasks);
    const teamVelocity = this.calculateTeamVelocity(data.teams);
    
    const score = Math.round((completionRate + teamVelocity) / 2);
    
    return {
      score,
      insights: this.generateInsights(data, input),
      recommendations: this.generateRecommendations(score, data)
    };
  }
  
  private calculateCompletionRate(tasks: any[]): number {
    const completed = tasks.filter(t => t.status === 'completed').length;
    return (completed / tasks.length) * 100;
  }
  
  private calculateTeamVelocity(teams: any[]): number {
    return teams.reduce((sum, team) => sum + team.velocity, 0) / teams.length;
  }
  
  private generateInsights(data: any, input: AnalysisInput): string[] {
    const insights = [];
    
    if (input.includeDetails) {
      insights.push(`Analyzed ${data.tasks.length} tasks across ${data.teams.length} teams`);
      insights.push(`Average team velocity: ${this.calculateTeamVelocity(data.teams)} points/sprint`);
    }
    
    return insights;
  }
  
  private generateRecommendations(score: number, data: any): AnalysisResult['recommendations'] {
    const recommendations = [];
    
    if (score < 70) {
      recommendations.push({
        type: 'improvement',
        priority: 'high' as const,
        description: 'Focus on improving task completion rates and team velocity'
      });
    }
    
    return recommendations;
  }
  
  // Cache management
  private generateCacheKey(input: AnalysisInput): string {
    return `analysis:${input.workspaceId}:${input.timeframe}:${input.includeDetails}`;
  }
  
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  private setCache<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }
}
