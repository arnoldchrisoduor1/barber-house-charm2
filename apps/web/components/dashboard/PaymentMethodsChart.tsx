"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatKES } from "@/lib/format";

export interface PaymentMethodPoint {
  method: string;
  amount: number;
  count: number;
}

const COLORS: Record<string, string> = {
  mpesa: "#4ade80",
  cash: "hsl(38, 80%, 55%)",
  card: "#60a5fa",
};

interface PaymentMethodsChartProps {
  data: PaymentMethodPoint[];
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No payment data yet</p>;
  }

  return (
    <div className="flex items-center gap-4" data-testid="payment-methods-chart">
      <div className="h-[160px] w-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="method"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.method} fill={COLORS[d.method] ?? "#888"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [formatKES(Number(value)), "Amount"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d) => (
          <div key={d.method} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[d.method] ?? "#888" }}
              />
              <span className="text-sm capitalize text-muted-foreground">{d.method}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-foreground">
                {total > 0 ? Math.round((d.amount / total) * 100) : 0}%
              </span>
              <span className="ml-2 text-xs text-muted-foreground">({d.count})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
