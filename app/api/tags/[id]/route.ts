
import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, workspace_id } = body;
    
    // Validate workspace access if provided, otherwise we rely on RLS but it's better to check
    // However, we need to know the workspace of the tag to check permissions properly.
    // For simplicity, we assume the user sending the request knows the workspace_id and we check it.
    // Or we fetch the tag first.
    
    if (!workspace_id) {
         // Optionally fetch tag to verify workspace, or assume RLS handles it.
         // Let's rely on RLS for ownership/access if simpler, but best practice is explicit check.
         const { data: existingTag } = await supabase.from('tags').select('workspace_id').eq('id', id).single();
         if(existingTag) {
             const hasAccess = await checkWorkspaceAccess(supabase, existingTag.workspace_id, user.id);
             if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
         }
    } else {
        const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
        if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (color) updates.color = color;
    // We don't update workspace_id normally

    const { data: tag, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch tag to check workspace permissions
    const { data: existingTag, error: fetchError } = await supabase
        .from('tags')
        .select('workspace_id')
        .eq('id', id)
        .single();

    if (fetchError || !existingTag) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    
    const hasAccess = await checkWorkspaceAccess(supabase, existingTag.workspace_id, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
