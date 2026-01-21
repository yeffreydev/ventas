import React from "react";

interface ChannelData {
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
  percentage: number;
}

interface ChannelChartProps {
  channels: ChannelData[];
  title: string;
}

export default function ChannelChart({ channels, title }: ChannelChartProps) {
  const maxCount = Math.max(...channels.map((c) => c.count));

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        {title}
      </h2>
      <div className="space-y-5">
        {channels.map((channel) => (
          <div key={channel.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${channel.bgColor} rounded-lg`}>
                  <div className={`w-5 h-5 ${channel.color}`}>
                    {channel.icon}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {channel.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {channel.count} conversaciones
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {channel.count}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {channel.percentage}%
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${channel.bgColor} transition-all duration-500`}
                style={{ width: `${(channel.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}