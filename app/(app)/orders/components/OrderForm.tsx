"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { CreateOrderInput, CreateOrderItemInput, Address } from "@/app/types/orders";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import ProductSelectorModal from "./ProductSelectorModal";

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

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

interface OrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderForm({ onClose, onSuccess }: OrderFormProps) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateOrderInput>({
    items: [],
    status: 'pending',
    shipping_address: {},
    billing_address: {},
    notes: '',
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [orderItems, setOrderItems] = useState<CreateOrderItemInput[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Product selector modal state
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [selectingForIndex, setSelectingForIndex] = useState<number | null>(null);

  // Workspace settings
  const [allowOrdersWithoutStock, setAllowOrdersWithoutStock] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    if (!currentWorkspace) return;

    try {
      setLoadingData(true);
      const [productsRes, customersRes, fieldsRes, settingsRes] = await Promise.all([
        fetch(`/api/products?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/customers?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/order-field-definitions?workspace_id=${currentWorkspace.id}`),
        fetch(`/api/workspaces/${currentWorkspace.id}/settings`)
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData);
      }

      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        setFieldDefinitions(fieldsData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAllowOrdersWithoutStock(settingsData.allow_orders_without_stock || false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const addOrderItem = () => {
    setOrderItems([
      {
        product_id: '',
        quantity: 1,
        unit_price: 0, // Initialize to prevent uncontrolled input error
      },
      ...orderItems, // Prepend new item to avoid scroll jumping
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

    if (!currentWorkspace) {
      alert('No hay workspace seleccionado');
      return;
    }

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
        customer_id: selectedCustomer || undefined,
        items: orderItems,
        workspace_id: currentWorkspace.id,
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

  const openProductSelector = (index: number) => {
    setSelectingForIndex(index);
    setProductSelectorOpen(true);
  };

  const handleProductSelect = (product: Product) => {
    // Validate stock if not allowed to order without stock
    if (!allowOrdersWithoutStock && product.stock <= 0) {
      alert(`No se puede agregar "${product.name}" porque no hay stock disponible. Para permitir pedidos sin stock, actualiza la configuración del workspace.`);
      return;
    }

    if (selectingForIndex !== null) {
      updateOrderItem(selectingForIndex, 'product_id', product.id);
      
      // Show warning if stock is low but allowed
      if (allowOrdersWithoutStock && product.stock <= 0) {
        console.warn(`Producto "${product.name}" agregado sin stock disponible`);
      }
    }
    setProductSelectorOpen(false);
    setSelectingForIndex(null);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-xl p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-5xl my-8">
        {/* Fixed Header */}
        <div className="sticky top-0 bg-background border-b border-current/10 px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-foreground">Crear Nuevo Pedido</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cliente (Opcional)
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Seleccionar cliente...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.email && `(${customer.email})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-foreground">
                  Artículos del Pedido
                </label>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Artículo
                </button>
              </div>

              <div className="space-y-3">
                {orderItems.map((item, index) => {
                  const selectedProduct = products.find(p => p.id === item.product_id);
                  const itemTotal = (item.unit_price || selectedProduct?.price || 0) * item.quantity;

                  return (
                    <div key={index} className="bg-hover-bg p-4 rounded-lg border border-current/10">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        {/* Product Selection */}
                        <div className="lg:col-span-5">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            Producto *
                          </label>
                          <button
                            type="button"
                            onClick={() => openProductSelector(index)}
                            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-left hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                          >
                            {selectedProduct ? (
                              <div>
                                <div className="font-medium text-foreground truncate">
                                  {selectedProduct.name}
                                </div>
                                <div className="text-xs text-text-tertiary mt-0.5">
                                  S/. {selectedProduct.price.toFixed(2)} • Stock: {selectedProduct.stock}
                                  {selectedProduct.sku && ` • SKU: ${selectedProduct.sku}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-text-tertiary">Seleccionar producto...</span>
                            )}
                          </button>
                        </div>

                        {/* Variant Selection */}
                        {selectedProduct?.product_variants && selectedProduct.product_variants.length > 0 && (
                          <div className="lg:col-span-3">
                            <label className="block text-xs font-medium text-text-secondary mb-1.5">
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
                                  {variant.name} - S/. {variant.price.toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Quantity */}
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || ''}
                            onChange={(e) => updateOrderItem(index, 'quantity', e.target.value === '' ? 0 : parseInt(e.target.value))}
                            required
                            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>

                        {/* Price */}
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">
                            Precio Unit.
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price === 0 || item.unit_price === undefined ? '' : item.unit_price}
                            onChange={(e) => updateOrderItem(index, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>

                        {/* Total & Remove - Better layout on mobile */}
                        <div className="lg:col-span-12 flex items-center justify-between gap-3 pt-2 border-t border-current/10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-text-secondary">Total del artículo:</span>
                            <span className="text-sm font-bold text-primary">S/. {itemTotal.toFixed(2)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {orderItems.length === 0 && (
                  <div className="text-center py-12 text-text-secondary bg-hover-bg rounded-lg border border-dashed border-current/20">
                    <p className="mb-2">No hay artículos en el pedido</p>
                    <p className="text-sm">Haz clic en "Agregar Artículo" para comenzar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Total */}
            {orderItems.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total del Pedido:</span>
                  <span className="text-2xl font-bold text-primary">S/. {calculateTotal().toFixed(2)}</span>
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
                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                placeholder="Agregar notas sobre el pedido..."
              />
            </div>

            {/* Dynamic Fields Section */}
            {(formData.payment_proof_url !== undefined || fieldDefinitions.length > 0) && (
              <div className="border-t border-current/10 pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Información Adicional</h3>
                
                {/* Payment Proof */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Comprobante de Pago
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLoading(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const response = await fetch('/api/orders/upload', {
                              method: 'POST',
                              body: formData
                            });
                            const data = await response.json();
                            setFormData(prev => ({ ...prev, payment_proof_url: data.url }));
                          } catch (error) {
                            alert('Error al subir el archivo');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                    />
                    {formData.payment_proof_url && (
                      <span className="text-sm text-green-600 flex items-center gap-1 whitespace-nowrap">
                        ✓ Archivo subido
                      </span>
                    )}
                  </div>
                </div>

                {/* Custom Fields */}
                {fieldDefinitions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fieldDefinitions.map((field) => {
                      const fieldValue = formData.custom_fields?.[field.name] || field.default_value || '';
                      
                      return (
                        <div key={field.id} className={field.type === 'checkbox' ? 'md:col-span-2' : ''}>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          
                          {/* SELECT field */}
                          {field.type === 'select' && (
                            <select
                              required={field.required}
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                custom_fields: { ...prev.custom_fields, [field.name]: e.target.value }
                              }))}
                              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="">Seleccionar...</option>
                              {field.options?.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}
                          
                          {/* DATE field */}
                          {field.type === 'date' && (
                            <input
                              type="date"
                              required={field.required}
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                custom_fields: { ...prev.custom_fields, [field.name]: e.target.value }
                              }))}
                              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          )}
                          
                          {/* NUMBER field */}
                          {field.type === 'number' && (
                            <input
                              type="number"
                              step="any"
                              required={field.required}
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                custom_fields: { ...prev.custom_fields, [field.name]: e.target.value }
                              }))}
                              placeholder={`Ingrese ${field.label?.toLowerCase() || 'número'}`}
                              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          )}
                          
                          {/* TEXT field */}
                          {field.type === 'text' && (
                            <input
                              type="text"
                              required={field.required}
                              value={fieldValue}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                custom_fields: { ...prev.custom_fields, [field.name]: e.target.value }
                              }))}
                              placeholder={`Ingrese ${field.label?.toLowerCase() || 'texto'}`}
                              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          )}
                          
                          {/* CHECKBOX field */}
                          {field.type === 'checkbox' && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-hover-bg border border-input-border rounded-lg">
                              <input
                                type="checkbox"
                                id={`field-${field.id}`}
                                required={field.required}
                                checked={fieldValue === 'true' || fieldValue === true}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  custom_fields: { ...prev.custom_fields, [field.name]: e.target.checked.toString() }
                                }))}
                                className="w-5 h-5 text-primary bg-input-bg border-input-border rounded focus:ring-2 focus:ring-primary/50"
                              />
                              <label htmlFor={`field-${field.id}`} className="text-sm text-foreground cursor-pointer flex-1">
                                {field.label || field.name}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="sticky bottom-0 bg-background border-t border-current/10 px-6 py-4 rounded-b-xl flex flex-col-reverse sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || orderItems.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creando...' : 'Crear Pedido'}
          </button>
        </div>

        {/* Product Selector Modal */}
        <ProductSelectorModal
          show={productSelectorOpen}
          products={products}
          selectedProductId={
            selectingForIndex !== null 
              ? orderItems[selectingForIndex]?.product_id 
              : undefined
          }
          onSelect={handleProductSelect}
          onClose={() => {
            setProductSelectorOpen(false);
            setSelectingForIndex(null);
          }}
        />
      </div>
    </div>
  );
}