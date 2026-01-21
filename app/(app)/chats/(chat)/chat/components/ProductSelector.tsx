'use client';

import { useState, useEffect } from 'react';
import { HiX, HiSearch, HiShoppingCart } from 'react-icons/hi';
import { Spinner } from 'flowbite-react';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock?: number;
  image_url?: string;
  product_variants?: ProductVariant[];
}

interface ProductSelectorProps {
  onSelect: (product: Product, variant?: ProductVariant) => void;
  onClose: () => void;
  workspaceId?: string;
}

export default function ProductSelector({ onSelect, onClose, workspaceId }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchProducts();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    if (!workspaceId) {
      console.error('Workspace ID is required to fetch products');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/products?workspace_id=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      } else {
        console.error('Error fetching products:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.product_variants && product.product_variants.length > 0) {
      setSelectedProduct(product);
    } else {
      onSelect(product);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (selectedProduct) {
      onSelect(selectedProduct, variant);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <HiShoppingCart className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {selectedProduct ? `Variantes de ${selectedProduct.name}` : 'Seleccionar Producto'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-full transition-colors"
          >
            <HiX className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Search Bar */}
        {!selectedProduct && (
          <div className="p-4 border-b border-border">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, descripción o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input-bg border border-input-border text-foreground placeholder-text-tertiary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : selectedProduct ? (
            /* Variant Selection View */
            <div className="space-y-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-sm text-primary hover:text-primary/80 mb-4"
              >
                ← Volver a productos
              </button>
              
              {/* Product without variant option */}
              <div
                onClick={() => onSelect(selectedProduct)}
                className="p-4 border border-border rounded-lg hover:bg-hover-bg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Producto base (sin variante)</h3>
                    <p className="text-sm text-text-secondary">
                      S/.{selectedProduct.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {selectedProduct.product_variants?.map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  className="p-4 border border-border rounded-lg hover:bg-hover-bg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏷️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{variant.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-text-secondary">
                          S/.{variant.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          Stock: {variant.stock}
                        </p>
                        {variant.sku && (
                          <p className="text-xs text-text-tertiary">
                            SKU: {variant.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
              <HiShoppingCart className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No se encontraron productos</p>
              <p className="text-sm mt-2">
                {searchQuery ? 'Intenta con otra búsqueda' : 'Agrega productos para comenzar'}
              </p>
            </div>
          ) : (
            /* Products Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="p-4 border border-border rounded-lg hover:bg-hover-bg cursor-pointer transition-colors group"
                >
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-hover-bg">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl">📦</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-lg font-semibold text-primary">
                          S/.{product.price.toFixed(2)}
                        </p>
                        {product.stock !== undefined && (
                          <p className="text-xs text-text-tertiary">
                            Stock: {product.stock}
                          </p>
                        )}
                      </div>
                      {product.sku && (
                        <p className="text-xs text-text-tertiary mt-1">
                          SKU: {product.sku}
                        </p>
                      )}
                      {product.product_variants && product.product_variants.length > 0 && (
                        <p className="text-xs text-primary mt-2">
                          {product.product_variants.length} variante(s) disponible(s)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}