import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    // For backwards compatibility, if no workspace_id, try user_id based query
    // But ideally all calls should include workspace_id
    const query = supabase
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
      .eq('id', id);

    if (workspaceId) {
      query.eq('workspace_id', workspaceId);
    } else {
      query.eq('user_id', user.id);
    }

    const { data: customer, error } = await query.single();

    if (error) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      identity_document_type,
      identity_document_number,
      email,
      phone,
      city,
      province,
      district,
      address,
      stage,
      tags,
      workspace_id
    } = body;

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (identity_document_type !== undefined) updateData.identity_document_type = identity_document_type;
    if (identity_document_number !== undefined) updateData.identity_document_number = identity_document_number;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (district !== undefined) updateData.district = district;
    if (address !== undefined) updateData.address = address;
    if (stage !== undefined) updateData.stage = stage;

    // Update customer - use workspace_id if provided, otherwise user_id
    const updateQuery = supabase
      .from('customers')
      .update(updateData)
      .eq('id', id);

    if (workspace_id) {
      updateQuery.eq('workspace_id', workspace_id);
    } else {
      updateQuery.eq('user_id', user.id);
    }

    const { data: customer, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await supabase
        .from('customer_tags')
        .delete()
        .eq('customer_id', id);

      // Add new tags
      if (tags.length > 0) {
        const tagInserts = tags.map((tagId: string) => ({
          customer_id: id,
          tag_id: tagId
        }));

        await supabase
          .from('customer_tags')
          .insert(tagInserts);
      }
    }

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    const deleteQuery = supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (workspaceId) {
      deleteQuery.eq('workspace_id', workspaceId);
    } else {
      deleteQuery.eq('user_id', user.id);
    }

    const { error } = await deleteQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
