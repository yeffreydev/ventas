import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: List products with stock information for a workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const categoryId = searchParams.get('category_id');
    const lowStock = searchParams.get('low_stock');
    const search = searchParams.get('search');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        stock,
        price,
        image_url,
        min_stock_alert,
        product_categories:category_id (
          id,
          name,
          color
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter for low stock in JavaScript if requested
    let filteredProducts = products;
    if (lowStock === 'true' && products) {
      filteredProducts = products.filter(product => {
        const threshold = product.min_stock_alert || 10;
        return (product.stock || 0) <= threshold;
      });
    }

    return NextResponse.json(filteredProducts);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
