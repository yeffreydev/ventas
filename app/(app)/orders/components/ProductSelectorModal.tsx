"use client";

import { useState, useEffect } from "react";
import { X, Search, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  stock: number;
  image_url: string | null;
  min_stock_alert?: number;
  product_variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string | null;
}

interface ProductSelectorModalProps {
  show: boolean;
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  selectedProductId?: string;
}

export default function ProductSelectorModal({
  show,
  products,
  onSelect,
  onClose,
  selectedProductId,
}: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Reset search when modal opens
  useEffect(() => {
    if (show) {
      setSearchTerm("");
    }
  }, [show]);

  // Filter products based on search
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && show) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [show, onClose]);

  // Get stock badge styling
  const getStockBadge = (product: Product) => {
    const stock = product.stock || 0;
    const threshold = product.min_stock_alert || 10;

    if (stock === 0) {
      return {
        text: "Sin stock",
        className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
        icon: "⚠️",
      };
    } else if (stock <= threshold) {
      return {
        text: stock.toLocaleString(),
        className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
        icon: "⚠️",
      };
    } else {
      return {
        text: stock.toLocaleString(),
        className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
        icon: "✓",
      };
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Seleccionar Producto
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Mostrando {filteredProducts.length} de {products.length} productos
          </p>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">No se encontraron productos</p>
              <p className="text-sm">Intenta con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const stockBadge = getStockBadge(product);
                const isSelected = product.id === selectedProductId;

                return (
                  <button
                    key={product.id}
                    onClick={() => onSelect(product)}
                    className={`
                      group relative p-4 rounded-lg border-2 transition-all text-left
                      hover:border-primary hover:shadow-md
                      ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background"
                      }
                    `}
                  >
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                          {product.name}
                        </h4>
                        
                        {/* Price */}
                        <p className="text-lg font-bold text-primary mb-2">
                          S/. {product.price.toFixed(2)}
                        </p>

                        {/* Stock Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${stockBadge.className}`}
                          >
                            {stockBadge.icon} Stock: {stockBadge.text}
                          </span>
                        </div>

                        {/* SKU */}
                        {product.sku && (
                          <p className="text-xs text-text-tertiary truncate">
                            SKU: {product.sku}
                          </p>
                        )}

                        {/* Variants indicator */}
                        {product.product_variants && product.product_variants.length > 0 && (
                          <p className="text-xs text-text-secondary mt-1">
                            {product.product_variants.length} variante(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-hover-bg rounded-b-xl">
          <p className="text-sm text-text-secondary text-center">
            Haz clic en un producto para seleccionarlo
          </p>
        </div>
      </div>
    </div>
  );
}
