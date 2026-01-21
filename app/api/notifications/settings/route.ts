import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return default settings if none exist
    if (!data) {
      return NextResponse.json({
        enabled: true,
        sound_enabled: true,
        browser_notifications: true,
        notification_types: {
          new_message: true,
          new_conversation: true,
          assignment: true,
          reminder: true,
          order_update: true,
          system: true,
          mention: true,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/notifications/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, sound_enabled, browser_notifications, notification_types } = body;

    const updateData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof enabled === 'boolean') updateData.enabled = enabled;
    if (typeof sound_enabled === 'boolean') updateData.sound_enabled = sound_enabled;
    if (typeof browser_notifications === 'boolean') updateData.browser_notifications = browser_notifications;
    if (notification_types) updateData.notification_types = notification_types;

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/notifications/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}