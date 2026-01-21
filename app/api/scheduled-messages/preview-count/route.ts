import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

// POST - Get count of customers that match the filters
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      filter_by_tags,
      filter_by_labels,
      filter_by_message_age,
      filter_by_last_interaction,
    } = body;

    // Get customers matching the filters
    const { data: customers, error } = await supabase.rpc(
      'get_customers_for_scheduled_message',
      {
        p_user_id: user.id,
        p_filter_by_tags: filter_by_tags || null,
        p_filter_by_labels: filter_by_labels || null,
        p_filter_by_message_age: filter_by_message_age || null,
        p_filter_by_last_interaction: filter_by_last_interaction || null,
      }
    );

    if (error) {
      console.error('Error getting customer count:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: customers?.length || 0 });
  } catch (error) {
    console.error('Error in POST /api/scheduled-messages/preview-count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}