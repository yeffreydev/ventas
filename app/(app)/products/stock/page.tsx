"use client";

import { useState, useEffect } from "react";
import {
  HiPlus,
  HiRefresh,
  HiX,
  HiCube,
  HiArrowUp,
  HiArrowDown,
  HiAdjustments,
  HiFilter,
  HiSearch,
} from "react-icons/hi";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface Product {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  price: number;
  image_url?: string;
  product_categories?: {
    id: string;
    name: string;
    color: string;
  };
}

interface StockMovement {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    sku?: string;
  };
  movement_type: "in" | "out" | "adjustment";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  notes?: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

type TabType = "inventory" | "movements";

export default function StockPage() {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabType>("inventory");
  const [loading, setLoading] = useState(false);
  
  // Inventory state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  // Movements state
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedMovementType, setSelectedMovementType] = useState("");

  // Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"in" | "out" | "adjustment">("in");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      fetchCategories();
      if (activeTab === "inventory") {
        fetchProducts();
      } else {
        fetchMovements();
      }
    }
  }, [currentWorkspace, activeTab]);

  useEffect(() => {
    if (activeTab === "inventory") {
      fetchProducts();
    }
  }, [searchProduct, selectedCategory, showLowStock]);

  const fetchCategories = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/categories?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      let url = `/api/stock/products?workspace_id=${currentWorkspace.id}`;
      if (selectedCategory) url += `&category_id=${selectedCategory}`;
      if (showLowStock) url += `&low_stock=true`;
      if (searchProduct) url += `&search=${encodeURIComponent(searchProduct)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      let url = `/api/stock?workspace_id=${currentWorkspace.id}`;
      if (selectedProduct) url += `&product_id=${selectedProduct}`;
      if (selectedMovementType) url += `&movement_type=${selectedMovementType}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustmentType("in");
    setAdjustmentQuantity("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setShowAdjustModal(true);
  };

  const handleCloseModal = () => {
    setShowAdjustModal(false);
    setAdjustingProduct(null);
    setAdjustmentQuantity("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || !currentWorkspace || !adjustmentQuantity) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: adjustingProduct.id,
          workspace_id: currentWorkspace.id,
          movement_type: adjustmentType,
          quantity: parseInt(adjustmentQuantity),
          reason: adjustmentReason || null,
          notes: adjustmentNotes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al ajustar stock");
      }

      await fetchProducts();
      await fetchMovements();
      handleCloseModal();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case "in": return "Entrada";
      case "out": return "Salida";
      case "adjustment": return "Ajuste";
      default: return type;
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in": return <HiArrowUp className="w-4 h-4 text-green-600" />;
      case "out": return <HiArrowDown className="w-4 h-4 text-red-600" />;
      case "adjustment": return <HiAdjustments className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "inventory"
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-hover-bg"
            }`}
          >
            <HiCube className="inline mr-2 w-4 h-4" />
            Inventario
          </button>
          <button
            onClick={() => setActiveTab("movements")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "movements"
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-hover-bg"
            }`}
          >
            <HiAdjustments className="inline mr-2 w-4 h-4" />
            Movimientos
          </button>
        </div>

        <button
          onClick={activeTab === "inventory" ? fetchProducts : fetchMovements}
          disabled={loading}
          className="p-2 text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors disabled:opacity-50"
          title="Actualizar"
        >
          <HiRefresh className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  <HiSearch className="inline mr-1 w-4 h-4" />
                  Buscar Producto
                </label>
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Nombre o SKU..."
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <HiFilter className="inline mr-1 w-4 h-4" />
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Todas</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Stock Bajo (≤10)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Products Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-background border border-dashed border-border rounded-lg">
              <HiCube className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No se encontraron productos</p>
            </div>
          ) : (
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hover-bg border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">
                        Stock Actual
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-hover-bg transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                <HiCube className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{product.name}</p>
                              {product.sku && (
                                <p className="text-xs text-text-secondary">SKU: {product.sku}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {product.product_categories ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${product.product_categories.color}20`,
                                color: product.product_categories.color,
                              }}
                            >
                              {product.product_categories.name}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">Sin categoría</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold ${
                              product.stock <= 10
                                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                                : product.stock <= 50
                                ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                                : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenAdjust(product)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <HiAdjustments className="w-3.5 h-3.5" />
                            Ajustar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Producto
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => {
                    setSelectedProduct(e.target.value);
                    fetchMovements();
                  }}
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Todos los productos</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Movimiento
                </label>
                <select
                  value={selectedMovementType}
                  onChange={(e) => {
                    setSelectedMovementType(e.target.value);
                    fetchMovements();
                  }}
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Todos</option>
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                  <option value="adjustment">Ajuste</option>
                </select>
              </div>
            </div>
          </div>

          {/* Movements Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 bg-background border border-dashed border-border rounded-lg">
              <HiAdjustments className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No hay movimientos de stock registrados</p>
            </div>
          ) : (
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hover-bg border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">
                        Cantidad
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">
                        Stock Anterior
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">
                        Stock Nuevo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Razón/Notas
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-hover-bg transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">
                            {movement.products.name}
                          </p>
                          {movement.products.sku && (
                            <p className="text-xs text-text-secondary">
                              SKU: {movement.products.sku}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.movement_type)}
                            <span className="text-sm text-foreground">
                              {getMovementTypeLabel(movement.movement_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">
                            {movement.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-text-secondary">
                            {movement.previous_stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-foreground">
                            {movement.new_stock}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground">{movement.reason || "-"}</p>
                          {movement.notes && (
                            <p className="text-xs text-text-secondary">{movement.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-text-secondary">
                            {formatDate(movement.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-md w-full shadow-2xl border border-border">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Ajustar Stock</h3>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-foreground">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4">
              <div className="bg-hover-bg rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">{adjustingProduct.name}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Stock actual: <span className="font-semibold">{adjustingProduct.stock}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "in", label: "Entrada", icon: HiArrowUp, color: "green" },
                    { value: "out", label: "Salida", icon: HiArrowDown, color: "red" },
                    { value: "adjustment", label: "Ajuste", icon: HiAdjustments, color: "blue" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAdjustmentType(type.value as any)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        adjustmentType === type.value
                          ? `border-${type.color}-600 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <type.icon className={`w-5 h-5 text-${type.color}-600`} />
                      <span className="text-xs font-medium text-foreground">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {adjustmentType === "adjustment" ? "Nuevo Stock *" : "Cantidad *"}
                </label>
                <input
                  type="number"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  placeholder={adjustmentType === "adjustment" ? "Ej. 100" : "Ej. 50"}
                  min="1"
                  required
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Razón
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccionar razón</option>
                  <option value="Compra">Compra</option>
                  <option value="Venta">Venta</option>
                  <option value="Devolución">Devolución</option>
                  <option value="Dañado">Dañado/Perdido</option>
                  <option value="Inventario">Conteo de Inventario</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Información adicional..."
                  rows={2}
                  className="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!adjustmentQuantity || isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  )}
                  Aplicar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
