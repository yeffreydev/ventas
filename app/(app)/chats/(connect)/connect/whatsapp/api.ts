import axios from 'axios';

interface CreateWhatsAppInboxPayload {
   inboxName: string;
   phoneNumber: string;
   phoneNumberId: string;
   businessAccountId: string;
   apiKey: string;
   workspace_id: string;
}

interface ChatwootInboxResponse {
  id: number;
  name: string;
  channel_type: string;
  // Add other fields as needed
}

interface WhatsAppInboxInfo {
  id: number;
  name: string;
  phone_number: string;
  provider: string;
  webhook_url: string;
  callback_webhook_url: string;
  provider_config: {
    webhook_verify_token?: string;
    api_key?: string;
    phone_number_id?: string;
    business_account_id?: string;
  };
}

export async function createWhatsAppInbox(
  payload: CreateWhatsAppInboxPayload
): Promise<ChatwootInboxResponse> {
  try {
    const response = await axios.post<ChatwootInboxResponse>(
      '/chats/connect/whatsapp/api',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function getWhatsAppInboxes(workspaceId?: string): Promise<WhatsAppInboxInfo[]> {
  try {
    const params = new URLSearchParams();
    if (workspaceId) {
      params.append('workspace_id', workspaceId);
    }

    const response = await axios.get<{ success: boolean; inboxes: WhatsAppInboxInfo[] }>(
      `/chats/connect/whatsapp/list?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.inboxes;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
    throw error;
  }
}