"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Users, Package } from "lucide-react";
import { useWorkspace } from "@/app/providers/WorkspaceProvider";
import KanbanColumn from "./components/KanbanColumn";
import KanbanCard from "./components/KanbanCard";
import ConfirmationModal from "./components/ConfirmationModal";
import {
  Customer,
  Order,
  CustomerStage,
  OrderStage,
  KanbanColumn as KanbanColumnType,
} from "./types";

export default function KanbanPage() {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"customers" | "orders">("customers");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    itemId: string;
    fromStage: string;
    toStage: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customer columns with real data
  const [customerColumns, setCustomerColumns] = useState<
    KanbanColumnType<Customer>[]
  >([
    {
      id: "prospect",
      title: "Prospecto",
      color: "bg-gray-50 dark:bg-gray-900/30",
      items: [],
    },
    {
      id: "qualified",
      title: "Calificado",
      color: "bg-blue-50 dark:bg-blue-900/30",
      items: [],
    },
    {
      id: "negotiation",
      title: "Negociación",
      color: "bg-purple-50 dark:bg-purple-900/30",
      items: [],
    },
    {
      id: "customer",
      title: "Cliente",
      color: "bg-green-50 dark:bg-green-900/30",
      items: [],
    },
    {
      id: "inactive",
      title: "Inactivo",
      color: "bg-red-50 dark:bg-red-900/30",
      items: [],
    },
  ]);

  // Order columns with real data (matching database schema)
  const [orderColumns, setOrderColumns] = useState<KanbanColumnType<Order>[]>([
    {
      id: "pending",
      title: "Pendiente",
      color: "bg-yellow-50 dark:bg-yellow-900/30",
      items: [],
    },
    {
      id: "processing",
      title: "Procesando",
      color: "bg-blue-50 dark:bg-blue-900/30",
      items: [],
    },
    {
      id: "completed",
      title: "Completado",
      color: "bg-green-50 dark:bg-green-900/30",
      items: [],
    },
    {
      id: "cancelled",
      title: "Cancelado",
      color: "bg-red-50 dark:bg-red-900/30",
      items: [],
    },
  ]);

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentWorkspace) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/customers?workspace_id=${currentWorkspace.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch customers');
        }
        
        const customers: Customer[] = await response.json();
        
        // Organize customers by stage
        setCustomerColumns(prev => {
          const newColumns = prev.map(col => ({
            ...col,
            items: customers.filter(customer => customer.stage === col.id)
          }));
          return newColumns;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'customers' && currentWorkspace) {
      fetchCustomers();
    }
  }, [activeTab, currentWorkspace]);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentWorkspace) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/orders?workspace_id=${currentWorkspace.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        const orders: Order[] = data.orders || [];
        
        // Organize orders by status
        setOrderColumns(prev => {
          const newColumns = prev.map(col => ({
            ...col,
            items: orders.filter(order => order.status === col.id)
          }));
          return newColumns;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'orders' && currentWorkspace) {
      fetchOrders();
    }
  }, [activeTab, currentWorkspace]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination columns
    const columns = activeTab === "customers" ? customerColumns : orderColumns;
    const sourceColumn = columns.find((col) =>
      col.items.some((item) => item.id === activeId)
    );
    const destColumn = columns.find((col) => col.id === overId);

    if (!sourceColumn || !destColumn) return;
    if (sourceColumn.id === destColumn.id) return;

    // Find the item being moved
    const item = sourceColumn.items.find((item) => item.id === activeId);
    if (!item) return;

    // Show confirmation modal
    setPendingMove({
      itemId: activeId,
      fromStage: sourceColumn.title,
      toStage: destColumn.title,
    });
  };

  const confirmMove = async () => {
    if (!pendingMove || !currentWorkspace) return;

    const { itemId, fromStage, toStage } = pendingMove;

    if (activeTab === "customers") {
      // Find the destination column to get the stage ID
      const destColumn = customerColumns.find((col) => col.title === toStage);
      if (!destColumn) return;

      try {
        // Update customer stage in the database
        const response = await fetch(`/api/customers/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stage: destColumn.id,
            workspace_id: currentWorkspace.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update customer stage');
        }

        // Update local state
        setCustomerColumns((prev) => {
          const newColumns = [...prev];
          const sourceColumn = newColumns.find((col) => col.title === fromStage);
          const destColumnLocal = newColumns.find((col) => col.title === toStage);

          if (!sourceColumn || !destColumnLocal) return prev;

          const itemIndex = sourceColumn.items.findIndex(
            (item) => item.id === itemId
          );
          if (itemIndex === -1) return prev;

          const [item] = sourceColumn.items.splice(itemIndex, 1);
          item.stage = destColumnLocal.id as CustomerStage;
          destColumnLocal.items.push(item);

          return newColumns;
        });
      } catch (err) {
        console.error('Error updating customer stage:', err);
        setError('Failed to update customer stage');
      }
    } else {
      // Find the destination column to get the status ID
      const destColumn = orderColumns.find((col) => col.title === toStage);
      if (!destColumn) return;

      try {
        // Update order status in the database
        const response = await fetch(`/api/orders/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: destColumn.id,
            workspace_id: currentWorkspace.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update order status');
        }

        // Update local state
        setOrderColumns((prev) => {
          const newColumns = [...prev];
          const sourceColumn = newColumns.find((col) => col.title === fromStage);
          const destColumnLocal = newColumns.find((col) => col.title === toStage);

          if (!sourceColumn || !destColumnLocal) return prev;

          const itemIndex = sourceColumn.items.findIndex(
            (item) => item.id === itemId
          );
          if (itemIndex === -1) return prev;

          const [item] = sourceColumn.items.splice(itemIndex, 1);
          item.status = destColumnLocal.id as OrderStage;
          destColumnLocal.items.push(item);

          return newColumns;
        });
      } catch (err) {
        console.error('Error updating order status:', err);
        setError('Failed to update order status');
      }
    }

    setPendingMove(null);
  };

  const cancelMove = () => {
    setPendingMove(null);
  };

  const getActiveItem = () => {
    if (!activeId) return null;
    const columns = activeTab === "customers" ? customerColumns : orderColumns;
    for (const column of columns) {
      const item = column.items.find((item) => item.id === activeId);
      if (item) return item;
    }
    return null;
  };

  const activeItem = getActiveItem();
  const columns = activeTab === "customers" ? customerColumns : orderColumns;

  // Calculate stats
  const totalCustomers = customerColumns.reduce((sum, col) => sum + col.items.length, 0);
  const totalOrders = orderColumns.reduce((sum, col) => sum + col.items.length, 0);
  const totalOrdersValue = orderColumns.reduce((sum, col) => 
    sum + col.items.reduce((s, o) => s + (o as Order).total_amount, 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg shadow-primary/25">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                Tablero Kanban
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Arrastra y suelta para gestionar el flujo de trabajo
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats Pills */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {totalCustomers} clientes
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <Package className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {totalOrders} pedidos
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  S/ {totalOrdersValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs with modern design */}
        <div className="flex items-center gap-4">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => setActiveTab("customers")}
              className={`
                relative px-6 py-2.5 rounded-xl font-semibold text-sm
                transition-all duration-300 ease-out
                flex items-center gap-2.5
                ${activeTab === "customers"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }
              `}
            >
              <Users className="w-4 h-4" />
              <span>Clientes</span>
              {activeTab === "customers" && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {totalCustomers}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`
                relative px-6 py-2.5 rounded-xl font-semibold text-sm
                transition-all duration-300 ease-out
                flex items-center gap-2.5
                ${activeTab === "orders"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }
              `}
            >
              <Package className="w-4 h-4" />
              <span>Pedidos</span>
              {activeTab === "orders" && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {totalOrders}
                </span>
              )}
            </button>
          </div>

          {/* Refresh hint */}
          <p className="text-xs text-gray-400 dark:text-gray-500 hidden lg:block">
            💡 Tip: Arrastra las tarjetas entre columnas para cambiar su estado
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-rose-800 dark:text-rose-300">Error al cargar datos</p>
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
              <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Cargando {activeTab === 'customers' ? 'clientes' : 'pedidos'}...
            </p>
          </div>
        ) : (
          /* Kanban Board */
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto pb-6 -mx-6 px-6">
              <div className="flex gap-5 min-w-max">
                {columns.map((column, index) => (
                  <div 
                    key={column.id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <KanbanColumn
                      id={column.id}
                      title={column.title}
                      items={column.items}
                      type={activeTab === "customers" ? "customer" : "order"}
                      color={column.color}
                    />
                  </div>
                ))}
              </div>
            </div>

            <DragOverlay dropAnimation={{
              duration: 300,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
              {activeItem ? (
                <div className="rotate-3 scale-105 shadow-2xl opacity-95">
                  <KanbanCard item={activeItem} type={activeTab === "customers" ? "customer" : "order"} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Confirmation Modal */}
        {pendingMove && (
          <ConfirmationModal
            isOpen={true}
            itemName={
              activeTab === "customers"
                ? customerColumns
                    .flatMap((col) => col.items)
                    .find((item) => item.id === pendingMove.itemId)?.name || ""
                : orderColumns
                    .flatMap((col) => col.items)
                    .find((item) => item.id === pendingMove.itemId)
                    ?.order_number || ""
            }
            fromStage={pendingMove.fromStage}
            toStage={pendingMove.toStage}
            onConfirm={confirmMove}
            onCancel={cancelMove}
          />
        )}
      </div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}

