-- MIGRACIÓN: Fix validación invitación y acceso público
-- Aplicar en SQL Editor

-- 1. Corregir is_invitation_valid para usar now() directamente (timestamptz vs timestamptz)
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
    AND expires_at > now(); -- Comparación directa timestamptz
    
    RETURN FOUND;
END;
$$;

-- 2. Crear función segura para obtener detalles de invitación (disponible para anon)
-- Esto permite mostrar la invitación antes de loguearse
CREATE OR REPLACE FUNCTION public.get_invitation_details(token_input text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', ai.id,
        'email', ai.email,
        'invited_by_email', u.email,
        'inviter_name', COALESCE(u.raw_user_meta_data->>'display_name', u.email),
        'role_name', r.name,
        'display_name', ai.display_name,
        'message', ai.message,
        'workspace_id', ai.workspace_id,
        'workspace_name', w.name,
        'specialties', ai.specialties,
        'languages', ai.languages,
        'max_concurrent_chats', ai.max_concurrent_chats,
        'expires_at', ai.expires_at
    ) INTO result
    FROM public.agent_invitations ai
    JOIN public.roles r ON r.id = ai.role_id
    JOIN auth.users u ON u.id = ai.invited_by
    LEFT JOIN public.workspaces w ON w.id = ai.workspace_id
    WHERE ai.token = token_input
    AND ai.status = 'pending'
    AND ai.expires_at > now();

    RETURN result;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_invitation_details(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_details(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_details(text) TO service_role;
