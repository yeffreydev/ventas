import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

// GET - Obtener todos los canales del usuario autenticado en un workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tenga acceso al workspace
    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este workspace' },
        { status: 403 }
      );
    }

    // Obtener canales del usuario en el workspace
    const { data: channels, error } = await supabase
      .from('user_chatwoot_channels')
      .select('*')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching channels:', error);
      return NextResponse.json(
        { error: 'Error al obtener canales' },
        { status: 500 }
      );
    }

    return NextResponse.json({ channels });

  } catch (error) {
    console.error('Error in GET /api/user-chatwoot-channels:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva relación usuario-canal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      workspace_id,
      chatwoot_account_id,
      chatwoot_inbox_id,
      chatwoot_inbox_name,
      chatwoot_channel_type,
      metadata = {}
    } = body;

    // Validar campos requeridos
    if (!workspace_id || !chatwoot_account_id || !chatwoot_inbox_id) {
      return NextResponse.json(
        { error: 'workspace_id, chatwoot_account_id y chatwoot_inbox_id son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tenga acceso al workspace
    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este workspace' },
        { status: 403 }
      );
    }

    // Insertar nueva relación
    const { data: channel, error } = await supabase
      .from('user_chatwoot_channels')
      .insert({
        user_id: user.id,
        workspace_id,
        chatwoot_account_id,
        chatwoot_inbox_id,
        chatwoot_inbox_name,
        chatwoot_channel_type,
        metadata,
      })
      .select()
      .single();

    if (error) {
      // Si es un error de duplicado
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Este canal ya está asociado a tu cuenta' },
          { status: 409 }
        );
      }
      
      console.error('Error creating channel:', error);
      return NextResponse.json(
        { error: 'Error al crear canal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ channel }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/user-chatwoot-channels:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}