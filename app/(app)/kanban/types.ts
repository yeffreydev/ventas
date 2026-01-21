export type CustomerStage = "prospect" | "qualified" | "negotiation" | "customer" | "inactive";
export type OrderStage = "pending" | "processing" | "completed" | "cancelled";

export interface Customer {
  id: string;
  name: string;
  email: string;
  identity_document_type: string;
  identity_document_number: string;
  city?: string;
  province?: string;
  district?: string;
  address?: string;
  stage: CustomerStage;
  created_at: string;
  updated_at: string;
  user_id: string;
  customer_tags?: {
    tag_id: string;
    tags: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  user_id: string;
  order_date: string;
  status: OrderStage;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
  customers?: {
    id: string;
    name: string;
    email: string | null;
  };
}

export interface KanbanColumn<T> {
  id: string;
  title: string;
  items: T[];
  color: string;
}

export interface StageChangeConfirmation {
  itemId: string;
  itemName: string;
  fromStage: string;
  toStage: string;
  onConfirm: () => void;
  onCancel: () => void;
}