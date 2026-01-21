"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import { CreateOrderInput, CreateOrderItemInput } from "@/app/types/orders";

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  stock: number;
  image_url: string | null;
  product_variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string | null;
}

interface ChatOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
  customerId?: string;
  customerName?: string;
  workspaceId: string;
}

export default function ChatOrderForm({ 
  onClose, 
  onSuccess, 
  customerId,
  customerName,
  workspaceId
}: ChatOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateOrderInput>({
    customer_id: customerId,
    items: [],
    status: 'pending',
    shipping_address: {},
    billing_address: {},
    notes: '',
  });

  const [orderItems, setOrderItems] = useState<CreateOrderItemInput[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/products?workspace_id=${workspaceId}`);

      if (response.ok) {
        const productsData = await response.json();
        setProducts(productsData);
      } else {
        console.error('Error fetching products:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: '',
        quantity: 1,
      }
    ]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof CreateOrderItemInput, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };

    // If product changes, reset variant and update price
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].unit_price = product.price;
        updated[index].product_variant_id = undefined;
      }
    }

    // If variant changes, update price
    if (field === 'product_variant_id' && value) {
      const product = products.find(p => p.id === updated[index].product_id);
      const variant = product?.product_variants?.find(v => v.id === value);
      if (variant) {
        updated[index].unit_price = variant.price;
      }
    }

    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      const price = item.unit_price || product?.price || 0;
      const discount = item.discount_amount || 0;
      const tax = item.tax_amount || 0;
      return sum + (price * item.quantity - discount + tax);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (orderItems.length === 0) {
      alert('Debes agregar al menos un artículo al pedido');
      return;
    }

    // Validate all items have products selected
    const invalidItems = orderItems.filter(item => !item.product_id || item.quantity <= 0);
    if (invalidItems.length > 0) {
      alert('Todos los artículos deben tener un producto y cantidad válida');
      return;
    }

    try {
      setLoading(true);

      const orderData: CreateOrderInput = {
        ...formData,
        customer_id: customerId,
        items: orderItems,
        workspace_id: workspaceId, // Required by API
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-background rounded-xl p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-background rounded-xl p-6 max-w-4xl w-full mx-4 my-8 border border-current/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Crear Pedido desde Chat</h2>
              {customerName && (
                <p className="text-sm text-text-secondary mt-1">
                  Cliente: <span className="font-semibold text-foreground">{customerName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-foreground">
                Artículos del Pedido
              </label>
              <button
                type="button"
                onClick={addOrderItem}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Artículo
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {orderItems.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.product_id);
                const itemTotal = (item.unit_price || selectedProduct?.price || 0) * item.quantity;

                return (
                  <div key={index} className="bg-hover-bg p-4 rounded-lg border border-current/20">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Product Selection */}
                      <div className="md:col-span-5">
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Producto *
                        </label>
                        <select
                          value={item.product_id}
                          onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">Seleccionar producto...</option>
                          {filteredProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${product.price.toFixed(2)} (Stock: {product.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant Selection */}
                      {selectedProduct?.product_variants && selectedProduct.product_variants.length > 0 && (
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Variante
                          </label>
                          <select
                            value={item.product_variant_id || ''}
                            onChange={(e) => updateOrderItem(index, 'product_variant_id', e.target.value || undefined)}
                            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <option value="">Sin variante</option>
                            {selectedProduct.product_variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.name} - ${variant.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Cantidad *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          required
                          className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-text-secondary mb-1">
                          Precio Unit.
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price || selectedProduct?.price || 0}
                          onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      {/* Total & Remove */}
                      <div className="md:col-span-2 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Total
                          </label>
                          <div className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm font-semibold text-foreground">
                            ${itemTotal.toFixed(2)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {orderItems.length === 0 && (
                <div className="text-center py-8 text-text-secondary bg-hover-bg rounded-lg border border-current/20">
                  No hay artículos en el pedido. Haz clic en "Agregar Artículo" para comenzar.
                </div>
              )}
            </div>
          </div>

          {/* Order Total */}
          {orderItems.length > 0 && (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total del Pedido:</span>
                <span className="text-2xl font-bold text-primary">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Agregar notas sobre el pedido..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-current/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || orderItems.length === 0}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creando...' : 'Crear Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}