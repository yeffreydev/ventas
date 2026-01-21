import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

// GET - List all scheduled messages for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');

    let query = supabase
      .from('scheduled_messages')
      .select(`
        *,
        customer:customers(id, name, phone, email)
      `)
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching scheduled messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response
    const formattedData = data.map(msg => ({
      id: msg.id,
      customer_id: msg.customer_id,
      customer_name: msg.customer?.name,
      customer_phone: msg.customer?.phone,
      customer_email: msg.customer?.email,
      message: msg.message,
      scheduled_at: msg.scheduled_at,
      status: msg.status,
      recurrence: msg.recurrence,
      channel: msg.channel,
      target_type: msg.target_type,
      filter_by_tags: msg.filter_by_tags,
      filter_by_labels: msg.filter_by_labels,
      filter_by_message_age: msg.filter_by_message_age,
      filter_by_last_interaction: msg.filter_by_last_interaction,
      created_at: msg.created_at,
      sent_at: msg.sent_at,
      error_message: msg.error_message,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error in GET /api/scheduled-messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new scheduled message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      target_type,
      customer_id,
      message,
      scheduled_at: scheduled_at_direct, // New format: ISO string
      scheduled_date, // Old format: YYYY-MM-DD
      scheduled_time, // Old format: HH:MM
      recurrence = 'once',
      channel,
      filter_by_tags,
      filter_by_labels,
      filter_by_message_age,
      filter_by_last_interaction,
    } = body;

    // Validate required fields
    if (!target_type || !message || !channel) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Handle scheduled_at: prefer direct ISO format, fallback to date+time
    let scheduled_at: string;
    if (scheduled_at_direct) {
      scheduled_at = scheduled_at_direct;
    } else if (scheduled_date && scheduled_time) {
      scheduled_at = new Date(`${scheduled_date}T${scheduled_time}`).toISOString();
    } else {
      return NextResponse.json(
        { error: 'Se requiere fecha y hora de programación' },
        { status: 400 }
      );
    }

    // Validate target type
    if (target_type === 'single' && !customer_id) {
      return NextResponse.json(
        { error: 'Se requiere un cliente para envío individual' },
        { status: 400 }
      );
    }

    // Validate scheduled time is in the future
    if (new Date(scheduled_at) <= new Date()) {
      return NextResponse.json(
        { error: 'La fecha y hora debe ser en el futuro' },
        { status: 400 }
      );
    }

    // Create the scheduled message
    const { data, error } = await supabase
      .from('scheduled_messages')
      .insert({
        user_id: user.id,
        target_type,
        customer_id: target_type === 'single' ? customer_id : null,
        message,
        scheduled_at,
        recurrence,
        channel,
        filter_by_tags: target_type === 'group' ? filter_by_tags : null,
        filter_by_labels: target_type === 'group' ? filter_by_labels : null,
        filter_by_message_age: target_type === 'group' ? filter_by_message_age : null,
        filter_by_last_interaction: target_type === 'group' ? filter_by_last_interaction : null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating scheduled message:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If it's a group message, calculate and store the target customers
    if (target_type === 'group') {
      const { data: customers, error: customersError } = await supabase.rpc(
        'get_customers_for_scheduled_message',
        {
          p_user_id: user.id,
          p_filter_by_tags: filter_by_tags || null,
          p_filter_by_labels: filter_by_labels || null,
          p_filter_by_message_age: filter_by_message_age || null,
          p_filter_by_last_interaction: filter_by_last_interaction || null,
        }
      );

      if (!customersError && customers && customers.length > 0) {
        // Create scheduled_message_sends records
        const sends = customers.map((c: any) => ({
          scheduled_message_id: data.id,
          customer_id: c.customer_id,
          status: 'pending',
        }));

        await supabase.from('scheduled_message_sends').insert(sends);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/scheduled-messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}