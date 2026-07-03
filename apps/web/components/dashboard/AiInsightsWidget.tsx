"use client";

import { useMemo } from "react";
import { Calendar, DollarSign, Sparkles, TrendingUp, Users } from "lucide-react";

interface DashboardMetrics {
  todayBookings: number;
  totalCustomers: number;
  todayRevenue: number;
  activeStaff: number;
  noShowRate: number;
  chairUtil: number;
  avgTransaction: number;
  pendingBookings: number;
}

interface Insight {
  title: string;
  description: string;
  type: string;
  priority: "high" | "medium" | "low";
}

const typeIcons: Record<string, typeof Sparkles> = {
  revenue: DollarSign,
  staffing: Users,
  scheduling: Calendar,
  retention: TrendingUp,
};

const priorityColors: Record<string, string> = {
  high: "border-red-400/30 bg-red-400/5",
  medium: "border-primary/30 bg-primary/5",
  low: "border-muted-foreground/20 bg-secondary/30",
};

function buildInsights(metrics: DashboardMetrics): Insight[] {
  const insights: Insight[] = [];

  if (metrics.noShowRate > 15) {
    insights.push({
      title: "High no-show rate",
      description: `${metrics.noShowRate.toFixed(0)}% of bookings are no-shows. Consider SMS reminders or deposit policies.`,
      type: "scheduling",
      priority: "high",
    });
  }

  if (metrics.chairUtil < 40 && metrics.activeStaff > 0) {
    insights.push({
      title: "Low station utilization",
      description: `Stations are at ${metrics.chairUtil}% capacity. Promote off-peak slots or run a flash promotion.`,
      type: "staffing",
      priority: "medium",
    });
  }

  if (metrics.pendingBookings > 5) {
    insights.push({
      title: "Pending bookings backlog",
      description: `${metrics.pendingBookings} bookings awaiting confirmation. Review the queue to reduce wait times.`,
      type: "scheduling",
      priority: "medium",
    });
  }

  if (metrics.todayRevenue > 0 && metrics.avgTransaction > 0) {
    insights.push({
      title: "Revenue momentum",
      description: `Today's revenue is ${metrics.todayRevenue.toLocaleString()} KES with an average ticket of ${metrics.avgTransaction.toLocaleString()} KES.`,
      type: "revenue",
      priority: "low",
    });
  }

  if (metrics.totalCustomers > 0 && metrics.todayBookings === 0) {
    insights.push({
      title: "Quiet day ahead",
      description: "No bookings scheduled yet today. Reach out to waitlisted clients or post a same-day offer.",
      type: "retention",
      priority: "medium",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Operations look healthy",
      description: "Key metrics are within normal ranges. Keep monitoring bookings and revenue trends.",
      type: "retention",
      priority: "low",
    });
  }

  return insights;
}

export function AiInsightsWidget({ metrics }: { metrics: DashboardMetrics }) {
  const insights = useMemo(() => buildInsights(metrics), [metrics]);

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl" data-testid="ai-insights">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="flex items-center gap-2 font-heading font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Smart Insights
        </h3>
      </div>
      <div className="space-y-3 p-4">
        {insights.map((insight, i) => {
          const Icon = typeIcons[insight.type] ?? Sparkles;
          return (
            <div
              key={i}
              className={`rounded-lg border p-3 ${priorityColors[insight.priority] ?? priorityColors.low}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-md bg-secondary/80 p-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
