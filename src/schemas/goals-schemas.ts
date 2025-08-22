import { z } from 'zod';

// ========================================
// GOALS VALIDATION SCHEMAS
// ========================================

// Team ID validation
export const TeamIdSchema = z.string().min(1, 'Team ID is required');

// Goal ID validation
export const GoalIdSchema = z.string().min(1, 'Goal ID is required');

// Target ID validation
export const TargetIdSchema = z.string().min(1, 'Target ID is required');

// User ID validation
export const UserIdSchema = z.number().positive('User ID must be positive');

// ========================================
// GOAL SCHEMAS
// ========================================

// Goal color validation (hex color)
export const GoalColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color');

// Create goal schema
export const CreateGoalSchema = z.object({
  team_id: TeamIdSchema,
  name: z.string().min(1, 'Goal name is required').max(255, 'Goal name too long'),
  due_date: z.number().positive('Due date must be a positive Unix timestamp'),
  description: z.string().optional(),
  multiple_owners: z.boolean().default(false),
  owners: z.array(UserIdSchema).min(1, 'At least one owner is required'),
  color: GoalColorSchema.optional().default('#007cff')
});

// Update goal schema
export const UpdateGoalSchema = z.object({
  goal_id: GoalIdSchema,
  name: z.string().min(1).max(255).optional(),
  due_date: z.number().positive().optional(),
  description: z.string().optional(),
  rem_owners: z.array(UserIdSchema).optional(),
  add_owners: z.array(UserIdSchema).optional(),
  color: GoalColorSchema.optional()
});

// Delete goal schema
export const DeleteGoalSchema = z.object({
  goal_id: GoalIdSchema
});

// Get goals schema
export const GetGoalsSchema = z.object({
  team_id: TeamIdSchema,
  include_completed: z.boolean().optional().default(false)
});

// ========================================
// GOAL TARGET SCHEMAS
// ========================================

// Goal target types
export const GoalTargetTypeSchema = z.enum(['number', 'currency', 'boolean', 'task', 'list']);

// Base target schema
export const BaseTargetSchema = z.object({
  name: z.string().min(1, 'Target name is required').max(255, 'Target name too long'),
  type: GoalTargetTypeSchema
});

// Number target schema
export const NumberTargetSchema = BaseTargetSchema.extend({
  type: z.literal('number'),
  target_value: z.number().min(0, 'Target value must be non-negative'),
  start_value: z.number().optional().default(0),
  unit: z.string().optional()
});

// Currency target schema
export const CurrencyTargetSchema = BaseTargetSchema.extend({
  type: z.literal('currency'),
  target_value: z.number().min(0, 'Target value must be non-negative'),
  start_value: z.number().optional().default(0),
  unit: z.string().optional().default('USD')
});

// Boolean target schema
export const BooleanTargetSchema = BaseTargetSchema.extend({
  type: z.literal('boolean'),
  target_value: z.literal(1), // Boolean targets are always 1 (true)
  start_value: z.literal(0).optional().default(0)
});

// Task target schema
export const TaskTargetSchema = BaseTargetSchema.extend({
  type: z.literal('task'),
  target_value: z.number().min(1, 'Target value must be at least 1'),
  start_value: z.number().optional().default(0),
  task_statuses: z.array(z.string()).optional(),
  list_ids: z.array(z.string()).optional()
});

// List target schema
export const ListTargetSchema = BaseTargetSchema.extend({
  type: z.literal('list'),
  target_value: z.number().min(1, 'Target value must be at least 1'),
  start_value: z.number().optional().default(0),
  list_ids: z.array(z.string()).min(1, 'At least one list ID is required')
});

// Union schema for all target types
export const CreateGoalTargetSchema = z.discriminatedUnion('type', [
  NumberTargetSchema,
  CurrencyTargetSchema,
  BooleanTargetSchema,
  TaskTargetSchema,
  ListTargetSchema
]);

// Update target schema
export const UpdateGoalTargetSchema = z.object({
  goal_id: GoalIdSchema,
  target_id: TargetIdSchema,
  name: z.string().min(1).max(255).optional(),
  target_value: z.number().min(0).optional(),
  unit: z.string().optional(),
  task_statuses: z.array(z.string()).optional(),
  list_ids: z.array(z.string()).optional()
});

