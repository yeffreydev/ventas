// IndexedDB utility for caching chat messages and conversations
const DB_NAME = 'ChatCache';
const DB_VERSION = 2; // Incremented to add workspaceId indexes
const CONVERSATIONS_STORE = 'conversations';
const MESSAGES_STORE = 'messages';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedConversation {
  id: number;
  data: any;
  timestamp: number;
  workspaceId: string;
}

interface CachedMessages {
  conversationId: number;
  messages: any[];
  timestamp: number;
  workspaceId: string;
}

class ChatCacheDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create conversations store (version 1)
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          const conversationsStore = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
          conversationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          conversationsStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        } else if (oldVersion < 2) {
          // Add workspaceId index to existing store (version 2 upgrade)
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE);
          if (!conversationsStore.indexNames.contains('workspaceId')) {
            conversationsStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
        }

        // Create messages store (version 1)
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'conversationId' });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        } else if (oldVersion < 2) {
          // Add workspaceId index to existing store (version 2 upgrade)
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const messagesStore = transaction.objectStore(MESSAGES_STORE);
          if (!messagesStore.indexNames.contains('workspaceId')) {
            messagesStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          }
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Conversations cache methods
  async cacheConversations(conversations: any[], workspaceId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const timestamp = Date.now();

    for (const conv of conversations) {
      const cached: CachedConversation = {
        id: conv.id,
        data: conv,
        timestamp,
        workspaceId,
      };
      store.put(cached);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedConversations(workspaceId?: string): Promise<any[] | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    return new Promise((resolve, reject) => {
      let request: IDBRequest;

      if (workspaceId) {
        // Get only conversations for this workspace
        const index = store.index('workspaceId');
        request = index.getAll(workspaceId);
      } else {
        // Get all conversations (backward compatibility)
        request = store.getAll();
      }

      request.onsuccess = () => {
        const cached = request.result as CachedConversation[];
        if (cached.length === 0) {
          resolve(null);
          return;
        }

        // Sort conversations by last message timestamp (most recent first)
        const sortedConversations = cached
          .map(c => c.data)
          .sort((a: any, b: any) => {
            const aTime = a.last_non_activity_message?.created_at || a.timestamp || 0;
            const bTime = b.last_non_activity_message?.created_at || b.timestamp || 0;
            return bTime - aTime; // Most recent first
          });

        resolve(sortedConversations);
      };
      request.onerror = () => {
        console.warn('Error reading from cache:', request.error);
        resolve(null); // Fail gracefully
      };
    });
  }

  // Messages cache methods
  async cacheMessages(conversationId: number, messages: any[], workspaceId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    // Sort messages by created_at timestamp before caching, then by id for stable ordering
    const sortedMessages = messages.sort((a: any, b: any) => {
      if (a.created_at !== b.created_at) {
        return a.created_at - b.created_at;
      }
      return a.id - b.id;
    });

    const cached: CachedMessages = {
      conversationId,
      messages: sortedMessages,
      timestamp: Date.now(),
      workspaceId,
    };

    store.put(cached);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedMessages(conversationId: number, workspaceId?: string): Promise<any[] | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const request = store.get(conversationId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cached = request.result as CachedMessages | undefined;
        if (!cached) {
          resolve(null);
          return;
        }

        // Validate workspace if provided
        if (workspaceId && cached.workspaceId !== workspaceId) {
          console.warn(`Cached messages for conversation ${conversationId} belong to different workspace`);
          resolve(null);
          return;
        }

        // Sort messages by created_at timestamp before returning (ascending order: oldest first)
        const sortedMessages = cached.messages.sort((a: any, b: any) => a.created_at - b.created_at);

        // Return cached data regardless of age (stale-while-revalidate)
        resolve(sortedMessages);
      };
      request.onerror = () => {
        console.warn('Error reading from cache:', request.error);
        resolve(null); // Fail gracefully
      };
    });
  }

  // Add optimistic message (for immediate UI update)
  async addOptimisticMessage(conversationId: number, message: any, workspaceId: string): Promise<void> {
    const cachedMessages = await this.getCachedMessages(conversationId, workspaceId);
    if (cachedMessages) {
      const updatedMessages = [...cachedMessages, message];
      await this.cacheMessages(conversationId, updatedMessages, workspaceId);
    }
  }

  // Update message status (from sending to sent)
  async updateMessageStatus(conversationId: number, tempId: string, realMessage: any, workspaceId: string): Promise<void> {
    const cachedMessages = await this.getCachedMessages(conversationId, workspaceId);
    if (cachedMessages) {
      const updatedMessages = cachedMessages.map(msg =>
        msg.tempId === tempId ? realMessage : msg
      );
      await this.cacheMessages(conversationId, updatedMessages, workspaceId);
    }
  }

  // Add a new message to the cache (for realtime updates)
  async addMessageToCache(conversationId: number, message: any, workspaceId: string): Promise<void> {
    const cachedMessages = await this.getCachedMessages(conversationId, workspaceId);
    if (cachedMessages) {
      // Check if message already exists
      const exists = cachedMessages.some(m => m.id === message.id);
      if (!exists) {
        const updatedMessages = [...cachedMessages, message];
        await this.cacheMessages(conversationId, updatedMessages, workspaceId);
      }
    }
  }

  // Synchronize conversations cache with fresh data from cloud
  async syncConversations(freshConversations: any[], workspaceId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const index = store.index('workspaceId');
    const timestamp = Date.now();

    return new Promise((resolve, reject) => {
      // Get all cached conversations for this workspace
      const request = index.getAll(workspaceId);
      
      request.onsuccess = () => {
        const cachedItems = request.result as CachedConversation[];
        const freshIds = new Set(freshConversations.map(conv => conv.id));

        // Delete conversations that no longer exist in the cloud
        for (const cached of cachedItems) {
          if (!freshIds.has(cached.id)) {
            store.delete(cached.id);
          }
        }

        // Add or update conversations from the cloud
        for (const conv of freshConversations) {
          const cached: CachedConversation = {
            id: conv.id,
            data: conv,
            timestamp,
            workspaceId,
          };
          store.put(cached);
        }
      };

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear cache for other workspaces (keep only current workspace)
  async clearOtherWorkspaces(currentWorkspaceId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite');
    
    return new Promise((resolve, reject) => {
      // Clear conversations from other workspaces
      const convStore = transaction.objectStore(CONVERSATIONS_STORE);
      const convRequest = convStore.getAll();
      
      convRequest.onsuccess = () => {
        const conversations = convRequest.result as CachedConversation[];
        conversations.forEach(conv => {
          if (conv.workspaceId && conv.workspaceId !== currentWorkspaceId) {
            convStore.delete(conv.id);
          }
        });
      };

      // Clear messages from other workspaces
      const msgStore = transaction.objectStore(MESSAGES_STORE);
      const msgRequest = msgStore.getAll();
      
      msgRequest.onsuccess = () => {
        const messages = msgRequest.result as CachedMessages[];
        messages.forEach(msg => {
          if (msg.workspaceId && msg.workspaceId !== currentWorkspaceId) {
            msgStore.delete(msg.conversationId);
          }
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear all cache for a specific workspace
  async clearWorkspaceCache(workspaceId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite');
    
    return new Promise((resolve, reject) => {
      // Clear conversations for this workspace
      const convStore = transaction.objectStore(CONVERSATIONS_STORE);
      const convIndex = convStore.index('workspaceId');
      const convRequest = convIndex.getAll(workspaceId);
      
      convRequest.onsuccess = () => {
        const conversations = convRequest.result as CachedConversation[];
        conversations.forEach(conv => {
          convStore.delete(conv.id);
        });
      };

      // Clear messages for this workspace
      const msgStore = transaction.objectStore(MESSAGES_STORE);
      const msgIndex = msgStore.index('workspaceId');
      const msgRequest = msgIndex.getAll(workspaceId);
      
      msgRequest.onsuccess = () => {
        const messages = msgRequest.result as CachedMessages[];
        messages.forEach(msg => {
          msgStore.delete(msg.conversationId);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite');
    
    transaction.objectStore(CONVERSATIONS_STORE).clear();
    transaction.objectStore(MESSAGES_STORE).clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear old cache entries
  async clearOldCache(): Promise<void> {
    const db = await this.ensureDB();
    const now = Date.now();
    const transaction = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite');

    // Clear old conversations
    const convStore = transaction.objectStore(CONVERSATIONS_STORE);
    const convRequest = convStore.getAll();
    convRequest.onsuccess = () => {
      const conversations = convRequest.result as CachedConversation[];
      conversations.forEach(conv => {
        if (now - conv.timestamp >= CACHE_DURATION) {
          convStore.delete(conv.id);
        }
      });
    };

    // Clear old messages
    const msgStore = transaction.objectStore(MESSAGES_STORE);
    const msgRequest = msgStore.getAll();
    msgRequest.onsuccess = () => {
      const messages = msgRequest.result as CachedMessages[];
      messages.forEach(msg => {
        if (now - msg.timestamp >= CACHE_DURATION) {
          msgStore.delete(msg.conversationId);
        }
      });
    };

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const chatCache = new ChatCacheDB();