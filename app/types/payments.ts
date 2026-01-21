export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'paypal' | 'other';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'other';

export interface Payment {
  id: string;
  payment_number: string;
  order_id: string | null;
  workspace_id: string;
  user_id: string;
  customer_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_date: string;
  transaction_id?: string | null;
  card_brand?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithRelations extends Payment {
  orders?: {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
  };
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  receipt?: PaymentReceipt;
}

export interface PaymentReceipt {
  id: string;
  payment_id: string;
  receipt_number: string;
  receipt_data: any;
  pdf_url?: string | null;
  generated_at: string;
}

export interface CreatePaymentInput {
  order_id?: string | null;
  workspace_id: string;
  customer_id?: string | null;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  payment_method: PaymentMethod;
  payment_date?: string;
  transaction_id?: string;
  card_brand?: string;
  reference_number?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentInput {
  amount?: number;
  status?: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_date?: string;
  transaction_id?: string;
  card_brand?: string;
  reference_number?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface PaymentFilters {
  workspace_id: string;
  status?: PaymentStatus | 'all';
  payment_method?: PaymentMethod | 'all';
  order_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
