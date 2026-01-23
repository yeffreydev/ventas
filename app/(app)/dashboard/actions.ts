"use server";

import { createClient } from "@/app/utils/supabase/server";
import { cookies } from "next/headers";

export interface DashboardStats {
  totalCustomers: number;
  totalConversations: number;
  activeChats: number;
  revenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentActivities: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "message" | "customer" | "resolved" | "order";
  title: string;
  description: string;
  time: string;
}

// Default stats for immediate response
const defaultStats: DashboardStats = {
  totalCustomers: 0,
  totalConversations: 0,
  activeChats: 0,
  revenue: 0,
  pendingOrders: 0,
  lowStockProducts: 0,
  recentActivities: [],
};

export async function getDashboardStats(workspaceId?: string): Promise<DashboardStats> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Run all queries in parallel for maximum speed
    const [
      customersResult,
      ordersResult,
      productsResult,
      recentCustomersResult,
      recentOrdersResult,
    ] = await Promise.all([
      // 1. Customers count
      workspaceId 
        ? supabase.from("customers").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId)
        : supabase.from("customers").select("*", { count: "exact", head: true }),
      
      // 2. Orders with amounts
      workspaceId
        ? supabase.from("orders").select("total_amount, status").eq("workspace_id", workspaceId)
        : supabase.from("orders").select("total_amount, status"),
      
      // 3. Low stock products
      workspaceId
        ? supabase.from("products").select("*", { count: "exact", head: true }).lt("stock", 10).eq("workspace_id", workspaceId)
        : supabase.from("products").select("*", { count: "exact", head: true }).lt("stock", 10),
      
      // 4. Recent customers
      workspaceId
        ? supabase.from("customers").select("id, name, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(3)
        : supabase.from("customers").select("id, name, created_at").order("created_at", { ascending: false }).limit(3),
      
      // 5. Recent orders
      workspaceId
        ? supabase.from("orders").select("id, order_number, total_amount, created_at, customers(name)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(3)
        : supabase.from("orders").select("id, order_number, total_amount, created_at, customers(name)").order("created_at", { ascending: false }).limit(3),
    ]);

    // Calculate stats from results
    const totalCustomers = customersResult.count || 0;
    const lowStockProducts = productsResult.count || 0;
    
    const orders = ordersResult.data || [];
    const revenue = orders
      .filter((o: any) => o.status === "completed" || o.status === "processing")
      .reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0);
    const pendingOrders = orders.filter((o: any) => o.status === "pending").length;

    // Fetch Chatwoot stats separately with timeout
    let activeChats = 0;
    let totalConversations = 0;

    try {
      const chatwootPromise = fetchChatwootStats(supabase, workspaceId);
      const chatwootTimeout = new Promise<{ activeChats: number; totalConversations: number }>((resolve) => {
        setTimeout(() => resolve({ activeChats: 0, totalConversations: 0 }), 3000);
      });
      
      const chatwootResult = await Promise.race([chatwootPromise, chatwootTimeout]);
      activeChats = chatwootResult.activeChats;
      totalConversations = chatwootResult.totalConversations;
    } catch {
      // Silently fail - chatwoot stats are optional
    }

    // Build activities
    const activities: ActivityItem[] = [];

    if (recentOrdersResult.data) {
      (recentOrdersResult.data as any[]).forEach((order) => {
        let customerName = 'Cliente';
        if (order.customers) {
          if (Array.isArray(order.customers)) {
            customerName = order.customers[0]?.name || 'Cliente';
          } else {
            customerName = (order.customers as any).name || 'Cliente';
          }
        }
        
        activities.push({
          id: order.id,
          type: "order",
          title: `Nueva orden ${order.order_number}`,
          description: `${customerName} - $${order.total_amount}`,
          time: new Date(order.created_at).toLocaleDateString("es-ES") 
        });
      });
    }

    if (recentCustomersResult.data) {
      (recentCustomersResult.data as any[]).forEach((customer) => {
        activities.push({
          id: customer.id,
          type: "customer",
          title: "Nuevo cliente",
          description: customer.name,
          time: new Date(customer.created_at).toLocaleDateString("es-ES")
        });
      });
    }

    const sortedActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    return {
      totalCustomers,
      totalConversations,
      activeChats,
      revenue,
      pendingOrders,
      lowStockProducts,
      recentActivities: sortedActivities
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return defaultStats;
  }
}

async function fetchChatwootStats(
  supabase: any, 
  workspaceId?: string
): Promise<{ activeChats: number; totalConversations: number }> {
  const CHATWOOT_API_URL = process.env.CHATWOOT_API_URL;
  const CHATWOOT_APP_ACCESS_TOKEN = process.env.CHATWOOT_APP_ACCESS_TOKEN;
  
  if (!CHATWOOT_API_URL || !CHATWOOT_APP_ACCESS_TOKEN) {
    return { activeChats: 0, totalConversations: 0 };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { activeChats: 0, totalConversations: 0 };
  }

  let channelsQuery = supabase
    .from('user_chatwoot_channels')
    .select('chatwoot_inbox_id')
    .eq('user_id', user.id)
    .eq('is_active', true);
    
  if (workspaceId) {
    channelsQuery = channelsQuery.eq('workspace_id', workspaceId);
  }

  const { data: userChannels } = await channelsQuery;

  if (!userChannels || userChannels.length === 0) {
    return { activeChats: 0, totalConversations: 0 };
  }

  const userInboxIds = userChannels.map((ch: any) => ch.chatwoot_inbox_id);
  const accountId = 1;

  let apiUrl = CHATWOOT_API_URL.trim();
  if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
  if (!apiUrl.includes('/api/v1')) apiUrl = `${apiUrl}/api/v1`;

  const axios = (await import('axios')).default;
  const response = await axios.get(
    `${apiUrl}/accounts/${accountId}/conversations`,
    {
      params: { status: 'open' },
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': CHATWOOT_APP_ACCESS_TOKEN,
      },
      timeout: 2500, // 2.5 second timeout
    }
  );

  const payload = response.data?.data?.payload || response.data?.payload || [];
  const allConversations = Array.isArray(payload) ? payload : [];
  
  const filteredConversations = allConversations.filter((conv: any) =>
    userInboxIds.includes(conv.inbox_id)
  );

  return { 
    activeChats: filteredConversations.length, 
    totalConversations: filteredConversations.length 
  };
}
