import { ClickUpClient } from './index.js';
import axios from 'axios';

// ========================================
// GOALS TYPE DEFINITIONS
// ========================================

export interface GoalMember {
  id: number;
  username: string;
  email: string;
  color: string;
  initials: string;
  profilePicture: string;
}

export interface CreateGoalParams {
  name: string;
  due_date: number; // Unix timestamp
  description?: string;
  multiple_owners: boolean;
  owners: number[];
  color?: string;
}

export interface UpdateGoalParams {
  name?: string;
  due_date?: number;
  description?: string;
  rem_owners?: number[];
  add_owners?: number[];
  color?: string;
}

export interface GoalTarget {
  id: string;
  goal_id: string;
  name: string;
  creator: number;
  type: 'number' | 'currency' | 'boolean' | 'task' | 'list';
  date_created: string;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
  task_statuses: string[] | null;
  list_ids: string[] | null;
  completed: boolean;
  percent_completed: number;
}

export interface Goal {
  id: string;
  name: string;
  team_id: string;
  date_created: string;
  start_date: string | null;
  due_date: string;
  description: string;
  private: boolean;
  archived: boolean;
  creator: number;
  color: string;
  pretty_id: string;
  multiple_owners: boolean;
  folder_id: string | null;
  members: GoalMember[];
  owners: GoalMember[];
  key_results: GoalTarget[];
  percent_completed: number;
  pretty_url: string;
}

export interface CreateGoalTargetParams {
  name: string;
  type: 'number' | 'currency' | 'boolean' | 'task' | 'list';
  target_value: number;
  start_value?: number;
  unit?: string;
  task_statuses?: string[];
  list_ids?: string[];
}

export interface UpdateGoalTargetParams {
  name?: string;
  target_value?: number;
  unit?: string;
  task_statuses?: string[];
  list_ids?: string[];
}

export interface GoalSummary {
  total_goals: number;
  completed_goals: number;
  in_progress_goals: number;
  overdue_goals: number;
  average_progress: number;
  goals_by_status: Record<string, number>;
  upcoming_deadlines: Array<{
    goal_id: string;
    name: string;
    due_date: string;
    days_remaining: number;
  }>;
}

// ========================================
// ENHANCED GOALS CLIENT
// ========================================

export class EnhancedGoalsClient {
  private client: ClickUpClient;

  constructor(client: ClickUpClient) {
    this.client = client;
  }

  private getAxiosInstance() {
    return this.client.getAxiosInstance();
  }

  // ========================================
  // GOAL MANAGEMENT
  // ========================================

  /**
   * Get goals for a team
   */
  async getGoals(teamId: string, includeCompleted: boolean = false): Promise<Goal[]> {
    try {
      const queryParams = new URLSearchParams();
      if (includeCompleted) queryParams.append('include_completed', 'true');

      const endpoint = `/team/${teamId}/goal?${queryParams.toString()}`;
      const response = await this.getAxiosInstance().get(endpoint);
      
      return response.data.goals || [];
    } catch (error) {
      console.error('Error getting goals:', error);
      throw this.handleError(error, `Failed to get goals for team ${teamId}`);
    }
  }

  /**
   * Create a new goal
   */
  async createGoal(teamId: string, params: CreateGoalParams): Promise<Goal> {
    try {
      const endpoint = `/team/${teamId}/goal`;
      const response = await this.getAxiosInstance().post(endpoint, params);
      
      return response.data.goal;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw this.handleError(error, `Failed to create goal for team ${teamId}`);
    }
  }

