/* eslint-disable max-len */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedGoalsClient } from '../clickup-client/goals-enhanced.js';
import { htmlEncode } from '../utils/security.js';
import { mcpError } from '../utils/error-handling.js';
import {
  TeamIdSchema,
  GoalIdSchema,
  TargetIdSchema,
  GoalTargetTypeSchema,
  GoalColorSchema,
} from '../schemas/goals-schemas.js';

// Create clients
const clickUpClient = createClickUpClient();
const goalsClient = createEnhancedGoalsClient(clickUpClient);

export function setupGoalsTools(server: McpServer): void {
  // ========================================
  // GOAL MANAGEMENT OPERATIONS
  // ========================================

  server.tool(
    'clickup_get_goals',
    'Get goals for a team with optional filtering. Returns goal details including progress, targets, and team members.',
    {
      team_id: TeamIdSchema.describe('The ID of the team to get goals for'),
      include_completed: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include completed goals'),
    },
    async ({ team_id, include_completed }) => {
      try {
        const goals = await goalsClient.getGoals(team_id, include_completed);

        return {
          content: [
            {
              type: 'text',
              text: `Goals for team ${htmlEncode(team_id)}:\n\n${JSON.stringify(goals, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting goals', error);
      }
    }
  );

  server.tool(
    'clickup_create_goal',
    'Create a new goal with targets and deadlines. Supports team collaboration with multiple owners.',
    {
      team_id: TeamIdSchema.describe('The ID of the team to create the goal for'),
      name: z.string().min(1).max(255).describe('The name of the goal'),
      due_date: z.number().positive().describe('Goal due date (Unix timestamp in milliseconds)'),
      description: z.string().optional().describe('Detailed description of the goal'),
      multiple_owners: z
        .boolean()
        .optional()
        .describe('Whether the goal can have multiple owners (defaults to true when multiple owners are provided)'),
      owners: z.array(z.number().positive()).min(1).describe('Array of user IDs who own this goal'),
      color: GoalColorSchema.optional().default('#007cff').describe('Goal color (hex format)'),
    },
    async ({ team_id, name, due_date, description, multiple_owners, owners, color }) => {
      try {
        // Validate due date is in the future
        if (!goalsClient.validateGoalDate(due_date)) {
          return {
            content: [{ type: 'text', text: 'Error: Due date must be in the future' }],
            isError: true,
          };
        }

        const params = {
          name,
          // The API expects unix milliseconds; normalize seconds-scale input
          due_date: goalsClient.normalizeGoalDate(due_date),
          description,
          multiple_owners: multiple_owners ?? owners.length > 1,
          owners,
          color,
        };

        const goal = await goalsClient.createGoal(team_id, params);

        return {
          content: [
            {
              type: 'text',
              text: `Goal created successfully!\n\n${JSON.stringify(goal, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating goal', error);
      }
    }
  );

  server.tool(
    'clickup_update_goal',
    'Update an existing goal. Can modify name, description, due date, owners, and color.',
    {
      goal_id: GoalIdSchema.describe('The ID of the goal to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the goal'),
      due_date: z.number().positive().optional().describe('New due date (Unix timestamp in milliseconds)'),
      description: z.string().optional().describe('New description for the goal'),
      rem_owners: z
        .array(z.number().positive())
        .optional()
        .describe('Array of user IDs to remove as owners'),
      add_owners: z
        .array(z.number().positive())
        .optional()
        .describe('Array of user IDs to add as owners'),
      color: GoalColorSchema.optional().describe('New goal color (hex format)'),
    },
    async ({ goal_id, name, due_date, description, rem_owners, add_owners, color }) => {
      try {
        // Validate due date if provided
        if (due_date && !goalsClient.validateGoalDate(due_date)) {
          return {
            content: [{ type: 'text', text: 'Error: Due date must be in the future' }],
            isError: true,
          };
        }

        const params = {
          name,
          // The API expects unix milliseconds; normalize seconds-scale input
          due_date: due_date !== undefined ? goalsClient.normalizeGoalDate(due_date) : undefined,
          description,
          rem_owners,
          add_owners,
          color,
        };

        const updatedGoal = await goalsClient.updateGoal(goal_id, params);

        return {
          content: [
            {
              type: 'text',
              text: `Goal updated successfully!\n\n${JSON.stringify(updatedGoal, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating goal', error);
      }
    }
  );

  server.tool(
    'clickup_delete_goal',
    'Delete a goal from ClickUp. This action cannot be undone and will remove all associated targets.',
    {
      goal_id: GoalIdSchema.describe('The ID of the goal to delete'),
    },
    async ({ goal_id }) => {
      try {
        await goalsClient.deleteGoal(goal_id);

        return {
          content: [
            {
              type: 'text',
              text: `Goal ${htmlEncode(goal_id)} deleted successfully. All associated targets have been removed.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting goal', error);
      }
    }
  );

  server.tool(
    'clickup_get_goal',
    'Get detailed information about a specific goal including all targets and progress data.',
    {
      goal_id: GoalIdSchema.describe('The ID of the goal to retrieve'),
    },
    async ({ goal_id }) => {
      try {
        const goal = await goalsClient.getGoal(goal_id);

        // Add formatted progress information
        const formattedGoal = {
          ...goal,
          progress_summary: {
            overall_progress: `${goal.percent_completed}%`,
            days_until_due: goalsClient.getDaysUntilDue(goal.due_date),
            status: goalsClient.getGoalStatus(goal.percent_completed, goal.due_date),
            targets_count: goal.key_results.length,
            completed_targets: goal.key_results.filter(t => t.completed).length,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: `Goal details:\n\n${JSON.stringify(formattedGoal, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting goal', error);
      }
    }
  );

  // ========================================
  // GOAL TARGET MANAGEMENT
  // ========================================

  server.tool(
    'clickup_create_goal_target',
    'Create a target (key result) for a goal. Supports different target types: number, currency, boolean, percentage, and automatic (tracked via linked tasks/lists).',
    {
      goal_id: GoalIdSchema.describe('The ID of the goal to add the target to'),
      name: z.string().min(1).max(255).describe('The name of the target'),
      type: GoalTargetTypeSchema.describe('The type of target'),
      steps_end: z.number().optional().describe('The target end value to achieve'),
      steps_start: z.number().optional().default(0).describe('The starting value (defaults to 0)'),
      unit: z.string().optional().describe('Unit of measurement (e.g., "USD", "tasks", "users")'),
      owners: z
        .array(z.number().positive())
        .optional()
        .describe('Array of user IDs who own this target'),
      task_ids: z
        .array(z.string())
        .optional()
        .describe('Task IDs to link for automatic tracking'),
      list_ids: z
        .array(z.string())
        .optional()
        .describe('List IDs to link for automatic tracking'),
    },
    async ({ goal_id, name, type, steps_end, steps_start, unit, owners, task_ids, list_ids }) => {
      try {
        const params = {
          name,
          type,
          steps_end,
          steps_start,
          unit,
          owners,
          task_ids,
          list_ids,
        };

        const target = await goalsClient.createGoalTarget(goal_id, params);

        return {
          content: [
            {
              type: 'text',
              text: `Goal target created successfully!\n\n${JSON.stringify(target, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating goal target', error);
      }
    }
  );

  server.tool(
    'clickup_update_goal_target',
    'Update an existing goal target (key result). Sets the current progress value and an optional note.',
    {
      target_id: TargetIdSchema.describe('The ID of the target (key result) to update'),
      steps_current: z.number().optional().describe('The current progress value of the target'),
      note: z.string().optional().describe('A note describing the progress update'),
    },
    async ({ target_id, steps_current, note }) => {
      try {
        const params = {
          steps_current,
          note,
        };

        const updatedTarget = await goalsClient.updateGoalTarget(target_id, params);

        return {
          content: [
            {
              type: 'text',
              text: `Goal target updated successfully!\n\n${JSON.stringify(updatedTarget, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('updating goal target', error);
      }
    }
  );

  server.tool(
    'clickup_delete_goal_target',
    'Delete a target (key result) from a goal. This action cannot be undone.',
    {
      target_id: TargetIdSchema.describe('The ID of the target (key result) to delete'),
    },
    async ({ target_id }) => {
      try {
        await goalsClient.deleteGoalTarget(target_id);

        return {
          content: [
            {
              type: 'text',
              text: `Goal target ${htmlEncode(target_id)} deleted successfully.`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('deleting goal target', error);
      }
    }
  );

  // ========================================
  // GOAL ANALYTICS & REPORTING
  // ========================================

  server.tool(
    'clickup_get_goal_summary',
    'Get comprehensive goal analytics and summary for a team. Includes progress statistics, status breakdown, and upcoming deadlines.',
    {
      team_id: TeamIdSchema.describe('The ID of the team to get goal summary for'),
    },
    async ({ team_id }) => {
      try {
        const summary = await goalsClient.getGoalSummary(team_id);

        return {
          content: [
            {
              type: 'text',
              text: `Goal summary for team ${htmlEncode(team_id)}:\n\n${JSON.stringify(summary, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('getting goal summary', error);
      }
    }
  );

  // ========================================
  // HELPER TOOLS
  // ========================================

  server.tool(
    'clickup_create_number_goal',
    'Create a number-based goal with a target. Convenient helper for creating numeric goals like task counts or metrics.',
    {
      team_id: TeamIdSchema.describe('The ID of the team'),
      goal_name: z.string().min(1).max(255).describe('The name of the goal'),
      target_name: z.string().min(1).max(255).describe('The name of the target'),
      target_value: z.number().min(1).describe('The numeric target to achieve'),
      unit: z
        .string()
        .optional()
        .describe('Unit of measurement (e.g., "tasks", "users", "points")'),
      due_date: z.number().positive().describe('Goal due date (Unix timestamp)'),
      description: z.string().optional().describe('Goal description'),
      owners: z.array(z.number().positive()).min(1).describe('Array of user IDs who own this goal'),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .default('#007cff')
        .describe('Goal color'),
    },
    async ({
      team_id,
      goal_name,
      target_name,
      target_value,
      unit,
      due_date,
      description,
      owners,
      color,
    }) => {
      try {
        // Create the goal
        const goal = await goalsClient.createGoal(team_id, {
          name: goal_name,
          due_date: goalsClient.normalizeGoalDate(due_date),
          description,
          multiple_owners: owners.length > 1,
          owners,
          color,
        });

        // Create the number target
        const target = await goalsClient.createGoalTarget(goal.id, {
          name: target_name,
          type: 'number',
          steps_end: target_value,
          steps_start: 0,
          unit,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Number goal created successfully!\n\nGoal: ${JSON.stringify(goal, null, 2)}\n\nTarget: ${JSON.stringify(target, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating number goal', error);
      }
    }
  );

  server.tool(
    'clickup_create_currency_goal',
    'Create a currency-based goal with a monetary target. Convenient helper for creating revenue or budget goals.',
    {
      team_id: TeamIdSchema.describe('The ID of the team'),
      goal_name: z.string().min(1).max(255).describe('The name of the goal'),
      target_name: z.string().min(1).max(255).describe('The name of the target'),
      target_value: z.number().min(0).describe('The monetary target to achieve'),
      currency: z
        .string()
        .optional()
        .default('USD')
        .describe('Currency code (e.g., "USD", "EUR", "GBP")'),
      due_date: z.number().positive().describe('Goal due date (Unix timestamp)'),
      description: z.string().optional().describe('Goal description'),
      owners: z.array(z.number().positive()).min(1).describe('Array of user IDs who own this goal'),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .default('#00c851')
        .describe('Goal color'),
    },
    async ({
      team_id,
      goal_name,
      target_name,
      target_value,
      currency,
      due_date,
      description,
      owners,
      color,
    }) => {
      try {
        // Create the goal
        const goal = await goalsClient.createGoal(team_id, {
          name: goal_name,
          due_date: goalsClient.normalizeGoalDate(due_date),
          description,
          multiple_owners: owners.length > 1,
          owners,
          color,
        });

        // Create the currency target
        const target = await goalsClient.createGoalTarget(goal.id, {
          name: target_name,
          type: 'currency',
          steps_end: target_value,
          steps_start: 0,
          unit: currency,
        });

        // Format the target value for display
        const formattedValue = goalsClient.formatCurrencyValue(target_value, currency);

        return {
          content: [
            {
              type: 'text',
              text: `Currency goal created successfully!\n\nGoal: ${goal_name}\nTarget: ${formattedValue}\n\nDetails:\nGoal: ${JSON.stringify(goal, null, 2)}\n\nTarget: ${JSON.stringify(target, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('creating currency goal', error);
      }
    }
  );

  server.tool(
    'clickup_format_goal_progress',
    'Format goal progress information for human-readable display. Useful for reporting and dashboards.',
    {
      goal_id: GoalIdSchema.describe('The ID of the goal to format'),
    },
    async ({ goal_id }) => {
      try {
        const goal = await goalsClient.getGoal(goal_id);

        const status = goalsClient.getGoalStatus(goal.percent_completed, goal.due_date);
        const daysUntilDue = goalsClient.getDaysUntilDue(goal.due_date);

        let formattedTargets = '';
        for (const target of goal.key_results) {
          const progress = goalsClient.calculateTargetProgress(
            target.steps_start,
            target.steps_current,
            target.steps_end
          );
          let valueDisplay = '';

          if (target.type === 'currency') {
            valueDisplay = `${goalsClient.formatCurrencyValue(target.steps_current, target.unit || 'USD')} / ${goalsClient.formatCurrencyValue(target.steps_end, target.unit || 'USD')}`;
          } else {
            valueDisplay = `${goalsClient.formatNumberValue(target.steps_current, target.unit || undefined)} / ${goalsClient.formatNumberValue(target.steps_end, target.unit || undefined)}`;
          }

          formattedTargets += `\n  • ${target.name}: ${valueDisplay} (${progress.toFixed(1)}%)`;
        }

        const formattedProgress = `
📊 Goal Progress Report

🎯 Goal: ${goal.name}
📈 Overall Progress: ${goal.percent_completed}%
📅 Status: ${status.toUpperCase()}
⏰ Days Until Due: ${daysUntilDue}
👥 Owners: ${goal.owners.map(o => o.username).join(', ')}

🎯 Targets:${formattedTargets}

📝 Description: ${goal.description || 'No description'}
`;

        return {
          content: [
            {
              type: 'text',
              text: formattedProgress,
            },
          ],
        };
      } catch (error: unknown) {
        return mcpError('formatting goal progress', error);
      }
    }
  );
}
