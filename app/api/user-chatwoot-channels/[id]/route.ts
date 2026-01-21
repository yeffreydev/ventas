import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

// GET - Obtener un canal específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data: channel, error } = await supabase
      .from('user_chatwoot_channels')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Canal no encontrado' },
          { status: 404 }
        );
      }

      console.error('Error fetching channel:', error);
      return NextResponse.json(
        { error: 'Error al obtener canal' },
        { status: 500 }
      );
    }

    // Verificar que el usuario tenga acceso al workspace del canal
    const hasAccess = await checkWorkspaceAccess(supabase, channel.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este canal' },
        { status: 403 }
      );
    }

    return NextResponse.json({ channel });

  } catch (error) {
    console.error('Error in GET /api/user-chatwoot-channels/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un canal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const body = await request.json();
    const {
      chatwoot_inbox_name,
      chatwoot_channel_type,
      is_active,
      metadata
    } = body;

    // Construir objeto de actualización solo con campos proporcionados
    const updates: any = {};
    if (chatwoot_inbox_name !== undefined) updates.chatwoot_inbox_name = chatwoot_inbox_name;
    if (chatwoot_channel_type !== undefined) updates.chatwoot_channel_type = chatwoot_channel_type;
    if (is_active !== undefined) updates.is_active = is_active;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      );
    }

    // Primero obtener el canal para verificar workspace access
    const { data: existingChannel, error: fetchError } = await supabase
      .from('user_chatwoot_channels')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Canal no encontrado' },
          { status: 404 }
        );
      }

      console.error('Error fetching channel:', fetchError);
      return NextResponse.json(
        { error: 'Error al obtener canal' },
        { status: 500 }
      );
    }

    // Verificar que el usuario tenga acceso al workspace del canal
    const hasAccess = await checkWorkspaceAccess(supabase, existingChannel.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este canal' },
        { status: 403 }
      );
    }

    const { data: channel, error } = await supabase
      .from('user_chatwoot_channels')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating channel:', error);
      return NextResponse.json(
        { error: 'Error al actualizar canal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ channel });

  } catch (error) {
    console.error('Error in PATCH /api/user-chatwoot-channels/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un canal (de la plataforma y de Chatwoot)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiUrl = process.env.CHATWOOT_API_URL;
  const accessToken = process.env.CHATWOOT_APP_ACCESS_TOKEN;

  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!apiUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Error de configuración del servidor: Credenciales API faltantes' },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Primero obtener la información del canal antes de eliminarlo
    const { data: channel, error: fetchError } = await supabase
      .from('user_chatwoot_channels')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Canal no encontrado' },
          { status: 404 }
        );
      }
      console.error('Error fetching channel:', fetchError);
      return NextResponse.json(
        { error: 'Error al obtener información del canal' },
        { status: 500 }
      );
    }

    // Verificar que el usuario tenga acceso al workspace del canal
    const hasAccess = await checkWorkspaceAccess(supabase, channel.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a este canal' },
        { status: 403 }
      );
    }

    // Intentar eliminar el inbox de Chatwoot primero
    try {
      console.log(`Deleting inbox ${channel.chatwoot_inbox_id} from Chatwoot account ${channel.chatwoot_account_id}`);
      
      await axios.delete(
        `${apiUrl}/accounts/${channel.chatwoot_account_id}/inboxes/${channel.chatwoot_inbox_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': accessToken,
          },
        }
      );

      console.log(`Successfully deleted inbox ${channel.chatwoot_inbox_id} from Chatwoot`);
    } catch (chatwootError) {
      // Si el inbox ya no existe en Chatwoot (404), continuar con la eliminación local
      if (axios.isAxiosError(chatwootError) && chatwootError.response?.status === 404) {
        console.log(`Inbox ${channel.chatwoot_inbox_id} not found in Chatwoot, proceeding with local deletion`);
      } else {
        // Para otros errores de Chatwoot, registrar pero continuar
        console.error('Error deleting inbox from Chatwoot:', chatwootError);
        if (axios.isAxiosError(chatwootError)) {
          console.error('Chatwoot API Error Response:', JSON.stringify(chatwootError.response?.data, null, 2));
        }
        
        // Retornar error si no se pudo eliminar de Chatwoot
        return NextResponse.json(
          {
            error: 'Error al eliminar el canal de Chatwoot',
            details: axios.isAxiosError(chatwootError) ? chatwootError.response?.data : 'Error desconocido'
          },
          { status: 500 }
        );
      }
    }

    // Eliminar el canal de la base de datos local
    const { error: deleteError } = await supabase
      .from('user_chatwoot_channels')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting channel from database:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar canal de la base de datos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Canal eliminado exitosamente de Chatwoot y de la plataforma',
      deleted_inbox_id: channel.chatwoot_inbox_id
    });

  } catch (error) {
    console.error('Error in DELETE /api/user-chatwoot-channels/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}