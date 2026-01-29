import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkWorkspaceAccess } from '@/app/lib/workspace-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RLS will filter based on workspace access
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants(*),
        product_categories(*)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, product.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if product exists and get workspace_id
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existingProduct.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      sku,
      stock,
      image_url,
      category_id,
      variants,
      min_stock_alert
    } = body;

    // Update product
    const { data: product, error } = await supabase
      .from('products')
      .update({
        name,
        description,
        price,
        sku,
        stock,
        image_url,
        category_id: category_id || null,
        min_stock_alert: min_stock_alert !== undefined ? min_stock_alert : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle variants
    if (variants) {
      const { data: existingVariants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id);
        
      const existingIds = existingVariants?.map(v => v.id) || [];
      const newVariantIds = variants.filter((v: any) => v.id).map((v: any) => v.id);
      
      const idsToDelete = existingIds.filter(existingId => !newVariantIds.includes(existingId));
      if (idsToDelete.length > 0) {
        await supabase
          .from('product_variants')
          .delete()
          .in('id', idsToDelete);
      }

      for (const variant of variants) {
        if (variant.id) {
           await supabase
            .from('product_variants')
            .update({
              name: variant.name,
              price: variant.price,
              stock: variant.stock,
              sku: variant.sku,
              updated_at: new Date().toISOString()
            })
            .eq('id', variant.id);
        } else {
           await supabase
            .from('product_variants')
            .insert({
              product_id: id,
              name: variant.name,
              price: variant.price || product.price,
              stock: variant.stock || 0,
              sku: variant.sku
            });
        }
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if product exists and get workspace_id
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, workspace_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, existingProduct.workspace_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized workspace access' }, { status: 403 });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}