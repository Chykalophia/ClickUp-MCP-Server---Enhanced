/**
 * Example Analysis Tool
 * 
 * This is a complete example of how to create a new intelligence tool
 * following the established patterns and best practices.
 */

import { z } from 'zod';

// 1. Define input schema with validation
export const exampleAnalysisSchema = z.object({
  workspaceId: z.string()
    .min(1)
    .describe('ClickUp workspace ID to analyze'),
  
  analysisType: z.enum(['quick', 'standard', 'comprehensive'])
    .default('standard')
    .describe('Depth of analysis to perform'),
  
  includeRecommendations: z.boolean()
    .default(true)
    .describe('Whether to include actionable recommendations'),
  
  timeframe: z.enum(['1week', '2weeks', '1month', '3months'])
    .default('1month')
    .describe('Historical data timeframe for analysis')
});

export type ExampleAnalysisInput = z.infer<typeof exampleAnalysisSchema>;

// 2. Define response interfaces
interface AnalysisResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: {
    completionRate: number;
    averageVelocity: number;
    teamUtilization: number;
  };
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
}

interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// 3. Core analysis logic
async function performAnalysis(params: ExampleAnalysisInput): Promise<AnalysisResult> {
  // Simulate API call to ClickUp
  const workspaceData = await fetchWorkspaceData(params.workspaceId);
  
  // Perform analysis based on type
  const metrics = calculateMetrics(workspaceData, params.timeframe);
  const score = calculateOverallScore(metrics);
  const grade = scoreToGrade(score);
  
  // Generate recommendations if requested
  const recommendations = params.includeRecommendations 
    ? generateRecommendations(metrics, params.analysisType)
    : [];
  
  return {
    score,
    grade,
    metrics,
    recommendations
  };
}

// 4. Helper functions
async function fetchWorkspaceData(workspaceId: string): Promise<any> {
  // Mock implementation - replace with actual ClickUp API calls
  return {
    tasks: [
      { status: 'completed', dueDate: '2024-09-01' },
      { status: 'in_progress', dueDate: '2024-09-02' }
    ],
    teams: [
      { id: 'team1', members: 5, utilization: 0.85 }
    ]
  };
}

function calculateMetrics(data: any, timeframe: string): AnalysisResult['metrics'] {
  // Mock calculations - implement actual metric logic
  return {
    completionRate: 0.78,
    averageVelocity: 45.2,
    teamUtilization: 0.85
  };
}

function calculateOverallScore(metrics: AnalysisResult['metrics']): number {
  // Weighted scoring algorithm
  const weights = {
    completionRate: 0.4,
    averageVelocity: 0.3,
    teamUtilization: 0.3
  };
  
  return Math.round(
    (metrics.completionRate * weights.completionRate +
     (metrics.averageVelocity / 100) * weights.averageVelocity +
     metrics.teamUtilization * weights.teamUtilization) * 100
  );
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function generateRecommendations(
  metrics: AnalysisResult['metrics'], 
  analysisType: string
): AnalysisResult['recommendations'] {
  const recommendations = [];
  
  if (metrics.completionRate < 0.8) {
    recommendations.push({
      type: 'process_improvement',
      priority: 'high' as const,
      title: 'Improve Task Completion Rate',
      description: 'Focus on reducing blockers and improving task clarity'
    });
  }
  
  if (metrics.teamUtilization > 0.9) {
    recommendations.push({
      type: 'capacity_management',
      priority: 'medium' as const,
      title: 'Consider Team Capacity',
      description: 'Team utilization is high - consider workload balancing'
    });
  }
  
  return recommendations;
}

// 5. Response formatting
function formatAnalysisResult(result: AnalysisResult): string {
  const { score, grade, metrics, recommendations } = result;
  
  let report = `# 📊 Workspace Analysis Results

## Overall Health Score: ${score}/100 (Grade: ${grade})

### Key Metrics
- **Task Completion Rate**: ${(metrics.completionRate * 100).toFixed(1)}%
- **Average Velocity**: ${metrics.averageVelocity} points/sprint
- **Team Utilization**: ${(metrics.teamUtilization * 100).toFixed(1)}%

`;

  if (recommendations.length > 0) {
    report += `### 🎯 Recommendations

`;
    recommendations.forEach((rec, index) => {
      const priorityEmoji = rec.priority === 'high' ? '🔴' : 
                           rec.priority === 'medium' ? '🟡' : '🟢';
      
      report += `${index + 1}. ${priorityEmoji} **${rec.title}**
   ${rec.description}

`;
    });
  }
  
  report += `---
*Analysis completed at ${new Date().toISOString()}*`;
  
  return report;
}

// 6. Main tool function
export async function exampleAnalysisTool(params: ExampleAnalysisInput): Promise<ToolResponse> {
  try {
    // Validate input parameters
    const validatedParams = exampleAnalysisSchema.parse(params);
    
    // Perform analysis
    const result = await performAnalysis(validatedParams);
    
    // Format and return response
    return {
      content: [{
        type: 'text',
        text: formatAnalysisResult(result)
      }]
    };
    
  } catch (error) {
    // Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      content: [{
        type: 'text',
        text: `❌ **Analysis Error**: ${errorMessage}\n\nPlease check your input parameters and try again.`
      }],
      isError: true
    };
  }
}

// 7. Export for registration
export const toolDefinition = {
  name: 'clickup_example_analysis',
  description: '📊 **EXAMPLE ANALYSIS TOOL** - Demonstrates how to create intelligence tools with proper validation, analysis, and formatting.',
  inputSchema: exampleAnalysisSchema,
  handler: exampleAnalysisTool
};
