import { createClient } from '@/app/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
  if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('customer_attribute_definitions')
    .select('*')
    .eq('workspace_id', workspaceId) // Scope
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, label, type, options, required, default_value, order_position, workspace_id } = body;

  if (!name || !type || !workspace_id) {
    return NextResponse.json({ error: 'Name, type and workspace_id are required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
  if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('customer_attribute_definitions')
    .insert([
      {
        name,
        label: label || name,
        type,
        options,
        required: required || false,
        default_value,
        order_position: order_position || 0,
        user_id: user.id,
        workspace_id
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
