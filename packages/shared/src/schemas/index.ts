// Common Zod schemas shared across ClickUp MCP packages

import { z } from 'zod';

export const ClickUpTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.string(),
  priority: z.number().optional(),
  assignees: z.array(z.object({
    id: z.number(),
    username: z.string(),
    email: z.string()
  })).optional(),
  due_date: z.string().optional(),
  start_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    value: z.any()
  })).optional()
});

export const ProjectHealthMetricsSchema = z.object({
  overallScore: z.number().min(0).max(100),
  taskCompletionRate: z.number().min(0).max(100),
  overdueTasksCount: z.number().min(0),
  blockedTasksCount: z.number().min(0),
  averageTaskAge: z.number().min(0),
  teamVelocity: z.number().min(0),
  riskFactors: z.array(z.string()),
  recommendations: z.array(z.string())
});

export const SprintPlanningDataSchema = z.object({
  sprintCapacity: z.number().min(0),
  teamVelocity: z.number().min(0),
  suggestedTasks: z.array(ClickUpTaskSchema),
  estimatedCompletion: z.string(),
  riskAssessment: z.string(),
  recommendations: z.array(z.string())
});
