// MCP Tool Handler - Executes CRM tools with workspace isolation and security
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Minimal interfaces for type safety
interface Customer {
  id: string;
  name: string;
  email: string;
  stage: string;
  identity_document_number?: string;
  created_at: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  order_date: string;
  created_at: string;
  customers: {
    id: string;
    name: string;
    email: string;
  } | null;
}

async function checkWorkspaceAccess(
  supabase: any,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  if (!workspaceId) return false;
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}

export async function executeMCPTool(
  toolName: string,
  args: any,
  workspaceId: string,
  userId: string
): Promise<ToolExecutionResult> {
  try {
    const supabase = await createClient(cookies());

    // Verify workspace access
    const hasAccess = await checkWorkspaceAccess(supabase, workspaceId, userId);
    if (!hasAccess) {
      return {
        success: false,
        error: 'Unauthorized workspace access',
      };
    }

    // Execute the appropriate tool
    switch (toolName) {
      case 'create_customer':
        return await createCustomer(supabase, args, workspaceId, userId);
      
      case 'list_customers':
        return await listCustomers(supabase, args, workspaceId);
      
      case 'update_customer_stage':
        return await updateCustomerStage(supabase, args, workspaceId);
      
      case 'create_product':
        return await createProduct(supabase, args, workspaceId, userId);
      
      case 'list_products':
        return await listProducts(supabase, args, workspaceId);
      
      case 'update_product':
        return await updateProduct(supabase, args, workspaceId);
      
      case 'create_order':
        return await createOrder(supabase, args, workspaceId, userId);
      
      case 'list_orders':
        return await listOrders(supabase, args, workspaceId);
      
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      success: false,
      error: error.message || 'Internal server error',
    };
  }
}

// Tool Implementations

async function createCustomer(
  supabase: any,
  args: any,
  workspaceId: string,
  userId: string
): Promise<ToolExecutionResult> {
  const { data: customer, error } = await supabase
    .from('customers')
    .insert([
      {
        name: args.name,
        email: args.email,
        identity_document_type: args.identity_document_type,
        identity_document_number: args.identity_document_number,
        city: args.city || null,
        province: args.province || null,
        district: args.district || null,
        address: args.address || null,
        stage: args.stage || 'prospect',
        workspace_id: workspaceId,
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: `Customer "${customer.name}" created successfully`,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        stage: customer.stage,
      },
    },
  };
}

async function listCustomers(
  supabase: any,
  args: any,
  workspaceId: string
): Promise<ToolExecutionResult> {
  let query = supabase
    .from('customers')
    .select('id, name, email, stage, identity_document_number, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (args.stage) {
    query = query.eq('stage', args.stage);
  }

  if (args.search) {
    query = query.or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`);
  }

  // Apply limit
  const limit = Math.min(args.limit || 10, 50);
  query = query.limit(limit);

  const { data: customers, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      count: customers.length,
      customers: (customers as Customer[]).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        stage: c.stage,
        document: c.identity_document_number,
        created_at: c.created_at,
      })),
    },
  };
}

async function updateCustomerStage(
  supabase: any,
  args: any,
  workspaceId: string
): Promise<ToolExecutionResult> {
  // First verify the customer belongs to this workspace
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('id', args.customer_id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existingCustomer) {
    return {
      success: false,
      error: 'Customer not found or does not belong to this workspace',
    };
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .update({ stage: args.new_stage })
    .eq('id', args.customer_id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: `Customer "${existingCustomer.name}" stage updated to "${args.new_stage}"`,
      customer: {
        id: customer.id,
        name: customer.name,
        stage: customer.stage,
      },
    },
  };
}

async function createProduct(
  supabase: any,
  args: any,
  workspaceId: string,
  userId: string
): Promise<ToolExecutionResult> {
  const { data: product, error } = await supabase
    .from('products')
    .insert([
      {
        name: args.name,
        sku: args.sku,
        price: args.price,
        stock: args.stock,
        description: args.description || null,
        workspace_id: workspaceId,
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: `Product "${product.name}" created successfully`,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
      },
    },
  };
}

async function listProducts(
  supabase: any,
  args: any,
  workspaceId: string
): Promise<ToolExecutionResult> {
  let query = supabase
    .from('products')
    .select('id, name, sku, price, stock, category, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (args.category) {
    query = query.eq('category', args.category);
  }

  if (args.low_stock_only) {
    query = query.lt('stock', 10);
  }

  // Apply limit
  const limit = Math.min(args.limit || 10, 50);
  query = query.limit(limit);

  const { data: products, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      count: products.length,
      products: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stock: p.stock,
        category: p.category,
      })),
    },
  };
}

async function updateProduct(
  supabase: any,
  args: any,
  workspaceId: string
): Promise<ToolExecutionResult> {
  // First verify the product belongs to this workspace
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', args.product_id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!existingProduct) {
    return {
      success: false,
      error: 'Product not found or does not belong to this workspace',
    };
  }

  // Build update object with only provided fields
  const updateData: any = {};
  if (args.name !== undefined) updateData.name = args.name;
  if (args.price !== undefined) updateData.price = args.price;
  if (args.stock !== undefined) updateData.stock = args.stock;
  if (args.description !== undefined) updateData.description = args.description;

  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      error: 'No fields to update provided',
    };
  }

  const { data: product, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', args.product_id)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const updatedFields = Object.keys(updateData).join(', ');
  return {
    success: true,
    data: {
      message: `Product "${existingProduct.name}" updated successfully (${updatedFields})`,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        description: product.description,
      },
    },
  };
}

async function createOrder(
  supabase: any,
  args: any,
  workspaceId: string,
  userId: string
): Promise<ToolExecutionResult> {
  // Verify customer belongs to this workspace
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('id', args.customer_id)
    .eq('workspace_id', workspaceId)
    .single();

  if (!customer) {
    return {
      success: false,
      error: 'Customer not found or does not belong to this workspace',
    };
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert([
      {
        customer_id: args.customer_id,
        total: args.total,
        status: args.status || 'pending',
        order_date: args.order_date || new Date().toISOString(),
        workspace_id: workspaceId,
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: `Order created successfully for customer "${customer.name}"`,
      order: {
        id: order.id,
        customer_name: customer.name,
        total: order.total,
        status: order.status,
        order_date: order.order_date,
      },
    },
  };
}

async function listOrders(
  supabase: any,
  args: any,
  workspaceId: string
): Promise<ToolExecutionResult> {
  let query = supabase
    .from('orders')
    .select(`
      id,
      total,
      status,
      order_date,
      created_at,
      customers (
        id,
        name,
        email
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (args.status) {
    query = query.eq('status', args.status);
  }

  if (args.customer_id) {
    query = query.eq('customer_id', args.customer_id);
  }

  // Apply limit
  const limit = Math.min(args.limit || 10, 50);
  query = query.limit(limit);

  const { data: orders, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      count: orders.length,
      orders: (orders as Order[]).map((o) => ({
        id: o.id,
        customer: o.customers ? {
          id: o.customers.id,
          name: o.customers.name,
          email: o.customers.email,
        } : null,
        total: o.total,
        status: o.status,
        order_date: o.order_date,
      })),
    },
  };
}
