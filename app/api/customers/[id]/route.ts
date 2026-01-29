import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';

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

    // RLS will filter based on workspace access
    const { data: customer, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, customer.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
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

    // First check if customer exists and get workspace_id
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existingCustomer.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

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
      tags
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

    // Update customer
    const { data: customer, error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
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

    // First check if customer exists and get workspace_id
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existingCustomer.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { error } = await supabase
      .from('customers')
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
