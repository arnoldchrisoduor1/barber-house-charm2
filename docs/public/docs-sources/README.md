# Haus of Grooming OS — Architecture documentation index

Read **in this order** for onboarding:

| Order | Document | Purpose |
|-------|----------|---------|
| 0 | [00-architecture-overview.md](./00-architecture-overview.md) | High-level system, business modes (including solo_pro/products), roles, subscriptions, 2FA, links to depth |
| 1 | [01-data-storage-and-schema.md](./01-data-storage-and-schema.md) | PostgreSQL tables/columns/relations, Redis, S3, caching, sharding |
| 2 | [02-backend-api-and-services.md](./02-backend-api-and-services.md) | Laravel modular monolith, Node calling service, APIs, critical data paths |
| 3 | [03-frontend-modules-and-ux.md](./03-frontend-modules-and-ux.md) | Next.js by mode (barber, spa, products, solo_pro, …), role views, SEO, images, security |
| 4 | [04-navigation-matrix-by-mode-and-role.md](./04-navigation-matrix-by-mode-and-role.md) | Every nav item: mode × role × path × subscription feature |

**Supporting references**

- [index.html](./index.html) — **documentation home (chapters):** (1) full-stack implementation master plan, (2) backend and APIs, (3) frontend, (4) data and storage, (5) system overview, (6) navigation matrix, (7) infrastructure costs and product pricing — open in a browser.
- [unified-architecture-and-pricing.html](./unified-architecture-and-pricing.html) — legacy **single-page** HTML (all-in-one); still linked from chapter sidebars.
- [full-stack-implementation-master-plan.md](./full-stack-implementation-master-plan.md) — phased delivery, DevOps, scale, bot protection (program view). Chapter 1 HTML is generated from this file (see `_build-ch1.mjs` in `docs/`).
- [haus-of-grooming-system-blueprint.md](./haus-of-grooming-system-blueprint.md) — screen-by-screen product blueprint.
- [technical-architecture-current-implementation.md](./technical-architecture-current-implementation.md) — prototype repo snapshot (historical).

Canonical **column definitions** for the relational model are derived from the **shared TypeScript / schema types** (Phase 0 reference); production Laravel migrations may add columns (for example `organizations.settings`, `users.two_factor_*`, `branches.organization_id` if enforced globally).

© 2026 Haus of Grooming OS. All rights reserved.
