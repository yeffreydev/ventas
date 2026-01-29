// =====================================================
// AGENT INVITATIONS TYPES
// =====================================================

export interface AgentInvitation {
  id: string;
  email: string;
  invited_by: string;
  role_id: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  display_name: string | null;
  max_concurrent_chats: number;
  specialties: string[] | null;
  languages: string[];
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  workspace_id?: string;
}

export interface PendingInvitation extends AgentInvitation {
  inviter_email: string;
  inviter_name: string | null;
  role_name: string;
  role_slug: string;
  rejected_by?: string[];
  workspace_name?: string;
}

export interface CreateInvitationRequest {
  email: string;
  role_id?: string; // Optional, defaults to 'agent' role
  display_name?: string;
  max_concurrent_chats?: number;
  specialties?: string[];
  languages?: string[];
  message?: string;
  workspace_name?: string;
  workspace_id: string;
}

export interface InvitationResponse {
  success: boolean;
  invitation?: AgentInvitation;
  error?: string;
  message?: string;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface RejectInvitationRequest {
  token: string;
}