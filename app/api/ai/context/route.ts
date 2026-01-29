import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Fetch customers summary
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, stage, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch orders summary
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_id, total, order_date, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(30);

    // Fetch products summary
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, sku, stock, price, category')
      .eq('workspace_id', workspaceId)
      .limit(50);

    // Aggregate stats
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    const context = {
      stats: {
        totalCustomers: customerCount || 0,
        totalOrders: orderCount || 0,
        totalProducts: productCount || 0,
      },
      recentCustomers: customers || [],
      recentOrders: orders || [],
      products: products || [],
    };

    return NextResponse.json(context);
  } catch (error) {
    console.error('Error fetching AI context:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
