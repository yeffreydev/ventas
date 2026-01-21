import React from "react";

interface Activity {
  id: string;
  type: "message" | "customer" | "resolved" | "order";
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  title: string;
}

export default function ActivityFeed({ activities, title }: ActivityFeedProps) {
  const getActivityColors = (type: Activity["type"]) => {
    switch (type) {
      case "message":
        return {
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          color: "text-blue-600 dark:text-blue-400",
        };
      case "customer":
        return {
          bgColor: "bg-green-100 dark:bg-green-900/30",
          color: "text-green-600 dark:text-green-400",
        };
      case "resolved":
        return {
          bgColor: "bg-purple-100 dark:bg-purple-900/30",
          color: "text-purple-600 dark:text-purple-400",
        };
      case "order":
        return {
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
          color: "text-orange-600 dark:text-orange-400",
        };
      default:
        return {
          bgColor: "bg-gray-100 dark:bg-gray-900/30",
          color: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          Ver todo
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const colors = getActivityColors(activity.type);
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-3 rounded-lg transition-all duration-200"
            >
              <div
                className={`p-2.5 ${activity.iconBgColor || colors.bgColor} rounded-lg flex-shrink-0`}
              >
                <div className={`w-5 h-5 ${activity.iconColor || colors.color}`}>
                  {activity.icon}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}