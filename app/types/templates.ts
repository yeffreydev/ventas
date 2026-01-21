export interface Template {
  id: string;
  name: string;
  content: string;
  shortcut?: string;
  category?: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  shortcut?: string;
  category?: string;
  is_active?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  shortcut?: string;
  category?: string;
  is_active?: boolean;
}