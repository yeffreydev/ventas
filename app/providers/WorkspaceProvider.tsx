"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
    // Check if cache is still valid
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
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agent' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const fetchedRef = useRef(false);
  const mountedRef = useRef(true);

  // Helper to load persisted workspace preference
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

  const fetchWorkspaces = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchedRef.current && !forceRefresh) return;
    
    try {
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
          setIsLoading(false);
          // Continue to fetch fresh data in background
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
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

      // Determine current workspace
      let selectedWorkspace: Workspace | null = null;
      const lastWorkspaceId = getPersistedWorkspaceId();

      if (lastWorkspaceId) {
        selectedWorkspace = sortedWorkspaces.find((w: any) => w.id === lastWorkspaceId) || null;
      }

      if (!selectedWorkspace && sortedWorkspaces.length > 0) {
        selectedWorkspace = sortedWorkspaces.find((w: any) => w.is_owner) || sortedWorkspaces[0] as unknown as Workspace;
      }

      if (selectedWorkspace) {
        setCurrentWorkspace(selectedWorkspace);
        persistWorkspaceId(selectedWorkspace.id);
        const ws = selectedWorkspace as any;
        setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
        
        // Update cache
        setWorkspaceCache(sortedWorkspaces as unknown as Workspace[], selectedWorkspace.id);
      } else {
        setCurrentWorkspace(null);
        setUserRole(null);
        clearWorkspaceCache();
      }

      fetchedRef.current = true;
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

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    fetchWorkspaces();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace && workspace.id !== currentWorkspace?.id) {
      setIsSwitching(true);
      
      try {
        setCurrentWorkspace(workspace);
        persistWorkspaceId(workspaceId);
        
        const ws = workspace as any;
        setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
        
        // Update cache
        setWorkspaceCache(workspaces, workspaceId);
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 200));
        
        router.push('/dashboard');
      } catch (error) {
        console.error('Error switching workspace:', error);
      } finally {
        setIsSwitching(false);
      }
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

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      userRole,
      isLoading,
      isSwitching,
      refreshWorkspaces,
      createWorkspace,
      switchWorkspace
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
