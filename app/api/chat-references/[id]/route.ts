import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { UpdateChatReferenceInput } from '@/app/types/chat-references';

// GET - Fetch a specific chat reference by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeCustomer = searchParams.get('include_customer') === 'true';

    let query;
    
    if (includeCustomer) {
      query = supabase
        .from('chat_references_with_customer')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
    } else {
      query = supabase
        .from('chat_references')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching chat reference:', error);
      return NextResponse.json(
        { error: 'Chat reference not found' },
        { status: 404 }
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

// PATCH - Update a chat reference
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateChatReferenceInput = await request.json();

    // Update chat reference
    const { data, error } = await supabase
      .from('chat_references')
      .update({
        ...(body.status && { status: body.status }),
        ...(body.last_message_at && { last_message_at: body.last_message_at }),
        ...(body.metadata && { metadata: body.metadata }),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating chat reference:', error);
      return NextResponse.json(
        { error: 'Failed to update chat reference' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Chat reference not found' },
        { status: 404 }
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

// DELETE - Delete a chat reference
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('chat_references')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting chat reference:', error);
      return NextResponse.json(
        { error: 'Failed to delete chat reference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Chat reference deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}