import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';

async function checkWorkspaceAdmin(supabase: any, workspaceId: string, userId: string): Promise<boolean> {
  if (!workspaceId) return false;
  
  // Check if user is owner
  const { data: ownerData } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (ownerData) return true;

  // Check if user is admin in workspace_members
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && data && data.role === 'admin';
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Get workspace settings
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, name, default_min_stock_alert, allow_orders_without_stock')
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error fetching workspace settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check workspace admin access
    const isAdmin = await checkWorkspaceAdmin(supabase, workspaceId, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only workspace administrators can update settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { default_min_stock_alert, allow_orders_without_stock } = body;

    // Validate inputs
    if (default_min_stock_alert !== undefined) {
      if (typeof default_min_stock_alert !== 'number' || default_min_stock_alert < 0) {
        return NextResponse.json(
          { error: 'default_min_stock_alert must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    if (allow_orders_without_stock !== undefined) {
      if (typeof allow_orders_without_stock !== 'boolean') {
        return NextResponse.json(
          { error: 'allow_orders_without_stock must be a boolean' },
          { status: 400 }
        );
      }
    }

    // Update workspace settings
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (default_min_stock_alert !== undefined) {
      updateData.default_min_stock_alert = default_min_stock_alert;
    }

    if (allow_orders_without_stock !== undefined) {
      updateData.allow_orders_without_stock = allow_orders_without_stock;
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId)
      .select('id, name, default_min_stock_alert, allow_orders_without_stock')
      .single();

    if (error) {
      console.error('Error updating workspace settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
