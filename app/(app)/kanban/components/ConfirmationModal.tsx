"use client";

import { X, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  itemName: string;
  fromStage: string;
  toStage: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  itemName,
  fromStage,
  toStage,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm();
    setIsLoading(false);
  };

  const handleCancel = () => {
    setIsAnimating(false);
    setTimeout(onCancel, 150);
  };

  // Determine if this is a "positive" or "negative" transition
  const isPositiveTransition = ['Cliente', 'Completado', 'Calificado'].includes(toStage);
  const isNegativeTransition = ['Inactivo', 'Cancelado'].includes(toStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-md
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleCancel}
      />

      {/* Modal */}
      <div 
        className={`
          relative w-full max-w-md
          transition-all duration-300 ease-out
          ${isAnimating 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
          }
        `}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
          {/* Gradient Header */}
          <div className={`
            p-6 pb-4
            ${isNegativeTransition 
              ? 'bg-gradient-to-br from-rose-500/10 to-orange-500/10' 
              : isPositiveTransition 
                ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10'
                : 'bg-gradient-to-br from-blue-500/10 to-purple-500/10'
            }
          `}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`
                  p-3 rounded-xl
                  ${isNegativeTransition 
                    ? 'bg-rose-100 dark:bg-rose-900/30' 
                    : isPositiveTransition 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }
                `}>
                  {isNegativeTransition ? (
                    <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <CheckCircle2 className={`w-6 h-6 ${isPositiveTransition ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Confirmar cambio
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Esta acción actualizará el estado
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Item Name */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Elemento a modificar:
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {itemName}
              </p>
            </div>

            {/* Stage Transition */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</p>
                <span className="inline-flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm">
                  {fromStage}
                </span>
              </div>
              
              <div className="flex-shrink-0">
                <div className={`
                  p-2 rounded-full
                  ${isNegativeTransition 
                    ? 'bg-rose-100 dark:bg-rose-900/30' 
                    : isPositiveTransition 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }
                `}>
                  <ArrowRight className={`
                    w-4 h-4
                    ${isNegativeTransition 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : isPositiveTransition 
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }
                  `} />
                </div>
              </div>
              
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hacia</p>
                <span className={`
                  inline-flex items-center px-3 py-1.5 rounded-lg font-medium text-sm
                  ${isNegativeTransition 
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' 
                    : isPositiveTransition 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }
                `}>
                  {toStage}
                </span>
              </div>
            </div>

            {/* Warning for negative transitions */}
            {isNegativeTransition && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  ⚠️ Esta acción puede tener implicaciones importantes. Asegúrate de que sea correcta.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="
                flex-1 px-5 py-3 
                bg-gray-100 hover:bg-gray-200 
                dark:bg-gray-700 dark:hover:bg-gray-600
                text-gray-700 dark:text-gray-300 
                rounded-xl font-semibold text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`
                flex-1 px-5 py-3 
                text-white rounded-xl font-semibold text-sm
                transition-all duration-200 
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                ${isNegativeTransition 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : isPositiveTransition 
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-primary hover:bg-primary/90'
                }
                ${!isLoading && 'hover:scale-[1.02] active:scale-[0.98]'}
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}