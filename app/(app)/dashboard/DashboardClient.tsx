"use client";

import { useEffect, useState } from "react";
import {
  HiUsers,
  HiChatAlt2,
  HiTrendingUp,
  HiClock,
  HiCheckCircle,
  HiExclamation,
  HiChartBar,
  HiPhone,
  HiShoppingCart,
} from "react-icons/hi";
import {
  FaWhatsapp,
  FaFacebookMessenger,
  FaInstagram,
  FaTelegram,
} from "react-icons/fa";
import { Skeleton } from "@/app/components/ui/Skeleton";
import StatCard from "./components/StatCard";
import ChannelChart from "./components/ChannelChart";
import ActivityFeed from "./components/ActivityFeed";
import QuickActions from "./components/QuickActions";
import ConversationsTrendChart from "./components/ConversationsTrendChart";
import ChannelBarChart from "./components/ChannelBarChart";
import ResponseTimeChart from "./components/ResponseTimeChart";
import ConversationStatusPieChart from "./components/ConversationStatusPieChart";
import { DashboardStats, getDashboardStats } from "./actions";

import { useWorkspace } from "../../providers/WorkspaceProvider";

interface DashboardClientProps {
  initialStats: DashboardStats;
}

export default function DashboardClient({ initialStats }: DashboardClientProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    // Refresh stats when workspace context is available
    if (currentWorkspace?.id) {
       setIsLoading(true);
       getDashboardStats(currentWorkspace.id).then((freshStats) => {
         setStats(freshStats);
       }).catch(err => console.error("Failed to refresh dashboard stats for workspace:", err))
       .finally(() => setIsLoading(false));
    } else {
      // If no workspace yet, keep loading or just show what we have?
      // Assuming workspace loads quickly.
    }
  }, [currentWorkspace?.id]);

  const channelData = [
    {
      name: "WhatsApp",
      icon: <FaWhatsapp className="w-full h-full" />,
      count: 856, // Mock for now
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      percentage: 49,
    },
    {
      name: "Messenger",
      icon: <FaFacebookMessenger className="w-full h-full" />,
      count: 432, // Mock
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      percentage: 25,
    },
    {
      name: "Instagram",
      icon: <FaInstagram className="w-full h-full" />,
      count: 289, // Mock
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      percentage: 17,
    },
    {
      name: "Telegram",
      icon: <FaTelegram className="w-full h-full" />,
      count: 156, // Mock
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-100 dark:bg-sky-900/30",
      percentage: 9,
    },
  ];

  const quickActions = [
    {
      id: "1",
      label: "Nuevo Chat",
      icon: <HiChatAlt2 className="w-full h-full" />,
      variant: "primary" as const,
      onClick: () => console.log("Nuevo chat"),
    },
    {
      id: "2",
      label: "Agregar Cliente",
      icon: <HiUsers className="w-full h-full" />,
      variant: "secondary" as const,
      onClick: () => console.log("Agregar cliente"),
    },
    {
      id: "3",
      label: "Ver Reportes",
      icon: <HiChartBar className="w-full h-full" />,
      variant: "secondary" as const,
      onClick: () => console.log("Ver reportes"),
    },
    {
      id: "4",
      label: "Conectar Canal",
      icon: <HiPhone className="w-full h-full" />,
      variant: "secondary" as const,
      onClick: () => console.log("Conectar canal"),
    },
  ];

  // Transform recent activities from props to match ActivityFeed component expectation
  // Note: ActivityFeed component expects 'icon' which is a ReactNode. We need to map types to icons.
  const mappedActivities = stats.recentActivities.map(activity => ({
      ...activity,
      icon: getIconForType(activity.type)
  }));

  function getIconForType(type: string) {
      switch(type) {
          case 'message': return <HiChatAlt2 className="w-full h-full" />;
          case 'customer': return <HiUsers className="w-full h-full" />;
          case 'resolved': return <HiCheckCircle className="w-full h-full" />;
          case 'order': return <HiShoppingCart className="w-full h-full" />;
          default: return <HiChatAlt2 className="w-full h-full" />;
      }
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Bienvenido de vuelta, aquí está tu resumen de hoy
            </p>
          </div>
          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 md:px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 w-fit">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Stats Grid - 3 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          <StatCard
            title="Total Clientes"
            value={stats.totalCustomers}
            icon={<HiUsers className="w-full h-full" />}
            trend={{
              value: "+12%", // Calculate real trend later
              isPositive: true,
              label: "este mes",
            }}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
            loading={isLoading}
          />
          <StatCard
            title="Ingresos Totales"
            value={`$${stats.revenue.toFixed(2)}`}
            icon={<HiShoppingCart className="w-full h-full" />}
            trend={{
              value: "+8%",
              isPositive: true,
              label: "este mes",
            }}
             iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            loading={isLoading}
          />
           <StatCard
            title="Pedidos Pendientes"
            value={stats.pendingOrders}
            icon={<HiExclamation className="w-full h-full" />}
            trend={{
              value: "Requiere",
              isPositive: false,
              label: "atención",
            }}
            iconBgColor="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            loading={isLoading}
          />
         
          <StatCard
            title="Chats Activos"
            value={stats.activeChats}
            icon={<HiPhone className="w-full h-full" />}
            trend={{
              value: "En tiempo real",
              isPositive: true,
              label: "",
            }}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
            loading={isLoading}
          />
          {/* 
          <StatCard
            title="Tiempo de Respuesta"
            value="2m" // Mock
            icon={<HiClock className="w-full h-full" />}
            trend={{
              value: "-15%",
              isPositive: true,
              label: "más rápido",
            }}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
            iconColor="text-yellow-600 dark:text-yellow-400"
            loading={isLoading}
          />
          */}
           <StatCard
            title="Productos stock bajo"
            value={stats.lowStockProducts}
            icon={<HiExclamation className="w-full h-full" />}
            trend={{
              value: "Alerta",
              isPositive: false,
              label: "stock",
            }}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            loading={isLoading}
          />
        </div>

        {/* Main Charts - Full width trend chart */}
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ConversationsTrendChart />
          )}
        </div>

        {/* Charts Grid - 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </>
          ) : (
            <>
              <ChannelBarChart />
              <ResponseTimeChart />
            </>
          )}
        </div>

        {/* Charts Grid - 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {isLoading ? (
             <>
               <Skeleton className="h-[300px] w-full" />
               <Skeleton className="h-[300px] w-full" />
             </>
          ) : (
            <>
              <ConversationStatusPieChart />
              <ChannelChart
                channels={channelData}
                title="Distribución por Canal"
              />
            </>
          )}
        </div>

        {/* Activity Feed - Full width */}
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ActivityFeed
              activities={mappedActivities}
              title="Actividad Reciente"
            />
          )}
        </div>

        {/* Quick Actions */}
        <QuickActions actions={quickActions} title="Acciones Rápidas" />
      </div>
    </div>
  );
}
