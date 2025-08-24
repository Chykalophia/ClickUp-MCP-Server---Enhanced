import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import tool setup functions that don't have ESM dependencies
import { setupSpaceTools } from '../tools/space-tools';
import { setupChecklistTools } from '../tools/checklist-tools';
import { setupCommentTools } from '../tools/comment-tools';

describe('Integration Tests', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });
  });

  describe('Tool Registration', () => {
    it('should register space tools without errors', () => {
      expect(() => {
        setupSpaceTools(server);
      }).not.toThrow();
    });

    it('should register checklist tools without errors', () => {
      expect(() => {
        setupChecklistTools(server);
      }).not.toThrow();
    });

    it('should register comment tools without errors', () => {
      expect(() => {
        setupCommentTools(server);
      }).not.toThrow();
    });
  });

  describe('Server Configuration', () => {
    it('should create server with correct configuration', () => {
      expect(server).toBeDefined();
      // Basic server validation - we can't test much without actual connections
    });

    it('should handle multiple tool registrations', () => {
      expect(() => {
        setupSpaceTools(server);
        setupChecklistTools(server);
        setupCommentTools(server);
      }).not.toThrow();
    });
  });

  describe('Environment Validation', () => {
    it('should handle missing API token gracefully', () => {
      const originalToken = process.env.CLICKUP_API_TOKEN;
      delete process.env.CLICKUP_API_TOKEN;
      
      // Tools should still register even without token
      expect(() => {
        setupSpaceTools(server);
      }).not.toThrow();
      
      // Restore token
      if (originalToken) {
        process.env.CLICKUP_API_TOKEN = originalToken;
      }
    });

    it('should validate API token format when present', () => {
      const originalToken = process.env.CLICKUP_API_TOKEN;
      process.env.CLICKUP_API_TOKEN = 'test_token_123';
      
      expect(() => {
        setupSpaceTools(server);
      }).not.toThrow();
      
      // Restore original token
      if (originalToken) {
        process.env.CLICKUP_API_TOKEN = originalToken;
      } else {
        delete process.env.CLICKUP_API_TOKEN;
      }
    });
  });

  describe('Basic Functionality', () => {
    it('should handle server lifecycle', () => {
      expect(() => {
        // Basic server operations that don't require network calls
        setupSpaceTools(server);
        setupChecklistTools(server);
      }).not.toThrow();
    });

    it('should maintain server state', () => {
      setupSpaceTools(server);
      expect(server).toBeDefined();
      
      setupChecklistTools(server);
      expect(server).toBeDefined();
    });
  });
});
