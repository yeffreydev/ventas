import { createClient } from '@/app/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id');
  const workspaceId = searchParams.get('workspace_id');

  if (!customerId || !workspaceId) {
    return NextResponse.json({ error: 'Customer ID and Workspace ID are required' }, { status: 400 });
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
    .from('customer_notes')
    .select('*')
    .eq('customer_id', customerId)
    .eq('workspace_id', workspaceId) // Scope
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { customer_id, content, workspace_id } = body;

  if (!customer_id || !content || !workspace_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    .from('customer_notes')
    .insert([
      {
        customer_id,
        content,
        created_by: user.id,
        workspace_id
      }
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from('customer_activities').insert([
    {
      customer_id,
      type: 'note',
      description: 'Nota agregada: ' + content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      created_by: user.id,
      workspace_id
    }
  ]);

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  const { error } = await supabase
    .from('customer_notes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
