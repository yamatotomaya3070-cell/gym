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

export interface TrendPoint {
  date: string  // YYYY-MM-DD
  value: number
}

interface Props {
  data: TrendPoint[]
  unit?: string
  color?: string
  label?: string
  height?: number
  decimals?: number
}

export function TrendLine({
  data,
  unit = "",
  color = "#1B3A6B",
  label = "値",
  height = 160,
  decimals = 1,
}: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        データがありません
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF4" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(5).replace("-", "/")}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          unit={unit}
          width={48}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #E8ECF4",
            fontSize: "12px",
          }}
          formatter={(value: number) => [
            `${Number(value).toFixed(decimals)}${unit}`,
            label,
          ]}
          labelFormatter={(d: string) => d}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, strokeWidth: 0, r: 2.5 }}
          activeDot={{ r: 5, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
