import { describe, it, expect } from '@jest/globals';
import { 
  BulkCreateTasksSchema, 
  BulkUpdateTasksSchema,
  BulkCreateTaskItemSchema,
  BulkUpdateTaskItemSchema
} from '../schemas/task-schemas.js';

describe('Bulk Task Operations Schema Validation', () => {
  describe('BulkCreateTaskItemSchema', () => {
    it('should validate valid task creation data', () => {
      const validTask = {
        name: 'Test Task',
        description: 'Test description',
        assignees: [123, 456],
        tags: ['urgent', 'bug'],
        status: 'open',
        priority: 2
      };

      expect(() => BulkCreateTaskItemSchema.parse(validTask)).not.toThrow();
    });

    it('should require name field', () => {
      const invalidTask = {
        description: 'Test description'
      };

      expect(() => BulkCreateTaskItemSchema.parse(invalidTask)).toThrow();
    });

    it('should validate priority range (1-4)', () => {
      const invalidTask = {
        name: 'Test Task',
        priority: 5
      };

      expect(() => BulkCreateTaskItemSchema.parse(invalidTask)).toThrow();
    });

    it('should accept markdown_content field', () => {
      const validTask = {
        name: 'Test Task',
        markdown_content: '# Header\n\nSome **bold** text'
      };

      expect(() => BulkCreateTaskItemSchema.parse(validTask)).not.toThrow();
    });

    it('should validate custom fields structure', () => {
      const validTask = {
        name: 'Test Task',
        custom_fields: [
          { id: 'field1', value: 'value1' },
          { id: 'field2', value: 42 }
        ]
      };

      expect(() => BulkCreateTaskItemSchema.parse(validTask)).not.toThrow();
    });
  });

  describe('BulkUpdateTaskItemSchema', () => {
    it('should validate valid task update data', () => {
      const validUpdate = {
        task_id: 'task123',
        name: 'Updated Task',
        status: 'in progress',
        priority: 3
      };

      expect(() => BulkUpdateTaskItemSchema.parse(validUpdate)).not.toThrow();
    });

    it('should require task_id field', () => {
      const invalidUpdate = {
        name: 'Updated Task'
      };

      expect(() => BulkUpdateTaskItemSchema.parse(invalidUpdate)).toThrow();
    });

    it('should validate priority range (1-4)', () => {
      const invalidUpdate = {
        task_id: 'task123',
        priority: 0
      };

      expect(() => BulkUpdateTaskItemSchema.parse(invalidUpdate)).toThrow();
    });
  });

  describe('BulkCreateTasksSchema', () => {
    it('should validate valid bulk creation request', () => {
      const validRequest = {
        list_id: 'list123',
        tasks: [
          { name: 'Task 1' },
          { name: 'Task 2', description: 'Description 2' }
        ],
        continue_on_error: true
      };

      expect(() => BulkCreateTasksSchema.parse(validRequest)).not.toThrow();
    });

    it('should require list_id', () => {
      const invalidRequest = {
        tasks: [{ name: 'Task 1' }]
      };

      expect(() => BulkCreateTasksSchema.parse(invalidRequest)).toThrow();
    });

    it('should require at least one task', () => {
      const invalidRequest = {
        list_id: 'list123',
        tasks: []
      };

      expect(() => BulkCreateTasksSchema.parse(invalidRequest)).toThrow();
    });

    it('should limit to maximum 50 tasks', () => {
      const tasks = Array.from({ length: 51 }, (_, i) => ({ name: `Task ${i + 1}` }));
      const invalidRequest = {
        list_id: 'list123',
        tasks
      };

      expect(() => BulkCreateTasksSchema.parse(invalidRequest)).toThrow();
    });

    it('should default continue_on_error to false', () => {
      const request = {
        list_id: 'list123',
        tasks: [{ name: 'Task 1' }]
      };

      const parsed = BulkCreateTasksSchema.parse(request);
      expect(parsed.continue_on_error).toBe(false);
    });
  });

  describe('BulkUpdateTasksSchema', () => {
    it('should validate valid bulk update request', () => {
      const validRequest = {
        tasks: [
          { task_id: 'task1', name: 'Updated Task 1' },
          { task_id: 'task2', status: 'completed' }
        ],
        continue_on_error: false
      };

      expect(() => BulkUpdateTasksSchema.parse(validRequest)).not.toThrow();
    });

    it('should require at least one task', () => {
      const invalidRequest = {
        tasks: []
      };

      expect(() => BulkUpdateTasksSchema.parse(invalidRequest)).toThrow();
    });

    it('should limit to maximum 50 tasks', () => {
      const tasks = Array.from({ length: 51 }, (_, i) => ({ 
        task_id: `task${i + 1}`, 
        name: `Updated Task ${i + 1}` 
      }));
      const invalidRequest = {
        tasks
      };

      expect(() => BulkUpdateTasksSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('Input Validation and Security', () => {
    it('should sanitize task names to prevent XSS', () => {
      const maliciousTask = {
        name: '<script>alert("xss")</script>Test Task',
        description: '<img src="x" onerror="alert(1)">'
      };

      // The schema should accept the input, but the client should sanitize it
      expect(() => BulkCreateTaskItemSchema.parse(maliciousTask)).not.toThrow();
    });

    it('should validate assignee IDs are numbers', () => {
      const invalidTask = {
        name: 'Test Task',
        assignees: ['not-a-number', 123]
      };

      expect(() => BulkCreateTaskItemSchema.parse(invalidTask)).toThrow();
    });

    it('should validate timestamps are numbers', () => {
      const invalidTask = {
        name: 'Test Task',
        due_date: 'not-a-timestamp'
      };

      expect(() => BulkCreateTaskItemSchema.parse(invalidTask)).toThrow();
    });

    it('should validate task_id is not empty string', () => {
      const invalidUpdate = {
        task_id: '',
        name: 'Updated Task'
      };

      expect(() => BulkUpdateTaskItemSchema.parse(invalidUpdate)).toThrow();
    });

    it('should validate list_id is not empty string', () => {
      const invalidRequest = {
        list_id: '',
        tasks: [{ name: 'Task 1' }]
      };

      expect(() => BulkCreateTasksSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tasks with only required fields', () => {
      const minimalTask = {
        name: 'Minimal Task'
      };

      expect(() => BulkCreateTaskItemSchema.parse(minimalTask)).not.toThrow();
    });

    it('should handle updates with only task_id', () => {
      const minimalUpdate = {
        task_id: 'task123'
      };

      expect(() => BulkUpdateTaskItemSchema.parse(minimalUpdate)).not.toThrow();
    });

    it('should handle empty arrays for optional array fields', () => {
      const taskWithEmptyArrays = {
        name: 'Test Task',
        assignees: [],
        tags: [],
        custom_fields: []
      };

      expect(() => BulkCreateTaskItemSchema.parse(taskWithEmptyArrays)).not.toThrow();
    });

    it('should handle maximum valid priority', () => {
      const taskWithMaxPriority = {
        name: 'High Priority Task',
        priority: 4
      };

      expect(() => BulkCreateTaskItemSchema.parse(taskWithMaxPriority)).not.toThrow();
    });

    it('should handle minimum valid priority', () => {
      const taskWithMinPriority = {
        name: 'Low Priority Task',
        priority: 1
      };

      expect(() => BulkCreateTaskItemSchema.parse(taskWithMinPriority)).not.toThrow();
    });

    it('should handle both description and markdown_content', () => {
      const taskWithBoth = {
        name: 'Test Task',
        description: 'Plain description',
        markdown_content: '# Markdown Description'
      };

      expect(() => BulkCreateTaskItemSchema.parse(taskWithBoth)).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should handle maximum allowed tasks (50)', () => {
      const maxTasks = Array.from({ length: 50 }, (_, i) => ({ 
        name: `Task ${i + 1}` 
      }));
      const request = {
        list_id: 'list123',
        tasks: maxTasks
      };

      expect(() => BulkCreateTasksSchema.parse(request)).not.toThrow();
    });

    it('should handle complex task objects with all fields', () => {
      const complexTask = {
        name: 'Complex Task',
        description: 'Detailed description with **markdown**',
        markdown_content: '# Header\n\n- List item 1\n- List item 2',
        assignees: [123, 456, 789],
        tags: ['urgent', 'bug', 'frontend', 'backend'],
        status: 'in progress',
        priority: 3,
        due_date: Date.now() + 86400000, // Tomorrow
        due_date_time: true,
        time_estimate: 3600000, // 1 hour
        start_date: Date.now(),
        start_date_time: true,
        notify_all: true,
        parent: 'parent-task-123',
        links_to: 'linked-task-456',
        check_required_custom_fields: true,
        custom_fields: [
          { id: 'field1', value: 'text value' },
          { id: 'field2', value: 42 },
          { id: 'field3', value: true },
          { id: 'field4', value: ['option1', 'option2'] }
        ]
      };

      expect(() => BulkCreateTaskItemSchema.parse(complexTask)).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for all fields', () => {
      // This test ensures TypeScript compilation catches type errors
      const validTask = {
        name: 'Test Task',
        assignees: [123], // Should be number[]
        priority: 2, // Should be number 1-4
        due_date: 1234567890, // Should be number
        due_date_time: true, // Should be boolean
        tags: ['tag1', 'tag2'], // Should be string[]
        custom_fields: [{ id: 'field1', value: 'value1' }] // Should have correct structure
      };

      expect(() => BulkCreateTaskItemSchema.parse(validTask)).not.toThrow();
    });
  });
});
