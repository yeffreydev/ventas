// =====================================================
// ROLES AND AGENTS TYPES
// =====================================================

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: Record<string, any>;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role?: Role;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string; // Added workspace_id
  owner_id: string;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'leader' | 'member';
  joined_at: string;
  team?: Team;
  user?: {
    email: string;
    display_name?: string;
  };
}

export interface ChatAssignment {
  id: string;
  conversation_id: number;
  agent_id: string;
  team_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  unassigned_at: string | null;
  status: 'active' | 'completed' | 'transferred';
  notes: string | null;
  agent?: AgentProfile;
  team?: Team;
}

export interface AgentProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'available' | 'busy' | 'offline';
  max_concurrent_chats: number;
  current_chat_count: number;
  specialties: string[] | null;
  languages: string[];
  working_hours: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActiveAgent {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'available' | 'busy' | 'offline';
  max_concurrent_chats: number;
  current_chat_count: number;
  specialties: string[] | null;
  languages: string[];
  email: string;
  user_display_name: string | null;
  roles: string[];
}

export interface ChatAssignmentDetailed extends ChatAssignment {
  agent_name: string | null;
  agent_avatar: string | null;
  team_name: string | null;
  assigned_by_email: string | null;
}

// Request/Response types
export interface AssignAgentRequest {
  conversation_id: number;
  agent_id: string;
  team_id?: string;
  notes?: string;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  workspace_id: string; // Added workspace_id
  metadata?: Record<string, any>;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface AddTeamMemberRequest {
  team_id: string;
  user_id: string;
  role?: 'leader' | 'member';
}

export interface UpdateAgentProfileRequest {
  display_name?: string;
  avatar_url?: string;
  status?: 'available' | 'busy' | 'offline';
  max_concurrent_chats?: number;
  specialties?: string[];
  languages?: string[];
  working_hours?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
}

// Permission checking
export type Permission = 
  | 'all'
  | 'dashboard'
  | 'chats'
  | 'customers'
  | 'orders'
  | 'products'
  | 'scheduled_messages'
  | 'kanban'
  | 'payments'
  | 'integrations'
  | 'automation'
  | 'config'
  | 'teams';

export interface PermissionCheck {
  hasPermission: boolean;
  roles: string[];
}