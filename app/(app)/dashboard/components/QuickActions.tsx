import React from "react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

interface QuickActionsProps {
  actions: QuickAction[];
  title: string;
}

export default function QuickActions({ actions, title }: QuickActionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`p-4 rounded-xl border transition-all duration-200 group ${
              action.variant === "primary"
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <div
              className={`w-8 h-8 mx-auto mb-3 transition-transform group-hover:scale-110 ${
                action.variant === "primary"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
              }`}
            >
              {action.icon}
            </div>
            <p
              className={`text-sm font-medium text-center ${
                action.variant === "primary"
                  ? "text-blue-900 dark:text-blue-100"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {action.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}