"use client";

import { X, Printer, Download, FileText } from "lucide-react";
import { PaymentReceipt } from "@/app/types/payments";
import { useRef } from "react";

interface ReceiptModalProps {
  receipt: PaymentReceipt;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Boleta ${receipt.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .receipt-number { font-size: 18px; color: #666; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { margin-top: 20px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 5px; }
            .grand-total { font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const { receipt_data } = receipt;
  const payment = receipt_data.payment;
  const order = receipt_data.order;
  const customer = receipt_data.customer;
  const workspace = receipt_data.workspace;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-current/20">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Boleta de Pago
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="w-5 h-5 text-text-secondary" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div ref={printRef} className="p-8">
          {/* Header */}
          <div className="header text-center mb-8 border-b-2 border-current/20 pb-6">
            <div className="company-name text-3xl font-bold text-foreground mb-2">
              {workspace?.name || 'Mi Empresa'}
            </div>
            <div className="receipt-number text-lg text-text-secondary">
              Boleta N° {receipt.receipt_number}
            </div>
            <div className="text-sm text-text-secondary mt-2">
              Fecha de emisión: {new Date(receipt.generated_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Payment Information */}
            <div className="section">
              <div className="section-title text-base font-bold mb-4 border-b border-current/20 pb-2">
                Información del Pago
              </div>
              <div className="space-y-2">
                <div className="info-row flex justify-between">
                  <span className="label font-semibold text-foreground">N° de Pago:</span>
                  <span className="text-foreground">{payment.payment_number}</span>
                </div>
                <div className="info-row flex justify-between">
                  <span className="label font-semibold text-foreground">Monto:</span>
                  <span className="text-foreground font-bold">{payment.currency} {parseFloat(payment.amount).toFixed(2)}</span>
                </div>
                <div className="info-row flex justify-between">
                  <span className="label font-semibold text-foreground">Método:</span>
                  <span className="text-foreground capitalize">{payment.payment_method}</span>
                </div>
                {payment.card_brand && (
                  <div className="info-row flex justify-between">
                    <span className="label font-semibold text-foreground">Tarjeta:</span>
                    <span className="text-foreground capitalize">{payment.card_brand}</span>
                  </div>
                )}
                {payment.transaction_id && (
                  <div className="info-row flex justify-between">
                    <span className="label font-semibold text-foreground">ID Transacción:</span>
                    <span className="text-foreground">{payment.transaction_id}</span>
                  </div>
                )}
                {payment.reference_number && (
                  <div className="info-row flex justify-between">
                    <span className="label font-semibold text-foreground">N° Referencia:</span>
                    <span className="text-foreground">{payment.reference_number}</span>
                  </div>
                )}
                <div className="info-row flex justify-between">
                  <span className="label font-semibold text-foreground">Fecha de Pago:</span>
                  <span className="text-foreground">
                    {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            {customer && (
              <div className="section">
                <div className="section-title text-base font-bold mb-4 border-b border-current/20 pb-2">
                  Información del Cliente
                </div>
                <div className="space-y-2">
                  <div className="info-row flex justify-between">
                    <span className="label font-semibold text-foreground">Nombre:</span>
                    <span className="text-foreground">{customer.name}</span>
                  </div>
                  {customer.document && (
                    <div className="info-row flex justify-between">
                      <span className="label font-semibold text-foreground">Documento:</span>
                      <span className="text-foreground">{customer.document}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="info-row flex justify-between">
                      <span className="label font-semibold text-foreground">Email:</span>
                      <span className="text-foreground">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="info-row flex justify-between">
                      <span className="label font-semibold text-foreground">Teléfono:</span>
                      <span className="text-foreground">{customer.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          {order && (
            <div className="section mb-8">
              <div className="section-title text-base font-bold mb-4 border-b border-current/20 pb-2">
                Detalles de la Orden - {order.order_number}
              </div>
              <div className="mb-2">
                <span className="label font-semibold text-foreground">Fecha de Orden: </span>
                <span className="text-foreground">
                  {new Date(order.order_date).toLocaleDateString('es-ES')}
                </span>
              </div>

              {/* Order Items Table */}
              {order.items && order.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse mt-4">
                    <thead>
                      <tr className="bg-hover-bg">
                        <th className="border border-current/20 px-4 py-2 text-left text-foreground">Producto</th>
                        <th className="border border-current/20 px-4 py-2 text-left text-foreground">SKU</th>
                        <th className="border border-current/20 px-4 py-2 text-center text-foreground">Cant.</th>
                        <th className="border border-current/20 px-4 py-2 text-right text-foreground">P. Unit.</th>
                        <th className="border border-current/20 px-4 py-2 text-right text-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="border border-current/20 px-4 py-2 text-foreground">{item.product_name}</td>
                          <td className="border border-current/20 px-4 py-2 text-foreground">{item.product_sku || '-'}</td>
                          <td className="border border-current/20 px-4 py-2 text-center text-foreground">{item.quantity}</td>
                          <td className="border border-current/20 px-4 py-2 text-right text-foreground">
                            ${parseFloat(item.unit_price).toFixed(2)}
                          </td>
                          <td className="border border-current/20 px-4 py-2 text-right text-foreground font-semibold">
                            ${parseFloat(item.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Order Totals */}
              <div className="totals mt-6">
                <div className="total-row flex justify-end gap-20 text-foreground">
                  <span className="font-semibold">Total de Orden:</span>
                  <span className="font-bold">${parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
                <div className="grand-total flex justify-end gap-20 text-lg font-bold mt-4 pt-4 border-t-2 border-current/20 text-foreground">
                  <span>Monto Pagado:</span>
                  <span>{payment.currency} {parseFloat(payment.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="footer mt-12 pt-6 border-t border-current/20 text-center text-sm text-text-secondary">
            <p>Gracias por su pago</p>
            <p className="mt-2">Este es un comprobante de pago generado electrónicamente</p>
            <p className="mt-1">Generado por: {receipt_data.generated_by}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-current/20">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-background hover:bg-hover-bg border border-current/20 rounded-lg text-foreground font-medium transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
