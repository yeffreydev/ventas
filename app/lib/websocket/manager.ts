import { WebSocket } from 'ws';

export interface ClientConnection {
  id: string;
  socket: WebSocket;
  userId?: number;
  accountId: number;
  inboxIds: number[];
  activeConversationId?: number;
  connectedAt: Date;
}

export interface ChatwootEvent {
  event: string;
  accountId: number;
  inboxId?: number;
  conversationId?: number;
  data: any;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private clients: Map<string, ClientConnection> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addClient(client: ClientConnection): void {
    this.clients.set(client.id, client);
    console.log(`Client ${client.id} connected. Total clients: ${this.clients.size}`);
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.socket.close();
      } catch (error) {
        console.error('Error closing socket:', error);
      }
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
    }
  }

  updateClient(clientId: string, updates: Partial<ClientConnection>): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.set(clientId, { ...client, ...updates });
    }
  }

  broadcast(event: ChatwootEvent): void {
    const targetClients = this.filterClients(event);
    
    console.log(`Broadcasting event ${event.event} to ${targetClients.length} clients`);
    
    targetClients.forEach(client => {
      try {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.send(JSON.stringify(event));
        }
      } catch (error) {
        console.error(`Error sending to client ${client.id}:`, error);
        this.removeClient(client.id);
      }
    });
  }

  private filterClients(event: ChatwootEvent): ClientConnection[] {
    return Array.from(this.clients.values()).filter(client => {
      // Must match account
      if (client.accountId !== event.accountId) {
        return false;
      }

      // If event has inbox, client must have access to it
      if (event.inboxId && !client.inboxIds.includes(event.inboxId)) {
        return false;
      }

      // For message events, prioritize clients viewing the conversation
      if (event.event === 'message.created' && event.conversationId) {
        // Send to clients viewing this conversation
        if (client.activeConversationId === event.conversationId) {
          return true;
        }
        // Also send to clients in the same inbox (for conversation list updates)
        if (event.inboxId && client.inboxIds.includes(event.inboxId)) {
          return true;
        }
        return false;
      }

      return true;
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }
}

export const wsManager = WebSocketManager.getInstance();