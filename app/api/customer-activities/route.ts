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
    .from('customer_activities')
    .select('*')
    .eq('customer_id', customerId)
    .eq('workspace_id', workspaceId) // Scope
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
