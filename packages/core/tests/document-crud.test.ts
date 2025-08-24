import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createEnhancedDocsClient } from '../src/clickup-client/docs-enhanced.js';
import { createClickUpClient } from '../src/clickup-client/index.js';

// Mock the ClickUp client
jest.mock('../src/clickup-client/index.js');
jest.mock('axios');

describe('Enhanced Document CRUD Operations', () => {
  let mockClickUpClient: any;
  let enhancedDocsClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock client
    mockClickUpClient = {
      getAxiosInstance: jest.fn()
    };
    
    (createClickUpClient as jest.Mock).mockReturnValue(mockClickUpClient);
    
    // Set up environment variable
    process.env.CLICKUP_API_TOKEN = 'test-token';
    
    enhancedDocsClient = createEnhancedDocsClient(mockClickUpClient);
  });

  describe('Document CRUD Operations', () => {
    it('should create a document in workspace', async () => {
      const mockDoc = {
        id: 'doc123',
        name: 'Test Document',
        workspace_id: 'workspace123',
        public: false
      };

      // Mock axios response
      const axios = require('axios');
      axios.post.mockResolvedValue({ data: mockDoc });

      const result = await enhancedDocsClient.createDoc({
        workspace_id: 'workspace123',
        name: 'Test Document',
        content: 'Test content',
        public: false
      });

      expect(result).toEqual(mockDoc);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/workspaces/workspace123/docs',
        {
          name: 'Test Document',
          content: 'Test content',
          public: false
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'test-token',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should create a document in space', async () => {
      const mockDoc = {
        id: 'doc123',
        name: 'Test Document',
        space_id: 'space123',
        public: false
      };

      const axios = require('axios');
      axios.post.mockResolvedValue({ data: mockDoc });

      const result = await enhancedDocsClient.createDoc({
        space_id: 'space123',
        name: 'Test Document'
      });

      expect(result).toEqual(mockDoc);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/spaces/space123/docs',
        {
          name: 'Test Document',
          content: '',
          public: false
        },
        expect.any(Object)
      );
    });

    it('should update a document', async () => {
      const mockUpdatedDoc = {
        id: 'doc123',
        name: 'Updated Document',
        content: 'Updated content'
      };

      const axios = require('axios');
      axios.put.mockResolvedValue({ data: mockUpdatedDoc });

      const result = await enhancedDocsClient.updateDoc('doc123', {
        name: 'Updated Document',
        content: 'Updated content'
      });

      expect(result).toEqual(mockUpdatedDoc);
      expect(axios.put).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123',
        {
          name: 'Updated Document',
          content: 'Updated content'
        },
        expect.any(Object)
      );
    });

    it('should delete a document', async () => {
      const axios = require('axios');
      axios.delete.mockResolvedValue({});

      await enhancedDocsClient.deleteDoc('doc123');

      expect(axios.delete).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123',
        expect.any(Object)
      );
    });

    it('should get a document', async () => {
      const mockDoc = {
        id: 'doc123',
        name: 'Test Document',
        content: 'Test content'
      };

      const axios = require('axios');
      axios.get.mockResolvedValue({ data: mockDoc });

      const result = await enhancedDocsClient.getDoc('doc123');

      expect(result).toEqual(mockDoc);
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123',
        expect.any(Object)
      );
    });

    it('should throw error when no parent specified for document creation', async () => {
      await expect(enhancedDocsClient.createDoc({
        name: 'Test Document'
      })).rejects.toThrow('Must specify workspace_id, space_id, or folder_id');
    });
  });

  describe('Page Management Operations', () => {
    it('should create a page', async () => {
      const mockPage = {
        id: 'page123',
        name: 'Test Page',
        content: 'Test content',
        doc_id: 'doc123'
      };

      const axios = require('axios');
      axios.post.mockResolvedValue({ data: mockPage });

      const result = await enhancedDocsClient.createPage('doc123', {
        name: 'Test Page',
        content: 'Test content',
        content_format: 'markdown'
      });

      expect(result).toEqual(mockPage);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123/pages',
        {
          name: 'Test Page',
          content: 'Test content',
          content_format: 'markdown'
        },
        expect.any(Object)
      );
    });

    it('should update a page', async () => {
      const mockUpdatedPage = {
        id: 'page123',
        name: 'Updated Page',
        content: 'Updated content'
      };

      const axios = require('axios');
      axios.put.mockResolvedValue({ data: mockUpdatedPage });

      const result = await enhancedDocsClient.updatePage('doc123', 'page123', {
        name: 'Updated Page',
        content: 'Updated content'
      });

      expect(result).toEqual(mockUpdatedPage);
      expect(axios.put).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123/pages/page123',
        {
          name: 'Updated Page',
          content: 'Updated content'
        },
        expect.any(Object)
      );
    });

    it('should delete a page', async () => {
      const axios = require('axios');
      axios.delete.mockResolvedValue({});

      await enhancedDocsClient.deletePage('doc123', 'page123');

      expect(axios.delete).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123/pages/page123',
        expect.any(Object)
      );
    });
  });

  describe('Sharing Management Operations', () => {
    it('should get document sharing settings', async () => {
      const mockSharing = {
        public: true,
        team_sharing: false,
        guest_sharing: true
      };

      const axios = require('axios');
      axios.get.mockResolvedValue({ data: mockSharing });

      const result = await enhancedDocsClient.getDocSharing('doc123');

      expect(result).toEqual(mockSharing);
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123/sharing',
        expect.any(Object)
      );
    });

    it('should update document sharing settings', async () => {
      const mockUpdatedSharing = {
        public: false,
        team_sharing: true
      };

      const axios = require('axios');
      axios.put.mockResolvedValue({ data: mockUpdatedSharing });

      const result = await enhancedDocsClient.updateDocSharing('doc123', {
        public: false,
        team_sharing: true
      });

      expect(result).toEqual(mockUpdatedSharing);
      expect(axios.put).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v3/docs/doc123/sharing',
        {
          public: false,
          team_sharing: true
        },
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors appropriately', async () => {
      const axios = require('axios');
      const error = {
        response: {
          status: 404,
          data: { message: 'Document not found' }
        },
        message: 'Request failed with status code 404'
      };
      axios.get.mockRejectedValue(error);

      await expect(enhancedDocsClient.getDoc('nonexistent')).rejects.toThrow(
        'Failed to get document nonexistent: Resource not found - Document not found'
      );
    });

    it('should handle 403 permission errors', async () => {
      const axios = require('axios');
      const error = {
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      };
      axios.delete.mockRejectedValue(error);

      await expect(enhancedDocsClient.deleteDoc('doc123')).rejects.toThrow(
        'Failed to delete document doc123: Permission denied - insufficient access rights'
      );
    });

    it('should handle rate limiting errors', async () => {
      const axios = require('axios');
      const error = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      };
      axios.post.mockRejectedValue(error);

      await expect(enhancedDocsClient.createDoc({
        workspace_id: 'workspace123',
        name: 'Test'
      })).rejects.toThrow(
        'Failed to create document: Rate limit exceeded - please retry later'
      );
    });
  });
});
