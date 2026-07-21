# ScrinHouse — Project Status

**Ghana's trusted phone store & repair booking app**
Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (base-nova) · Supabase · Zod · Vitest

---

## Phase 1 — Foundation + Catalog ✅
- Standard storefront pages, filters, search, and admin dashboards for products, categories, and brands.

## Phase 2 — Auth + Cart + Checkout + Payments ✅
- Customer sign-up, login, and sign-out server actions.
- Client-side Zustand cart drawer and cart page.
- Checkout shipping form pre-filled with profile details.
- Place order server action + Paystack checkout redirection & webhook endpoint to update order status on payment verification.
- Auto-sliding hero slideshow banner on the home page.

## Phase 3 — Customer Dashboard ✅
- Tabbed customer dashboard route (`/account`) displaying:
  - **Orders**: Full order history.
  - **Wishlist**: Saved products list with "Add to Cart" and "Remove" actions.
  - **Addresses**: Saved delivery addresses with full CRUD forms.
  - **Warranties**: Active/expired device warranties.
- Saved address dropdown selector integrated into checkout shipping form.
- Live order status tracker page (`/track`) showing status progress timeline.
- Public warranty verification checker page (`/warranty`) via IMEI / serial lookup.

## Phase 4 — Repair Booking ✅
- Repair landing page (`/repairs`) introducing services, warranties, and advantages.
- Multi-step interactive repair wizard booking page (`/repairs/book`) containing:
  - Upfront estimated pricing set by the admin (calculated dynamically in real-time).
  - Pre-filled customer contact details and optional saved address pick-up details.
  - Generates tracking ID for progress tracking.
- Test suite verification for repair bookings.

---

## Storefront Page Status

| Route | Status |
|---|---|
| `/` (homepage) | ✅ Hero Banner Slideshow + Category Nav + New Arrivals grid |
| `/category/[slug]` | ✅ Listing page with filters, sort, pagination |
| `/products/[slug]` | ✅ Full product detail (gallery, variant selector, wishlist heart button, related products) |
| `/search` | ✅ Search results page |
| `/cart` | ✅ Full cart summary with items, quantites, and checkout redirection |
| `/checkout` | ✅ Saved addresses selector and checkout form |
| `/account` | ✅ Tabbed profile, orders, wishlist, addresses CRUD, and warranties list |
| `/track` | ✅ Live order/repair search tracker and progress timeline |
| `/warranty` | ✅ Public IMEI/Serial warranty lookup and remaining days countdown |
| `/repairs` | ✅ Services introduction and details landing page |
| `/repairs/book` | ✅ Interactive repair wizard booking and live price estimates |
| `/about`, `/contact`, `/faq`, `/blog` | ⏳ Likely stubs |

---

## Design System

**Strict monochrome aesthetic**:
- Black / white / gray only — no decorative accent colors.
- Typography-led hierarchy (Cabinet Grotesk + Switzer fonts).
- Flat product cards (hairline border, no shadow).
- Clear, clean UI layout with rounded corner product images and no decorative gradients.

---

## Upcoming Phases

5. **Admin Panel** (orders, repairs, customers, employees, analytics)
6. **Notifications & Comms** (email, SMS, live chat)
7. **Blog + SEO/PWA polish**
