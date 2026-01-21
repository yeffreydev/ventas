"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '../utils/supabase/client';
import { Workspace, WorkspaceMember, WorkspaceContextType } from '../types/workspace';

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'agent' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

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

  const fetchWorkspaces = useCallback(async () => {
    console.log("Fetching workspaces...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setIsLoading(false);
        return;
      }

      // Fetch all accessible workspaces (owned + guest) using the view
      const { data, error } = await supabase
        .from('user_accessible_workspaces')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching workspaces:', error.message, error.details, error.hint, error.code);
        return;
      }

      // Check if data is null or empty array to avoid issues
      const fetchedWorkspaces = data || [];
      console.log("Fetched workspaces:", fetchedWorkspaces.length, fetchedWorkspaces.map((w: any) => ({ id: w.id, name: w.name, is_owner: w.is_owner })));

      // Sort: owned workspaces first, then guest workspaces
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
        // Default to first owned workspace, or first guest if no owned
        selectedWorkspace = sortedWorkspaces.find((w: any) => w.is_owner) || sortedWorkspaces[0] as unknown as Workspace;
      }

      if (selectedWorkspace) {
        setCurrentWorkspace(selectedWorkspace);
        persistWorkspaceId(selectedWorkspace.id);
        
        // Set role based on access_type
        const ws = selectedWorkspace as any;
        setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
      } else {
        // No workspaces found
        setCurrentWorkspace(null);
        setUserRole(null);
      }

    } catch (err) {
      console.error('Unexpected error fetching workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Handle workspace refresh after invitation acceptance
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('workspace_refresh=true')) {
      // Get the invited workspace ID if present
      const url = new URL(window.location.href);
      const invitedWorkspaceId = url.searchParams.get('invited_workspace');

      const handleWorkspaceRefresh = async () => {
        console.log('Starting workspace refresh after invitation acceptance...');

        // Force a fresh fetch from the database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Fetch workspaces directly (bypass cache/state)
          const { data, error } = await supabase
            .from('user_accessible_workspaces')
            .select('*')
            .eq('user_id', user.id);

          if (error) {
            console.error('Error fetching workspaces during refresh:', error);
            return;
          }

          const fetchedWorkspaces = data || [];
          console.log('Directly fetched workspaces:', fetchedWorkspaces.length, fetchedWorkspaces.map((w: any) => ({ id: w.id, name: w.name })));

          // Update state with fresh data
          const sortedWorkspaces = fetchedWorkspaces.sort((a: any, b: any) => {
            if (a.is_owner && !b.is_owner) return -1;
            if (!a.is_owner && b.is_owner) return 1;
            return a.name.localeCompare(b.name);
          });

          setWorkspaces(sortedWorkspaces as unknown as Workspace[]);

          // Now try to find and select the invited workspace
          if (invitedWorkspaceId) {
            const invitedWorkspace = sortedWorkspaces.find((w: any) => w.id === invitedWorkspaceId);
            if (invitedWorkspace) {
              console.log('Found and selecting invited workspace:', invitedWorkspace.name);
              setCurrentWorkspace(invitedWorkspace as Workspace);
              persistWorkspaceId(invitedWorkspaceId);

              // Set role based on workspace access_type and role field
              const ws = invitedWorkspace as any;
              setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
            } else {
              console.warn('Invited workspace not found in refreshed data:', invitedWorkspaceId);
              console.log('Available workspace IDs:', sortedWorkspaces.map((w: any) => w.id));
            }
          }

        } catch (err) {
          console.error('Error during workspace refresh:', err);
        }

        // Clean up URL parameters
        url.searchParams.delete('workspace_refresh');
        url.searchParams.delete('invited_workspace');
        window.history.replaceState({}, '', url.pathname + url.search);
      };

      const timer = setTimeout(handleWorkspaceRefresh, 1500); // Give more time for DB to update
      return () => clearTimeout(timer);
    }
  }, [supabase]); // Only depend on supabase, not workspaces or fetchWorkspaces

  // Fetch workspaces on mount and auth changes
  useEffect(() => {
    fetchWorkspaces();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchWorkspaces();
      } else if (event === 'SIGNED_OUT') {
        setWorkspaces([]);
        setCurrentWorkspace(null);
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove fetchWorkspaces from dependencies to prevent infinite loop

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace && workspace.id !== currentWorkspace?.id) {
      // Show loader
      setIsSwitching(true);
      
      try {
        // Update workspace state immediately
        setCurrentWorkspace(workspace);
        persistWorkspaceId(workspaceId);
        
        // Set role based on workspace access_type and role field
        const ws = workspace as any;
        setUserRole(ws.role || (ws.is_owner ? 'admin' : 'agent'));
        
        // Small delay to show the loader
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Navigate to dashboard to refresh data
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

      // Trigger will add the member, but we should refresh to be sure and get the updated list
      await fetchWorkspaces();
      
      return data as Workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      return null;
    }
  };
  
  const refreshWorkspaces = async () => {
    await fetchWorkspaces();
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
