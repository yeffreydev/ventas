'use client';

import { HiUser, HiX } from 'react-icons/hi';
import { Badge } from 'flowbite-react';

interface CustomerSelectorModalProps {
  showCustomerSelector: boolean;
  setShowCustomerSelector: (show: boolean) => void;
  customerSearchTerm: string;
  setCustomerSearchTerm: (term: string) => void;
  availableCustomers: any[];
  handleSelectCustomerToLink: (customer: any) => void;
}

export default function CustomerSelectorModal({
  showCustomerSelector,
  setShowCustomerSelector,
  customerSearchTerm,
  setCustomerSearchTerm,
  availableCustomers,
  handleSelectCustomerToLink
}: CustomerSelectorModalProps) {
  if (!showCustomerSelector) return null;

  const filteredCustomers = availableCustomers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.identity_document_number.includes(customerSearchTerm)
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-current/20">
        {/* Modal Header */}
        <div className="p-6 border-b border-current/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <HiUser className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Vincular Cliente</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Selecciona un cliente para vincular a esta conversación
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCustomerSelector(false);
                setCustomerSearchTerm('');
              }}
              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            >
              <HiX className="w-6 h-6 text-text-secondary" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, email o documento..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Customer List */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {availableCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiUser className="w-8 h-8 text-primary" />
              </div>
              <p className="text-text-secondary">No hay clientes disponibles</p>
              <p className="text-sm text-text-tertiary mt-2">Crea un cliente primero para poder vincularlo</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-text-secondary">No se encontraron clientes</p>
              <p className="text-sm text-text-tertiary mt-2">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomerToLink(customer)}
                  className="w-full p-4 border-2 border-current/20 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {customer.name}
                        </p>
                        <p className="text-sm text-text-secondary mt-1">{customer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-hover-bg rounded text-text-tertiary">
                            {customer.identity_document_type}: {customer.identity_document_number}
                          </span>
                          {customer.city && (
                            <span className="text-xs px-2 py-1 bg-hover-bg rounded text-text-tertiary">
                              📍 {customer.city}
                            </span>
                          )}
                        </div>
                        {customer.address && (
                          <p className="text-xs text-text-tertiary mt-2 line-clamp-1">
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Stage Badge */}
                    <Badge color="info" size="sm" className="flex-shrink-0">
                      {customer.stage}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-current/20 bg-hover-bg">
          <button
            onClick={() => {
              setShowCustomerSelector(false);
              setCustomerSearchTerm('');
            }}
            className="w-full px-4 py-2.5 border border-current/20 rounded-lg hover:bg-background transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}