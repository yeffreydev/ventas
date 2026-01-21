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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    // Optional: if no workspaceId, strict mode returns error
    if (!workspaceId) {
        return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, user.id);
    if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants(*),
        product_categories(*)
      `)
      .eq('workspace_id', workspaceId) // Scope to workspace
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Internal server error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[POST /api/products] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[POST /api/products] Request body:', JSON.stringify(body, null, 2));
    
    const {
      name,
      description,
      price,
      sku,
      stock,
      image_url,
      category_id,
      variants,
      workspace_id // Required
    } = body;

    if (!workspace_id) {
      console.error('[POST /api/products] Missing workspace_id');
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    console.log('[POST /api/products] Checking workspace access:', { workspace_id, user_id: user.id });
    const hasAccess = await checkWorkspaceAccess(supabase, workspace_id, user.id);
    if (!hasAccess) {
      console.error('[POST /api/products] Unauthorized workspace access');
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    // Validate required fields
    if (!name || price === undefined) {
      console.error('[POST /api/products] Missing required fields:', { name, price });
      return NextResponse.json(
        { error: 'Missing required fields: name and price are required' },
        { status: 400 }
      );
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([
        {
          name,
          description,
          price,
          sku,
          stock: stock || 0,
          image_url,
          category_id: category_id || null,
          user_id: user.id, // Track creator
          workspace_id: workspace_id // Scope to workspace
        }
      ])
      .select()
      .single();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    // Create variants if provided
    if (variants && variants.length > 0) {
      const variantsToInsert = variants.map((variant: any) => ({
        product_id: product.id,
        name: variant.name,
        price: variant.price || product.price,
        stock: variant.stock || 0,
        sku: variant.sku
      }));

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert);

      if (variantsError) {
        console.error('Error creating variants:', variantsError);
        // Consider whether to rollback product creation or just report error
      }
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}