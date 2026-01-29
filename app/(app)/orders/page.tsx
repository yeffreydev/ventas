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
  Package,
  DollarSign,
  ShoppingCart,
  Loader2,
  Edit,
  Settings
} from "lucide-react";
import { OrderWithCustomer, OrderStatus, OrderWithDetails } from "@/app/types/orders";
import OrderForm from "./components/OrderForm";
import EditOrderModal from "./components/EditOrderModal";
import CustomFieldsModal from "./components/CustomFieldsModal";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import { createClient } from "@/app/utils/supabase/client";
import DeleteOrderModal from "./components/DeleteOrderModal";

export default function OrdersPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  // State for delete confirmation
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [viewingCustomFields, setViewingCustomFields] = useState<Record<string, any> | null>(null);
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
    completed_orders: 0
  });

  /* State for members list */
  const [members, setMembers] = useState<any[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    const fetchUser = async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();

    if (currentWorkspace) {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setDateFrom(today);
      setDateTo(today);

      fetchCustomers();
      fetchMembers();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace && dateFrom && dateTo) {
      fetchOrders();
    }
  }, [currentWorkspace, statusFilter, customerFilter, agentFilter, dateFrom, dateTo]);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchCustomers = async () => {
    if (!currentWorkspace) return;

    try {
      const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrders = async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('workspace_id', currentWorkspace.id);
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (customerFilter) {
        params.append('customer_id', customerFilter);
      }
      if (agentFilter) {
        params.append('agent_id', agentFilter);
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

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      
      // Calculate stats
      calculateStats(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: OrderWithCustomer[]) => {
    const stats = {
      total_orders: ordersData.length,
      total_revenue: ordersData.reduce((sum, order) => sum + order.total_amount, 0),
      pending_orders: ordersData.filter(o => o.status === 'pending').length,
      completed_orders: ordersData.filter(o => o.status === 'completed').length
    };
    setOrderStats(stats);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchOrders();
        setOrderToDelete(null);
      } else {
        const error = await response.json();
        console.error('Error deleting order:', error);
        alert('Error al eliminar el pedido: ' + (error.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error al eliminar el pedido');
    }
  };

  const handleSearch = () => {
    fetchOrders();
  };

  // ... (statsDisplay and getStatusBadge remain unchanged)
  const statsDisplay = [
    {
      title: "Total Pedidos",
      value: orderStats.total_orders.toString(),
      change: "+12%",
      icon: ShoppingCart,
      color: "text-primary"
    },
    {
      title: "Ingresos",
      value: `S/. ${orderStats.total_revenue.toFixed(2)}`,
      change: "+8%",
      icon: DollarSign,
      color: "text-green-500"
    },
    {
      title: "Pendientes",
      value: orderStats.pending_orders.toString(),
      change: "-5%",
      icon: Clock,
      color: "text-yellow-500"
    },
    {
      title: "Completados",
      value: orderStats.completed_orders.toString(),
      change: "+15%",
      icon: CheckCircle,
      color: "text-primary"
    }
  ];

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: {
        label: "Pendiente",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      },
      processing: {
        label: "Procesando",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      },
      completed: {
        label: "Completado",
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      },
      cancelled: {
        label: "Cancelado",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pedidos</h1>
            <p className="text-sm text-text-secondary mt-1">Gestiona y monitorea todos tus pedidos</p>
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
        <div className="bg-background rounded-xl p-4 sm:p-6 border border-current/20">
          <h3 className="text-sm font-semibold text-foreground mb-4">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Número de pedido, cliente..."
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
                <option value="processing">Procesando</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Cliente
              </label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="">Todos</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Agente
              </label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="">Todos</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
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
            <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
              
              {(statusFilter !== 'all' || customerFilter || agentFilter || dateFrom !== new Date().toISOString().split('T')[0] || dateTo !== new Date().toISOString().split('T')[0] || searchTerm) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCustomerFilter('');
                    setAgentFilter('');
                    // Reset to today
                    const today = new Date().toISOString().split('T')[0];
                    setDateFrom(today);
                    setDateTo(today);
                  }}
                  className="px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-text-secondary hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  title="Limpiar filtros"
                >
                  <XCircle className="w-4 h-4" />
                  <span className="sm:inline">Limpiar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ... (Actions Bar remains unchanged) */}
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={() => router.push('/orders/custom-fields')}
            className="px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Gestionar Campos</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
          <button className="flex-1 sm:flex-none px-4 py-2.5 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button 
            onClick={() => setShowOrderForm(true)}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido</span>
          </button>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="bg-background rounded-xl border border-current/20 p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredOrders.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-background rounded-xl border border-current/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-hover-bg border-b border-current/20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Agente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-hover-bg transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{order.order_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-foreground">
                            {order.customer_name || 'Sin cliente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">
                            {order.user_id === currentUserId ? 'Tú' : (order.agent_name || 'Usuario')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-text-secondary">
                            {new Date(order.order_date).toLocaleDateString('es-ES')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-foreground">
                            S/. {order.total_amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => router.push(`/orders/${order.id}`)}
                              className="p-1.5 hover:bg-hover-bg rounded transition-colors" 
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4 text-text-secondary" />
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/orders/${order.id}`);
                                  if (response.ok) {
                                    const fullOrder = await response.json();
                                    setEditingOrder(fullOrder);
                                    setShowEditModal(true);
                                  }
                                } catch (error) {
                                  console.error('Error fetching order details:', error);
                                }
                              }}
                              className="p-1.5 hover:bg-hover-bg rounded transition-colors" 
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-text-secondary" />
                            </button>
                            {currentWorkspace?.owner_id === currentUserId && (
                              <button 
                                onClick={() => setOrderToDelete(order)}
                                className="p-1.5 hover:bg-hover-bg rounded transition-colors" 
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-background rounded-xl p-4 border border-current/20 active:bg-hover-bg transition-colors"
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-semibold text-foreground">{order.order_number}</span>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Cliente:</span>
                      <span className="text-foreground font-medium">{order.customer_name || 'Sin cliente'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Fecha:</span>
                      <span className="text-foreground">{new Date(order.order_date).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Total:</span>
                      <span className="text-lg font-bold text-primary">S/. {order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-current/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/orders/${order.id}`);
                      }}
                      className="flex-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(`/api/orders/${order.id}`);
                          if (response.ok) {
                            const fullOrder = await response.json();
                            setEditingOrder(fullOrder);
                            setShowEditModal(true);
                          }
                        } catch (error) {
                          console.error('Error fetching order details:', error);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-foreground transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    {currentWorkspace?.owner_id === currentUserId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="bg-background border-t border-current/20">
              <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-text-secondary text-center sm:text-left">
                  Mostrando <span className="font-medium text-foreground">{filteredOrders.length}</span> de{" "}
                  <span className="font-medium text-foreground">{orders.length}</span> pedidos
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-foreground transition-colors">
                    Anterior
                  </button>
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-white rounded-lg text-sm font-medium transition-colors">
                    1
                  </button>
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-foreground transition-colors">
                    2
                  </button>
                  <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-sm font-medium text-foreground transition-colors">
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="bg-background rounded-xl border border-current/20 p-12">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                No se encontraron pedidos
              </h2>
              <p className="text-text-secondary mb-6">
                {searchTerm || statusFilter !== "all" 
                  ? "Intenta ajustar tus filtros de búsqueda"
                  : "Comienza creando tu primer pedido para gestionar tus ventas"}
              </p>
              <button 
                onClick={() => setShowOrderForm(true)}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Primer Pedido</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <OrderForm
          onClose={() => setShowOrderForm(false)}
          onSuccess={() => {
            fetchOrders();
            setShowOrderForm(false);
          }}
        />
      )}

      {showEditModal && editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          onSuccess={() => {
            fetchOrders();
            setShowEditModal(false);
            setEditingOrder(null);
          }}
        />
      )}

      {showCustomFieldsModal && viewingCustomFields && (
        <CustomFieldsModal
          customFields={viewingCustomFields}
          onClose={() => {
            setShowCustomFieldsModal(false);
            setViewingCustomFields(null);
          }}
        />
      )}
      
      {orderToDelete && (
        <DeleteOrderModal
          order={orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}