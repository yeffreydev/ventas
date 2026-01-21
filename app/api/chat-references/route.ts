import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { CreateChatReferenceInput } from '@/app/types/chat-references';

// GET - Fetch all chat references for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const status = searchParams.get('status');
    const includeCustomer = searchParams.get('include_customer') === 'true';

    let query;
    
    if (includeCustomer) {
      // Use the view to get chat references with customer information
      query = supabase
        .from('chat_references_with_customer')
        .select('*')
        .eq('user_id', user.id);
    } else {
      query = supabase
        .from('chat_references')
        .select('*')
        .eq('user_id', user.id);
    }

    // Apply filters
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // Order by last message date (most recent first)
    query = query.order('last_message_at', { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching chat references:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat references' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new chat reference
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateChatReferenceInput = await request.json();

    // Validate required fields
    if (!body.customer_id || !body.chatwoot_conversation_id) {
      return NextResponse.json(
        { error: 'customer_id and chatwoot_conversation_id are required' },
        { status: 400 }
      );
    }

    // Verify customer belongs to user
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', body.customer_id)
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if chat reference already exists
    const { data: existing } = await supabase
      .from('chat_references')
      .select('id')
      .eq('chatwoot_conversation_id', body.chatwoot_conversation_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Chat reference already exists for this conversation' },
        { status: 409 }
      );
    }

    // Create chat reference
    const { data, error } = await supabase
      .from('chat_references')
      .insert({
        customer_id: body.customer_id,
        chatwoot_conversation_id: body.chatwoot_conversation_id,
        chatwoot_inbox_id: body.chatwoot_inbox_id || null,
        chatwoot_account_id: body.chatwoot_account_id || null,
        status: body.status || 'open',
        last_message_at: body.last_message_at || new Date().toISOString(),
        metadata: body.metadata || {},
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat reference:', error);
      return NextResponse.json(
        { error: 'Failed to create chat reference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}