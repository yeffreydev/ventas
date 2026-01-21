// Order status types
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// Address interface
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
}

// Order interface
export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  user_id: string;
  order_date: string;
  status: OrderStatus;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_address: Address | null;
  billing_address: Address | null;
  notes: string | null;
  payment_proof_url?: string | null;
  custom_fields?: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Order item interface
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    image_url: string | null;
  };
  product_variants?: {
    id: string;
    name: string;
  };
}

// Order with items
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

// Order with customer details
export interface OrderWithCustomer extends Order {
  customer_name?: string;
  customer_email?: string;
}

// Order with full details (items and customer)
export interface OrderWithDetails extends OrderWithItems {
  customer_name?: string;
  customer_email?: string;
  workspace_name?: string;
  customers?: {
    id: string;
    name: string;
    email: string | null;
    identity_document_number?: string | null;
  };
}

// Order status history
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

// Create order input
export interface CreateOrderInput {
  customer_id?: string;
  status?: OrderStatus;
  shipping_address?: Address;
  billing_address?: Address;
  notes?: string;
  payment_proof_url?: string;
  custom_fields?: Record<string, any>;
  items: CreateOrderItemInput[];
  metadata?: Record<string, any>;
  workspace_id?: string;
}

// Create order item input
export interface CreateOrderItemInput {
  product_id: string;
  product_variant_id?: string;
  quantity: number;
  unit_price?: number; // Optional, will be fetched from product if not provided
  discount_amount?: number;
  tax_amount?: number;
}

// Update order input
export interface UpdateOrderInput {
  customer_id?: string;
  status?: OrderStatus;
  shipping_address?: Address;
  billing_address?: Address;
  notes?: string;
  payment_proof_url?: string;
  custom_fields?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Update order item input
export interface UpdateOrderItemInput {
  id?: string; // If provided, update existing item; otherwise create new
  product_id: string;
  product_variant_id?: string;
  quantity: number;
  unit_price?: number;
  discount_amount?: number;
  tax_amount?: number;
}

// Order filters for list queries
export interface OrderFilters {
  status?: OrderStatus | 'all';
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search by order number or customer name
}

// Order list response with pagination
export interface OrderListResponse {
  orders: OrderWithCustomer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Order statistics
export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_order_value: number;
}

// Product availability check
export interface ProductAvailability {
  product_id: string;
  product_variant_id?: string;
  available: boolean;
  current_stock: number;
  requested_quantity: number;
}

// Order validation result
export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  product_availability: ProductAvailability[];
}