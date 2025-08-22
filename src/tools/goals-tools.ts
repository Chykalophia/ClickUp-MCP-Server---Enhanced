import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClickUpClient } from '../clickup-client/index.js';
import { createEnhancedGoalsClient } from '../clickup-client/goals-enhanced.js';
import { 
// TeamIdSchema, 
// GoalIdSchema, 
// TargetIdSchema,
// CreateGoalSchema,
// UpdateGoalSchema,
// GoalColorSchema
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
      team_id: z.string().min(1).describe('The ID of the team to get goals for'),
      include_completed: z.boolean().optional().default(false).describe('Whether to include completed goals')
    },
    async ({ team_id, include_completed }) => {
      try {
        const goals = await goalsClient.getGoals(team_id, include_completed);

        return {
          content: [{ 
            type: 'text', 
            text: `Goals for team ${team_id}:\n\n${JSON.stringify(goals, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting goals:', error);
        return {
          content: [{ type: 'text', text: `Error getting goals: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_goal',
    'Create a new goal with targets and deadlines. Supports team collaboration with multiple owners.',
    {
      team_id: z.string().min(1).describe('The ID of the team to create the goal for'),
      name: z.string().min(1).max(255).describe('The name of the goal'),
      due_date: z.number().positive().describe('Goal due date (Unix timestamp)'),
      description: z.string().optional().describe('Detailed description of the goal'),
      multiple_owners: z.boolean().default(false).describe('Whether the goal can have multiple owners'),
      owners: z.array(z.number().positive()).min(1).describe('Array of user IDs who own this goal'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#007cff').describe('Goal color (hex format)')
    },
    async ({ team_id, name, due_date, description, multiple_owners, owners, color }) => {
      try {
        // Validate due date is in the future
        if (!goalsClient.validateGoalDate(due_date)) {
          return {
            content: [{ type: 'text', text: 'Error: Due date must be in the future' }],
            isError: true
          };
        }

        const params = {
          name,
          due_date,
          description,
          multiple_owners,
          owners,
          color
        };

        const goal = await goalsClient.createGoal(team_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal created successfully!\n\n${JSON.stringify(goal, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating goal:', error);
        return {
          content: [{ type: 'text', text: `Error creating goal: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_goal',
    'Update an existing goal. Can modify name, description, due date, owners, and color.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the goal'),
      due_date: z.number().positive().optional().describe('New due date (Unix timestamp)'),
      description: z.string().optional().describe('New description for the goal'),
      rem_owners: z.array(z.number().positive()).optional().describe('Array of user IDs to remove as owners'),
      add_owners: z.array(z.number().positive()).optional().describe('Array of user IDs to add as owners'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('New goal color (hex format)')
    },
    async ({ goal_id, name, due_date, description, rem_owners, add_owners, color }) => {
      try {
        // Validate due date if provided
        if (due_date && !goalsClient.validateGoalDate(due_date)) {
          return {
            content: [{ type: 'text', text: 'Error: Due date must be in the future' }],
            isError: true
          };
        }

        const params = {
          name,
          due_date,
          description,
          rem_owners,
          add_owners,
          color
        };

        const updatedGoal = await goalsClient.updateGoal(goal_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal updated successfully!\n\n${JSON.stringify(updatedGoal, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating goal:', error);
        return {
          content: [{ type: 'text', text: `Error updating goal: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_goal',
    'Delete a goal from ClickUp. This action cannot be undone and will remove all associated targets.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal to delete')
    },
    async ({ goal_id }) => {
      try {
        await goalsClient.deleteGoal(goal_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal ${goal_id} deleted successfully. All associated targets have been removed.` 
          }]
        };
      } catch (error: any) {
        console.error('Error deleting goal:', error);
        return {
          content: [{ type: 'text', text: `Error deleting goal: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_get_goal',
    'Get detailed information about a specific goal including all targets and progress data.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal to retrieve')
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
            completed_targets: goal.key_results.filter(t => t.completed).length
          }
        };

        return {
          content: [{ 
            type: 'text', 
            text: `Goal details:\n\n${JSON.stringify(formattedGoal, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting goal:', error);
        return {
          content: [{ type: 'text', text: `Error getting goal: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  // ========================================
  // GOAL TARGET MANAGEMENT
  // ========================================

  server.tool(
    'clickup_create_goal_target',
    'Create a target (key result) for a goal. Supports different target types: number, currency, boolean, task, and list.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal to add the target to'),
      name: z.string().min(1).max(255).describe('The name of the target'),
      type: z.enum(['number', 'currency', 'boolean', 'task', 'list']).describe('The type of target'),
      target_value: z.number().min(0).describe('The target value to achieve'),
      start_value: z.number().optional().default(0).describe('The starting value (defaults to 0)'),
      unit: z.string().optional().describe('Unit of measurement (e.g., "USD", "tasks", "users")'),
      task_statuses: z.array(z.string()).optional().describe('Task statuses to track (for task type targets)'),
      list_ids: z.array(z.string()).optional().describe('List IDs to track (for list type targets)')
    },
    async ({ goal_id, name, type, target_value, start_value, unit, task_statuses, list_ids }) => {
      try {
        const params = {
          name,
          type,
          target_value,
          start_value,
          unit,
          task_statuses,
          list_ids
        };

        const target = await goalsClient.createGoalTarget(goal_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal target created successfully!\n\n${JSON.stringify(target, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating goal target:', error);
        return {
          content: [{ type: 'text', text: `Error creating goal target: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_update_goal_target',
    'Update an existing goal target. Can modify name, target value, unit, and tracking parameters.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal'),
      target_id: z.string().min(1).describe('The ID of the target to update'),
      name: z.string().min(1).max(255).optional().describe('New name for the target'),
      target_value: z.number().min(0).optional().describe('New target value'),
      unit: z.string().optional().describe('New unit of measurement'),
      task_statuses: z.array(z.string()).optional().describe('New task statuses to track'),
      list_ids: z.array(z.string()).optional().describe('New list IDs to track')
    },
    async ({ goal_id, target_id, name, target_value, unit, task_statuses, list_ids }) => {
      try {
        const params = {
          name,
          target_value,
          unit,
          task_statuses,
          list_ids
        };

        const updatedTarget = await goalsClient.updateGoalTarget(goal_id, target_id, params);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal target updated successfully!\n\n${JSON.stringify(updatedTarget, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error updating goal target:', error);
        return {
          content: [{ type: 'text', text: `Error updating goal target: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_delete_goal_target',
    'Delete a target from a goal. This action cannot be undone.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal'),
      target_id: z.string().min(1).describe('The ID of the target to delete')
    },
    async ({ goal_id, target_id }) => {
      try {
        await goalsClient.deleteGoalTarget(goal_id, target_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal target ${target_id} deleted successfully from goal ${goal_id}.` 
          }]
        };
      } catch (error: any) {
        console.error('Error deleting goal target:', error);
        return {
          content: [{ type: 'text', text: `Error deleting goal target: ${error.message}` }],
          isError: true
        };
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
      team_id: z.string().min(1).describe('The ID of the team to get goal summary for')
    },
    async ({ team_id }) => {
      try {
        const summary = await goalsClient.getGoalSummary(team_id);

        return {
          content: [{ 
            type: 'text', 
            text: `Goal summary for team ${team_id}:\n\n${JSON.stringify(summary, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error getting goal summary:', error);
        return {
          content: [{ type: 'text', text: `Error getting goal summary: ${error.message}` }],
          isError: true
        };
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
      team_id: z.string().min(1).describe('The ID of the team'),
      goal_name: z.string().min(1).max(255).describe('The name of the goal'),
      target_name: z.string().min(1).max(255).describe('The name of the target'),
      target_value: z.number().min(1).describe('The numeric target to achieve'),
      unit: z.string().optional().describe('Unit of measurement (e.g., "tasks", "users", "points")'),
      due_date: z.number().positive().describe('Goal due date (Unix timestamp)'),
      description: z.string().optional().describe('Goal description'),
      owners: z.array(z.number().positive()).min(1).describe('Array of user IDs who own this goal'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#007cff').describe('Goal color')
    },
    async ({ team_id, goal_name, target_name, target_value, unit, due_date, description, owners, color }) => {
      try {
        // Create the goal
        const goal = await goalsClient.createGoal(team_id, {
          name: goal_name,
          due_date,
          description,
          multiple_owners: owners.length > 1,
          owners,
          color
        });

        // Create the number target
        const target = await goalsClient.createGoalTarget(goal.id, {
          name: target_name,
          type: 'number',
          target_value,
          start_value: 0,
          unit
        });

        return {
          content: [{ 
            type: 'text', 
            text: `Number goal created successfully!\n\nGoal: ${JSON.stringify(goal, null, 2)}\n\nTarget: ${JSON.stringify(target, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating number goal:', error);
        return {
          content: [{ type: 'text', text: `Error creating number goal: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_create_currency_goal',
    'Create a currency-based goal with a monetary target. Convenient helper for creating revenue or budget goals.',
    {
      team_id: z.string().min(1).describe('The ID of the team'),
      goal_name: z.string().min(1).max(255).describe('The name of the goal'),
      target_name: z.string().min(1).max(255).describe('The name of the target'),
      target_value: z.number().min(0).describe('The monetary target to achieve'),
      currency: z.string().optional().default('USD').describe('Currency code (e.g., "USD", "EUR", "GBP")'),
      due_date: z.number().positive().describe('Goal due date (Unix timestamp)'),
      description: z.string().optional().describe('Goal description'),
      owners: z.array(z.number().positive()).min(1).describe('Array of user IDs who own this goal'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#00c851').describe('Goal color')
    },
    async ({ team_id, goal_name, target_name, target_value, currency, due_date, description, owners, color }) => {
      try {
        // Create the goal
        const goal = await goalsClient.createGoal(team_id, {
          name: goal_name,
          due_date,
          description,
          multiple_owners: owners.length > 1,
          owners,
          color
        });

        // Create the currency target
        const target = await goalsClient.createGoalTarget(goal.id, {
          name: target_name,
          type: 'currency',
          target_value,
          start_value: 0,
          unit: currency
        });

        // Format the target value for display
        const formattedValue = goalsClient.formatCurrencyValue(target_value, currency);

        return {
          content: [{ 
            type: 'text', 
            text: `Currency goal created successfully!\n\nGoal: ${goal_name}\nTarget: ${formattedValue}\n\nDetails:\nGoal: ${JSON.stringify(goal, null, 2)}\n\nTarget: ${JSON.stringify(target, null, 2)}` 
          }]
        };
      } catch (error: any) {
        console.error('Error creating currency goal:', error);
        return {
          content: [{ type: 'text', text: `Error creating currency goal: ${error.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'clickup_format_goal_progress',
    'Format goal progress information for human-readable display. Useful for reporting and dashboards.',
    {
      goal_id: z.string().min(1).describe('The ID of the goal to format')
    },
    async ({ goal_id }) => {
      try {
        const goal = await goalsClient.getGoal(goal_id);
        
        const status = goalsClient.getGoalStatus(goal.percent_completed, goal.due_date);
        const daysUntilDue = goalsClient.getDaysUntilDue(goal.due_date);
        
        let formattedTargets = '';
        for (const target of goal.key_results) {
          const progress = goalsClient.calculateTargetProgress(target.start_value, target.current_value, target.target_value);
          let valueDisplay = '';
          
          if (target.type === 'currency') {
            valueDisplay = `${goalsClient.formatCurrencyValue(target.current_value, target.unit || 'USD')} / ${goalsClient.formatCurrencyValue(target.target_value, target.unit || 'USD')}`;
          } else {
            valueDisplay = `${goalsClient.formatNumberValue(target.current_value, target.unit || undefined)} / ${goalsClient.formatNumberValue(target.target_value, target.unit || undefined)}`;
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
          content: [{ 
            type: 'text', 
            text: formattedProgress
          }]
        };
      } catch (error: any) {
        console.error('Error formatting goal progress:', error);
        return {
          content: [{ type: 'text', text: `Error formatting goal progress: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}
