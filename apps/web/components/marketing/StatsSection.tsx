const STATS = [
  { value: "9", label: "Business modes" },
  { value: "50+", label: "Integrated modules" },
  { value: "24/7", label: "Operations visibility" },
  { value: "KES", label: "Local payments ready" },
];

export function StatsSection() {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-display text-3xl text-gradient-gold sm:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
