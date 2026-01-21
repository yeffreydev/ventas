-- Fix Invitation Timezone Logic
-- Problem: Using timezone('utc', now()) caused issues when comparing with timestamptz columns.
-- Solution: Use now() which returns timestamptz and compares correctly with table columns.

-- 1. Fix is_invitation_valid
CREATE OR REPLACE FUNCTION public.is_invitation_valid(invitation_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    SELECT * INTO invitation_record
    FROM public.agent_invitations
    WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now(); -- Changed from timezone('utc', now())
    
    RETURN FOUND;
END;
$$;

-- 2. Fix accept_agent_invitation
CREATE OR REPLACE FUNCTION public.accept_agent_invitation(invitation_token text, user_uuid uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
    agent_role_id UUID;
    result JSONB;
BEGIN
    -- Get invitation
    SELECT * INTO invitation_record
    FROM public.agent_invitations
    WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now(); -- Fix timezone issue
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitation not found or expired'
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
        accepted_at = now() -- Fix timezone issue
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
            now() -- Fix timezone issue
        )
        ON CONFLICT (workspace_id, agent_id) DO NOTHING;
    END IF;
    
    -- Mark related notification as read (if exists)
    UPDATE public.notifications
    SET read = true,
        read_at = now() -- Fix timezone issue
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

-- 3. Fix expire_old_invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.agent_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < now(); -- Fix timezone issue
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$;

-- 4. Fix reject_agent_invitation
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
    
    -- Update invitation status
    UPDATE public.agent_invitations
    SET status = 'rejected',
        rejected_at = now() -- Fix timezone issue
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Invitation rejected'
    );
END;
$$;

-- 5. Update defaults to be robust
ALTER TABLE public.agent_invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + '7 days'::interval);

ALTER TABLE public.agent_invitations 
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.agent_invitations 
ALTER COLUMN updated_at SET DEFAULT now();
