# SwapDoor – Project Overview & Handoff

> A global home exchange platform. This document summarizes the project's concept, goals, users, structure, and technical progress so far, for anyone picking up or continuing the work.

---

## 1. What is SwapDoor?

**SwapDoor** is a community-driven web platform for **home exchange** (house swapping). It connects travelers who want to temporarily swap homes with one another, letting them experience authentic, local living instead of staying in hotels — while saving significantly on accommodation costs.

- **Course context:** Korisnička sučelja (User Interfaces) – FESB, 2025/26
- **Mentor:** Mario Čagalj
- **Repo:** [github.com/ivrlic02/SwapDoor](https://github.com/ivrlic02/SwapDoor)
- **Idea pitch video:** [Watch on YouTube](https://youtu.be/juhnkCSr0zo)

### Problem Statement
Traveling often feels expensive and impersonal. Hotels are costly and rarely offer a genuine "home away from home" experience.

### Proposed Solution
SwapDoor lets users exchange homes for a set period, giving them a cost-free, authentic travel experience. The platform promotes cultural exchange, builds trust between members, and reimagines how people travel — favoring **"sharing, not spending"** over commercial accommodation.

### Target Users
- Travelers, families, and digital nomads
- People seeking authentic, affordable, and community-based stays around the world

### Design Priorities
- **Usability** — simple, intuitive, low-friction flows
- **Simplicity** — minimalist aesthetic, no clutter
- **Trust** — verified profiles, reviews, transparent communication between swap partners

---

## 2. Branding

- **Name:** SwapDoor
- **Logo:** A walking Sasquatch/Bigfoot silhouette carrying an open door — playful nod to "swap" (the door = exchanging homes) with a distinctive, memorable mascot.
- **Primary color:** Blue (dark blue wordmark/silhouette, light blue door accent)

---

## 3. User Personas

Three core personas guide design and product decisions (full source: `User personas.pdf` in repo):

### 🧳 Persona 1 — Alex Chen, "The Digital Nomad"
- **Age 28**, freelance UX/UI Designer, nomadic (home base: Berlin), ~$65k/yr, **very tech-savvy**
- **Needs:** 1–3 month stays, reliable fast Wi-Fi, real workspace, authentic (non-touristy) neighborhoods
- **Pain points:** Expensive long-term Airbnbs/rentals, unreliable advertised Wi-Fi, impersonal co-living/hotels, hassle of subletting his own place while away
- **Why SwapDoor:** Trades his Berlin apartment for a place abroad — saves money and gets a fully equipped "home" (kitchen + desk). Main drivers: **cost & practicality** (trust matters but is secondary).

### 👨‍👩‍👧‍👦 Persona 2 — Sarah Miller, "The Cautious Family Planner"
- **Age 42**, part-time Graphic Designer, Suburban Minneapolis, MN, married with 2 kids (8 & 11), **moderate tech-savvy** (can get overwhelmed by cluttered UIs)
- **Needs:** Affordable 2-week family vacation, safe/family-friendly neighborhood, full kitchen, laundry, separate bedrooms
- **Pain points:** Cost of booking multiple hotel rooms, fear of misrepresented listings, uncertainty about who she's swapping with (incl. safety of her own home)
- **Why SwapDoor:** Cost-saving is the hook, but **trust & safety features** (verified profiles, clear photos, reviews, secure communication) are what drive commitment. UI must emphasize security and clarity.

### 🌍 Persona 3 — Mateo & Elena Ruiz, "The Empty Nester Explorer(s)"
- **Age 61 (Mateo) / 59 (Elena)**, recently retired (former engineer), Buenos Aires, Argentina, adult children moved out, **low–moderate tech-savvy** (frustrated by complex sign-ups or "too many buttons")
- **Needs:** Longer immersive "bucket list" trips (3–4 weeks), authentic cultural experiences, comfort, affordability on fixed retirement income
- **Pain points:** Hotels feel soulless/impersonal, modern apps feel confusing, wary of scams, physical discomfort of small hotel rooms long-term
- **Why SwapDoor:** Aligns with desire for cultural exchange and authentic living, not just savings. UI must be **simple, clear, and trustworthy**; will rely heavily on profiles and reviews before committing to a swap.

---

## 4. Information Architecture

Sitemap (see `Sitemap.png` in repo) — top-level nav from **Homepage**:

- **Explore**
  - Search and Filters
  - My saved homes
  - Points System
- **How It Works**
  - Swap Process
  - Neighborhood Guides
- **Service**
  - Trust and Safety
  - Points system
- **Messages**
  - My trips & messages
  - My Swaps (Pending / Confirmed / Past)
  - Propose Swap
  - Notifications
- **User Menu**
  - **Dashboard** → My Swaps, Reswaps, Pending, View/Edit Listing, Calendar
  - **My Profile** → View/Edit Public Profile, My Reviews
  - **Account Settings** → Personal Info, Password, Notifications, Log Out

Card sorting exercises with personas informed this grouping to reduce navigation friction.

---

## 5. Project Requirements (Course Deliverable)

The final web application must:

- Be usable from a web browser and **responsive** across device sizes
- Support **search/filtering** of products or services (swap listings)
- Support **user login** for private content
- Include a **public blog** with multiple posts containing diverse content (images, videos, code snippets)
- Store part of its content in a **remote headless CMS**

### Demonstration & Report
- Show the **production version** live, or a demo video covering the requirements above
- **Deploy** to an appropriate cloud platform (Vercel, Netlify, or a personal VPS)
- Conduct a **usability evaluation** of the application
- Analyze performance via **[PageSpeed Insights](https://pagespeed.web.dev/)**
- Document all project phases (briefly) and the usability evaluation in a **final report**

---

## 6. Assignments Completed So Far

| # | Assignment | Summary |
|---|---|---|
| 1 | **Idea Pitch** | Defined concept, problem statement, target users, and solution. Produced a promo/pitch video. |
| 2 | **User Personas & Information Architecture** | Created 3 detailed personas + sitemap + card sorting to define navigation structure. |
| 4 | **Low/High-Fidelity Prototyping** | Designed low- and high-fidelity prototypes based on personas + IA, applying minimalist aesthetics and CRAP design principles for a trustworthy, navigable interface. |
| 5 | **Next.js – Dynamic Routes & Data Fetching** | Implemented dynamic routes for posts/swaps in Next.js, fetching data from a mock API (JSON hosted via mocki.io). Deployed to a public host (Vercel/Netlify) to demonstrate working dynamic routing. |

**Mock API (Assignment 5):** [mocki.io JSON endpoint](https://mocki.io/v1/13d0cd32-ea90-46a2-81fd-16e78d5707fe)

*(Note: Assignment 3 was not included in the provided materials — confirm if it exists/was skipped.)*

---

## 7. Tech Stack (as established so far)

- **Framework:** Next.js (dynamic routing, SSR/data fetching)
- **Data (current/interim):** Mock JSON API via mocki.io
- **Data (target/final):** Remote headless CMS (to be selected/integrated)
- **Hosting:** Vercel or Netlify (or personal VPS)
- **Design process:** Personas → IA/sitemap → card sorting → low-fi → high-fi prototypes (CRAP principles, minimalist aesthetic)

---

## 8. Open Items / Next Steps

> Status as of **2026-08-22**. [Handoff.md](./Handoff.md) is the detailed,
> maintained version of this list — §1 for what exists, "What's left to do" for
> what doesn't.

- [x] Confirm/integrate headless CMS for content storage — **Supabase**. Listings, profiles, reviews and wishlist since 2026-08-17; **blog posts (`blog_posts`) and the whole How-it-Works page (`site_content`) since 2026-08-22**, with a purpose-built editor at `/admin` (admin-only via `profiles.role` + RLS) rather than the Supabase Table Editor
- [x] Implement user authentication (login-gated private content) — Supabase Auth; six gated routes (`/dashboard`, `/profile`, `/my-listings`, `/my-listings/[id]/edit`, `/list-your-home`, `/swaps`)
- [x] Build out search/filter functionality for swap listings — destination/dates/guests + type, amenities, rating, verified, budget; List/Map toggle; URL-synced
- [x] Build public blog section with mixed media content — `/blog` + `/blog/[slug]`, **5 posts across 4 categories**, rendering ten block types including **video (the project's own pitch film) and code snippets**. The earlier narrowing to images-only was reopened on 2026-08-22: a block-model CMS made the other two nearly free, so the brief is met literally
- [x] Ensure responsive design across breakpoints — QA'd at mobile/tablet/desktop, then **redesigned for touch on 2026-08-23**: a device-measured heuristic evaluation (320–820px) and a rebuild of everything below `lg` — drawer, search sheets, Explore filter sheet, swipe galleries, 44px targets, mobile spacing — with the desktop rendering left byte-identical. See the last dated section in [Handoff.md](./Handoff.md)
- [x] **Light and dark themes** — added 2026-08-24. The dark theme stays the default and is provably unchanged; the light one is the same design re-lit, holding the same contrast floor (fg 14.65:1, muted 5.23:1, accent 4.71:1, all measured on the painted page). Switched by one control in the footer, the account menu and the mobile drawer. See the last dated section in [Handoff.md](./Handoff.md)
- [ ] Run usability evaluation with target personas (or representative users)
- [x] **Image + page-load performance pass** — added 2026-08-24. The photos were not
  slow, they were *cold*: a warm optimizer request answers in 170 ms and a cold one
  took 1.4–2.3 s, and almost every request was cold. Fixed by a 31-day image cache,
  a trimmed width ladder (226 optimizer URLs on a listing page → 94), galleries that
  fetch the next photo before it is asked for, and
  [scripts/warm-images.mjs](../../scripts/warm-images.mjs) so nobody is the first
  visitor. `/explore` also stopped querying Supabase on every request. See the last
  dated section in [Handoff.md](./Handoff.md)
- [ ] Run PageSpeed Insights performance audit *(worth running only after the next
  deploy **and** `node scripts/warm-images.mjs` — the optimizer cache is keyed to the
  build, so a fresh deployment starts cold and would be measured cold)*
- [ ] Finalize production deployment *(build is green; needs Vercel env vars + Supabase redirect URLs, and email auto-confirm turned off)*
- [ ] Compile final report (project phases + usability evaluation + performance results)