  /**
   * Update an existing goal
   */
  async updateGoal(goalId: string, params: UpdateGoalParams): Promise<Goal> {
    try {
      const endpoint = `/goal/${goalId}`;
      const response = await this.getAxiosInstance().put(endpoint, params);
      
      return response.data.goal;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw this.handleError(error, `Failed to update goal ${goalId}`);
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    try {
      const endpoint = `/goal/${goalId}`;
      await this.getAxiosInstance().delete(endpoint);
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw this.handleError(error, `Failed to delete goal ${goalId}`);
    }
  }

  /**
   * Get a specific goal by ID
   */
  async getGoal(goalId: string): Promise<Goal> {
    try {
      const endpoint = `/goal/${goalId}`;
      const response = await this.getAxiosInstance().get(endpoint);
      
      return response.data.goal;
    } catch (error) {
      console.error('Error getting goal:', error);
      throw this.handleError(error, `Failed to get goal ${goalId}`);
    }
  }

  // ========================================
  // GOAL TARGET MANAGEMENT
  // ========================================

  /**
   * Create a goal target (key result)
   */
  async createGoalTarget(goalId: string, params: CreateGoalTargetParams): Promise<GoalTarget> {
    try {
      const endpoint = `/goal/${goalId}/target`;
      const response = await this.getAxiosInstance().post(endpoint, params);
      
      return response.data.target;
    } catch (error) {
      console.error('Error creating goal target:', error);
      throw this.handleError(error, `Failed to create target for goal ${goalId}`);
    }
  }

  /**
   * Update a goal target
   */
  async updateGoalTarget(goalId: string, targetId: string, params: UpdateGoalTargetParams): Promise<GoalTarget> {
    try {
      const endpoint = `/goal/${goalId}/target/${targetId}`;
      const response = await this.getAxiosInstance().put(endpoint, params);
      
      return response.data.target;
    } catch (error) {
      console.error('Error updating goal target:', error);
      throw this.handleError(error, `Failed to update target ${targetId} for goal ${goalId}`);
    }
  }

  /**
   * Delete a goal target
   */
  async deleteGoalTarget(goalId: string, targetId: string): Promise<void> {
    try {
      const endpoint = `/goal/${goalId}/target/${targetId}`;
      await this.getAxiosInstance().delete(endpoint);
    } catch (error) {
      console.error('Error deleting goal target:', error);
      throw this.handleError(error, `Failed to delete target ${targetId} for goal ${goalId}`);
    }
  }

  // ========================================
  // GOAL ANALYTICS & REPORTING
  // ========================================

  /**
   * Get goal summary and analytics for a team
   */
  async getGoalSummary(teamId: string): Promise<GoalSummary> {
    try {
      const goals = await this.getGoals(teamId, true);
      
      let totalGoals = goals.length;
      let completedGoals = 0;
      let inProgressGoals = 0;
      let overdueGoals = 0;
      let totalProgress = 0;
      const goalsByStatus: Record<string, number> = {};
      const upcomingDeadlines: Array<{
        goal_id: string;
        name: string;
        due_date: string;
        days_remaining: number;
      }> = [];

      const now = Date.now();

      for (const goal of goals) {
        const dueDate = new Date(goal.due_date).getTime();
        const progress = goal.percent_completed;
        totalProgress += progress;

        // Categorize goals
        if (progress >= 100) {
          completedGoals++;
        } else if (now > dueDate) {
          overdueGoals++;
        } else {
          inProgressGoals++;
        }

        // Get goal status
        const status = this.getGoalStatus(progress, goal.due_date);
        goalsByStatus[status] = (goalsByStatus[status] || 0) + 1;

        // Check for upcoming deadlines (within 7 days)
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0 && daysRemaining <= 7 && progress < 100) {
          upcomingDeadlines.push({
            goal_id: goal.id,
            name: goal.name,
            due_date: goal.due_date,
            days_remaining: daysRemaining
          });
        }
      }

      // Sort upcoming deadlines by days remaining
      upcomingDeadlines.sort((a, b) => a.days_remaining - b.days_remaining);

      return {
        total_goals: totalGoals,
        completed_goals: completedGoals,
        in_progress_goals: inProgressGoals,
        overdue_goals: overdueGoals,
        average_progress: totalGoals > 0 ? Math.round(totalProgress / totalGoals) : 0,
        goals_by_status: goalsByStatus,
        upcoming_deadlines: upcomingDeadlines
      };
    } catch (error) {
      console.error('Error getting goal summary:', error);
      throw this.handleError(error, `Failed to get goal summary for team ${teamId}`);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Calculate progress percentage for a target
   */
  calculateTargetProgress(startValue: number, currentValue: number, targetValue: number): number {
    if (targetValue === startValue) return 100; // Avoid division by zero
    
    const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
    return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
  }

  /**
   * Check if a target is completed
   */
  isTargetCompleted(currentValue: number, targetValue: number, type: string): boolean {
    switch (type) {
      case 'boolean':
        return currentValue >= 1;
      case 'number':
      case 'currency':
      case 'task':
      case 'list':
        return currentValue >= targetValue;
      default:
        return false;
    }
  }

  /**
   * Format currency value with unit
   */
  formatCurrencyValue(value: number, unit: string = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: unit.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    try {
      return formatter.format(value);
    } catch (error) {
      // Fallback for invalid currency codes
      return `${unit} ${value.toLocaleString()}`;
    }
  }

  /**
   * Format number value with unit
   */
  formatNumberValue(value: number, unit?: string): string {
    const formattedNumber = value.toLocaleString();
    return unit ? `${formattedNumber} ${unit}` : formattedNumber;
  }

  /**
   * Get goal status based on progress and due date
   */
  getGoalStatus(percentCompleted: number, dueDate: string): 'completed' | 'on_track' | 'at_risk' | 'overdue' {
    const now = Date.now();
    const due = new Date(dueDate).getTime();
    
    if (percentCompleted >= 100) return 'completed';
    if (now > due) return 'overdue';
    
    // Calculate if on track (simple heuristic: progress should match time elapsed)
    const timeElapsed = now;
    const totalTime = due;
    const expectedProgress = (timeElapsed / totalTime) * 100;
    
    if (percentCompleted >= expectedProgress * 0.8) return 'on_track';
    return 'at_risk';
  }

  /**
   * Calculate days until due date
   */
  getDaysUntilDue(dueDate: string): number {
    const now = Date.now();
    const due = new Date(dueDate).getTime();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  }

  /**
   * Validate goal date (must be in the future)
   */
  validateGoalDate(dueDate: number): boolean {
    const now = Date.now();
    return dueDate > now;
  }

  // ========================================
  // ERROR HANDLING
  // ========================================

  private handleError(error: any, context: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      switch (status) {
        case 400:
          return new Error(`${context}: Invalid request - ${message}`);
        case 401:
          return new Error(`${context}: Authentication failed - check API token`);
        case 403:
          return new Error(`${context}: Permission denied - insufficient access rights`);
        case 404:
          return new Error(`${context}: Resource not found - ${message}`);
        case 429:
          return new Error(`${context}: Rate limit exceeded - please retry later`);
        case 500:
          return new Error(`${context}: Server error - please try again`);
        default:
          return new Error(`${context}: ${message}`);
      }
    }
    
    return new Error(`${context}: ${error.message || 'Unknown error'}`);
  }
}

export const createEnhancedGoalsClient = (client: ClickUpClient): EnhancedGoalsClient => {
  return new EnhancedGoalsClient(client);
};
