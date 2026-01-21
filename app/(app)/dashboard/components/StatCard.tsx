import React from "react";
import { Skeleton } from "@/app/components/ui/Skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    label: string;
  };
  iconBgColor?: string;
  iconColor?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  iconBgColor = "bg-blue-100 dark:bg-blue-900/30",
  iconColor = "text-blue-600 dark:text-blue-400",
  loading = false,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-8 md:h-9 w-20 md:w-24 mb-2 md:mb-3" />
          ) : (
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          )}
          
          {loading ? (
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ) : (
             trend && (
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {trend.value}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {trend.label}
                </span>
              </div>
            )
          )}
        </div>
        <div className={`p-2 md:p-3 ${iconBgColor} rounded-xl flex-shrink-0`}>
          <div className={`w-6 h-6 md:w-8 md:h-8 ${iconColor}`}>{icon}</div>
        </div>
      </div>
    </div>
  );
}