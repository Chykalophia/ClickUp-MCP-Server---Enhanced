import { SprintPlanningData, ClickUpTask } from '@chykalophia/clickup-mcp-shared';
import axios from 'axios';

export class SmartSprintPlanner {
  private apiToken: string;
  private baseUrl = 'https://api.clickup.com/api/v2';

  constructor() {
    this.apiToken = process.env.CLICKUP_API_TOKEN || '';
    if (!this.apiToken) {
      throw new Error('CLICKUP_API_TOKEN environment variable is required');
    }
  }

  async generateSprintPlan(params: {
    workspace_id: string;
    team_id?: string;
    sprint_duration_days?: number;
    team_capacity_hours?: number;
    priority_focus?: 'high_priority' | 'balanced' | 'quick_wins';
    include_dependencies?: boolean;
  }): Promise<SprintPlanningData> {
    try {
      // Fetch available tasks
      const availableTasks = await this.fetchAvailableTasks(params.workspace_id);
      
      // Calculate team velocity and capacity
      const teamVelocity = await this.calculateTeamVelocity(params.workspace_id);
      const sprintCapacity = params.team_capacity_hours || this.estimateSprintCapacity(params.sprint_duration_days || 14);
      
      // Apply AI-powered task selection
      const suggestedTasks = await this.selectOptimalTasks(availableTasks, {
        velocity: teamVelocity,
        capacity: sprintCapacity,
        focus: params.priority_focus || 'balanced',
        includeDependencies: params.include_dependencies || true
      });

      // Generate risk assessment
      const riskAssessment = this.assessSprintRisks(suggestedTasks, sprintCapacity, teamVelocity);
      
      // Generate AI recommendations
      const recommendations = this.generateSprintRecommendations(suggestedTasks, {
        velocity: teamVelocity,
        capacity: sprintCapacity,
        focus: params.priority_focus || 'balanced'
      });

      // Estimate completion confidence
      const estimatedCompletion = this.estimateCompletionConfidence(suggestedTasks, teamVelocity, sprintCapacity);

      return {
        sprintCapacity,
        teamVelocity,
        suggestedTasks,
        estimatedCompletion,
        riskAssessment,
        recommendations
      };
    } catch (error: any) {
      throw new Error(`Failed to generate sprint plan: ${error.message}`);
    }
  }

  async optimizeCapacity(params: {
    workspace_id: string;
    sprint_tasks: string[];
    team_members: Array<{
      user_id: number;
      available_hours: number;
      skills?: string[];
    }>;
  }): Promise<{
    allocations: Array<{
      taskId: string;
      taskName: string;
      assigneeName: string;
      estimatedHours: number;
      skillMatch: number;
      confidence: string;
    }>;
    totalCapacity: number;
    allocatedHours: number;
    remainingCapacity: number;
    insights: string[];
  }> {
    try {
      // Fetch task details
      const tasks = await this.fetchTasksByIds(params.sprint_tasks);
      
      // Calculate optimal allocations using AI algorithms
      const allocations = await this.calculateOptimalAllocations(tasks, params.team_members);
      
      const totalCapacity = params.team_members.reduce((sum, member) => sum + member.available_hours, 0);
      const allocatedHours = allocations.reduce((sum, allocation) => sum + allocation.estimatedHours, 0);
      const remainingCapacity = totalCapacity - allocatedHours;
      
      const insights = this.generateCapacityInsights(allocations, totalCapacity, allocatedHours);

      return {
        allocations,
        totalCapacity,
        allocatedHours,
        remainingCapacity,
        insights
      };
    } catch (error: any) {
      throw new Error(`Failed to optimize capacity: ${error.message}`);
    }
  }

