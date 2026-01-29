"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import { createClient } from "@/app/utils/supabase/client";
import { HiUpload, HiTrash, HiSave } from "react-icons/hi";

export default function BusinessConfigPage() {
  const { currentWorkspace, updateWorkspace, refreshWorkspaces } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || "");
      setImageUrl(currentWorkspace.image_url || null);
    }
  }, [currentWorkspace]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '')) {
      setMessage({ type: "error", text: "Formato de imagen no soportado. Usa JPG, PNG, GIF o WEBP." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      setMessage({ type: "error", text: "La imagen es demasiado grande. Máximo 2MB." });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      const fileName = `${currentWorkspace?.id}/${Date.now()}.${fileExt}`;
      const bucket = 'workspace-images';

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // 3. Update Workspace
      setImageUrl(publicUrl);
      
      // Save image immediately to ensure URL is persisted
      if (currentWorkspace?.id) {
          await updateWorkspace(currentWorkspace.id, { image_url: publicUrl });
          
          // Force refresh to update all UI components including layout menu
          await refreshWorkspaces();
          
          setMessage({ type: "success", text: "Imagen actualizada correctamente. Se verá reflejada en todo el sistema." });
      }

    } catch (error: any) {
      console.error("Error uploading image:", error);
      setMessage({ type: "error", text: "Error al subir la imagen: " + error.message });
      setImageUrl(currentWorkspace?.image_url || null); // Revert
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    try {
      setIsLoading(true);
      setMessage(null);

      await updateWorkspace(currentWorkspace.id, {
        name,
        description,
        // image_url is already handled, but send it again if changed manually? No need.
      });

      setMessage({ type: "success", text: "Información del negocio actualizada" });
    } catch (error: any) {
      console.error("Error updating workspace:", error);
      setMessage({ type: "error", text: "Error al actualizar: " + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentWorkspace) return <div>Cargando...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span>🏢</span> Perfil del Negocio
        </h2>

        {message && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          
          {/* Image Upload Section */}
          <div className="flex flex-col sm:flex-row items-start gap-6 pb-8 border-b border-border">
            <div className="w-32 h-32 relative rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0 group">
              {imageUrl ? (
                <img 
                  src={`${imageUrl}?t=${Date.now()}`}
                  alt="Workspace Logo" 
                  className="w-full h-full object-cover"
                  key={imageUrl}
                />
              ) : (
                <span className="text-gray-400 text-4xl">🏢</span>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-800"
                    title="Cambiar imagen"
                    type="button"
                >
                    <HiUpload className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">Logotipo del Negocio</h3>
                <p className="text-sm text-text-secondary mb-4">
                    Sube una imagen representativa para tu negocio. Se recomienda 400x400px.
                </p>
                
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    {uploading ? "Subiendo..." : "Subir nueva imagen"}
                </button>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Nombre del Negocio
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                placeholder="Ej. Mi Empresa S.A."
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent bg-white resize-none"
                placeholder="Breve descripción de tu negocio..."
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 font-medium"
              >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                    </>
                ) : (
                    <>
                        <HiSave className="w-5 h-5" />
                        Guardar Cambios
                    </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
