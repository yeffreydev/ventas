export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_owner?: boolean;
  access_type?: 'owner' | 'guest';
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'agent';
  joined_at: string;
}

export interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  userRole: 'admin' | 'agent' | null;
  isLoading: boolean;
  isSwitching: boolean;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, slug: string, description?: string) => Promise<Workspace | null>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}
