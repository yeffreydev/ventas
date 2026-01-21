import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';
import type { CreateReminderInput } from '@/app/types/reminders';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

// GET - Fetch reminders
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const conversationId = searchParams.get('conversation_id');
    const status = searchParams.get('status');
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
        return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    let query = supabase
      .from('reminders')
      .select(`
        *,
        customers (
          name
        )
      `)
      //.eq('user_id', user.id) // Previously scoped to user, now workspace. But maybe reminders are personal? User requirement said "roles per workspace". Reminders usually transparent in team. 
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (conversationId) {
      query = query.eq('conversation_id', parseInt(conversationId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: reminders, error } = await query;

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminders: reminders || [] });
  } catch (error: any) {
    console.error('Error in GET /api/reminders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateReminderInput & { workspace_id: string } = await request.json();

    if (!body.title || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!body.workspace_id) {
        return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, body.workspace_id, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const reminderData = {
      user_id: user.id,
      customer_id: body.customer_id || null,
      conversation_id: body.conversation_id || null,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      due_date: body.due_date || null,
      priority: body.priority || 'medium',
      status: 'pending',
      created_from_message_id: body.created_from_message_id || null,
      workspace_id: body.workspace_id
    };

    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert(reminderData)
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/reminders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update a reminder
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    // If status is being changed to completed, set completed_at
    if (updates.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data: reminder, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminder });
  } catch (error: any) {
    console.error('Error in PUT /api/reminders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a reminder
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting reminder:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/reminders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}