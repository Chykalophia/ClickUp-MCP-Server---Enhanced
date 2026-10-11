/**
 * Shared harness for tool tests: drives a real McpServer (with strict params
 * enforced, as in production) over InMemoryTransport with a real Client, so a
 * test exercises the JSON-RPC validation path rather than calling handlers.
 *
 * Not a test file itself (no .test suffix), so jest does not collect it.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { enforceStrictParams } from '../utils/tool-registration.js';

export interface ToolCallOutcome {
  failed: boolean;
  text: string;
}

export interface ConnectedServer {
  client: Client;
  close: () => Promise<void>;
}

export async function connectServer(
  register: (server: McpServer) => void
): Promise<ConnectedServer> {
  const server = enforceStrictParams(new McpServer({ name: 'test-server', version: '1.0.0' }));
  register(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

/**
 * Call a tool and normalise how a rejection arrives (CallToolResult with
 * isError, or a thrown McpError, depending on the SDK version).
 */
export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallOutcome> {
  try {
    const result = (await client.callTool({ name, arguments: args })) as {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
    return {
      failed: result.isError === true,
      text: (result.content ?? []).map(entry => entry.text ?? '').join('\n'),
    };
  } catch (error: unknown) {
    return { failed: true, text: error instanceof Error ? error.message : String(error) };
  }
}
