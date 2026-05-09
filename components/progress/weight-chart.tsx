"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface WeightChartProps {
  data: { date: string; value: number; rm?: number }[]
  yLabel?: string
  color?: string
}

export function WeightChart({
  data,
  yLabel = "kg",
  color = "#1B3A6B",
}: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          unit={yLabel}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #E8ECF4",
            fontSize: "12px",
            boxShadow: "0 1px 4px rgba(27,58,107,0.06)",
          }}
          formatter={(value: number) => [`${value}${yLabel}`, "重量"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: color }}
        />
        {data[0]?.rm !== undefined && (
          <Line
            type="monotone"
            dataKey="rm"
            stroke="#22C55E"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
