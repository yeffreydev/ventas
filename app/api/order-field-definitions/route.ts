import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function checkWorkspaceAccess(supabase: any, workspaceId: string, userId: string): Promise<boolean> {
  if (!workspaceId) return false;
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

// GET /api/order-field-definitions - List all field definitions for workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { data: fieldDefinitions, error } = await supabase
      .from('order_field_definitions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('order_position', { ascending: true });

    if (error) {
      console.error('Error fetching field definitions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(fieldDefinitions);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/order-field-definitions - Create a new field definition
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspace_id,
      name,
      label,
      type,
      required = false,
      default_value,
      options,
      order_position = 0
    } = body;

    if (!workspace_id) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Validate required fields
    if (!name || !label || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, label, and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['text', 'number', 'select', 'date', 'checkbox'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate options for select type
    if (type === 'select' && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { error: 'Select type requires options array' },
        { status: 400 }
      );
    }

    const { data: fieldDefinition, error } = await supabase
      .from('order_field_definitions')
      .insert([
        {
          workspace_id,
          name,
          label,
          type,
          required,
          default_value,
          options: type === 'select' ? options : null,
          order_position
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating field definition:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(fieldDefinition, { status: 201 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
