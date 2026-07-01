const TESTIMONIALS = [
  { quote: "We replaced five apps with one calm workspace.", name: "Amina K.", role: "CEO, Nairobi salon group" },
  { quote: "Commissions and payroll finally match what happens in the chair.", name: "James O.", role: "Director, Haus of Barber" },
  { quote: "Our mobile team tracks routes, zones, and payments without friction.", name: "Priya M.", role: "Ops lead, Haus of Mobile" },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="label-eyebrow">Trusted by operators</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.name} className="rounded-2xl glass p-6">
              <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-sm">
                <strong>{t.name}</strong>
                <span className="block text-muted-foreground">{t.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
