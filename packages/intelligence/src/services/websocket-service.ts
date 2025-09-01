import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';

export interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
  metadata: Record<string, any>;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'ping' | 'pong';
  channel?: string;
  data?: any;
  timestamp: number;
}

export interface WebSocketConfig {
  port: number;
  pingInterval: number;
  connectionTimeout: number;
  maxConnections: number;
  enableCompression: boolean;
}

export class WebSocketService extends EventEmitter {
  private wss?: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private channels: Map<string, Set<string>> = new Map();
  private config: WebSocketConfig;
  private pingTimer?: ReturnType<typeof setInterval>;

  constructor(config: WebSocketConfig = {
    port: 8080,
    pingInterval: 30000,
    connectionTimeout: 60000,
    maxConnections: 1000,
    enableCompression: true
  }) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.config.port,
          perMessageDeflate: this.config.enableCompression
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        this.wss.on('error', (error: Error) => {
          this.emit('server_error', error);
          reject(error);
        });

        this.startPingInterval();
        this.emit('server_started', { port: this.config.port });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    if (this.connections.size >= this.config.maxConnections) {
      ws.close(1013, 'Server overloaded');
      return;
    }

    const connectionId = this.generateConnectionId();
    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
      metadata: {
        userAgent: request.headers['user-agent'],
        ip: request.socket.remoteAddress,
        connectedAt: Date.now()
      }
    };

    this.connections.set(connectionId, connection);

    ws.on('message', (data) => {
      this.handleMessage(connectionId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    ws.on('error', (error: Error) => {
      this.emit('connection_error', { connectionId, error });
      this.handleDisconnection(connectionId);
    });

    ws.on('pong', () => {
      connection.lastPing = Date.now();
    });

    this.emit('connection_established', { connectionId, metadata: connection.metadata });
  }

  private handleMessage(connectionId: string, data: RawData): void {
    try {
      let messageData: string;
      
      if (Buffer.isBuffer(data)) {
        messageData = data.toString();
      } else if (data instanceof ArrayBuffer) {
        messageData = Buffer.from(data).toString();
      } else if (Array.isArray(data)) {
        messageData = Buffer.concat(data).toString();
      } else {
        messageData = String(data);
      }

      const message: WebSocketMessage = JSON.parse(messageData);
      const connection = this.connections.get(connectionId);

      if (!connection) return;

      switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(connectionId, message.channel!);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(connectionId, message.channel!);
        break;
      case 'ping':
        this.sendMessage(connectionId, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        this.emit('message_received', { connectionId, message });
      }
    } catch (error: any) {
      this.emit('message_error', { connectionId, error });
    }
  }

  private handleSubscribe(connectionId: string, channel: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.add(channel);
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(connectionId);

    this.emit('subscription_added', { connectionId, channel });
  }

  private handleUnsubscribe(connectionId: string, channel: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.delete(channel);
    this.channels.get(channel)?.delete(connectionId);

    if (this.channels.get(channel)?.size === 0) {
      this.channels.delete(channel);
    }

    this.emit('subscription_removed', { connectionId, channel });
  }

  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from all channels
    connection.subscriptions.forEach(channel => {
      this.channels.get(channel)?.delete(connectionId);
      if (this.channels.get(channel)?.size === 0) {
        this.channels.delete(channel);
      }
    });

    this.connections.delete(connectionId);
    this.emit('connection_closed', { connectionId });
  }

  sendMessage(connectionId: string, message: Partial<WebSocketMessage>): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const fullMessage: WebSocketMessage = {
        type: 'data',
        timestamp: Date.now(),
        ...message
      };

      connection.ws.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      this.emit('send_error', { connectionId, error });
      return false;
    }
  }

  broadcast(channel: string, data: any): number {
    const subscribers = this.channels.get(channel);
    if (!subscribers) return 0;

    let sentCount = 0;
    const message: WebSocketMessage = {
      type: 'data',
      channel,
      data,
      timestamp: Date.now()
    };

    subscribers.forEach(connectionId => {
      if (this.sendMessage(connectionId, message)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  broadcastToAll(data: any): number {
    let sentCount = 0;
    const message: WebSocketMessage = {
      type: 'data',
      data,
      timestamp: Date.now()
    };

    this.connections.forEach((connection, connectionId) => {
      if (this.sendMessage(connectionId, message)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      const now = Date.now();
      const connectionsToClose: string[] = [];

      this.connections.forEach((connection, connectionId) => {
        if (now - connection.lastPing > this.config.connectionTimeout) {
          connectionsToClose.push(connectionId);
        } else if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      });

      connectionsToClose.forEach(connectionId => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.ws.close(1000, 'Ping timeout');
        }
      });
    }, this.config.pingInterval);
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getChannelCount(): number {
    return this.channels.size;
  }

  getSubscriberCount(channel: string): number {
    return this.channels.get(channel)?.size || 0;
  }

  getMetrics(): any {
    return {
      connections: this.connections.size,
      channels: this.channels.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
      }

      this.connections.forEach(connection => {
        connection.ws.close(1001, 'Server shutting down');
      });

      if (this.wss) {
        this.wss.close(() => {
          this.emit('server_stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
