"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface VolumeChartProps {
  data: { week: string; volume: number }[]
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          unit="kg"
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #E8ECF4",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value.toLocaleString()}kg`, "ボリューム"]}
          cursor={{ fill: "#F5F7FA" }}
        />
        <Bar
          dataKey="volume"
          fill="#1B3A6B"
          radius={[6, 6, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
