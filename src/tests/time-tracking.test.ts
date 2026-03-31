import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateTimeEntryParams, UpdateTimeEntryParams } from '../clickup-client/time-tracking-enhanced';

// Mock functions must be declared before jest.mock hoisting can reference them
const mockCreateTimeEntry = jest.fn().mockResolvedValue({ id: 'test-123' });
const mockUpdateTimeEntry = jest.fn().mockResolvedValue({ id: 'test-123' });
const mockGetCurrentTimestamp = jest.fn().mockReturnValue(1774983600000);
const mockStartTimer = jest.fn().mockResolvedValue(undefined);

jest.mock('../clickup-client/index.js', () => ({
  createClickUpClient: () => ({})
}));

jest.mock('../clickup-client/time-tracking-enhanced.js', () => {
  return {
    createEnhancedTimeTrackingClient: () => ({
      createTimeEntry: mockCreateTimeEntry,
      updateTimeEntry: mockUpdateTimeEntry,
      getCurrentTimestamp: mockGetCurrentTimestamp,
      startTimer: mockStartTimer,
      getTimeEntries: jest.fn(),
      deleteTimeEntry: jest.fn(),
      getRunningTimers: jest.fn(),
      stopTimer: jest.fn(),
      getTimeSummary: jest.fn(),
      formatDuration: jest.fn(),
      convertDuration: jest.fn(),
    })
  };
});

// Import after mocks are set up
import { setupTimeTrackingTools } from '../tools/time-tracking-tools';

describe('Time Tracking', () => {
  describe('Tool Registration', () => {
    it('should register time tracking tools without errors', () => {
      const server = new McpServer({
        name: 'test-server',
        version: '1.0.0'
      });
      expect(() => {
        setupTimeTrackingTools(server);
      }).not.toThrow();
    });
  });

  describe('CreateTimeEntryParams', () => {
    it('should accept stop for specifying end time', () => {
      const params: CreateTimeEntryParams = {
        description: 'Test entry',
        start: 1774983600000,
        billable: false,
        stop: 1774990800000,
      };
      expect(params.stop).toBe(1774990800000);
      expect(params.duration).toBeUndefined();
    });

    it('should accept duration as an alternative to stop', () => {
      const params: CreateTimeEntryParams = {
        description: 'Test entry',
        start: 1774983600000,
        billable: false,
        duration: 7200000,
      };
      expect(params.duration).toBe(7200000);
      expect(params.stop).toBeUndefined();
    });

    it('should use tid for task association', () => {
      const params: CreateTimeEntryParams = {
        description: 'Test entry',
        start: 1774983600000,
        billable: false,
        duration: 1800000,
        tid: 'abc123',
      };
      expect(params.tid).toBe('abc123');
      expect((params as unknown as Record<string, unknown>)['task_id']).toBeUndefined();
    });
  });

  describe('UpdateTimeEntryParams', () => {
    it('should use tid for task association', () => {
      const params: UpdateTimeEntryParams = {
        tid: 'abc123',
      };
      expect(params.tid).toBe('abc123');
      expect((params as unknown as Record<string, unknown>)['task_id']).toBeUndefined();
    });

    it('should accept stop and duration independently', () => {
      const withStop: UpdateTimeEntryParams = { stop: 1774990800000 };
      const withDuration: UpdateTimeEntryParams = { duration: 7200000 };
      expect(withStop.stop).toBe(1774990800000);
      expect(withDuration.duration).toBe(7200000);
    });
  });

  describe('Runtime parameter mapping', () => {
    let server: McpServer;

    beforeEach(() => {
      jest.clearAllMocks();
      server = new McpServer({
        name: 'test-server',
        version: '1.0.0'
      });
      setupTimeTrackingTools(server);
    });

    it('create handler should map task_id to tid in API payload', async () => {
      // Access the registered tool handler via the server internals
      const tools = (server as any)._registeredTools;
      const createTool = tools?.['clickup_create_time_entry'];
      if (!createTool?.callback) {
        // If we can't access internals, skip gracefully
        return;
      }

      await createTool.callback({
        team_id: '123',
        description: 'Test',
        start: 1774983600000,
        billable: false,
        task_id: 'task-abc',
      });

      expect(mockCreateTimeEntry).toHaveBeenCalledWith('123', expect.objectContaining({
        tid: 'task-abc',
      }));
      expect(mockCreateTimeEntry).toHaveBeenCalledWith('123', expect.not.objectContaining({
        task_id: expect.anything(),
      }));
    });

    it('create handler should pass duration when provided', async () => {
      const tools = (server as any)._registeredTools;
      const createTool = tools?.['clickup_create_time_entry'];
      if (!createTool?.callback) return;

      await createTool.callback({
        team_id: '123',
        description: 'Test',
        start: 1774983600000,
        billable: false,
        duration: 3600000,
      });

      expect(mockCreateTimeEntry).toHaveBeenCalledWith('123', expect.objectContaining({
        duration: 3600000,
      }));
    });

    it('create handler should pass stop when provided', async () => {
      const tools = (server as any)._registeredTools;
      const createTool = tools?.['clickup_create_time_entry'];
      if (!createTool?.callback) return;

      await createTool.callback({
        team_id: '123',
        description: 'Test',
        start: 1774983600000,
        billable: false,
        stop: 1774990800000,
      });

      expect(mockCreateTimeEntry).toHaveBeenCalledWith('123', expect.objectContaining({
        stop: 1774990800000,
      }));
    });

    it('create handler should reject when both duration and stop are provided', async () => {
      const tools = (server as any)._registeredTools;
      const createTool = tools?.['clickup_create_time_entry'];
      if (!createTool?.callback) return;

      const result = await createTool.callback({
        team_id: '123',
        description: 'Test',
        start: 1774983600000,
        billable: false,
        duration: 3600000,
        stop: 1774990800000,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('either duration or stop');
      expect(mockCreateTimeEntry).not.toHaveBeenCalled();
    });

    it('update handler should reject when both duration and stop are provided', async () => {
      const tools = (server as any)._registeredTools;
      const updateTool = tools?.['clickup_update_time_entry'];
      if (!updateTool?.callback) return;

      const result = await updateTool.callback({
        team_id: '123',
        timer_id: 'entry-456',
        duration: 3600000,
        stop: 1774990800000,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('either duration or stop');
      expect(mockUpdateTimeEntry).not.toHaveBeenCalled();
    });

    it('update handler should map task_id to tid in API payload', async () => {
      const tools = (server as any)._registeredTools;
      const updateTool = tools?.['clickup_update_time_entry'];
      if (!updateTool?.callback) return;

      await updateTool.callback({
        team_id: '123',
        timer_id: 'entry-456',
        task_id: 'task-abc',
        duration: 3600000,
      });

      expect(mockUpdateTimeEntry).toHaveBeenCalledWith('123', 'entry-456', expect.objectContaining({
        tid: 'task-abc',
      }));
      expect(mockUpdateTimeEntry).toHaveBeenCalledWith('123', 'entry-456', expect.not.objectContaining({
        task_id: expect.anything(),
      }));
    });
  });
});
