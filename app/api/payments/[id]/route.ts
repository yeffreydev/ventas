import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UpdatePaymentInput } from '@/app/types/payments';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';


// GET /api/payments/[id] - Get a specific payment
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // Fetch payment with relations
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          id,
          order_number,
          total_amount,
          status,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total
          )
        ),
        customers (
          id,
          name,
          email,
          phone,
          document
        )
      `)
      .eq('id', id)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, payment.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Check if payment has a receipt
    const { data: receipt } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('payment_id', id)
      .single();

    return NextResponse.json({
      ...payment,
      receipt: receipt || null
    });
  } catch (error) {
    console.error('Internal server error fetching payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/payments/[id] - Update a payment
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const body: UpdatePaymentInput = await request.json();

    // Fetch existing payment
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existingPayment.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Update payment
    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Fetch complete payment with relations
    const { data: completePayment } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          id,
          order_number,
          total_amount,
          status
        ),
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json(completePayment);
  } catch (error: any) {
    console.error('Internal server error updating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/[id] - Delete a payment
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // Fetch existing payment
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existingPayment.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Delete payment (cascade will delete receipts)
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting payment:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Internal server error deleting payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
