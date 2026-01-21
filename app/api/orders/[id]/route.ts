import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UpdateOrderInput } from '@/app/types/orders';

// GET /api/orders/[id] - Get a single order with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            image_url
          ),
          product_variants (
            id,
            name
          )
        ),
        customers (
          id,
          name,
          email,
          identity_document_number
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch workspace name manually if not available via relation
    // We try to get it from workspaces table
    let workspaceName = '';
    if (order.workspace_id) {
       const { data: workspace } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', order.workspace_id)
        .single();
       if (workspace) {
         workspaceName = workspace.name;
       }
    }

    return NextResponse.json({ ...order, workspace_name: workspaceName });
  } catch (error) {
    console.error('Internal server error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update an order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateOrderInput & { workspace_id?: string } = await request.json();
    const {
      customer_id,
      status,
      shipping_address,
      billing_address,
      notes,
      payment_proof_url,
      custom_fields,
      metadata,
      workspace_id
    } = body;

    // Build the query to check if order exists - use workspace_id if provided, otherwise user_id
    let existingOrderQuery = supabase
      .from('orders')
      .select('id, status')
      .eq('id', id);
    
    if (workspace_id) {
      existingOrderQuery = existingOrderQuery.eq('workspace_id', workspace_id);
    } else {
      existingOrderQuery = existingOrderQuery.eq('user_id', user.id);
    }

    const { data: existingOrder, error: fetchError } = await existingOrderQuery.single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate status transitions
    if (status && existingOrder.status === 'completed') {
      return NextResponse.json(
        { error: 'No se puede modificar un pedido completado' },
        { status: 400 }
      );
    }

    if (status && existingOrder.status === 'cancelled' && status !== 'cancelled') {
      return NextResponse.json(
        { error: 'No se puede modificar un pedido cancelado' },
        { status: 400 }
      );
    }

    // If changing TO cancelled status, try to restore stock (optional, won't block the update)
    if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
      try {
        const { data: orderWithItems } = await supabase
          .from('orders')
          .select('order_items(product_id, product_variant_id, quantity)')
          .eq('id', id)
          .single();

        if (orderWithItems?.order_items) {
          for (const item of orderWithItems.order_items) {
            try {
              if (item.product_variant_id) {
                await supabase.rpc('increment_variant_stock', {
                  variant_id: item.product_variant_id,
                  quantity: item.quantity
                });
              } else if (item.product_id) {
                await supabase.rpc('increment_product_stock', {
                  product_id: item.product_id,
                  quantity: item.quantity
                });
              }
            } catch (stockError) {
              console.error('Error restoring stock for item:', item, stockError);
              // Continue with other items even if one fails
            }
          }
        }
      } catch (error) {
        console.error('Error fetching order items for stock restoration:', error);
        // Don't block the cancellation if stock restoration fails
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (customer_id !== undefined) updateData.customer_id = customer_id;
    if (status !== undefined) updateData.status = status;
    if (shipping_address !== undefined) updateData.shipping_address = shipping_address;
    if (billing_address !== undefined) updateData.billing_address = billing_address;
    if (notes !== undefined) updateData.notes = notes;
    if (payment_proof_url !== undefined) updateData.payment_proof_url = payment_proof_url;
    if (custom_fields !== undefined) updateData.custom_fields = custom_fields;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Update order - use workspace_id if provided, otherwise user_id
    let updateQuery = supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);
    
    if (workspace_id) {
      updateQuery = updateQuery.eq('workspace_id', workspace_id);
    } else {
      updateQuery = updateQuery.eq('user_id', user.id);
    }

    const { data: order, error: updateError } = await updateQuery
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            image_url
          ),
          product_variants (
            id,
            name
          )
        ),
        customers (
          id,
          name,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Internal server error updating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Delete/Cancel an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if order exists and belongs to user
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, order_items(product_id, product_variant_id, quantity)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order can be cancelled
    if (existingOrder.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel completed order' },
        { status: 400 }
      );
    }

    if (existingOrder.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    // Restore product stock before cancelling
    if (existingOrder.order_items) {
      for (const item of existingOrder.order_items) {
        if (item.product_variant_id) {
          // Restore variant stock
          await supabase.rpc('increment_variant_stock', {
            variant_id: item.product_variant_id,
            quantity: item.quantity
          });
        } else if (item.product_id) {
          // Restore product stock
          await supabase.rpc('increment_product_stock', {
            product_id: item.product_id,
            quantity: item.quantity
          });
        }
      }
    }

    // Update order status to cancelled instead of deleting
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Internal server error cancelling order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}