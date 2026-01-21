import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/utils/workspace-checks';

// GET - Get all attributes for a customer
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');
    const workspaceId = searchParams.get('workspace_id');

    if (!customerId || !workspaceId) {
      return NextResponse.json(
        { error: 'customer_id and workspace_id are required' },
        { status: 400 }
      );
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Verify the customer belongs to the workspace
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('workspace_id', workspaceId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all attributes for the customer
    const { data: attributes, error } = await supabase
      .from('customer_attributes')
      .select('*')
      .eq('customer_id', customerId)
      .order('attribute_name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(attributes || []);
  } catch (error: any) {
    console.error('Error fetching customer attributes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attributes' },
      { status: 500 }
    );
  }
}

// POST - Create a new attribute for a customer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customer_id, attribute_name, attribute_value, workspace_id } = body;

    if (!customer_id || !attribute_name || attribute_value === undefined || !workspace_id) {
      return NextResponse.json(
        { error: 'customer_id, attribute_name, attribute_value, and workspace_id are required' },
        { status: 400 }
      );
    }

     const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Verify the customer belongs to the workspace
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customer_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create the attribute (will fail if duplicate due to UNIQUE constraint)
    const { data, error } = await supabase
      .from('customer_attributes')
      .insert({
        customer_id,
        attribute_name: attribute_name.trim(),
        attribute_value: String(attribute_value || '').trim(),
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'An attribute with this name already exists for this customer' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer attribute:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create attribute' },
      { status: 500 }
    );
  }
}

// PUT and DELETE should ostensibly assume existing attributes are valid if user has access to customer
// But verifying workspace access via customer lookup is safest.
// For brevity in this tool call, I will only update GET and POST. 
// Ideally PUT/DELETE should also be updated to check workspace access before action.
// I will include PUT/DELETE updates in next chunks if needed or trust RLS/indirect checks.
// But wait, `customer_attributes` relies on `customers` for workspace check.
// PUT takes `id`. We look up attribute -> customer -> workspace_id.
// So PUT/DELETE *do* need updates to verify user's workspace membership against that customer's workspace.
// The current code checks `customers.user_id`. It MUST start checking `customers.workspace_id`.
// I'll update all in one go or split over calls. 
// I'll update PUT and DELETE in a subsequent call to be safe with line limits.


// PUT - Update an existing attribute
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, attribute_name, attribute_value } = body;

    // We rely on the implicit check: we fetch the attribute, check its customer, check customer's workspace, check user's membership.
    // However, PUT usually doesn't send workspace_id logic from client if it just sends ID?
    // But to authenticate, we need to know WHICH workspace strictly?
    // We can infer workspace from the customer the attribute belongs to.
    
    if (!id || !attribute_name || attribute_value === undefined) {
      return NextResponse.json(
        { error: 'id, attribute_name, and attribute_value are required' },
        { status: 400 }
      );
    }

    // Verify the attribute belongs to a customer, and that customer belongs to a workspace the user is in.
    const { data: attribute } = await supabase
      .from('customer_attributes')
      .select('customer_id, customers!inner(workspace_id)')
      .eq('id', id)
      .single();

    if (!attribute || !(attribute as any).customers?.workspace_id) {
          return NextResponse.json({ error: 'Attribute or workspace not found' }, { status: 404 });
    }
    
    const workspaceId = (attribute as any).customers.workspace_id;
    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized workspace access' },
        { status: 403 }
      );
    }

    // Update the attribute
    const { data, error } = await supabase
      .from('customer_attributes')
      .update({
        attribute_name: attribute_name.trim(),
        attribute_value: String(attribute_value || '').trim()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'An attribute with this name already exists for this customer' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating customer attribute:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update attribute' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an attribute
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Verify the attribute belongs to a customer, and that customer belongs to a workspace the user is in.
    const { data: attribute } = await supabase
      .from('customer_attributes')
      .select('customer_id, customers!inner(workspace_id)')
      .eq('id', id)
      .single();

    if (!attribute || !(attribute as any).customers?.workspace_id) {
         return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });
    }

    const workspaceId = (attribute as any).customers.workspace_id;
    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized workspace access' },
        { status: 403 }
      );
    }

    // Delete the attribute
    const { error } = await supabase
      .from('customer_attributes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting customer attribute:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete attribute' },
      { status: 500 }
    );
  }
}