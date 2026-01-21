import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

// GET - Get a single field definition
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('customer_attribute_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Definición no encontrada' }, { status: 404 });
    }

    // Verify workspace access
    if (data.workspace_id) {
      const hasAccess = await checkWorkspaceAccess(supabase, data.workspace_id, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching field definition:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update a field definition
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, label, type, options, required, default_value, order_position } = body;

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First fetch the existing record to get workspace_id
    const { data: existing } = await supabase
      .from('customer_attribute_definitions')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Definición no encontrada' }, { status: 404 });
    }

    // Verify workspace access
    if (existing.workspace_id) {
      const hasAccess = await checkWorkspaceAccess(supabase, existing.workspace_id, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('customer_attribute_definitions')
      .update({
        name,
        label,
        type,
        options,
        required,
        default_value,
        order_position
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating field definition:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a field definition
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First fetch the existing record to get workspace_id
    const { data: existing } = await supabase
      .from('customer_attribute_definitions')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Definición no encontrada' }, { status: 404 });
    }

    // Verify workspace access
    if (existing.workspace_id) {
      const hasAccess = await checkWorkspaceAccess(supabase, existing.workspace_id, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('customer_attribute_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting field definition:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
