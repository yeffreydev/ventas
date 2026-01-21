import type { 
  ChatReference, 
  ChatReferenceWithCustomer, 
  CreateChatReferenceInput, 
  UpdateChatReferenceInput,
  ChatStatus 
} from '@/app/types/chat-references';

/**
 * Service for managing chat references
 */
export class ChatReferenceService {
  private baseUrl = '/api/chat-references';

  /**
   * Fetch all chat references
   */
  async getAll(options?: {
    customerId?: string;
    status?: ChatStatus;
    includeCustomer?: boolean;
  }): Promise<ChatReference[] | ChatReferenceWithCustomer[]> {
    const params = new URLSearchParams();
    
    if (options?.customerId) {
      params.append('customer_id', options.customerId);
    }
    
    if (options?.status) {
      params.append('status', options.status);
    }
    
    if (options?.includeCustomer) {
      params.append('include_customer', 'true');
    }

    const url = `${this.baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chat references');
    }
    
    const { data } = await response.json();
    return data;
  }

  /**
   * Fetch a single chat reference by ID
   */
  async getById(id: string, includeCustomer = false): Promise<ChatReference | ChatReferenceWithCustomer> {
    const params = new URLSearchParams();
    
    if (includeCustomer) {
      params.append('include_customer', 'true');
    }

    const url = `${this.baseUrl}/${id}?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chat reference');
    }
    
    const { data } = await response.json();
    return data;
  }

  /**
   * Get chat reference by Chatwoot conversation ID
   */
  async getByChatwootConversationId(
    conversationId: number, 
    includeCustomer = false
  ): Promise<ChatReference | ChatReferenceWithCustomer | null> {
    const chatReferences = await this.getAll({ includeCustomer });
    return chatReferences.find(
      (ref) => ref.chatwoot_conversation_id === conversationId
    ) || null;
  }

  /**
   * Get all chat references for a specific customer
   */
  async getByCustomerId(
    customerId: string, 
    includeCustomer = false
  ): Promise<ChatReference[] | ChatReferenceWithCustomer[]> {
    return this.getAll({ customerId, includeCustomer });
  }

  /**
   * Create a new chat reference
   */
  async create(input: CreateChatReferenceInput): Promise<ChatReference> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create chat reference');
    }
    
    const { data } = await response.json();
    return data;
  }

  /**
   * Update a chat reference
   */
  async update(id: string, input: UpdateChatReferenceInput): Promise<ChatReference> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update chat reference');
    }
    
    const { data } = await response.json();
    return data;
  }

  /**
   * Delete a chat reference
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete chat reference');
    }
  }

  /**
   * Update chat status
   */
  async updateStatus(id: string, status: ChatStatus): Promise<ChatReference> {
    return this.update(id, { status });
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessage(id: string, timestamp: string): Promise<ChatReference> {
    return this.update(id, { last_message_at: timestamp });
  }

  /**
   * Link a Chatwoot conversation to a customer
   */
  async linkConversationToCustomer(
    customerId: string,
    chatwootConversationId: number,
    options?: {
      inboxId?: number;
      accountId?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<ChatReference> {
    return this.create({
      customer_id: customerId,
      chatwoot_conversation_id: chatwootConversationId,
      chatwoot_inbox_id: options?.inboxId,
      chatwoot_account_id: options?.accountId,
      status: 'open',
      last_message_at: new Date().toISOString(),
      metadata: options?.metadata || {},
    });
  }
}

// Export a singleton instance
export const chatReferenceService = new ChatReferenceService();