// Delete target schema
export const DeleteGoalTargetSchema = z.object({
  goal_id: GoalIdSchema,
  target_id: TargetIdSchema
});

// ========================================
// GOAL PROGRESS SCHEMAS
// ========================================

// Progress update schema
export const UpdateGoalProgressSchema = z.object({
  goal_id: GoalIdSchema,
  target_id: TargetIdSchema,
  current_value: z.number().min(0, 'Current value must be non-negative')
});

// Progress calculation schema
export const GoalProgressSchema = z.object({
  target_id: z.string(),
  name: z.string(),
  type: GoalTargetTypeSchema,
  start_value: z.number(),
  target_value: z.number(),
  current_value: z.number(),
  percent_completed: z.number().min(0).max(100),
  completed: z.boolean(),
  unit: z.string().nullable()
});

// ========================================
// RESPONSE TYPE SCHEMAS
// ========================================

// Goal member schema
export const GoalMemberSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  color: z.string(),
  initials: z.string(),
  profilePicture: z.string()
});

// Goal target response schema
export const GoalTargetResponseSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  name: z.string(),
  creator: z.number(),
  type: GoalTargetTypeSchema,
  date_created: z.string(),
  start_value: z.number(),
  target_value: z.number(),
  current_value: z.number(),
  unit: z.string().nullable(),
  task_statuses: z.array(z.string()).nullable(),
  list_ids: z.array(z.string()).nullable(),
  completed: z.boolean(),
  percent_completed: z.number()
});

// Goal response schema
export const GoalResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  team_id: z.string(),
  date_created: z.string(),
  start_date: z.string().nullable(),
  due_date: z.string(),
  description: z.string(),
  private: z.boolean(),
  archived: z.boolean(),
  creator: z.number(),
  color: z.string(),
  pretty_id: z.string(),
  multiple_owners: z.boolean(),
  folder_id: z.string().nullable(),
  members: z.array(GoalMemberSchema),
  owners: z.array(GoalMemberSchema),
  key_results: z.array(GoalTargetResponseSchema),
  percent_completed: z.number(),
  pretty_url: z.string()
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate progress percentage for a target
 */
export function calculateTargetProgress(startValue: number, currentValue: number, targetValue: number): number {
  if (targetValue === startValue) return 100; // Avoid division by zero
  
  const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
}

/**
 * Check if a target is completed
 */
export function isTargetCompleted(currentValue: number, targetValue: number, type: string): boolean {
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
export function formatCurrencyValue(value: number, unit: string = 'USD'): string {
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
export function formatNumberValue(value: number, unit?: string): string {
  const formattedNumber = value.toLocaleString();
  return unit ? `${formattedNumber} ${unit}` : formattedNumber;
}

/**
 * Validate goal date (must be in the future)
 */
export function validateGoalDate(dueDate: number): boolean {
  const now = Date.now();
  return dueDate > now;
}

/**
 * Calculate overall goal progress from targets
 */
export function calculateGoalProgress(targets: Array<{
  id: string;
  percent_completed: number;
}>): number {
  if (targets.length === 0) return 0;
  
  const totalProgress = targets.reduce((sum, target) => sum + target.percent_completed, 0);
  return Math.round(totalProgress / targets.length);
}

/**
 * Get goal status based on progress and due date
 */
export function getGoalStatus(percentCompleted: number, dueDate: string): 'completed' | 'on_track' | 'at_risk' | 'overdue' {
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

// ========================================
// COMBINED TOOL SCHEMAS
// ========================================

export const GoalsToolSchemas = {
  // Goal operations
  getGoals: GetGoalsSchema,
  createGoal: CreateGoalSchema,
  updateGoal: UpdateGoalSchema,
  deleteGoal: DeleteGoalSchema,

  // Target operations
  createGoalTarget: z.object({
    goal_id: GoalIdSchema,
    target: CreateGoalTargetSchema
  }),
  updateGoalTarget: UpdateGoalTargetSchema,
  deleteGoalTarget: DeleteGoalTargetSchema,

  // Progress operations
  updateGoalProgress: UpdateGoalProgressSchema
};
