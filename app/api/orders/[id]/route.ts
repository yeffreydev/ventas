import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UpdateOrderInput } from '@/app/types/orders';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';

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

    // First fetch the order to get workspace_id (RLS will filter based on workspace access)
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
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verify user has access to this workspace
    const hasAccess = await checkWorkspaceAccess(supabase, order.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Fetch workspace name manually if not available via relation
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

    // Fetch existing order (RLS will filter)
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify user has access to this workspace
    const hasAccess = await checkWorkspaceAccess(supabase, existingOrder.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
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
            }
          }
        }
      } catch (error) {
        console.error('Error fetching order items for stock restoration:', error);
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

    // Update order
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
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

    // Check if order exists (RLS will filter)
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, workspace_id, order_items(product_id, product_variant_id, quantity)')
      .eq('id', id)
      .single();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify user has access to this workspace
    const hasAccess = await checkWorkspaceAccess(supabase, existingOrder.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acceso no autorizado al espacio de trabajo' }, { status: 403 });
    }

    // Restore product stock before deleting (only if not already cancelled to avoid double restore)
    if (existingOrder.status !== 'cancelled' && existingOrder.order_items) {
      for (const item of existingOrder.order_items) {
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
      }
    }

    // Delete the order permanently
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting order:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar el pedido: ' + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Pedido eliminado correctamente'
    });

  } catch (error) {
    console.error('Internal server error deleting order:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}