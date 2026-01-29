import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CreateOrderInput, OrderFilters } from '@/app/types/orders';
import { requirePermission } from '@/app/lib/permissions';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';


// GET /api/orders - List orders with filtering and pagination
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
    const customerId = searchParams.get('customer_id');
    const agentId = searchParams.get('agent_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search');
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Check permission with workspaceId
    try {
      await requirePermission(user.id, 'orders', workspaceId);
    } catch (error) {
      console.error('[GET /api/orders] Permission denied:', error);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        *,
        customers (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('workspace_id', workspaceId); // Scope to workspace

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (agentId) {
      query = query.eq('user_id', agentId);
    }

    if (dateFrom) {
      query = query.gte('order_date', dateFrom);
    }

    if (dateTo) {
      // Add time to include the end date fully
      const dateToWithTime = `${dateTo}T23:59:59.999Z`;
      query = query.lte('order_date', dateToWithTime);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: orders, error, count } = await query
      .order('order_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }


    // Fetch agent names to allow dynamic updates
    const userIds = orders?.map(o => o.user_id).filter(Boolean) || [];
    const uniqueUserIds = Array.from(new Set(userIds));
    
    let agentMap: Record<string, string> = {};
    
    if (uniqueUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('user_id, display_name')
        .in('user_id', uniqueUserIds);
        
      if (profiles) {
        profiles.forEach(p => {
          if (p.display_name) {
            agentMap[p.user_id] = p.display_name;
          }
        });
      }
    }

    // Format response - prioritize live profile name, then stored snapshot, then fallback
    const formattedOrders = orders?.map(order => ({
      ...order,
      customer_name: order.customers?.name || null,
      customer_email: order.customers?.email || null,
      agent_name: agentMap[order.user_id] || order.created_by_name || 'Usuario'
    })) || [];

    return NextResponse.json({
      orders: formattedOrders,
      total: count || 0,
       page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize)
    });
  } catch (error) {
    console.error('Internal server error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateOrderInput = await request.json();
    const {
      customer_id,
      status = 'pending',
      shipping_address,
      billing_address,
      notes,
      items,
      payment_proof_url,
      custom_fields,
      metadata = {},
      workspace_id // Required from client
    } = body;

    // Validate workspace
    if (!workspace_id) {
       // Check if passed in body, otherwise 400
       return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Check permission with workspaceId
    try {
      await requirePermission(user.id, 'orders', workspace_id);
    } catch (error) {
      console.error('[POST /api/orders] Permission denied:', error);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
         return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    // Fetch workspace settings
    const { data: workspaceSettings, error: settingsError } = await supabase
      .from('workspaces')
      .select('allow_orders_without_stock')
      .eq('id', workspace_id)
      .single();

    const allowOrdersWithoutStock = workspaceSettings?.allow_orders_without_stock || false;

    // Validate and fetch product details for each item
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        // Fetch product details - scoped to workspace
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, price, sku, stock')
          .eq('id', item.product_id)
          .eq('workspace_id', workspace_id) // Ensure product belongs to workspace
          .single();

        if (productError || !product) {
          throw new Error(`Product not found: ${item.product_id}`);
        }

        // Check stock availability (unless allowed to ignore)
        if (!allowOrdersWithoutStock && product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }

        // If variant is specified, fetch variant details
        let variantDetails = null;
        if (item.product_variant_id) {
          const { data: variant, error: variantError } = await supabase
            .from('product_variants')
            .select('id, name, price, sku, stock')
            .eq('id', item.product_variant_id)
            .eq('product_id', item.product_id)
            .single();

          if (variantError || !variant) {
            throw new Error(`Product variant not found: ${item.product_variant_id}`);
          }

          if (!allowOrdersWithoutStock && variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for variant: ${variant.name}`);
          }

          variantDetails = variant;
        }

        // Calculate item totals
        const unitPrice = item.unit_price || variantDetails?.price || product.price;
        const subtotal = unitPrice * item.quantity;
        const discountAmount = item.discount_amount || 0;
        const taxAmount = item.tax_amount || 0;
        const total = subtotal - discountAmount + taxAmount;

        return {
          product_id: product.id,
          product_variant_id: item.product_variant_id || null,
          product_name: variantDetails ? `${product.name} - ${variantDetails.name}` : product.name,
          product_sku: variantDetails?.sku || product.sku,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total,
          metadata: {}
        };
      })
    );

    // Generate order number (workspace-scoped) with retry logic
    let orderNumberData: string | null = null;
    let orderNumberError: any = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data, error } = await supabase
        .rpc('generate_order_number', { p_workspace_id: workspace_id });
      
      if (!error) {
        orderNumberData = data;
        break;
      }
      
      orderNumberError = error;
      console.error(`Error generating order number (attempt ${attempt}/${maxRetries}):`, error);
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
      }
    }

    if (orderNumberError || !orderNumberData) {
      console.error('Failed to generate order number after retries:', orderNumberError);
      return NextResponse.json({ 
        error: 'Failed to generate order number. Please try again.',
        details: orderNumberError?.message 
      }, { status: 500 });
    }


    // Calculate order totals
    const orderSubtotal = itemsWithDetails.reduce((sum, item) => sum + item.subtotal, 0);
    const orderTaxAmount = itemsWithDetails.reduce((sum, item) => sum + item.tax_amount, 0);
    const orderDiscountAmount = itemsWithDetails.reduce((sum, item) => sum + item.discount_amount, 0);
    const orderTotalAmount = itemsWithDetails.reduce((sum, item) => sum + item.total, 0);

    // Get the agent name from user metadata
    const agentName = user.user_metadata?.full_name || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'Usuario';

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderNumberData,
          customer_id: customer_id || null,
          user_id: user.id,
          created_by_name: agentName, // Save agent name directly
          workspace_id: workspace_id, // Scope to workspace
          status,
          subtotal: orderSubtotal,
          tax_amount: orderTaxAmount,
          discount_amount: orderDiscountAmount,
          total_amount: orderTotalAmount,
          shipping_address: shipping_address || null,
          billing_address: billing_address || null,
          notes: notes || null,
          payment_proof_url: payment_proof_url || null,
          custom_fields: custom_fields || {},
          metadata
        }
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Create order items
    const orderItemsToInsert = itemsWithDetails.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    // Update product stock
    for (const item of items) {
      if (item.product_variant_id) {
        // Update variant stock
        await supabase.rpc('decrement_variant_stock', {
          variant_id: item.product_variant_id,
          quantity: item.quantity
        });
      } else {
        // Update product stock
        await supabase.rpc('decrement_product_stock', {
          product_id: item.product_id,
          quantity: item.quantity
        });
      }
    }

    // Fetch complete order with items
    const { data: completeOrder } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', order.id)
      .single();

    return NextResponse.json(completeOrder, { status: 201 });
  } catch (error: any) {
    console.error('Internal server error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}