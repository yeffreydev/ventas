'use client';

import { useState, useEffect } from "react";
import { HiX, HiExclamationCircle, HiPlus, HiTrash } from "react-icons/hi";
import { createClient } from "@/app/utils/supabase/client";
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
  variants?: ProductVariant[];
}

interface ProductFormProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (product: Product) => Promise<void>;
  initialData?: Product | null;
}

export default function ProductForm({ show, onClose, onSubmit, initialData }: ProductFormProps) {
  const { currentWorkspace } = useWorkspace();
  const [formData, setFormData] = useState<Product>({
    name: '',
    description: '',
    price: 0,
    sku: '',
    stock: 0,
    image_url: '',
    category_id: '',
    variants: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newVariant, setNewVariant] = useState<ProductVariant>({
    name: '',
    price: 0,
    stock: 0,
    sku: ''
  });

  const supabase = createClient();

  useEffect(() => {
    if (currentWorkspace && show) {
      fetchCategories();
    }
  }, [currentWorkspace, show]);

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

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        variants: initialData.variants || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        sku: '',
        stock: 0,
        image_url: '',
        category_id: '',
        variants: []
      });
    }
  }, [initialData, show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? (value === '' ? 0 : parseFloat(value) || 0) : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      
      setFormData(prev => ({
        ...prev,
        image_url: data.publicUrl
      }));
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddVariant = () => {
    if (!newVariant.name) return;
    
    setFormData(prev => ({
      ...prev,
      variants: [...(prev.variants || []), { ...newVariant, price: newVariant.price || prev.price }]
    }));
    
    setNewVariant({
      name: '',
      price: 0,
      stock: 0,
      sku: ''
    });
  };

  const handleRemoveVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.filter((_, i) => i !== index)
    }));
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
      <div className="card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-current/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-current/20 bg-background">
          <h3 className="text-2xl font-bold text-foreground">
            {initialData ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-foreground transition-colors"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <HiExclamationCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                    Nombre del producto *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Ej. Camiseta de algodón"
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-semibold text-foreground mb-2">
                      Precio *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">S/.</span>
                      </div>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={handleChange}
                        required
                        className="w-full pl-9 px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="stock" className="block text-sm font-semibold text-foreground mb-2">
                      Stock
                    </label>
                    <input
                      id="stock"
                      name="stock"
                      type="number"
                      value={formData.stock === 0 ? '' : formData.stock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sku" className="block text-sm font-semibold text-foreground mb-2">
                    SKU (Código)
                  </label>
                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    value={formData.sku || ''}
                    onChange={handleChange}
                    placeholder="Ej. CAM-001"
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-foreground mb-2">
                    Categoría
                  </label>
                  <select
                    id="category"
                    name="category_id"
                    value={formData.category_id || ''}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Imagen del producto
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-input-border rounded-lg cursor-pointer bg-input-bg hover:bg-hover-bg transition-colors">
                      {formData.image_url ? (
                        <img src={formData.image_url} alt="Preview" className="h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-text-tertiary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-2 text-sm text-text-secondary"><span className="font-semibold">Click para subir</span></p>
                          <p className="text-xs text-text-tertiary">PNG, JPG or GIF</p>
                        </div>
                      )}
                      <input id="dropzone-file" type="file" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                  </div>
                  {uploading && <p className="text-sm text-primary mt-2">Subiendo imagen...</p>}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-foreground mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Descripción detallada del producto..."
                rows={3}
                className="w-full px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* Variants Section */}
            <div className="border-t border-current/20 pt-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Variaciones</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-hover-bg rounded-lg">
                <input
                  type="text"
                  placeholder="Nombre (ej. Talla L)"
                  value={newVariant.name}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground text-sm"
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={newVariant.price === 0 ? '' : newVariant.price}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, price: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                  className="px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground text-sm"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={newVariant.stock === 0 ? '' : newVariant.stock}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, stock: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                  className="px-3 py-2 border border-input-border rounded-lg bg-input-bg text-foreground text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
                >
                  <HiPlus className="inline mr-1" /> Agregar
                </button>
              </div>

              {formData.variants && formData.variants.length > 0 && (
                <div className="space-y-2">
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-current/20 rounded-lg bg-background">
                      <div className="flex gap-4">
                        <span className="font-medium text-foreground">{variant.name}</span>
                        <span className="text-text-secondary">S/. {variant.price}</span>
                        <span className="text-text-secondary">Stock: {variant.stock}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-current/20">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 cursor-pointer bg-text-secondary dark:bg-border text-foreground rounded-lg hover:bg-text-tertiary dark:hover:bg-border/80 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="px-6 py-2 cursor-pointer bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? 'Guardando...' : initialData ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}