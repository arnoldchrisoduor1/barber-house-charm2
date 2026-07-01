"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  Car,
  Flower2,
  Gem,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UserCircle,
} from "lucide-react";

const ROWS = [
  { key: "barber", index: "01", brand: "Haus of Barber", industry: "Barbershops & grooming", Icon: Scissors },
  { key: "beauty", index: "02", brand: "Haus of Beauty", industry: "Salons & beauty parlors", Icon: Sparkles },
  { key: "spa", index: "03", brand: "Haus of Spa", industry: "Spas & wellness centres", Icon: Flower2 },
  { key: "nail_bar", index: "04", brand: "Haus of Nails", industry: "Nail bars & studios", Icon: Gem },
  { key: "clinic", index: "05", brand: "Haus of Aesthetics", industry: "Aesthetic & medical clinics", Icon: Stethoscope },
  { key: "mobile", index: "06", brand: "Haus of Mobile", industry: "On-the-road professionals", Icon: Car },
  { key: "therapy", index: "07", brand: "Haus of Therapy", industry: "Therapy & counselling", Icon: Brain },
  { key: "solo_pro", index: "08", brand: "Haus of Solo Pro", industry: "Independent professionals", Icon: UserCircle },
  { key: "products", index: "09", brand: "Haus of Products", industry: "Beauty & retail stores", Icon: ShoppingBag },
];

export function BusinessChoiceSection() {
  return (
    <section id="get-started" className="relative py-24 sm:py-32">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="label-eyebrow">Chapter 02 — Solutions</p>
        <h2 className="mt-3 max-w-xl font-display text-4xl sm:text-5xl">
          Nine specialised <span className="italic text-gradient-aurora">experiences</span>, one platform.
        </h2>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="mt-12 overflow-hidden rounded-3xl glass"
        >
          {ROWS.map((row, i) => (
            <motion.div
              key={row.key}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            >
              <Link
                href={`/get-started?category=${row.key}`}
                className={`group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-5 transition-colors hover:bg-foreground/[0.025] sm:px-8 sm:py-7 ${
                  i !== ROWS.length - 1 ? "border-b border-foreground/[0.06]" : ""
                }`}
              >
                <span className="font-mono text-xs text-muted-foreground">{row.index}</span>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-strong text-primary group-hover:bg-gradient-gold group-hover:text-primary-foreground">
                    <row.Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-display text-lg">{row.brand}</div>
                    <div className="text-xs text-muted-foreground sm:text-sm">{row.industry}</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
