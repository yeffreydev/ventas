import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/templates - Starting request');
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('GET /api/templates - Auth check:', { userId: user?.id, authError: authError?.message });

    if (authError || !user) {
      console.log('GET /api/templates - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active_only') === 'true';

    console.log('GET /api/templates - Query params:', { category, activeOnly });

    let query = supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;

    console.log('GET /api/templates - Query result:', {
      templatesCount: templates?.length,
      error: error?.message
    });

    if (error) {
      console.error('Supabase error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(templates || []);
  } catch (error) {
    console.error('Internal server error fetching templates:', error);
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
      content,
      shortcut,
      category,
      is_active = true
    } = body;

    // Validate required fields
    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    // Check if shortcut already exists for this user
    if (shortcut) {
      const { data: existingTemplate } = await supabase
        .from('templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('shortcut', shortcut)
        .single();

      if (existingTemplate) {
        return NextResponse.json(
          { error: 'A template with this shortcut already exists' },
          { status: 400 }
        );
      }
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert([
        {
          name,
          content,
          shortcut,
          category,
          is_active,
          user_id: user.id
        }
      ])
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return NextResponse.json({ error: templateError.message }, { status: 500 });
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Internal server error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}