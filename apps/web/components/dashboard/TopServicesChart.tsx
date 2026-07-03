"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatKES } from "@/lib/format";

export interface TopServicePoint {
  name: string;
  revenue: number;
  count: number;
}

const COLORS = [
  "hsl(38, 80%, 55%)",
  "hsl(38, 70%, 65%)",
  "hsl(38, 60%, 72%)",
  "hsl(220, 15%, 50%)",
  "hsl(220, 15%, 60%)",
];

interface TopServicesChartProps {
  data: TopServicePoint[];
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  const chartData = data.slice(0, 5);

  if (chartData.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No service revenue yet</p>;
  }

  return (
    <div className="h-[220px] w-full" data-testid="top-services-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [formatKES(Number(value)), "Revenue"]}
          />
          <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
