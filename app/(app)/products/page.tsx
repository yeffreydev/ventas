'use client';

import { Button, TextInput, Select } from "flowbite-react";
import { HiPlus, HiDownload, HiPencil, HiTrash, HiCheck, HiTag } from "react-icons/hi";
import { HiOutlinePlayCircle } from "react-icons/hi2";
import { useState, useEffect } from "react";
import ProductForm from "./components/ProductForm";
import CategoryManager from "./components/CategoryManager";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface ProductVariant {
  id?: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Product {
  id?: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock?: number;
  image_url?: string;
  category_id?: string;
  category?: Category;
  variants?: ProductVariant[];
  product_variants?: ProductVariant[];
  active?: boolean;
  store?: string;
  group?: string;
}

export default function ProductsPage() {
  const { currentWorkspace } = useWorkspace();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filtros
  const [searchProduct, setSearchProduct] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      fetchProducts();
      fetchCategories();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    applyFilters();
  }, [products, searchProduct, categoryFilter, quantity, priceFrom, priceTo]);

  const fetchCategories = async () => {
    if (!currentWorkspace) return;
    
    try {
      const response = await fetch(`/api/categories?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/products?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((p: any) => ({
          ...p,
          variants: p.product_variants,
          category: p.product_categories,
          active: true,
          store: 'arellanorivero',
          group: '-'
        }));
        setProducts(mappedData);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar productos');
        console.error('Error fetching products:', errorData);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Error de conexión al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Filtro por nombre de producto
    if (searchProduct) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchProduct.toLowerCase())
      );
    }

    // Filtro por categoría
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category_id === categoryFilter);
    }

    // Filtro por cantidad mínima
    if (quantity) {
      filtered = filtered.filter(p => (p.stock || 0) >= parseInt(quantity));
    }

    // Filtro por precio
    if (priceFrom) {
      filtered = filtered.filter(p => p.price >= parseFloat(priceFrom));
    }
    if (priceTo) {
      filtered = filtered.filter(p => p.price <= parseFloat(priceTo));
    }

    setFilteredProducts(filtered);
  };

  const handleCreateProduct = async (product: Product) => {
    if (!currentWorkspace) {
      console.error('No workspace selected');
      throw new Error('No workspace selected');
    }

    try {
      const productWithWorkspace = {
        ...product,
        workspace_id: currentWorkspace.id
      };

      console.log('[handleCreateProduct] Sending product:', productWithWorkspace);

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productWithWorkspace),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[handleCreateProduct] Error response:', error);
        throw new Error(error.error || 'Error creating product');
      }

      await fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const handleUpdateProduct = async (product: Product) => {
    if (!product.id || !currentWorkspace) return;

    try {
      const productWithWorkspace = {
        ...product,
        workspace_id: currentWorkspace.id
      };

      console.log('[handleUpdateProduct] Sending product:', productWithWorkspace);

      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productWithWorkspace),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[handleUpdateProduct] Error response:', error);
        throw new Error(error.error || 'Error updating product');
      }

      await fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleNewClick = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (product: Product) => {
    if (editingProduct) {
      await handleUpdateProduct({ ...product, id: editingProduct.id });
    } else {
      await handleCreateProduct(product);
    }
  };

  const clearFilters = () => {
    setSearchProduct('');
    setCategoryFilter('');
    setQuantity('');
    setPriceFrom('');
    setPriceTo('');
  };

  // Listen for the add product event from layout
  useEffect(() => {
    const handleOpenForm = () => {
      setEditingProduct(null);
      setShowForm(true);
    };
    
    window.addEventListener('openProductForm', handleOpenForm);
    return () => window.removeEventListener('openProductForm', handleOpenForm);
  }, []);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-background rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Producto</label>
            <TextInput
              placeholder="Buscar producto..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Categoría</label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Cantidad mínima</label>
            <TextInput
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Precio S/</label>
            <div className="flex gap-2 items-center">
              <TextInput
                type="number"
                placeholder="Min"
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                className="w-full"
              />
              <span className="text-text-secondary">-</span>
              <TextInput
                type="number"
                placeholder="Max"
                value={priceTo}
                onChange={(e) => setPriceTo(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button color="blue" className="flex-1" onClick={applyFilters}>
              Buscar
            </Button>
            <Button color="light" outline onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-600">
              <p className="text-lg font-semibold mb-2">Ocurrió un error</p>
              <p>{error}</p>
              <Button color="gray" className="mt-4" onClick={fetchProducts}>
                Intentar de nuevo
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-background rounded-lg border border-border">
              <p className="text-text-secondary mb-4">No se encontraron productos</p>
              <Button color="blue" onClick={handleNewClick}>
                <HiPlus className="mr-2 h-5 w-5" />
                Agregar producto
              </Button>
            </div>
          ) : (
            <div className="bg-background rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hover-bg border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Foto</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Categoría</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Actividad</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Precio</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-hover-bg transition-colors">
                        <td className="px-6 py-4">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">📦</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-text-secondary">SKU: {product.sku}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {product.category ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: product.category.color }}
                              />
                              <span className="text-sm text-foreground">{product.category.name}</span>
                            </div>
                          ) : (
                            <span className="text-text-secondary text-sm">Sin categoría</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {product.active ? (
                            <HiCheck className="w-6 h-6 text-blue-600" />
                          ) : (
                            <span className="text-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">{product.stock || 0}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">
                          S/. {product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(product)}
                              className="p-2 text-text-secondary hover:text-primary transition-colors"
                              title="Editar"
                            >
                              <HiPencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => product.id && handleDeleteProduct(product.id)}
                              className="p-2 text-text-secondary hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <HiTrash className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

      <ProductForm
        show={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        initialData={editingProduct}
      />

      <CategoryManager
        show={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoryChange={fetchCategories}
      />
    </div>
  );
}
