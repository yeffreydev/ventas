import DashboardClient from "./DashboardClient";

// Make this a dynamic page to avoid blocking on server
export const dynamic = 'force-dynamic';

// Default stats to show immediately while loading
const defaultStats = {
  totalCustomers: 0,
  totalConversations: 0,
  activeChats: 0,
  revenue: 0,
  pendingOrders: 0,
  lowStockProducts: 0,
  recentActivities: [],
};

export default function DashboardPage() {
  // Don't await - let client fetch the data
  return <DashboardClient initialStats={defaultStats} />;
}
