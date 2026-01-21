import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function checkWorkspaceAccess(supabase: any, workspaceId: string, userId: string): Promise<boolean> {
  if (!workspaceId) return false;
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

// POST /api/payments/[id]/receipt - Generate a receipt for a payment
export async function POST(
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

    // Fetch payment with all necessary data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          id,
          order_number,
          total_amount,
          status,
          order_date,
          order_items (
            id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            subtotal,
            discount_amount,
            tax_amount,
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

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, payment.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Get workspace details
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', payment.workspace_id)
      .single();

    // Check if receipt already exists
    const { data: existingReceipt } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('payment_id', id)
      .single();

    if (existingReceipt) {
      return NextResponse.json(existingReceipt);
    }

    // Generate receipt number
    const { data: receiptNumberData, error: receiptNumberError } = await supabase
      .rpc('generate_receipt_number');

    if (receiptNumberError) {
      console.error('Error generating receipt number:', receiptNumberError);
      return NextResponse.json({ error: 'Failed to generate receipt number' }, { status: 500 });
    }

    // Prepare receipt data
    const receiptData = {
      payment: {
        payment_number: payment.payment_number,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        transaction_id: payment.transaction_id,
        reference_number: payment.reference_number,
        card_brand: payment.card_brand
      },
      order: payment.orders ? {
        order_number: payment.orders.order_number,
        order_date: payment.orders.order_date,
        total_amount: payment.orders.total_amount,
        items: payment.orders.order_items || []
      } : null,
      customer: payment.customers ? {
        name: payment.customers.name,
        email: payment.customers.email,
        phone: payment.customers.phone,
        document: payment.customers.document
      } : null,
      workspace: workspace ? {
        name: workspace.name
      } : null,
      generated_by: user.email,
      generated_at: new Date().toISOString()
    };

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('payment_receipts')
      .insert([
        {
          payment_id: id,
          receipt_number: receiptNumberData,
          receipt_data: receiptData,
          pdf_url: null
        }
      ])
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      return NextResponse.json({ error: receiptError.message }, { status: 500 });
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error: any) {
    console.error('Internal server error generating receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/payments/[id]/receipt - Get existing receipt for a payment
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

    // Fetch payment to check workspace access
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('workspace_id')
      .eq('id', id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, payment.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Fetch receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('payment_id', id)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('Internal server error fetching receipt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
