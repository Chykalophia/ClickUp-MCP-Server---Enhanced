import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CLICKUP_API_TOKEN = 'pk_test_token_1234567890abcdef';
  
  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  
  // Set up global test timeout
  jest.setTimeout(30000);
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
  
  // Clean up environment
  delete process.env.CLICKUP_API_TOKEN;
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers();
});

// Global test utilities
global.testUtils = {
  // Create mock ClickUp API response
  createMockApiResponse: (data: any, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  }),
  
  // Create mock error response
  createMockErrorResponse: (status: number, message: string) => ({
    response: {
      status,
      data: { err: message },
      headers: {}
    }
  }),
  
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test data
  generateTestData: {
    workspace: (overrides = {}) => ({
      id: '123',
      name: 'Test Workspace',
      color: '#7b68ee',
      avatar: null,
      members: [],
      ...overrides
    }),
    
    task: (overrides = {}) => ({
      id: 'task123',
      name: 'Test Task',
      description: 'Test task description',
      status: {
        status: 'Open',
        color: '#d3d3d3',
        type: 'open'
      },
      orderindex: '1.00000000000000000000000000000000',
      date_created: '1234567890000',
      date_updated: '1234567890000',
      date_closed: null,
      creator: {
        id: 456,
        username: 'testuser',
        color: '#7b68ee',
        email: 'test@example.com'
      },
      assignees: [],
      watchers: [],
      checklists: [],
      tags: [],
      parent: null,
      priority: null,
      due_date: null,
      start_date: null,
      points: null,
      time_estimate: null,
      custom_fields: [],
      dependencies: [],
      linked_tasks: [],
      team_id: '123',
      url: 'https://app.clickup.com/t/task123',
      permission_level: 'create',
      ...overrides
    }),
    
    webhook: (overrides = {}) => ({
      id: 'webhook123',
      webhook: {
        id: 'webhook123',
        userid: 456,
        team_id: 123,
        endpoint: 'https://example.com/webhook',
        client_id: 'client123',
        events: ['taskCreated', 'taskUpdated'],
        task_events: ['taskCreated', 'taskUpdated'],
        list_events: [],
        folder_events: [],
        space_events: [],
        goal_events: [],
        status: 'active',
        date_created: '2023-01-01T00:00:00.000Z',
        date_updated: '2023-01-01T00:00:00.000Z',
        ...overrides
      }
    }),
    
    webhookPayload: (overrides = {}) => ({
      id: 90110164070264,
      hist_id: "4697736615798917760",
      date: 1755803061841,
      version: {
        object_type: "comment",
        object_id: "90110164070264",
        workspace_id: 14168111,
        operation: "c",
        data: {
          context: {
            root_parent_type: 1,
            is_chat: false,
            audit_context: {
              userid: 38366580,
              current_time: 1755803061674,
              route: "*"
            },
            originating_service: "publicapi"
          },
          relationships: [
            {
              type: "comment-author",
              object_type: "user",
              object_id: 38366580,
              workspace_id: "14168111"
            },
            {
              type: "comment-parent",
              object_type: "task",
              object_id: "868f9p6ad",
              workspace_id: "14168111"
            }
          ],
          changes: [
            {
              field: "date_created",
              after: 1755803061841
            }
          ]
        },
        master_id: 13,
        version: 1755803061879000,
        deleted: false,
        traceparent: "6041334444293036127",
        date_created: 1755803061879,
        date_updated: 1755803061879,
        event_publish_time: 1755803061900
      },
      ...overrides
    })
  }
};

// Type declarations for global utilities
declare global {
  var testUtils: {
    createMockApiResponse: (data: any, status?: number) => any;
    createMockErrorResponse: (status: number, message: string) => any;
    waitFor: (ms: number) => Promise<void>;
    generateTestData: {
      workspace: (overrides?: any) => any;
      task: (overrides?: any) => any;
      webhook: (overrides?: any) => any;
      webhookPayload: (overrides?: any) => any;
    };
  };
}
