"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, MoreHorizontal } from "lucide-react";
import KanbanCard from "./KanbanCard";
import { Customer, Order } from "../types";

interface KanbanColumnProps {
  id: string;
  title: string;
  items: (Customer | Order)[];
  type: "customer" | "order";
  color: string;
}

// Get icon color based on column id
const getColumnAccent = (id: string) => {
  const accents: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    prospect: { 
      bg: 'bg-slate-100 dark:bg-slate-800/50', 
      text: 'text-slate-600 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      glow: 'shadow-slate-500/20'
    },
    qualified: { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      glow: 'shadow-blue-500/20'
    },
    negotiation: { 
      bg: 'bg-purple-100 dark:bg-purple-900/30', 
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      glow: 'shadow-purple-500/20'
    },
    customer: { 
      bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      glow: 'shadow-emerald-500/20'
    },
    inactive: { 
      bg: 'bg-rose-100 dark:bg-rose-900/30', 
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      glow: 'shadow-rose-500/20'
    },
    pending: { 
      bg: 'bg-amber-100 dark:bg-amber-900/30', 
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      glow: 'shadow-amber-500/20'
    },
    processing: { 
      bg: 'bg-blue-100 dark:bg-blue-900/30', 
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      glow: 'shadow-blue-500/20'
    },
    completed: { 
      bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      glow: 'shadow-emerald-500/20'
    },
    cancelled: { 
      bg: 'bg-rose-100 dark:bg-rose-900/30', 
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      glow: 'shadow-rose-500/20'
    },
  };
  return accents[id] || accents.prospect;
};

export default function KanbanColumn({
  id,
  title,
  items,
  type,
  color,
}: KanbanColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: id,
  });

  const accent = getColumnAccent(id);
  const isDragActive = !!active;

  return (
    <div className="flex-shrink-0 w-80">
      <div
        className={`
          rounded-2xl transition-all duration-300 ease-out overflow-hidden
          ${isOver 
            ? `ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl ${accent.glow}` 
            : 'shadow-sm hover:shadow-md'
          }
          ${isDragActive && !isOver ? 'opacity-90' : 'opacity-100'}
          bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm
          border border-gray-200/50 dark:border-gray-700/50
        `}
      >
        {/* Column Header */}
        <div className={`p-4 border-b ${accent.border} ${accent.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className={`font-bold text-sm ${accent.text}`}>
                {title}
              </h3>
              <span className={`
                px-2.5 py-1 rounded-full text-xs font-semibold
                ${accent.bg} ${accent.text}
                border ${accent.border}
              `}>
                {items.length}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                className={`
                  p-1.5 rounded-lg transition-all duration-200
                  hover:bg-white/50 dark:hover:bg-white/10
                  ${accent.text} opacity-60 hover:opacity-100
                `}
                title="Más opciones"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Column Content */}
        <div
          ref={setNodeRef}
          className={`
            p-3 space-y-3 min-h-[250px] max-h-[calc(100vh-280px)] overflow-y-auto
            scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 
            scrollbar-track-transparent
            transition-all duration-300
            ${isOver ? 'bg-primary/5' : ''}
          `}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.length > 0 ? (
              items.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <KanbanCard item={item} type={type} />
                </div>
              ))
            ) : (
              <div className={`
                flex flex-col items-center justify-center h-40 
                border-2 border-dashed rounded-xl
                transition-all duration-300
                ${isOver 
                  ? 'border-primary bg-primary/10 scale-105' 
                  : 'border-gray-200 dark:border-gray-700'
                }
              `}>
                <div className={`
                  p-3 rounded-full mb-2
                  ${isOver ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'}
                `}>
                  <Plus className={`w-5 h-5 ${isOver ? 'text-primary' : 'text-gray-400'}`} />
                </div>
                <p className={`text-sm font-medium ${isOver ? 'text-primary' : 'text-gray-400'}`}>
                  {isOver ? '¡Suelta aquí!' : 'Arrastra elementos aquí'}
                </p>
              </div>
            )}
          </SortableContext>
        </div>

        {/* Column Footer with count summary */}
        <div className={`px-4 py-2 border-t ${accent.border} bg-white/50 dark:bg-black/20`}>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{items.length} {type === 'customer' ? 'clientes' : 'pedidos'}</span>
            {type === 'order' && items.length > 0 && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                S/ {items.reduce((sum, item) => sum + ((item as Order).total_amount || 0), 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}