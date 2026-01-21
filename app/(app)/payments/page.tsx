"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Download,
  Search,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  CreditCard,
  Loader2,
  FileText,
  RefreshCw,
  TrendingUp,
  Package,
  Banknote,
  Edit,
} from "lucide-react";
import {
  SiPaypal,
  SiVisa,
  SiMastercard,
} from "react-icons/si";
import { PaymentWithRelations, PaymentStatus, PaymentMethod } from "@/app/types/payments";
import PaymentForm from "./components/PaymentForm";
import ReceiptModal from "./components/ReceiptModal";
import EditPaymentStatus from "./components/EditPaymentStatus";
import ConfirmDialog from "./components/ConfirmDialog";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";

export default function PaymentsPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean; paymentId: string | null}>({isOpen: false, paymentId: null});
  const [paymentStats, setPaymentStats] = useState({
    total_revenue: 0,
    total_payments: 0,
    pending_amount: 0,
    refunded_amount: 0
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchPayments();
    }
  }, [currentWorkspace, statusFilter, methodFilter, dateFrom, dateTo]);

  const fetchPayments = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('workspace_id', currentWorkspace.id);
      params.append('page_size', '100');
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (methodFilter !== 'all') {
        params.append('payment_method', methodFilter);
      }
      if (dateFrom) {
        params.append('date_from', dateFrom);
      }
      if (dateTo) {
        params.append('date_to', dateTo);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/payments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      
      // Calculate stats
      calculateStats(data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: PaymentWithRelations[]) => {
    const stats = {
      total_revenue: paymentsData.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
      total_payments: paymentsData.filter(p => p.status === 'completed').length,
      pending_amount: paymentsData.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
      refunded_amount: paymentsData.filter(p => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0)
    };
    setPaymentStats(stats);
  };

  const handleSearch = () => {
    fetchPayments();
  };

  const handleDeletePayment = async () => {
    if (!deleteConfirm.paymentId) return;

    try {
      const response = await fetch(`/api/payments/${deleteConfirm.paymentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPayments();
        setDeleteConfirm({isOpen: false, paymentId: null});
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      setDeleteConfirm({isOpen: false, paymentId: null});
    }
  };



  const handleViewReceipt = (payment: PaymentWithRelations) => {
    try {
      // Get workspace name
      const workspaceName = currentWorkspace?.name || 'Mi Empresa';
      
      // Generate receipt number (simple client-side generation)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const receiptNumber = `REC-${dateStr}-${randomNum}`;
      
      // Prepare receipt data
      const receiptData = {
        id: payment.id,
        payment_id: payment.id,
        receipt_number: receiptNumber,
        generated_at: now.toISOString(),
        receipt_data: {
          payment: {
            payment_number: payment.payment_number,
            amount: payment.amount,
            currency: payment.currency,
            payment_method: payment.payment_method,
            payment_date: payment.payment_date,
            transaction_id: payment.transaction_id,
            reference_number: payment.reference_number,
            card_brand: payment.card_brand
          },
          order: payment.orders ? {
            order_number: payment.orders.order_number,
            order_date: (payment.orders as any).order_date || payment.payment_date,
            total_amount: payment.orders.total_amount,
            items: (payment.orders as any).order_items || []
          } : null,
          customer: payment.customers ? {
            name: payment.customers.name,
            email: payment.customers.email,
            phone: payment.customers.phone,
            document: (payment.customers as any).document || ''
          } : null,
          workspace: {
            name: workspaceName
          },
          generated_by: 'Sistema',
          generated_at: now.toISOString()
        }
      };
      
      setViewingReceipt(receiptData);
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Error al generar la boleta. Por favor intenta de nuevo.');
    }
  };

  const statsDisplay = [
    {
      title: "Ingresos Totales",
      value: `$${paymentStats.total_revenue.toFixed(2)}`,
      change: "+12.5%",
      icon: DollarSign,
      color: "text-primary"
    },
    {
      title: "Transacciones",
      value: paymentStats.total_payments.toString(),
      change: "+8%",
      icon: CreditCard,
      color: "text-green-500"
    },
    {
      title: "Pendientes",
      value: `$${paymentStats.pending_amount.toFixed(2)}`,
      change: "-5%",
      icon: Clock,
      color: "text-yellow-500"
    },
    {
      title: "Reembolsos",
      value: `$${paymentStats.refunded_amount.toFixed(2)}`,
      change: "+3%",
      icon: RefreshCw,
      color: "text-red-500"
    }
  ];

  const getStatusBadge = (status: PaymentStatus) => {
    const statusConfig = {
      pending: {
        label: "Pendiente",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        icon: Clock
      },
      completed: {
        label: "Completado",
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        icon: CheckCircle
      },
      failed: {
        label: "Fallido",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        icon: XCircle
      },
      refunded: {
        label: "Reembolsado",
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        icon: RefreshCw
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getMethodIcon = (method: PaymentMethod, cardBrand?: string | null) => {
    if (method === "card" && cardBrand) {
      switch (cardBrand.toLowerCase()) {
        case "visa":
          return <SiVisa className="w-5 h-5 text-blue-600" />;
        case "mastercard":
          return <SiMastercard className="w-5 h-5 text-orange-600" />;
        default:
          return <CreditCard className="w-5 h-5 text-text-secondary" />;
      }
    }
    switch (method) {
      case "paypal":
        return <SiPaypal className="w-5 h-5 text-blue-600" />;
      case "transfer":
        return <CreditCard className="w-5 h-5 text-text-secondary" />;
      case "cash":
        return <Banknote className="w-5 h-5 text-green-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-text-secondary" />;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.customers?.name && payment.customers.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pagos</h1>
            <p className="text-text-secondary mt-1">Gestiona todos los pagos y genera boletas</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsDisplay.map((stat, index) => (
            <div
              key={index}
              className="bg-background rounded-xl p-6 border border-current/20 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                  <p className="text-sm text-green-500 mt-1">{stat.change} vs mes anterior</p>
                </div>
                <div className={`p-3 rounded-lg bg-primary/10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Section */}
        <div className="bg-background rounded-xl p-6 border border-current/20">
          <h3 className="text-sm font-semibold text-foreground mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Número de pago, transacción, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="failed">Fallido</option>
                <option value="refunded">Reembolsado</option>
              </select>
            </div>

            {/* Method Filter */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Método
              </label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="all">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="paypal">PayPal</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            {/* Actions */}
            <div className="lg:col-span-2 flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
              
              {(statusFilter !== 'all' || methodFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setMethodFilter('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  title="Limpiar filtros"
                >
                  <XCircle className="w-4 h-4" />
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <button 
              onClick={() => setShowPaymentForm(true)}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Pago</span>
            </button>
          </div>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="bg-background rounded-xl border border-current/20 p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredPayments.length > 0 ? (
          <div className="bg-background rounded-xl border border-current/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-hover-bg border-b border-current/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-hover-bg transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{payment.payment_number}</p>
                            {payment.transaction_id && (
                              <p className="text-xs text-text-secondary">{payment.transaction_id}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {payment.orders ? (
                          <button
                            onClick={() => router.push(`/orders/${payment.orders?.id}`)}
                            className="text-sm text-primary hover:underline"
                          >
                            {payment.orders?.order_number}
                          </button>
                        ) : (
                          <span className="text-sm text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {payment.customers?.name || 'Sin cliente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-foreground">
                          {payment.currency} {payment.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(payment.payment_method, payment.card_brand)}
                          <span className="text-sm text-foreground capitalize">
                            {payment.payment_method === 'card' && payment.card_brand
                              ? payment.card_brand
                              : payment.payment_method}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                        {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleViewReceipt(payment)}
                            className="p-1.5 hover:bg-hover-bg rounded transition-colors" 
                            title="Ver boleta"
                          >
                            <FileText className="w-4 h-4 text-text-secondary" />
                          </button>
                          <button 
                            onClick={() => setEditingPayment(payment)}
                            className="p-1.5 hover:bg-hover-bg rounded transition-colors" 
                            title="Editar estado"
                          >
                            <Edit className="w-4 h-4 text-text-secondary" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({isOpen: true, paymentId: payment.id})}
                            className="p-1.5 hover:bg-hover-bg rounded transition-colors" 
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-current/20 flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Mostrando <span className="font-medium text-foreground">{filteredPayments.length}</span> de{" "}
                <span className="font-medium text-foreground">{payments.length}</span> pagos
              </p>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-background rounded-xl border border-current/20 p-12">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No se encontraron pagos
              </h2>
              <p className="text-text-secondary mb-6">
                {searchTerm || statusFilter !== "all" || methodFilter !== "all"
                  ? "Intenta ajustar tus filtros de búsqueda"
                  : "Comienza registrando tu primer pago"}
              </p>
              <button 
                onClick={() => setShowPaymentForm(true)}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Registrar Primer Pago</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentForm
          onClose={() => setShowPaymentForm(false)}
          onSuccess={() => {
            fetchPayments();
            setShowPaymentForm(false);
          }}
        />
      )}

      {/* Receipt Modal */}
      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Edit Payment Status Modal */}
      {editingPayment && (
        <EditPaymentStatus
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSuccess={() => {
            fetchPayments();
            setEditingPayment(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Pago"
        message="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeletePayment}
        onCancel={() => setDeleteConfirm({isOpen: false, paymentId: null})}
        variant="danger"
      />
    </div>
  );
}
