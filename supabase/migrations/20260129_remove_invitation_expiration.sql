-- =====================================================
-- Remove Invitation Expiration Logic
-- =====================================================
-- This migration removes the expiration logic from invitations.
-- Invitations no longer expire - they can only be:
--   1. Rejected by the invitee
--   2. Deleted by the invitation creator
--   3. Accepted by the invitee

-- 1. Add rejected_by column to track which users have rejected the invitation
-- This allows the invitation to remain for the creator while hiding from the rejecting user
ALTER TABLE public.agent_invitations 
ADD COLUMN IF NOT EXISTS rejected_by uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.agent_invitations.rejected_by IS 'Array of user IDs who have rejected this invitation';

-- 2. Update is_invitation_valid function - remove expiration check
CREATE OR REPLACE FUNCTION public.is_invitation_valid(invitation_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    SELECT * INTO invitation_record
    FROM public.agent_invitations
    WHERE token = invitation_token
    AND status = 'pending';
    -- Removed: AND expires_at > now()
    
    RETURN FOUND;
END;
$$;

-- 3. Update accept_agent_invitation function - remove expiration check
CREATE OR REPLACE FUNCTION public.accept_agent_invitation(invitation_token text, user_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
    agent_role_id UUID;
    result JSONB;
BEGIN
    -- Get invitation (no expiration check)
    SELECT * INTO invitation_record
    FROM public.agent_invitations
    WHERE token = invitation_token
    AND status = 'pending';
    -- Removed: AND expires_at > now()
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitation not found or already processed'
        );
    END IF;
    
    -- Verify email matches
    IF invitation_record.email != (SELECT email FROM auth.users WHERE id = user_uuid) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email does not match invitation'
        );
    END IF;
    
    -- Update invitation status
    UPDATE public.agent_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = invitation_record.id;
    
    -- Assign role to user
    INSERT INTO public.user_roles (user_id, role_id, assigned_by)
    VALUES (user_uuid, invitation_record.role_id, invitation_record.invited_by)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    -- Create agent profile
    INSERT INTO public.agent_profiles (
        user_id,
        display_name,
        max_concurrent_chats,
        specialties,
        languages,
        status
    ) VALUES (
        user_uuid,
        invitation_record.display_name,
        invitation_record.max_concurrent_chats,
        invitation_record.specialties,
        invitation_record.languages,
        'available'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        max_concurrent_chats = EXCLUDED.max_concurrent_chats,
        specialties = EXCLUDED.specialties,
        languages = EXCLUDED.languages;
    
    -- Associate agent with workspace if workspace_id is provided
    IF invitation_record.workspace_id IS NOT NULL THEN
        INSERT INTO public.workspace_agents (
            workspace_id,
            agent_id,
            invited_by,
            joined_at
        ) VALUES (
            invitation_record.workspace_id,
            user_uuid,
            invitation_record.invited_by,
            now()
        )
        ON CONFLICT (workspace_id, agent_id) DO NOTHING;
    END IF;
    
    -- Mark related notification as read (if exists)
    UPDATE public.notifications
    SET read = true,
        read_at = now()
    WHERE user_id = user_uuid
    AND type = 'invitation'
    AND metadata->>'invitation_id' = invitation_record.id::text
    AND read = false;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Invitation accepted successfully',
        'workspace_id', invitation_record.workspace_id
    );
END;
$$;

-- 4. Update reject_agent_invitation function - add user to rejected_by array instead of changing status
CREATE OR REPLACE FUNCTION public.reject_agent_invitation(invitation_token text, user_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation
    SELECT * INTO invitation_record
    FROM public.agent_invitations
    WHERE token = invitation_token
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    -- Verify email matches
    IF invitation_record.email != (SELECT email FROM auth.users WHERE id = user_uuid) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email does not match invitation'
        );
    END IF;
    
    -- Add user to rejected_by array (so it won't show for them anymore)
    -- But keep the invitation visible to the creator
    UPDATE public.agent_invitations
    SET rejected_by = array_append(COALESCE(rejected_by, '{}'), user_uuid),
        rejected_at = now()
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Invitation rejected'
    );
END;
$$;

-- 5. Drop the expire_old_invitations function (no longer needed)
DROP FUNCTION IF EXISTS public.expire_old_invitations();

-- 6. Create a function to get invitations for a user, excluding rejected ones
CREATE OR REPLACE FUNCTION public.get_user_pending_invitations(user_email text, user_uuid uuid) 
RETURNS TABLE (
    id uuid,
    email text,
    invited_by uuid,
    role_id uuid,
    token text,
    status text,
    display_name text,
    max_concurrent_chats integer,
    specialties text[],
    languages text[],
    message text,
    created_at timestamptz,
    workspace_id uuid,
    workspace_name text,
    role_name text,
    inviter_email text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.id,
        ai.email,
        ai.invited_by,
        ai.role_id,
        ai.token,
        ai.status,
        ai.display_name,
        ai.max_concurrent_chats,
        ai.specialties,
        ai.languages,
        ai.message,
        ai.created_at,
        ai.workspace_id,
        w.name as workspace_name,
        r.name as role_name,
        u.email::text as inviter_email
    FROM public.agent_invitations ai
    LEFT JOIN public.workspaces w ON w.id = ai.workspace_id
    LEFT JOIN public.roles r ON r.id = ai.role_id
    LEFT JOIN auth.users u ON u.id = ai.invited_by
    WHERE ai.email = user_email
    AND ai.status = 'pending'
    AND (ai.rejected_by IS NULL OR NOT (user_uuid = ANY(ai.rejected_by)));
END;
$$;

-- 7. Update pending_invitations view to exclude rejected ones (if it exists)
-- First check if view exists and drop it
DROP VIEW IF EXISTS public.pending_invitations;

-- Recreate the view without expiration logic
CREATE OR REPLACE VIEW public.pending_invitations AS
SELECT 
    ai.id,
    ai.email,
    ai.invited_by,
    ai.role_id,
    ai.token,
    ai.status,
    ai.display_name,
    ai.max_concurrent_chats,
    ai.specialties,
    ai.languages,
    ai.message,
    ai.expires_at,
    ai.accepted_at,
    ai.rejected_at,
    ai.created_at,
    ai.updated_at,
    ai.workspace_id,
    ai.rejected_by,
    u.email as inviter_email,
    (u.raw_user_meta_data->>'display_name')::text as inviter_name,
    r.name as role_name,
    r.slug as role_slug,
    false as is_expired  -- Always false now
FROM public.agent_invitations ai
LEFT JOIN auth.users u ON u.id = ai.invited_by
LEFT JOIN public.roles r ON r.id = ai.role_id
WHERE ai.status = 'pending';
