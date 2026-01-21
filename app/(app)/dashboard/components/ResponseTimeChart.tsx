"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ResponseTimeChartProps {
  title?: string;
}

const data = [
  { time: "00:00", minutos: 3.2 },
  { time: "04:00", minutos: 2.8 },
  { time: "08:00", minutos: 4.5 },
  { time: "12:00", minutos: 3.8 },
  { time: "16:00", minutos: 2.5 },
  { time: "20:00", minutos: 2.1 },
  { time: "23:59", minutos: 2.8 },
];

export default function ResponseTimeChart({
  title = "Tiempo de Respuesta Promedio",
}: ResponseTimeChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorMinutos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              label={{
                value: "Minutos",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: "12px", fill: "#6b7280" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value) => [`${value ?? 0} min`, "Tiempo"]}
            />
            <Area
              type="monotone"
              dataKey="minutos"
              stroke="#f59e0b"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorMinutos)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}