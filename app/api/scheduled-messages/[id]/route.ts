import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

// GET - Get a specific scheduled message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('scheduled_messages')
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching scheduled message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/scheduled-messages/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a scheduled message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if message exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only allow updates to pending messages
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only update pending messages' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      message,
      scheduled_date,
      scheduled_time,
      recurrence,
      channel,
      filter_by_tags,
      filter_by_labels,
      filter_by_message_age,
      filter_by_last_interaction,
    } = body;

    const updates: any = {};

    if (message !== undefined) updates.message = message;
    if (recurrence !== undefined) updates.recurrence = recurrence;
    if (channel !== undefined) updates.channel = channel;

    // Update scheduled time if provided
    if (scheduled_date && scheduled_time) {
      const scheduled_at = new Date(`${scheduled_date}T${scheduled_time}`).toISOString();
      
      // Validate scheduled time is in the future
      if (new Date(scheduled_at) <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }
      
      updates.scheduled_at = scheduled_at;
    }

    // Update group filters if target_type is group
    if (existing.target_type === 'group') {
      if (filter_by_tags !== undefined) updates.filter_by_tags = filter_by_tags;
      if (filter_by_labels !== undefined) updates.filter_by_labels = filter_by_labels;
      if (filter_by_message_age !== undefined) updates.filter_by_message_age = filter_by_message_age;
      if (filter_by_last_interaction !== undefined) updates.filter_by_last_interaction = filter_by_last_interaction;

      // Recalculate target customers if filters changed
      const filtersChanged = 
        filter_by_tags !== undefined ||
        filter_by_labels !== undefined ||
        filter_by_message_age !== undefined ||
        filter_by_last_interaction !== undefined;

      if (filtersChanged) {
        // Delete existing sends
        await supabase
          .from('scheduled_message_sends')
          .delete()
          .eq('scheduled_message_id', id);

        // Recalculate customers
        const { data: customers, error: customersError } = await supabase.rpc(
          'get_customers_for_scheduled_message',
          {
            p_user_id: user.id,
            p_filter_by_tags: updates.filter_by_tags ?? existing.filter_by_tags,
            p_filter_by_labels: updates.filter_by_labels ?? existing.filter_by_labels,
            p_filter_by_message_age: updates.filter_by_message_age ?? existing.filter_by_message_age,
            p_filter_by_last_interaction: updates.filter_by_last_interaction ?? existing.filter_by_last_interaction,
          }
        );

        if (!customersError && customers && customers.length > 0) {
          const sends = customers.map((c: any) => ({
            scheduled_message_id: id,
            customer_id: c.customer_id,
            status: 'pending',
          }));

          await supabase.from('scheduled_message_sends').insert(sends);
        }
      }
    }

    const { data, error } = await supabase
      .from('scheduled_messages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating scheduled message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/scheduled-messages/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a scheduled message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if message exists and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only allow deletion of pending or failed messages
    if (!['pending', 'failed'].includes(existing.status)) {
      return NextResponse.json(
        { error: 'Can only delete pending or failed messages' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('scheduled_messages')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting scheduled message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/scheduled-messages/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}