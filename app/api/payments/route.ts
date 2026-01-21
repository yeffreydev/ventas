import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CreatePaymentInput, PaymentFilters } from '@/app/types/payments';

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

// GET /api/payments - List payments with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '10');
    const status = searchParams.get('status') || 'all';
    const paymentMethod = searchParams.get('payment_method') || 'all';
    const orderId = searchParams.get('order_id');
    const customerId = searchParams.get('customer_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search');
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Build query
    let query = supabase
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
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId);

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (dateFrom) {
      query = query.gte('payment_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('payment_date', dateTo);
    }

    if (search) {
      query = query.or(`payment_number.ilike.%${search}%,transaction_id.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: payments, error, count } = await query
      .order('payment_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      payments: payments || [],
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize)
    });
  } catch (error) {
    console.error('Internal server error fetching payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payments - Create a new payment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePaymentInput = await request.json();
    const {
      order_id,
      workspace_id,
      customer_id,
      amount,
      currency = 'USD',
      status = 'pending',
      payment_method,
      payment_date,
      transaction_id,
      card_brand,
      reference_number,
      notes,
      metadata = {}
    } = body;

    // Validate workspace
    if (!workspace_id) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    if (!payment_method) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    // If order_id is provided, validate it exists and belongs to workspace
    if (order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, total_amount, workspace_id, customer_id')
        .eq('id', order_id)
        .eq('workspace_id', workspace_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found or does not belong to workspace' }, { status: 404 });
      }

      // If customer_id not provided, use order's customer
      if (!customer_id && order.customer_id) {
        body.customer_id = order.customer_id;
      }
    }

    // Generate payment number
    const { data: paymentNumberData, error: paymentNumberError } = await supabase
      .rpc('generate_payment_number');

    if (paymentNumberError) {
      console.error('Error generating payment number:', paymentNumberError);
      return NextResponse.json({ error: 'Failed to generate payment number' }, { status: 500 });
    }

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          payment_number: paymentNumberData,
          order_id: order_id || null,
          workspace_id,
          user_id: user.id,
          customer_id: customer_id || null,
          amount,
          currency,
          status,
          payment_method,
          payment_date: payment_date || new Date().toISOString(),
          transaction_id: transaction_id || null,
          card_brand: card_brand || null,
          reference_number: reference_number || null,
          notes: notes || null,
          metadata
        }
      ])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
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
      .eq('id', payment.id)
      .single();

    return NextResponse.json(completePayment, { status: 201 });
  } catch (error: any) {
    console.error('Internal server error creating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
