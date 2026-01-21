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

// GET /api/order-field-definitions/[id] - Get a single field definition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: fieldDefinition, error } = await supabase
      .from('order_field_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Field definition not found' }, { status: 404 });
      }
      console.error('Error fetching field definition:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(fieldDefinition);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/order-field-definitions/[id] - Update a field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      label,
      type,
      required,
      default_value,
      options,
      order_position
    } = body;

    // Check if field definition exists
    const { data: existing, error: fetchError } = await supabase
      .from('order_field_definitions')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Field definition not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existing.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Build update object
    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (type !== undefined) {
      const validTypes = ['text', 'number', 'select', 'date', 'checkbox'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (required !== undefined) updateData.required = required;
    if (default_value !== undefined) updateData.default_value = default_value;
    if (options !== undefined) updateData.options = options;
    if (order_position !== undefined) updateData.order_position = order_position;

    const { data: fieldDefinition, error: updateError } = await supabase
      .from('order_field_definitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating field definition:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(fieldDefinition);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/order-field-definitions/[id] - Delete a field definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if field definition exists
    const { data: existing, error: fetchError } = await supabase
      .from('order_field_definitions')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Field definition not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existing.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('order_field_definitions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting field definition:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Field definition deleted successfully' });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
