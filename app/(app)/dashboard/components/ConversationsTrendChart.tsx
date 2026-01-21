"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ConversationsTrendChartProps {
  title?: string;
}

const data = [
  { date: "Lun", conversaciones: 120, resueltas: 95 },
  { date: "Mar", conversaciones: 145, resueltas: 110 },
  { date: "Mié", conversaciones: 165, resueltas: 130 },
  { date: "Jue", conversaciones: 142, resueltas: 115 },
  { date: "Vie", conversaciones: 180, resueltas: 145 },
  { date: "Sáb", conversaciones: 95, resueltas: 80 },
  { date: "Dom", conversaciones: 75, resueltas: 65 },
];

export default function ConversationsTrendChart({
  title = "Tendencia de Conversaciones",
}: ConversationsTrendChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "14px", paddingTop: "10px" }}
            />
            <Line
              type="monotone"
              dataKey="conversaciones"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 5 }}
              activeDot={{ r: 7 }}
              name="Conversaciones"
            />
            <Line
              type="monotone"
              dataKey="resueltas"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: "#10b981", r: 5 }}
              activeDot={{ r: 7 }}
              name="Resueltas"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}