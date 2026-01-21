import { createClient } from '@/app/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants(*),
        product_categories(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
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

    const body = await request.json();
    const {
      name,
      description,
      price,
      sku,
      stock,
      image_url,
      category_id,
      variants
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
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle variants
    if (variants) {
      // Delete existing variants not in the new list (if any logic requires it, or just update/insert)
      // For simplicity, we might delete all and recreate, or update existing ones.
      // Let's try a smarter approach: update existing, insert new, delete removed.
      
      // 1. Get existing variants
      const { data: existingVariants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id);
        
      const existingIds = existingVariants?.map(v => v.id) || [];
      const newVariantIds = variants.filter((v: any) => v.id).map((v: any) => v.id);
      
      // 2. Delete removed variants
      const idsToDelete = existingIds.filter(id => !newVariantIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase
          .from('product_variants')
          .delete()
          .in('id', idsToDelete);
      }

      // 3. Upsert variants
      const variantsToUpsert = variants.map((variant: any) => ({
        id: variant.id, // If id exists, it updates; if not (and we remove it from object for insert), it inserts.
                        // Actually upsert needs ID to update. New ones won't have ID.
        product_id: id,
        name: variant.name,
        price: variant.price || product.price,
        stock: variant.stock || 0,
        sku: variant.sku
      }));

      // Separate insert and update for clarity or use upsert if ID is handled correctly
      for (const variant of variantsToUpsert) {
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
              price: variant.price,
              stock: variant.stock,
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

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}