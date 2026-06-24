# 10 — Design System & Tokens

Port the prototype's design system verbatim. Aesthetic: **dark-first luxury wellness** — frosted glass surfaces, aurora mesh backgrounds, gold/teal accents, Instrument Serif display headings, JetBrains Mono eyebrow labels.

> Source: `../../barber-house-charm/src/index.css` + `tailwind.config.ts`. Copy into `apps/web` (e.g. `app/globals.css` + `tailwind.config.ts`). Do not redesign.

## Typography

```ts
fontFamily: {
  heading: ['Inter', 'sans-serif'],
  body:    ['Inter', 'sans-serif'],
  display: ['Instrument Serif', 'Georgia', 'serif'],
  mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
}
```

Load via Google Fonts (Inter 300–900, Instrument Serif, JetBrains Mono) — prefer `next/font` in Next.js. Headings use `--font-heading`; hero/display uses `font-display`; eyebrow labels use mono uppercase.

## Base tokens (`:root` — dark, barber/gold default)

All colors are **HSL channel triplets** (no `hsl()` wrapper) so Tailwind composes them as `hsl(var(--x))`.

```css
--background: 220 20% 7%;     --foreground: 40 20% 92%;
--card: 220 18% 10%;          --card-foreground: 40 20% 92%;
--popover: 220 18% 10%;       --popover-foreground: 40 20% 92%;
--primary: 38 80% 55%;        --primary-foreground: 220 20% 7%;   /* gold */
--secondary: 220 15% 15%;     --secondary-foreground: 40 20% 85%;
--muted: 220 15% 15%;         --muted-foreground: 220 10% 55%;
--accent: 38 80% 55%;         --accent-foreground: 220 20% 7%;
--destructive: 0 84.2% 60.2%; --destructive-foreground: 210 40% 98%;
--border: 220 15% 18%;        --input: 220 15% 18%;   --ring: 38 80% 55%;
--radius: 0.75rem;
/* sidebar-* mirror the above for the sidebar surface */
/* glow + gradients */
--glow-gold: 38 90% 60%; --glow-violet: 268 75% 62%; --glow-cyan: 195 85% 55%;
--gradient-gold: linear-gradient(135deg, hsl(38 80% 55%), hsl(45 90% 65%));
--gradient-aurora: linear-gradient(135deg, hsl(var(--glow-gold)) 0%, hsl(var(--glow-violet)) 55%, hsl(var(--glow-cyan)) 100%);
--gradient-dark: linear-gradient(180deg, hsl(220 20% 7%), hsl(220 18% 12%));
/* shadows + glass */
--shadow-gold: 0 0 40px -10px hsl(38 80% 55% / 0.3);
--shadow-card: 0 8px 32px -8px hsl(0 0% 0% / 0.4);
--shadow-glass: 0 24px 80px -32px hsl(0 0% 0% / 0.6), 0 1px 0 0 hsl(40 30% 90% / 0.06) inset;
--shadow-glow: 0 0 80px -20px hsl(var(--glow-gold) / 0.45);
--glass-bg: 220 22% 11% / 0.55;
--glass-border: 40 30% 92% / 0.08;
```

## Per-mode theme classes (primary hue overrides on `<html>`)

| Class | Mode | `--primary` (HSL) | Note |
|-------|------|-------------------|------|
| (none) | barber | `38 80% 55%` | base gold |
| `theme-beauty` | beauty | `330 70% 60%` | pink |
| `theme-spa` | **wellness/spa** | `170 55% 38%` | deep teal; also shifts background `200 18% 8%`, card `195 16% 11%` |
| `theme-nail` | nail_bar | `350 65% 55%` | rose gold |
| `theme-clinic` | clinic | `210 70% 50%` | clinical blue |
| `theme-mobile` | mobile | `145 60% 42%` | green |
| `theme-therapy` | therapy | `270 55% 55%` | purple |
| `theme-solo` | solo_pro | `38 92% 50%` | amber |
| `theme-both` | multi (Haus of Wellness) | `350 60% 58%` | rose-gold blend |
| **`theme-products`** | products | **MISSING — add it** | suggest `25 85% 55%` retail-orange |
| `.light` | any | `38 80% 45%` | light-mode override |

Each theme block overrides `--primary`, `--accent`, `--ring`, sidebar primaries, `--gradient-gold`, `--shadow-gold`. `theme-spa` additionally retunes background/card/border/muted for the wellness identity.

> **Action:** add the missing `.theme-products` block during the port (gap noted in `08`).

## Tailwind theme extension

- Semantic colors map to `hsl(var(--token))`: `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `popover`, `card`, `destructive`, `border`, `input`, `ring`, full `sidebar.*` set.
- Literal `gold: { DEFAULT: hsl(38 80% 55%), light: hsl(45 90% 65%), dark: hsl(35 70% 40%) }`.
- `borderRadius` lg/md/sm derived from `--radius`.
- `darkMode: ["class"]` — dark is default; `.light` class toggles light. Plugin: `tailwindcss-animate`.

## Signature utility classes (port from prototype)

`.glass`, `.glass-strong` (frosted surfaces), `.mesh-aurora`, `.mesh-ambient` (animated backgrounds), `.stat-tile` (KPI cards), `.nav-pill` (sidebar items), `.label-eyebrow` (mono uppercase tracking labels), `.text-gradient-gold`, `.text-gradient-aurora`, `.shadow-gold`, `.shadow-glow`.

## Theme application logic

`useBusinessCategory` toggles the theme class on `<html>` based on active categories (single mode → its class; multiple → `theme-both`). `ThemeToggle` toggles `.light` and persists `haus-theme` (`dark|light`) in localStorage. Port both behaviors.

## Component library

Port all **48 shadcn/ui primitives** (`src/components/ui/`) — they already consume the token vars, so they theme automatically. Build the new shared `<DataTable>` (see `02`) on top of `ui/table.tsx`. Charts via `ui/chart.tsx` (Recharts wrapper); reuse `RevenueChart`, `TopServicesChart`, `PaymentMethodsChart`, `StaffLeaderboard`.
