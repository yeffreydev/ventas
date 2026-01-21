"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, 
  User, 
  Mail, 
  Calendar, 
  DollarSign, 
  Package,
  TrendingUp,
  Clock,
  Tag
} from "lucide-react";
import { Customer, Order } from "../types";

interface KanbanCardProps {
  item: Customer | Order;
  type: "customer" | "order";
}

export default function KanbanCard({ item, type }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  const isCustomer = type === "customer";
  const customer = isCustomer ? (item as Customer) : null;
  const order = !isCustomer ? (item as Order) : null;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Get stage/status color classes
  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      prospect: 'from-slate-400 to-slate-500',
      qualified: 'from-blue-400 to-blue-500',
      negotiation: 'from-purple-400 to-purple-500',
      customer: 'from-emerald-400 to-emerald-500',
      inactive: 'from-rose-400 to-rose-500',
      pending: 'from-amber-400 to-amber-500',
      processing: 'from-blue-400 to-blue-500',
      completed: 'from-emerald-400 to-emerald-500',
      cancelled: 'from-rose-400 to-rose-500',
    };
    return colors[stage] || 'from-gray-400 to-gray-500';
  };

  const currentStage = isCustomer ? customer?.stage : order?.status;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white dark:bg-gray-800/90 rounded-xl border 
        transition-all duration-300 ease-out
        ${isDragging 
          ? 'shadow-2xl scale-105 border-primary/50 ring-2 ring-primary/20 z-50 rotate-2' 
          : 'shadow-sm hover:shadow-lg border-gray-200/60 dark:border-gray-700/60 hover:border-primary/30'
        }
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
    >
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${getStageColor(currentStage || '')} opacity-80`} />
      
      <div className="p-4 pt-5">
        {/* Drag Handle & Header */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1"
          >
            <div className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {isCustomer && customer ? (
              // Customer Card Content
              <>
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getStageColor(customer.stage)} flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0`}>
                    {getInitials(customer.name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                      {customer.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {customer.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(customer.created_at)}</span>
                  </div>
                  
                  {/* Tags */}
                  {customer.customer_tags && customer.customer_tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 text-[10px] font-medium">
                        +{customer.customer_tags.length}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : order ? (
              // Order Card Content
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        #{order.order_number}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                        {order.customer_name || order.customers?.name || 'Sin cliente'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Total Amount */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="flex items-center justify-between text-xs border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(order.order_date)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Subtotal: {formatCurrency(order.subtotal)}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hover overlay effect */}
      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}