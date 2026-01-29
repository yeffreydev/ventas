"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Download
} from "lucide-react";
import { generateOrderPDF } from "@/app/utils/pdfGenerator";
import { OrderWithDetails, OrderStatus } from "@/app/types/orders";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;

    // Use AbortController for timeout to prevent infinite loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Tiempo de espera agotado. Por favor intente nuevamente.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel order');
      }

      router.push('/orders');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: {
        label: "Pendiente",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: Clock
      },
      processing: {
        label: "Procesando",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        icon: Package
      },
      completed: {
        label: "Completado",
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: CheckCircle
      },
      cancelled: {
        label: "Cancelado",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: XCircle
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${config.className}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-background rounded-xl border border-current/20 p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Error al cargar el pedido
            </h2>
            <p className="text-text-secondary mb-6">{error || 'Pedido no encontrado'}</p>
            <button
              onClick={() => router.push('/orders')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Volver a Pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders')}
              className="p-2 rounded-lg bg-background hover:bg-hover-bg border border-current/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Pedido {order.order_number}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Creado el {new Date(order.order_date).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => generateOrderPDF(order, currentWorkspace?.image_url, currentWorkspace?.description)}
              className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 text-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <button
                onClick={cancelOrder}
                disabled={updating}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>

        {/* Status and Actions */}
        <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-text-secondary mb-2">Estado del Pedido</p>
              {getStatusBadge(order.status)}
            </div>
            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus('processing')}
                    disabled={updating}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 text-center"
                  >
                    Marcar como Procesando
                  </button>
                )}
                {order.status === 'processing' && (
                  <button
                    onClick={() => updateOrderStatus('completed')}
                    disabled={updating}
                    className="w-full sm:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 text-center"
                  >
                    Marcar como Completado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-background rounded-xl border border-current/20 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-current/20">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Artículos del Pedido
                </h2>
              </div>
              <div className="divide-y divide-border">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 hover:bg-hover-bg transition-colors">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {item.products?.image_url && (
                        <img
                          src={item.products.image_url}
                          alt={item.product_name}
                          className="w-full sm:w-20 h-40 sm:h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{item.product_name}</h3>
                        {item.product_sku && (
                          <p className="text-sm text-text-secondary">SKU: {item.product_sku}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                          <span className="text-sm text-text-secondary">
                            Cantidad: <span className="font-medium text-foreground">{item.quantity}</span>
                          </span>
                          <span className="text-sm text-text-secondary">
                            Precio: <span className="font-medium text-foreground">S/. {item.unit_price.toFixed(2)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="sm:text-right flex items-center justify-between sm:block pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-current/20 sm:border-none">
                        <span className="sm:hidden text-sm font-medium text-text-secondary">Subtotal:</span>
                        <p className="text-lg font-semibold text-foreground">
                          S/. {item.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 sm:p-6 bg-hover-bg border-t border-current/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal:</span>
                  <span className="font-medium text-foreground">S/. {order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Descuento:</span>
                    <span className="font-medium text-green-500">- S/. {order.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Impuestos:</span>
                    <span className="font-medium text-foreground">S/. {order.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-current/20">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">S/. {order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            {order.customers && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Cliente
                </h3>
                <div className="space-y-2">
                  <p className="text-foreground font-medium">{order.customers.name}</p>
                  {order.customers.email && (
                    <p className="text-sm text-text-secondary">{order.customers.email}</p>
                  )}
                  {order.customers.identity_document_number && (
                    <p className="text-sm text-text-secondary">Doc: {order.customers.identity_document_number}</p>
                  )}
                </div>
              </div>
            )}

            {/* Shipping Address */}
            {order.shipping_address && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Dirección de Envío
                </h3>
                <div className="space-y-1 text-sm text-text-secondary">
                  {order.shipping_address.street && <p>{order.shipping_address.street}</p>}
                  {order.shipping_address.city && <p>{order.shipping_address.city}</p>}
                  {order.shipping_address.state && <p>{order.shipping_address.state}</p>}
                  {order.shipping_address.postal_code && <p>{order.shipping_address.postal_code}</p>}
                  {order.shipping_address.country && <p>{order.shipping_address.country}</p>}
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4">Notas</h3>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* Payment Proof */}
            {order.payment_proof_url && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Comprobante de Pago
                </h3>
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Ver Comprobante
                </a>
              </div>
            )}

            {/* Billing Address */}
            {order.billing_address && Object.keys(order.billing_address).length > 0 && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Dirección de Facturación
                </h3>
                <div className="space-y-1 text-sm text-text-secondary">
                  {order.billing_address.street && <p>{order.billing_address.street}</p>}
                  {order.billing_address.city && <p>{order.billing_address.city}</p>}
                  {order.billing_address.state && <p>{order.billing_address.state}</p>}
                  {order.billing_address.postal_code && <p>{order.billing_address.postal_code}</p>}
                  {order.billing_address.country && <p>{order.billing_address.country}</p>}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {order.custom_fields && Object.keys(order.custom_fields).length > 0 && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4">Campos Personalizados</h3>
                <div className="space-y-3">
                  {Object.entries(order.custom_fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start gap-4 pb-3 border-b border-current/10 last:border-0 last:pb-0">
                      <span className="text-sm font-medium text-text-secondary capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-sm text-foreground text-right">
                        {typeof value === 'boolean' 
                          ? (value ? '✓ Sí' : '✗ No')
                          : String(value || '-')
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Metadata */}
            <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Información del Pedido
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-4 pb-3 border-b border-current/10">
                  <span className="text-sm font-medium text-text-secondary">Número de Orden:</span>
                  <span className="text-sm font-mono text-foreground">{order.order_number}</span>
                </div>
                <div className="flex justify-between items-start gap-4 pb-3 border-b border-current/10">
                  <span className="text-sm font-medium text-text-secondary">Fecha de Creación:</span>
                  <span className="text-sm text-foreground">
                    {new Date(order.created_at).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {order.updated_at && order.updated_at !== order.created_at && (
                  <div className="flex justify-between items-start gap-4 pb-3 border-b border-current/10">
                    <span className="text-sm font-medium text-text-secondary">Última Actualización:</span>
                    <span className="text-sm text-foreground">
                      {new Date(order.updated_at).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-4 pb-3 border-b border-current/10">
                  <span className="text-sm font-medium text-text-secondary">Estado:</span>
                  <span className="text-sm text-foreground capitalize">{order.status}</span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-sm font-medium text-text-secondary">ID del Pedido:</span>
                  <span className="text-xs font-mono text-text-tertiary">{order.id}</span>
                </div>
              </div>
            </div>

            {/* Additional Metadata if present */}
            {order.metadata && Object.keys(order.metadata).length > 0 && (
              <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
                <h3 className="text-lg font-semibold text-foreground mb-4">Metadata Adicional</h3>
                <div className="space-y-2">
                  {Object.entries(order.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start gap-4 text-xs">
                      <span className="text-text-secondary font-mono">{key}:</span>
                      <span className="text-text-tertiary font-mono text-right break-all">
                        {JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
           <div className="flex gap-4 items-center">
             <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
             <div className="space-y-2">
               <Skeleton className="h-8 w-48" />
               <Skeleton className="h-4 w-32" />
             </div>
           </div>
           <div className="flex gap-3">
             <Skeleton className="h-10 w-32 rounded-lg" />
             <Skeleton className="h-10 w-32 rounded-lg" />
           </div>
        </div>
        
        {/* Status Skeleton */}
        <Skeleton className="h-24 w-full rounded-xl" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Items Skeleton */}
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-background rounded-xl border border-current/20 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-current/20">
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="p-4 sm:p-6 space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              </div>
           </div>
           
           {/* Sidebar Skeletons */}
           <div className="space-y-6">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
           </div>
        </div>
      </div>
    </div>
  );
}