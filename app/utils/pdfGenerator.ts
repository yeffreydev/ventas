import jsPDF from 'jspdf';
import { OrderWithDetails } from '@/app/types/orders';

export const generateOrderPDF = (order: OrderWithDetails) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  
  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235];
  const secondaryColor: [number, number, number] = [107, 114, 128];
  const textColor: [number, number, number] = [17, 24, 39];
  const lightBg: [number, number, number] = [249, 250, 251];
  const borderColor: [number, number, number] = [229, 231, 235];

  // Status labels
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    cancelled: 'Cancelado'
  };

  let y = margin;

  // Helper: Draw section header
  const drawSectionHeader = (title: string) => {
    checkPageBreak(12);
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(...borderColor);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // Helper: Draw key-value pair
  const drawKeyValue = (key: string, value: string | number | null | undefined, indent = 0) => {
    if (value === null || value === undefined || value === '') return;
    checkPageBreak(6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text(`${key}:`, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const valueStr = String(value);
    const textWidth = doc.getTextWidth(`${key}: `);
    doc.text(valueStr, margin + indent + textWidth, y);
    y += 6;
  };

  // Helper: Check page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
  };

  // ==================== HEADER ====================
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  const headerText = order.workspace_name || 'Pedido';
  doc.text(headerText, margin, y);
  
  // Order number badge
  doc.setFontSize(14);
  doc.setTextColor(...textColor);
  doc.text(`#${order.order_number}`, pageWidth - margin, y, { align: 'right' });
  y += 10;

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'normal');
  const orderDate = new Date(order.order_date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Fecha: ${orderDate}`, margin, y);
  doc.text(`Estado: ${statusLabels[order.status] || order.status}`, pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Separator
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ==================== CUSTOMER INFO ====================
  if (order.customers) {
    drawSectionHeader('Información del Cliente');
    drawKeyValue('Nombre', order.customers.name);
    if (order.customers.email) drawKeyValue('Email', order.customers.email);
    if (order.customers.identity_document_number) drawKeyValue('Documento', order.customers.identity_document_number);
    y += 4;
  }

  // ==================== SHIPPING ADDRESS ====================
  if (order.shipping_address && Object.values(order.shipping_address).some(v => v)) {
    drawSectionHeader('Dirección de Envío');
    if (order.shipping_address.street) drawKeyValue('Calle', order.shipping_address.street);
    if (order.shipping_address.city) drawKeyValue('Ciudad', order.shipping_address.city);
    if (order.shipping_address.state) drawKeyValue('Estado/Provincia', order.shipping_address.state);
    if (order.shipping_address.postal_code) drawKeyValue('Código Postal', order.shipping_address.postal_code);
    if (order.shipping_address.country) drawKeyValue('País', order.shipping_address.country);
    if (order.shipping_address.phone) drawKeyValue('Teléfono', order.shipping_address.phone);
    y += 4;
  }

  // ==================== BILLING ADDRESS ====================
  if (order.billing_address && Object.values(order.billing_address).some(v => v)) {
    drawSectionHeader('Dirección de Facturación');
    if (order.billing_address.street) drawKeyValue('Calle', order.billing_address.street);
    if (order.billing_address.city) drawKeyValue('Ciudad', order.billing_address.city);
    if (order.billing_address.state) drawKeyValue('Estado/Provincia', order.billing_address.state);
    if (order.billing_address.postal_code) drawKeyValue('Código Postal', order.billing_address.postal_code);
    if (order.billing_address.country) drawKeyValue('País', order.billing_address.country);
    y += 4;
  }

  // ==================== ORDER ITEMS ====================
  drawSectionHeader('Artículos del Pedido');
  
  order.order_items?.forEach((item, index) => {
    checkPageBreak(35);
    
    // Item card background
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y - 2, contentWidth, 28, 3, 3, 'F');
    
    // Item number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${index + 1}.`, margin + 4, y + 5);
    
    // Product name
    doc.setTextColor(...textColor);
    let productName = item.product_name;
    if (item.product_sku) productName += ` (SKU: ${item.product_sku})`;
    doc.text(productName, margin + 12, y + 5);
    
    // Details row
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text(`Cantidad: ${item.quantity}`, margin + 12, y + 12);
    doc.text(`Precio Unit.: S/. ${item.unit_price.toFixed(2)}`, margin + 55, y + 12);
    
    // Subtotal and discounts
    if (item.discount_amount > 0) {
      doc.text(`Descuento: -S/. ${item.discount_amount.toFixed(2)}`, margin + 110, y + 12);
    }
    if (item.tax_amount > 0) {
      doc.text(`Impuesto: S/. ${item.tax_amount.toFixed(2)}`, margin + 12, y + 19);
    }
    
    // Item total
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`Total: S/. ${item.total.toFixed(2)}`, pageWidth - margin - 4, y + 19, { align: 'right' });
    
    y += 32;
  });

  // ==================== ORDER TOTALS ====================
  checkPageBreak(40);
  y += 4;
  
  // Totals box
  doc.setFillColor(...lightBg);
  doc.roundedRect(pageWidth - margin - 80, y, 80, 36, 3, 3, 'F');
  
  let totalsY = y + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  
  doc.text('Subtotal:', pageWidth - margin - 75, totalsY);
  doc.text(`S/. ${order.subtotal.toFixed(2)}`, pageWidth - margin - 5, totalsY, { align: 'right' });
  totalsY += 7;
  
  if (order.discount_amount > 0) {
    doc.setTextColor(34, 197, 94); // green
    doc.text('Descuento:', pageWidth - margin - 75, totalsY);
    doc.text(`-S/. ${order.discount_amount.toFixed(2)}`, pageWidth - margin - 5, totalsY, { align: 'right' });
    totalsY += 7;
  }
  
  if (order.tax_amount > 0) {
    doc.setTextColor(...textColor);
    doc.text('Impuestos:', pageWidth - margin - 75, totalsY);
    doc.text(`S/. ${order.tax_amount.toFixed(2)}`, pageWidth - margin - 5, totalsY, { align: 'right' });
    totalsY += 7;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', pageWidth - margin - 75, totalsY);
  doc.text(`S/. ${order.total_amount.toFixed(2)}`, pageWidth - margin - 5, totalsY, { align: 'right' });
  
  y += 44;

  // ==================== PAYMENT PROOF ====================
  if (order.payment_proof_url) {
    drawSectionHeader('Comprobante de Pago');
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.textWithLink('Ver comprobante adjunto', margin, y, { url: order.payment_proof_url });
    y += 10;
  }

  // ==================== NOTES ====================
  if (order.notes) {
    drawSectionHeader('Notas');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const splitNotes = doc.splitTextToSize(order.notes, contentWidth);
    splitNotes.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  }

  // ==================== CUSTOM FIELDS ====================
  if (order.custom_fields && Object.keys(order.custom_fields).length > 0) {
    drawSectionHeader('Campos Personalizados');
    Object.entries(order.custom_fields).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean' 
        ? (value ? 'Sí' : 'No') 
        : String(value || '-');
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      drawKeyValue(displayKey, displayValue);
    });
    y += 4;
  }

  // ==================== METADATA ====================
  if (order.metadata && Object.keys(order.metadata).length > 0) {
    drawSectionHeader('Información Adicional');
    Object.entries(order.metadata).forEach(([key, value]) => {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      drawKeyValue(key, displayValue);
    });
    y += 4;
  }

  // ==================== ORDER METADATA ====================
  drawSectionHeader('Datos del Pedido');
  drawKeyValue('ID', order.id);
  drawKeyValue('Número de Orden', order.order_number);
  drawKeyValue('Creado', new Date(order.created_at).toLocaleString('es-ES'));
  if (order.updated_at && order.updated_at !== order.created_at) {
    drawKeyValue('Actualizado', new Date(order.updated_at).toLocaleString('es-ES'));
  }

  // ==================== FOOTER ====================
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text('Gracias por su preferencia.', pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text(`Documento generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text('Impulsado por CRM Botia', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save
  doc.save(`Pedido-${order.order_number}.pdf`);
};
