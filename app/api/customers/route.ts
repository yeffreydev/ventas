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
       // Optional: return empty or error if workspace not specified. 
       // For migration safety, we could allow querying 'user_id' if no workspace, 
       // but we want to enforce workspace architecture.
       return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        customer_tags (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `)
      .eq('workspace_id', workspaceId) // Scope to workspace
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      identity_document_type,
      identity_document_number,
      email,
      city,
      province,
      district,
      address,
      stage,
      tags,
      workspace_id // Required
    } = body;

    // Validate workspace
     if (!workspace_id) {
          return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
     }
     
    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Validate required fields
    if (!name || !identity_document_type || !identity_document_number || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert([
        {
          name,
          identity_document_type,
          identity_document_number,
          email,
          city,
          province,
          district,
          address,
          stage: stage || 'prospect',
          user_id: user.id, // Keep tracking creator
          workspace_id: workspace_id // Scope to workspace
        }
      ])
      .select()
      .single();

    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    // Add tags if provided
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        customer_id: customer.id,
        tag_id: tagId
      }));

      const { error: tagError } = await supabase
        .from('customer_tags')
        .insert(tagInserts);

      if (tagError) {
        console.error('Error adding tags:', tagError);
      }
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
