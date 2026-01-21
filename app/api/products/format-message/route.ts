import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { product, variant } = await request.json();

    if (!product) {
      return NextResponse.json(
        { error: 'Product is required' },
        { status: 400 }
      );
    }

    // Determine which product info to use (variant or base product)
    const displayProduct = variant || product;
    const productName = variant ? `${product.name} - ${variant.name}` : product.name;
    const price = displayProduct.price;
    const stock = displayProduct.stock;
    const sku = displayProduct.sku || product.sku;

    // Format the message
    let message = `🛍️ *${productName}*\n\n`;
    
    if (product.description) {
      message += `${product.description}\n\n`;
    }

    message += `💰 *Precio:* S/.${price.toFixed(2)}\n`;
    
    if (stock !== undefined && stock !== null) {
      message += `📦 *Stock disponible:* ${stock} unidades\n`;
    }
    
    if (sku) {
      message += `🏷️ *SKU:* ${sku}\n`;
    }

    // Add variant info if applicable
    if (variant && product.product_variants && product.product_variants.length > 1) {
      message += `\n✨ *Variante seleccionada:* ${variant.name}\n`;
      message += `_Otras variantes disponibles: ${product.product_variants.length - 1}_\n`;
    }

    message += `\n¿Te gustaría realizar un pedido? 😊`;

    return NextResponse.json({
      message,
      imageUrl: product.image_url || null,
    });
  } catch (error) {
    console.error('Error formatting product message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}