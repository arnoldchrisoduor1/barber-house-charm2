const FEATURES = [
  { title: "Bookings & queue", desc: "Walk-ins, online booking, waitlist, and live queue boards." },
  { title: "POS & ledger", desc: "Collect payments, reconcile, and track tenant wallets." },
  { title: "CRM & loyalty", desc: "Client profiles, ownership, referrals, and rewards." },
  { title: "Staff & payroll", desc: "Schedules, commissions, tips, and payslips." },
  { title: "Inventory & retail", desc: "Stock, suppliers, consumption, and product sales." },
  { title: "Marketing", desc: "Campaigns, promotions, reviews, and WhatsApp reminders." },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="label-eyebrow">Chapter 03 — Platform</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
          Everything your front desk, chair, and back office need.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl glass p-6">
              <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
