-- Fix user_accessible_workspaces view to include image_url
-- This ensures that workspace images are visible after page refresh
-- Using CREATE OR REPLACE to avoid dropping dependencies (RLS policies)
-- image_url is added at the end to maintain column order compatibility

CREATE OR REPLACE VIEW public.user_accessible_workspaces AS
 SELECT w.id,
    w.name,
    w.slug,
    w.owner_id,
    w.created_at,
    w.updated_at,
    w.description,
    wm.user_id,
    wm.role,
    true AS is_owner,
    'owner'::text AS access_type,
    w.image_url
   FROM (public.workspaces w
     JOIN public.workspace_members wm ON ((w.id = wm.workspace_id)))
  WHERE (w.owner_id = wm.user_id)
UNION ALL
 SELECT w.id,
    w.name,
    w.slug,
    w.owner_id,
    w.created_at,
    w.updated_at,
    w.description,
    wa.agent_id AS user_id,
    'agent'::text AS role,
    false AS is_owner,
    'guest'::text AS access_type,
    w.image_url
   FROM (public.workspaces w
     JOIN public.workspace_agents wa ON ((w.id = wa.workspace_id)))
  WHERE (w.owner_id <> wa.agent_id);
