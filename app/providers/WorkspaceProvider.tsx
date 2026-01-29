"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';
import { Workspace, WorkspaceContextType } from '../types/workspace';

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Cache for workspaces to prevent repeated fetches
const WORKSPACE_CACHE_KEY = 'workspace_cache';
const WORKSPACE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface WorkspaceCache {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  timestamp: number;
}

function getWorkspaceCache(): WorkspaceCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(WORKSPACE_CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as WorkspaceCache;
    if (Date.now() - data.timestamp > WORKSPACE_CACHE_TTL) {
      localStorage.removeItem(WORKSPACE_CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setWorkspaceCache(workspaces: Workspace[], currentWorkspaceId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const cache: WorkspaceCache = {
      workspaces,
      currentWorkspaceId,
      timestamp: Date.now(),
    };
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

function clearWorkspaceCache() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WORKSPACE_CACHE_KEY);
  localStorage.removeItem('last_workspace_id');
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agent' | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const fetchedRef = useRef(false);
  const mountedRef = useRef(true);

  // Helper to load persisted workspace preference (local fallback)
  const getPersistedWorkspaceId = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last_workspace_id');
    }
    return null;
  };

  const persistWorkspaceId = (id: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_workspace_id', id);
    }
  };

  // Save default workspace to Supabase user metadata
  const saveDefaultWorkspaceToSupabase = async (workspaceId: string) => {
    try {
      await supabase.auth.updateUser({
        data: { default_workspace_id: workspaceId }
      });
    } catch (error) {
      console.error('Error saving default workspace:', error);
    }
  };

  // Get default workspace from user metadata
  const getDefaultWorkspaceFromSupabase = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.user_metadata?.default_workspace_id || null;
    } catch {
      return null;
    }
  };

  // Load user permissions for current workspace
  const loadUserPermissions = useCallback(async (workspaceId: string, userId: string) => {
    try {
      // First check if user is owner
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceData && workspaceData.owner_id === userId) {
        // Owner has all permissions
        setUserPermissions({ all: true });
        console.log('[WorkspaceProvider] User is owner - granted all permissions');
        return;
      }

      // Try to get permissions using RPC function
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
        p_workspace_id: workspaceId
      });

      if (error) {
        console.warn('RPC get_user_permissions error (function may not exist yet):', error);
        
        // Fallback: Check if user is member/agent and give basic permissions
        const { data: memberData } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .single();

        if (memberData) {
          if (memberData.role === 'admin') {
            setUserPermissions({ all: true });
            console.log('[WorkspaceProvider] Fallback: User is admin - granted all permissions');
          } else {
            // Basic permissions for agents
            setUserPermissions({ 
              dashboard: { view: true },
              chats: { view: true, create: true, update: true },
              customers: { view: true, create: true, update: true },
              orders: { view: true, create: true, update: true },
              products: { view: true }
            });
            console.log('[WorkspaceProvider] Fallback: User is agent - granted basic permissions');
          }
        } else {
          // Check if user is workspace agent
          const { data: agentData } = await supabase
            .from('workspace_agents')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('agent_id', userId)
            .single();

          if (agentData) {
            setUserPermissions({ 
              dashboard: { view: true },
              chats: { view: true, create: true, update: true }
            });
            console.log('[WorkspaceProvider] Fallback: User is workspace agent - granted chat permissions');
          } else {
            setUserPermissions({});
            console.log('[WorkspaceProvider] No permissions found for user');
          }
        }
        return;
      }

      if (data) {
        setUserPermissions(data);
        console.log('[WorkspaceProvider] Loaded permissions from RPC:', data);
      } else {
        setUserPermissions({});
      }
    } catch (error) {
      console.error('Error in loadUserPermissions:', error);
      // Grant basic permissions as ultimate fallback
      setUserPermissions({ 
        dashboard: { view: true },
        chats: { view: true }
      });
    }
  }, [supabase]);

  const fetchWorkspaces = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchedRef.current && !forceRefresh) return;
    
    try {
      if (forceRefresh) setIsLoading(true);

      // Try to use cache first for instant UI
      if (!forceRefresh) {
        const cache = getWorkspaceCache();
        if (cache && cache.workspaces.length > 0) {
          setWorkspaces(cache.workspaces);
          const lastId = getPersistedWorkspaceId() || cache.currentWorkspaceId;
          const ws = cache.workspaces.find((w: any) => w.id === lastId) || cache.workspaces[0];
          if (ws) {
            setCurrentWorkspace(ws);
            setUserRole((ws as any).role || ((ws as any).is_owner ? 'admin' : 'agent'));
          }
          // Don't set isLoading = false here - wait for fresh data to confirm
          // Continue to fetch fresh data in background
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (mountedRef.current) {
          setWorkspaces([]);
          setCurrentWorkspace(null);
          setIsLoading(false);
          clearWorkspaceCache();
        }
        return;
      }

      // Fetch workspaces
      const { data, error } = await supabase
        .from('user_accessible_workspaces')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching workspaces:', error.message);
        setIsLoading(false);
        return;
      }

      if (!mountedRef.current) return;

      const fetchedWorkspaces = data || [];
      
      // Sort: owned workspaces first
      const sortedWorkspaces = fetchedWorkspaces.sort((a: any, b: any) => {
        if (a.is_owner && !b.is_owner) return -1;
        if (!a.is_owner && b.is_owner) return 1;
        return a.name.localeCompare(b.name);
      });

      setWorkspaces(sortedWorkspaces as unknown as Workspace[]);
      fetchedRef.current = true;
      console.log('[WorkspaceProvider] Fetched workspaces:', sortedWorkspaces.length, 'workspaces');

      // If no workspaces, clear everything and stop
      if (sortedWorkspaces.length === 0) {
        setCurrentWorkspace(null);
        setUserRole(null);
        clearWorkspaceCache();
        setIsLoading(false);
        return;
      }

      // Determine current workspace with priority:
      // 1. localStorage (for session persistence)
      // 2. Supabase user metadata (for cross-device)
      // 3. First owned workspace
      // 4. First workspace in list
      
      let selectedWorkspace: Workspace | null = null;
      
      // Try localStorage first
      const localWorkspaceId = getPersistedWorkspaceId();
      if (localWorkspaceId) {
        selectedWorkspace = sortedWorkspaces.find((w: any) => w.id === localWorkspaceId) || null;
      }
      
      // If not found, try Supabase metadata
      if (!selectedWorkspace) {
        const supabaseWorkspaceId = user.user_metadata?.default_workspace_id;
        if (supabaseWorkspaceId) {
          selectedWorkspace = sortedWorkspaces.find((w: any) => w.id === supabaseWorkspaceId) || null;
        }
      }

      // If still not found, use first owned or first available
      if (!selectedWorkspace && sortedWorkspaces.length > 0) {
        selectedWorkspace = sortedWorkspaces.find((w: any) => w.is_owner) || sortedWorkspaces[0] as unknown as Workspace;
      }

      if (selectedWorkspace) {
        console.log('[WorkspaceProvider] Auto-selecting workspace:', selectedWorkspace.name, selectedWorkspace.id);
        setCurrentWorkspace(selectedWorkspace);
        persistWorkspaceId(selectedWorkspace.id);
        const ws = selectedWorkspace as any;
        setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
        
        // Load user permissions for this workspace
        await loadUserPermissions(selectedWorkspace.id, user.id);
        
        // Update cache
        setWorkspaceCache(sortedWorkspaces as unknown as Workspace[], selectedWorkspace.id);
        
        // Save to Supabase if not already saved
        if (!user.user_metadata?.default_workspace_id) {
          saveDefaultWorkspaceToSupabase(selectedWorkspace.id);
        }
      } else if (sortedWorkspaces.length > 0) {
        console.error('[WorkspaceProvider] Failed to auto-select workspace despite having workspaces:', sortedWorkspaces);
      }

    } catch (err) {
      console.error('Unexpected error fetching workspaces:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  // Handle workspace refresh after invitation acceptance
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.search.includes('workspace_refresh=true')) return;

    const url = new URL(window.location.href);
    const invitedWorkspaceId = url.searchParams.get('invited_workspace');

    const handleWorkspaceRefresh = async () => {
      clearWorkspaceCache();
      fetchedRef.current = false;
      await fetchWorkspaces(true);

      if (invitedWorkspaceId && mountedRef.current) {
        const invitedWorkspace = workspaces.find((w: any) => w.id === invitedWorkspaceId);
        if (invitedWorkspace) {
          setCurrentWorkspace(invitedWorkspace);
          persistWorkspaceId(invitedWorkspaceId);
          const ws = invitedWorkspace as any;
          setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
        }
      }

      // Clean up URL parameters
      url.searchParams.delete('workspace_refresh');
      url.searchParams.delete('invited_workspace');
      window.history.replaceState({}, '', url.pathname + url.search);
    };

    const timer = setTimeout(handleWorkspaceRefresh, 500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for auth changes to ensure workspaces are loaded on login/session recovery
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Clear current state if it looks stale or empty
          if (workspaces.length === 0) {
            fetchedRef.current = false;
            fetchWorkspaces(true);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        clearWorkspaceCache();
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchWorkspaces, workspaces.length]);

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    fetchWorkspaces();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchWorkspaces]);

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace && workspace.id !== currentWorkspace?.id) {
      setIsSwitching(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        setCurrentWorkspace(workspace);
        persistWorkspaceId(workspaceId);
        
        const ws = workspace as any;
        setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
        
        // Load permissions for new workspace
        await loadUserPermissions(workspaceId, user.id);
        
        // Update cache
        setWorkspaceCache(workspaces, workspaceId);
        
        // Save to Supabase for cross-device persistence
        saveDefaultWorkspaceToSupabase(workspaceId);
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 200));
        
        router.push('/dashboard');
      } catch (error) {
        console.error('Error switching workspace:', error);
      } finally {
        setIsSwitching(false);
      }
    } else if (workspace && workspace.id === currentWorkspace?.id) {
      // Same workspace, just navigate to dashboard
      router.push('/dashboard');
    }
  };

  const createWorkspace = async (name: string, slug: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          slug,
          description,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Clear cache and refetch
      clearWorkspaceCache();
      fetchedRef.current = false;
      await fetchWorkspaces(true);
      
      // Set the new workspace as current
      if (data) {
        await switchWorkspace(data.id);
      }
      
      return data as Workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      return null;
    }
  };
  
  const refreshWorkspaces = async () => {
    clearWorkspaceCache();
    fetchedRef.current = false;
    await fetchWorkspaces(true);
  };

  const setDefaultWorkspace = async (workspaceId: string) => {
    try {
      // Save to Supabase user metadata
      await saveDefaultWorkspaceToSupabase(workspaceId);
      // Persist locally
      persistWorkspaceId(workspaceId);
      // Update cache
      setWorkspaceCache(workspaces, workspaceId);
    } catch (error) {
      console.error('Error setting default workspace:', error);
      throw error;
    }
  };

  const updateWorkspace = async (id: string, updates: Partial<Workspace>) => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update local state - merge with existing workspace data to preserve fields like is_owner, role, etc.
        const updatedWorkspaces = workspaces.map(w => {
          if (w.id === id) {
            return { ...w, ...data, updated_at: new Date().toISOString() };
          }
          return w;
        });
        
        setWorkspaces(updatedWorkspaces as unknown as Workspace[]);
        
        if (currentWorkspace?.id === id) {
          const updatedCurrent = { ...currentWorkspace, ...data, updated_at: new Date().toISOString() } as Workspace;
          setCurrentWorkspace(updatedCurrent);
          
          // Update cache with the new current workspace
          setWorkspaceCache(updatedWorkspaces as unknown as Workspace[], id);
        }
        
        return data as Workspace;
      }
      return null;
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      userRole,
      userPermissions,
      isLoading,
      isSwitching,
      refreshWorkspaces,
      createWorkspace,
      switchWorkspace,
      setDefaultWorkspace,
      updateWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
