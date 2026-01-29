'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '@/app/providers/WorkspaceProvider';
import { Package, AlertTriangle, Save, Loader2 } from 'lucide-react';

interface WorkspaceSettings {
  id: string;
  name: string;
  default_min_stock_alert: number;
  allow_orders_without_stock: boolean;
}

export default function StockConfigPage() {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      fetchSettings();
    }
  }, [currentWorkspace]);

  const fetchSettings = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/settings`);
      
      if (!response.ok) {
        throw new Error('Error al cargar configuración');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace || !settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          default_min_stock_alert: settings.default_min_stock_alert,
          allow_orders_without_stock: settings.allow_orders_without_stock,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuración');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      setSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-text-secondary">
        <Package className="w-16 h-16 mb-4 opacity-50" />
        <p>No se pudo cargar la configuración</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración de Stock</h1>
          <p className="text-text-secondary">Administra las alertas y reglas de inventario</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="w-5 h-5 text-green-600 dark:text-green-400">✓</div>
          <span className="text-green-700 dark:text-green-300 text-sm">
            Configuración guardada exitosamente
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Default Stock Alert Section */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Alerta de Stock por Defecto
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Este valor se aplica a productos nuevos que no tienen una alerta específica configurada.
          </p>

          <div className="max-w-md">
            <label htmlFor="default_min_stock_alert" className="block text-sm font-medium text-foreground mb-2">
              Umbral de Stock Mínimo (unidades)
            </label>
            <input
              id="default_min_stock_alert"
              type="number"
              min="0"
              value={settings.default_min_stock_alert}
              onChange={(e) => setSettings({
                ...settings,
                default_min_stock_alert: parseInt(e.target.value) || 0
              })}
              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-text-tertiary mt-2">
              Los productos mostrarán una alerta cuando su stock sea menor o igual a este valor
            </p>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 bg-hover-bg rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground mb-2">Vista previa:</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Stock: 50</span>
                <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  Normal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  Stock: {settings.default_min_stock_alert}
                </span>
                <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                  ⚠️ Bajo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Stock: 0</span>
                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  ⚠️ Sin stock
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Allow Orders Without Stock Section */}
        <div className="bg-background border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Pedidos sin Stock
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Controla si se pueden crear pedidos cuando los productos no tienen stock disponible.
          </p>

          <div className="flex items-start gap-4 p-4 bg-hover-bg rounded-lg">
            <div className="flex-1">
              <label htmlFor="allow_orders_without_stock" className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    id="allow_orders_without_stock"
                    type="checkbox"
                    checked={settings.allow_orders_without_stock}
                    onChange={(e) => setSettings({
                      ...settings,
                      allow_orders_without_stock: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                  <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-7"></div>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {settings.allow_orders_without_stock ? 'Permitir pedidos sin stock' : 'No permitir pedidos sin stock'}
                  </span>
                  <p className="text-xs text-text-tertiary mt-1">
                    {settings.allow_orders_without_stock
                      ? 'Se pueden crear pedidos aunque no haya stock disponible'
                      : 'Se validará el stock antes de permitir crear pedidos'
                    }
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Warning when enabled */}
          {settings.allow_orders_without_stock && (
            <div className="mt-4 flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium mb-1">Advertencia</p>
                <p>
                  Al permitir pedidos sin stock, podrías crear órdenes que no podrás cumplir inmediatamente.
                  Asegúrate de tener un proceso para manejar pedidos pendientes de inventario.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
