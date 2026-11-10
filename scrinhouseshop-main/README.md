# ScrinHouse

Ghana's Trusted Phone Store & Repair Experts — smartphones, accessories, repair parts, and doorstep phone repair booking.

This is **Phase 1** of the build: foundation + product catalog (storefront browsing only — no auth, cart, or checkout yet).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (`base-nova` style)
- Supabase (Postgres, Auth, Storage, Realtime) via `@supabase/ssr`
- Zod validation, Vitest for unit tests

## Getting started

1. **Install dependencies** (already done if you're reading this after setup):
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine for development).

3. **Copy the env file** and fill in your project's credentials (Project Settings → API):
   ```bash
   cp .env.example .env.local
   ```
   Required for Phase 1: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

4. **Run the database migrations** against your project (in order, via the Supabase SQL editor or the Supabase CLI):
   ```
   supabase/migrations/0001_extensions_and_helpers.sql
   supabase/migrations/0002_roles_and_profiles.sql
   supabase/migrations/0003_catalog.sql
   supabase/migrations/0004_reviews.sql
   ```
   If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project, this is just:
   ```bash
   supabase db push
   ```

5. **Seed development data** (sample categories, brands, and products):
   ```bash
   psql "$DATABASE_URL" -f supabase/seed/seed.sql
   ```

6. **Run the dev server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest unit test suite |

## Project structure

```
app/                  Routes (App Router). (storefront) is a route group for public pages.
components/ui/        shadcn/ui primitives (generated — prefer `npx shadcn add` over hand-editing)
components/layout/    Header, footer, and other app-wide chrome
components/shared/    Reusable domain components (ProductCard, RatingStars, etc.)
features/             Feature-scoped components/hooks, organized by domain (catalog, repairs, ...)
lib/                  Supabase clients, env validation, generic utilities, Zod schemas
services/             Server-only data-access layer (Supabase queries mapped to domain types)
types/                Domain types + the hand-authored Supabase Database type
supabase/migrations/  SQL migrations, applied in order
supabase/seed/        Development seed data
tests/                Vitest unit tests
```

## Roadmap

Phase 1 (this phase) covers the storefront catalog only. Subsequent phases, each with its own spec/plan cycle:

1. ~~Foundation + Catalog~~ (this phase)
2. Auth + Cart + Checkout + Payments (Paystack)
3. Customer Dashboard (orders, wishlist, addresses, warranties, notifications)
4. Repair Booking (booking flow, pickup workflow, technician/rider assignment)
5. Admin Panel (products, inventory, orders, repairs, customers, employees, analytics)
6. Notifications & Comms (transactional email, SMS, live chat)
7. Blog + SEO/PWA polish
