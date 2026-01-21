import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: List stock movements for a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const productId = searchParams.get('product_id');
    const movementType = searchParams.get('movement_type');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('product_stock_movements')
      .select(`
        *,
        products:product_id (
          id,
          name,
          sku
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (movementType) {
      query = query.eq('movement_type', movementType);
    }

    const { data: movements, error } = await query;

    if (error) {
      console.error('Error fetching stock movements:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a stock movement and update product stock
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, workspace_id, movement_type, quantity, reason, notes } = body;

    // Validate required fields
    if (!product_id || !workspace_id || !movement_type || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['in', 'out', 'adjustment'].includes(movement_type)) {
      return NextResponse.json(
        { error: 'Invalid movement_type. Must be: in, out, or adjustment' },
        { status: 400 }
      );
    }

   if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current product stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', product_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    const previousStock = product.stock || 0;
    let newStock = previousStock;

    // Calculate new stock based on movement type
    switch (movement_type) {
      case 'in':
        newStock = previousStock + quantity;
        break;
      case 'out':
        newStock = previousStock - quantity;
        if (newStock < 0) {
          return NextResponse.json(
            { error: 'Insufficient stock' },
            { status: 400 }
          );
        }
        break;
      case 'adjustment':
        newStock = quantity; // Direct adjustment to specific value
        break;
    }

    // Start a transaction by creating the movement and updating the product
    const { data: movement, error: movementError } = await supabase
      .from('product_stock_movements')
      .insert({
        product_id,
        workspace_id,
        movement_type,
        quantity: movement_type === 'adjustment' ? Math.abs(newStock - previousStock) : quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason,
        notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (movementError) {
      console.error('Error creating movement:', movementError);
      return NextResponse.json({ error: movementError.message }, { status: 500 });
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', product_id)
      .eq('workspace_id', workspace_id);

    if (updateError) {
      console.error('Error updating product stock:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
