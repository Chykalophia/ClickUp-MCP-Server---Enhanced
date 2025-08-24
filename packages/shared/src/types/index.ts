// Common types shared across ClickUp MCP packages

export interface ClickUpTask {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: number;
  assignees?: Array<{ id: number; username: string; email: string }>;
  due_date?: string;
  start_date?: string;
  tags?: string[];
  custom_fields?: Array<{ id: string; name: string; value: any }>;
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  status: string;
  priority?: number;
  assignee?: any;
  task_count?: number;
  due_date?: string;
  start_date?: string;
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  };
  space: {
    id: string;
    name: string;
    access: boolean;
  };
  archived: boolean;
}

export interface ClickUpWorkspace {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  members: Array<{
    user: {
      id: number;
      username: string;
      email: string;
      color: string;
      profilePicture?: string;
    };
  }>;
}

export interface ProjectHealthMetrics {
  overallScore: number;
  taskCompletionRate: number;
  overdueTasksCount: number;
  blockedTasksCount: number;
  averageTaskAge: number;
  teamVelocity: number;
  riskFactors: string[];
  recommendations: string[];
}

export interface SprintPlanningData {
  sprintCapacity: number;
  teamVelocity: number;
  suggestedTasks: ClickUpTask[];
  estimatedCompletion: string;
  riskAssessment: string;
  recommendations: string[];
}
