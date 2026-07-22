/* eslint-disable max-len */
import { z } from 'zod';

// ========================================
// GOALS VALIDATION SCHEMAS
// ========================================

// Team ID validation
export const TeamIdSchema = z.coerce.string().min(1, 'Team ID is required');

// Goal ID validation
export const GoalIdSchema = z.coerce.string().min(1, 'Goal ID is required');

// Target ID validation
export const TargetIdSchema = z.coerce.string().min(1, 'Target ID is required');

// User ID validation
export const UserIdSchema = z.number().positive('User ID must be positive');

// ========================================
// GOAL SCHEMAS
// ========================================

// Goal color validation (hex color)
export const GoalColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color');

// Create goal schema
export const CreateGoalSchema = z.object({
  team_id: TeamIdSchema,
  name: z.string().min(1, 'Goal name is required').max(255, 'Goal name too long'),
  due_date: z.number().positive('Due date must be a positive Unix timestamp'),
  description: z.string().optional(),
  multiple_owners: z.boolean().default(false),
  owners: z.array(UserIdSchema).min(1, 'At least one owner is required'),
  color: GoalColorSchema.optional().default('#007cff'),
});

// Update goal schema
export const UpdateGoalSchema = z.object({
  goal_id: GoalIdSchema,
  name: z.string().min(1).max(255).optional(),
  due_date: z.number().positive().optional(),
  description: z.string().optional(),
  rem_owners: z.array(UserIdSchema).optional(),
  add_owners: z.array(UserIdSchema).optional(),
  color: GoalColorSchema.optional(),
});

// Delete goal schema
export const DeleteGoalSchema = z.object({
  goal_id: GoalIdSchema,
});

// Get goals schema
export const GetGoalsSchema = z.object({
  team_id: TeamIdSchema,
  include_completed: z.boolean().optional().default(false),
});

// ========================================
// GOAL TARGET SCHEMAS
// ========================================

// Goal target (key result) types
export const GoalTargetTypeSchema = z.enum(['number', 'currency', 'boolean', 'percentage', 'automatic']);

// Create target (key result) schema — mirrors CreateKeyResultRequest
export const CreateGoalTargetSchema = z.object({
  goal_id: GoalIdSchema,
  name: z.string().min(1, 'Target name is required').max(255, 'Target name too long'),
  type: GoalTargetTypeSchema,
  steps_start: z.number().optional(),
  steps_end: z.number().optional(),
  unit: z.string().optional(),
  owners: z.array(UserIdSchema).optional(),
  task_ids: z.array(z.string()).optional(),
  list_ids: z.array(z.string()).optional(),
});

// Update target (key result) schema — mirrors UpdateKeyResultRequest
export const UpdateGoalTargetSchema = z.object({
  target_id: TargetIdSchema,
  steps_current: z.number().optional(),
  note: z.string().optional(),
});

// Delete target schema
export const DeleteGoalTargetSchema = z.object({
  target_id: TargetIdSchema,
});

// ========================================
// GOAL PROGRESS SCHEMAS
// ========================================

// Progress update schema
export const UpdateGoalProgressSchema = z.object({
  target_id: TargetIdSchema,
  steps_current: z.number().min(0, 'Current value must be non-negative'),
  note: z.string().optional(),
});

// Progress calculation schema
export const GoalProgressSchema = z.object({
  target_id: z.string(),
  name: z.string(),
  type: GoalTargetTypeSchema,
  steps_start: z.number(),
  steps_end: z.number(),
  steps_current: z.number(),
  percent_completed: z.number().min(0).max(100),
  completed: z.boolean(),
  unit: z.string().nullable(),
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
  profilePicture: z.string(),
});

// Goal target (key result) response schema
export const GoalTargetResponseSchema = z.object({
  id: z.string(),
  goal_id: z.string(),
  name: z.string(),
  creator: z.number(),
  type: GoalTargetTypeSchema,
  date_created: z.string(),
  steps_start: z.number(),
  steps_end: z.number(),
  steps_current: z.number(),
  unit: z.string().nullable(),
  task_ids: z.array(z.string()).nullable(),
  list_ids: z.array(z.string()).nullable(),
  completed: z.boolean(),
  percent_completed: z.number(),
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
  pretty_url: z.string(),
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Calculate progress percentage for a target
 */
export function calculateTargetProgress(
  startValue: number,
  currentValue: number,
  targetValue: number
): number {
  if (targetValue === startValue) return 100; // Avoid division by zero

  const progress = ((currentValue - startValue) / (targetValue - startValue)) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
}

/**
 * Check if a target is completed
 */
export function isTargetCompleted(
  currentValue: number,
  targetValue: number,
  type: string
): boolean {
  switch (type) {
    case 'boolean':
      return currentValue >= 1;
    case 'number':
    case 'currency':
    case 'percentage':
    case 'automatic':
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
    maximumFractionDigits: 2,
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
export function calculateGoalProgress(
  targets: Array<{
    id: string;
    percent_completed: number;
  }>
): number {
  if (targets.length === 0) return 0;

  const totalProgress = targets.reduce((sum, target) => sum + target.percent_completed, 0);
  return Math.round(totalProgress / targets.length);
}

/**
 * Get goal status based on progress and due date
 */
export function getGoalStatus(
  percentCompleted: number,
  dueDate: string
): 'completed' | 'on_track' | 'at_risk' | 'overdue' {
  const now = Date.now();
  // due_date is a string containing a unix ms timestamp; new Date(string) would yield Invalid Date
  const due = new Date(Number(dueDate)).getTime();

  if (percentCompleted >= 100) return 'completed';
  if (now > due) return 'overdue';

  // Simple heuristic: a goal is at risk when the deadline is near (< 7 days)
  // and completion is still low. Without a start date, elapsed-time ratios
  // against a bare epoch timestamp are meaningless.
  const daysLeft = (due - now) / (1000 * 60 * 60 * 24);
  if (daysLeft < 7 && percentCompleted < 80) return 'at_risk';
  return 'on_track';
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
  createGoalTarget: CreateGoalTargetSchema,
  updateGoalTarget: UpdateGoalTargetSchema,
  deleteGoalTarget: DeleteGoalTargetSchema,

  // Progress operations
  updateGoalProgress: UpdateGoalProgressSchema,
};