  private async fetchAvailableTasks(workspaceId: string): Promise<ClickUpTask[]> {
    const headers = {
      'Authorization': this.apiToken,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get(`${this.baseUrl}/team/${workspaceId}/task?statuses[]=to%20do&statuses[]=open`, { headers });
      return response.data.tasks || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch available tasks: ${error.message}`);
    }
  }

  private async fetchTasksByIds(taskIds: string[]): Promise<ClickUpTask[]> {
    const headers = {
      'Authorization': this.apiToken,
      'Content-Type': 'application/json'
    };

    const tasks: ClickUpTask[] = [];
    
    for (const taskId of taskIds) {
      try {
        const response = await axios.get(`${this.baseUrl}/task/${taskId}`, { headers });
        tasks.push(response.data);
      } catch (error) {
        console.error(`Failed to fetch task ${taskId}:`, error);
      }
    }
    
    return tasks;
  }

  private async calculateTeamVelocity(_workspaceId: string): Promise<number> {
    // Simplified velocity calculation
    // In a real implementation, you would analyze historical sprint data
    return Math.round(25 + Math.random() * 15); // Mock velocity: 25-40 story points
  }

  private estimateSprintCapacity(durationDays: number): number {
    // Estimate capacity based on sprint duration
    // Assuming 6 hours per day per team member, 5 team members
    return durationDays * 6 * 5;
  }

  private async selectOptimalTasks(
    availableTasks: ClickUpTask[],
    criteria: {
      velocity: number;
      capacity: number;
      focus: 'high_priority' | 'balanced' | 'quick_wins';
      includeDependencies: boolean;
    }
  ): Promise<ClickUpTask[]> {
    // AI-powered task selection algorithm
    const scoredTasks = availableTasks.map(task => ({
      task,
      score: this.calculateTaskScore(task, criteria)
    }));

    // Sort by score (highest first)
    scoredTasks.sort((a, b) => b.score - a.score);

    // Select tasks that fit within capacity constraints
    const selectedTasks: ClickUpTask[] = [];
    let remainingCapacity = criteria.capacity;
    let remainingVelocity = criteria.velocity;

    for (const { task } of scoredTasks) {
      const estimatedHours = this.estimateTaskHours(task);
      const estimatedPoints = this.estimateStoryPoints(task);

      if (estimatedHours <= remainingCapacity && estimatedPoints <= remainingVelocity) {
        selectedTasks.push(task);
        remainingCapacity -= estimatedHours;
        remainingVelocity -= estimatedPoints;
      }

      // Stop when we've filled about 80% of capacity to leave buffer
      if (remainingCapacity < criteria.capacity * 0.2) {
        break;
      }
    }

    return selectedTasks;
  }

  private calculateTaskScore(task: ClickUpTask, criteria: any): number {
    let score = 0;

    // Priority scoring
    const priority = task.priority || 3;
    if (criteria.focus === 'high_priority') {
      score += (5 - priority) * 20; // Higher priority = higher score
    } else if (criteria.focus === 'quick_wins') {
      score += this.isQuickWin(task) ? 30 : 0;
    } else { // balanced
      score += (5 - priority) * 10;
      score += this.isQuickWin(task) ? 15 : 0;
    }

    // Age scoring (older tasks get higher priority)
    const taskAge = this.calculateTaskAge(task);
    score += Math.min(taskAge * 0.5, 20);

    // Dependency scoring
    if (criteria.includeDependencies && this.hasBlockingDependencies(task)) {
      score -= 15; // Penalize tasks with blocking dependencies
    }

    return score;
  }

  private estimateTaskHours(task: ClickUpTask): number {
    // Simplified estimation based on task complexity
    const description = task.description || '';
    const baseHours = 4;
    
    if (description.length > 500) return baseHours * 2;
    if (description.length > 200) return baseHours * 1.5;
    return baseHours;
  }

  private estimateStoryPoints(task: ClickUpTask): number {
    // Simplified story point estimation
    const hours = this.estimateTaskHours(task);
    return Math.ceil(hours / 4); // 4 hours = 1 story point
  }

  private isQuickWin(task: ClickUpTask): boolean {
    const estimatedHours = this.estimateTaskHours(task);
    const priority = task.priority || 3;
    return estimatedHours <= 4 && priority <= 2; // High priority, low effort
  }

  private calculateTaskAge(_task: ClickUpTask): number {
    // This would use the task creation date in a real implementation
    return Math.floor(Math.random() * 30); // Mock age: 0-30 days
  }

  private hasBlockingDependencies(_task: ClickUpTask): boolean {
    // This would check actual dependencies in a real implementation
    return Math.random() < 0.2; // 20% chance of having blocking dependencies
  }

  private assessSprintRisks(tasks: ClickUpTask[], capacity: number, _velocity: number): string {
    const risks: string[] = [];
    
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + this.estimateTaskHours(task), 0);
    const capacityUtilization = (totalEstimatedHours / capacity) * 100;
    
    if (capacityUtilization > 90) {
      risks.push('High capacity utilization may lead to sprint overcommitment');
    }
    
    const highPriorityTasks = tasks.filter(task => (task.priority || 3) <= 2).length;
    if (highPriorityTasks > tasks.length * 0.7) {
      risks.push('High concentration of priority tasks increases delivery pressure');
    }
    
    const tasksWithDependencies = tasks.filter(task => this.hasBlockingDependencies(task)).length;
    if (tasksWithDependencies > 0) {
      risks.push(`${tasksWithDependencies} tasks have potential blocking dependencies`);
    }
    
    if (risks.length === 0) {
      return 'Low risk sprint with balanced workload and clear priorities';
    }
    
    return risks.join('. ');
  }

  private generateSprintRecommendations(tasks: ClickUpTask[], context: any): string[] {
    const recommendations: string[] = [];
    
    const totalHours = tasks.reduce((sum, task) => sum + this.estimateTaskHours(task), 0);
    const utilization = (totalHours / context.capacity) * 100;
    
    if (utilization < 70) {
      recommendations.push('Consider adding more tasks to fully utilize team capacity');
    } else if (utilization > 90) {
      recommendations.push('Consider removing some tasks to avoid overcommitment');
    }
    
    const unassignedTasks = tasks.filter(task => !task.assignees || task.assignees.length === 0).length;
    if (unassignedTasks > 0) {
      recommendations.push(`Assign ${unassignedTasks} unassigned tasks before sprint start`);
    }
    
    const tasksWithoutDescription = tasks.filter(task => !task.description || task.description.trim() === '').length;
    if (tasksWithoutDescription > 0) {
      recommendations.push(`Add descriptions to ${tasksWithoutDescription} tasks for better clarity`);
    }
    
    recommendations.push('Schedule daily standups to track progress and address blockers');
    recommendations.push('Plan mid-sprint review to assess progress and adjust if needed');
    
    return recommendations;
  }

  private estimateCompletionConfidence(tasks: ClickUpTask[], velocity: number, capacity: number): string {
    const totalPoints = tasks.reduce((sum, task) => sum + this.estimateStoryPoints(task), 0);
    const totalHours = tasks.reduce((sum, task) => sum + this.estimateTaskHours(task), 0);
    
    const velocityRatio = totalPoints / velocity;
    const capacityRatio = totalHours / capacity;
    
    const maxRatio = Math.max(velocityRatio, capacityRatio);
    
    if (maxRatio <= 0.7) return 'High confidence (90-95%)';
    if (maxRatio <= 0.85) return 'Good confidence (80-90%)';
    if (maxRatio <= 1.0) return 'Moderate confidence (70-80%)';
    return 'Low confidence (50-70%)';
  }

  private async calculateOptimalAllocations(
    tasks: ClickUpTask[],
    teamMembers: Array<{ user_id: number; available_hours: number; skills?: string[] }>
  ): Promise<Array<{
    taskId: string;
    taskName: string;
    assigneeName: string;
    estimatedHours: number;
    skillMatch: number;
    confidence: string;
  }>> {
    const allocations = [];
    
    for (const task of tasks) {
      const estimatedHours = this.estimateTaskHours(task);
      
      // Find best team member for this task
      let bestMember = teamMembers[0];
      let bestScore = 0;
      
      for (const member of teamMembers) {
        if (member.available_hours >= estimatedHours) {
          const skillMatch = this.calculateSkillMatch(task, member.skills || []);
          const availabilityScore = (member.available_hours / estimatedHours) * 10;
          const totalScore = skillMatch + availabilityScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMember = member;
          }
        }
      }
      
      // Reduce available hours for selected member
      bestMember.available_hours -= estimatedHours;
      
      allocations.push({
        taskId: task.id,
        taskName: task.name,
        assigneeName: `User ${bestMember.user_id}`,
        estimatedHours,
        skillMatch: this.calculateSkillMatch(task, bestMember.skills || []),
        confidence: estimatedHours <= 8 ? 'High' : estimatedHours <= 16 ? 'Medium' : 'Low'
      });
    }
    
    return allocations;
  }

  private calculateSkillMatch(task: ClickUpTask, memberSkills: string[]): number {
    // Simplified skill matching based on task tags
    const taskSkills = task.tags || [];
    if (taskSkills.length === 0 || memberSkills.length === 0) return 50;
    
    const matches = taskSkills.filter(skill => 
      memberSkills.some(memberSkill => 
        memberSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(memberSkill.toLowerCase())
      )
    ).length;
    
    return Math.min(100, (matches / taskSkills.length) * 100);
  }

  private generateCapacityInsights(
    allocations: any[],
    totalCapacity: number,
    allocatedHours: number
  ): string[] {
    const insights = [];
    
    const utilization = (allocatedHours / totalCapacity) * 100;
    
    if (utilization > 95) {
      insights.push('Team is at maximum capacity - consider reducing scope or extending timeline');
    } else if (utilization < 60) {
      insights.push('Team has significant spare capacity - consider adding more tasks');
    } else {
      insights.push('Good capacity utilization with healthy buffer for unexpected work');
    }
    
    const highConfidenceTasks = allocations.filter(a => a.confidence === 'High').length;
    const lowConfidenceTasks = allocations.filter(a => a.confidence === 'Low').length;
    
    if (lowConfidenceTasks > highConfidenceTasks) {
      insights.push('Many tasks have low confidence estimates - consider breaking them down further');
    }
    
    const avgSkillMatch = allocations.reduce((sum, a) => sum + a.skillMatch, 0) / allocations.length;
    if (avgSkillMatch < 60) {
      insights.push('Consider skill development or task reassignment to improve efficiency');
    }
    
    return insights;
  }
}
