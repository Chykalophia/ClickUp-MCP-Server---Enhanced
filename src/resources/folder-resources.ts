import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClickUpClient } from '../clickup-client/index.js';
import { createFoldersClient } from '../clickup-client/folders.js';

// Create clients
const clickUpClient = createClickUpClient();
const foldersClient = createFoldersClient(clickUpClient);

export function setupFolderResources(server: McpServer): void {
  // Register space folders resource
  server.resource(
    'space-folders',
    new ResourceTemplate('clickup://space/{space_id}/folders', { list: undefined }),
    {
      description: 'Get all folders in a ClickUp space, including their names, settings, and contained lists.'
    },
    async (uri, params) => {
      try {
        const space_id = params.space_id as string;
        console.log('[FolderResources] Fetching folders for space:', space_id);
        const foldersResponse = await foldersClient.getFoldersFromSpace(space_id);
        console.log('[FolderResources] Got folders:', foldersResponse);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(foldersResponse, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[FolderResources] Error fetching space folders:', error);
        throw new Error(`Error fetching space folders: ${error.message}`);
      }
    }
  );

  // Register folder details resource
  server.resource(
    'folder-details',
    new ResourceTemplate('clickup://folder/{folder_id}', { list: undefined }),
    {
      description: 'Get detailed information about a specific ClickUp folder, including its name, settings, and metadata.'
    },
    async (uri, params) => {
      try {
        const folder_id = params.folder_id as string;
        console.log('[FolderResources] Fetching folder:', folder_id);
        
        // Note: The ClickUp API doesn't have a direct endpoint to get folder details
        // We would need to implement this in the foldersClient if API supports it
        // For now, return a placeholder response
        
        // Create a folder object with the ID and a message
        const folder = {
          id: folder_id,
          message: 'Folder details endpoint not available in ClickUp API'
        };
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(folder, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[FolderResources] Error fetching folder:', error);
        throw new Error(`Error fetching folder: ${error.message}`);
      }
    }
  );

  // Register folder lists resource
  server.resource(
    'folder-lists',
    new ResourceTemplate('clickup://folder/{folder_id}/lists', { list: undefined }),
    {
      description: 'Get all lists contained within a specific ClickUp folder, including their names and settings.'
    },
    async (uri, params) => {
      try {
        const folder_id = params.folder_id as string;
        console.log('[FolderResources] Fetching lists for folder:', folder_id);
        const lists = await foldersClient.getListsFromFolder(folder_id);
        console.log('[FolderResources] Got lists:', lists);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(lists, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[FolderResources] Error fetching folder lists:', error);
        throw new Error(`Error fetching folder lists: ${error.message}`);
      }
    }
  );

  // Add some example static resources for discoverability
  server.resource(
    'example-space-folders',
    'clickup://space/90113637923/folders',
    {
      description: 'An example space folders resource demonstrating the folder list format.'
    },
    async (uri) => {
      try {
        const space_id = '90113637923';
        console.log('[FolderResources] Fetching folders for example space:', space_id);
        const foldersResponse = await foldersClient.getFoldersFromSpace(space_id);
        console.log('[FolderResources] Got folders:', foldersResponse);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(foldersResponse, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[FolderResources] Error fetching example space folders:', error);
        throw new Error(`Error fetching example space folders: ${error.message}`);
      }
    }
  );

  server.resource(
    'example-folder',
    'clickup://folder/90115795569',
    {
      description: 'An example folder resource demonstrating the folder details format.'
    },
    async (uri) => {
      try {
        const folder_id = '90115795569';
        console.log('[FolderResources] Fetching example folder:', folder_id);
        
        // Create a folder object with the ID and a message
        const folder = {
          id: folder_id,
          message: 'Folder details endpoint not available in ClickUp API'
        };
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(folder, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[FolderResources] Error fetching example folder:', error);
        throw new Error(`Error fetching example folder: ${error.message}`);
      }
    }
  );

  server.resource(
    'example-folder-lists',
    'clickup://folder/90115795569/lists',
    {
      description: 'An example folder lists resource demonstrating the list data format.'
    },
    async (uri) => {
      try {
        const folder_id = '90115795569';
        console.log('[FolderResources] Fetching lists for example folder:', folder_id);
        const lists = await foldersClient.getListsFromFolder(folder_id);
        console.log('[FolderResources] Got lists:', lists);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: JSON.stringify(lists, null, 2)
            }
          ]
        };
      } catch (error: any) {
        console.error('[FolderResources] Error fetching example folder lists:', error);
        throw new Error(`Error fetching example folder lists: ${error.message}`);
      }
    }
  );
}
