# 🚪 SwapDoor | Home Exchange Web Application

# 📁 Project Overview

SwapDoor is a Next.js-based community platform for **home exchange** (house swapping). It connects travelers who want to temporarily swap homes with one another, letting them experience authentic, local living instead of staying in hotels — while saving significantly on accommodation costs. Members publish their own home, browse and filter homes worldwide on a list or an interactive map, propose a swap for specific dates, negotiate it in a message thread, and review each other afterwards. This report outlines the development process and the main features of the web application, which was created as part of a multi-stage assignment for the course *Korisnička sučelja* (FESB, 2025/26, mentor: Mario Čagalj). The project included defining personas and information architecture, designing low- and high-fidelity prototypes, implementing a responsive interface, and developing dynamic functionality such as authentication, listing creation, a swap request system, and a custom headless CMS.

**Problem:** traveling is expensive and impersonal — hotels cost a lot and rarely offer a genuine "home away from home".
**Solution:** exchange homes for a set period instead of paying for accommodation — *sharing, not spending*.
**Target users:** travelers, families, and digital nomads looking for authentic, affordable, community-based stays.

# 📂 Assignment Overview

## 1. Idea Pitch
- 🔗 Link to Assignment 1: [**Idea Pitch**](https://github.com/ivrlic02/SwapDoor/tree/main/assignments/Idea%20Pitch)

- Define the topic of the web application
- Clearly describe the problem it aims to solve
- Define who the targeted users are and how they would benefit from using this application

## 2. User personas and information architecture
- 🔗 Link to Assignment 2: [**User Personas**](https://github.com/ivrlic02/SwapDoor/blob/main/assignments/User%20personas%20and%20information%20architecture)

- Three well-defined user personas: **Alex Chen** (digital nomad, driven by cost and practicality), **Sarah Miller** (cautious family planner, driven by trust and safety), and **Mateo & Elena Ruiz** (retired explorers, driven by simplicity and authenticity)
- Detailed descriptions of each persona's objectives, motivations, and challenges when using the platform
- Information architecture structured around the needs of these personas, validated through card sorting
- A sitemap illustrating the platform's page hierarchy and overall navigation structure

## 3. Next.js – Application Deployment
- 🔗 Link to Assignment 3: [**Next.js - Deploying Application**](https://swap-door.vercel.app/)

- Initialize a new Next.js project as the foundation of the web application
- Create template pages based on the categories defined in the project's sitemap
- Implement application routes that correspond to the planned page structure
- Ensure proper navigation between pages using the Next.js Link component
- Deploy the initial version of the application to Vercel and verify it is publicly accessible

## 4. Low/High-fidelity prototype
- 🔗 Link to Assignment 4: [**Low/High-fidelity prototype**](https://github.com/ivrlic02/SwapDoor/tree/main/assignments/Low%20High-fidelity%20prototype)

- High-fidelity desktop homepage prototype demonstrating the visual style, layout, and content hierarchy
- High-fidelity mobile homepage prototype adapted for smaller screens and touch interaction
- Visual foundation for implementing the Next.js interface, ensuring consistency between design and the built application

## 5. Next.js - Dynamic routes, data fetching
- 🔗 Link to Assignment 5: [**Next.js - Dynamic routes, data fetching**](https://swap-door.vercel.app/explore)

- Dynamic routing implementation (`/explore/[id]`, `/blog/[slug]`, `/swaps/[id]`, `/my-listings/[id]/edit`)
- Data fetching and state management from a remote database
- Server actions and route handlers for backend functionality

# 🚀 Technologies And Features

**Frontend**

- HTML: Structure and semantic layout of pages
- CSS: Custom properties (design tokens) and layout adjustments
- TypeScript (ES6+): Client-side logic and interactivity, fully typed
- React 19 (Next.js App Router): Component-based frontend architecture with Server and Client Components
- Next.js 16: Full-stack React framework used for routing, SSR/SSG/ISR, and data fetching
- Tailwind CSS v4: Utility-first styling driven by semantic `@theme` tokens for responsive design and UI consistency
- Next/Image: Optimized image handling with a trimmed width ladder and a 31-day cache
- Custom SVG icon set and a traced brand component (`brand.tsx`) — no icon dependency
- Leaflet + leaflet.markercluster: Interactive maps with theme-aware tiles and pin clustering
- React Hooks: useState, useEffect, useMemo, and custom hooks for state and lifecycle management
- React Context API: Global state for profile, wishlist, swap badge, and search
- Next.js Link component: Client-side navigation between pages
- Next.js Router (next/navigation): Programmatic navigation and URL-synced filters
- Light and dark themes: applied before first paint, switchable from the footer, account menu, and mobile drawer

**Backend**

- Supabase Client (@supabase/supabase-js, @supabase/ssr): Communication with Supabase from both server and browser
- Next.js Server/Client architecture: Separation of server and client components
- Server Actions: Mutations for listings, profiles, reviews, swaps, and CMS content
- Single data layer (`lib/houses.ts`, `lib/swaps.ts`, `lib/places.ts`): API interaction and business logic kept out of components
- Async/Await pattern: Used for all asynchronous operations
- Middleware (`proxy.ts`): Session refresh and route gating for private pages

**Authentication**

- Supabase Auth: Email/password authentication system
- JWT Authentication: Secure session handling through Supabase
- Session Management: Cookie-based sessions shared between server and client
- User Registration & Login: Custom sign-in/sign-up form that honours `?next=` and ends inside the app
- Protected Routes: `/dashboard`, `/profile`, `/my-listings`, `/list-your-home`, `/swaps`, `/admin`

**Database**

- Supabase PostgreSQL Database: Primary relational database

**Tables**

- `houses` – home listings
- `profiles` – user profile data (incl. `role` for admin access)
- `saved_homes` – wishlist
- `reviews` – member reviews and ratings
- `swap_requests`, `swap_messages` – swap proposals and conversations
- `countries` (250) and `cities` (50,154) – reference geography from GeoNames
- `blog_posts`, `site_content` – headless CMS content
- Row Level Security (RLS): Policies on every table controlling read and write access
- Triggers: Automatic profile creation on signup, swap status machine, rating recalculation
- SQL Constraints: Unique indexes and CHECK constraints for data integrity
- RPC functions: `delete_own_account()`, ranked place search, `my_swap_badge()`

**Storage**

- Supabase Storage: Used for uploading and serving all media
- Public Buckets (`house-photos`, `avatars`): Listing photos and profile pictures
- File Upload Handling: Image upload with live preview before publishing

## Features Implemented

- User authentication (signup/login/logout) with a welcome state after registration
- Home listing marketplace with list and map views
- Search and filtering: destination, dates, guests, home type, amenities, rating, verified hosts, budget — all URL-synced
- Listing detail pages with photo mosaic, lightbox, amenities, reviews, and a location map
- Listing creation: 4-step form with a live card preview, autosaved draft, Country → City pickers, and a confirming map
- Listing editing and unlisting for owners
- Swap request system: propose, accept, decline, withdraw, with a message thread and unread badges
- Availability calendar with real date windows per home
- Wishlist / saved homes dashboard
- User profile with photo upload, travel preferences, a profile strength meter, and account settings
- Member reviews with a ✓ Verified host badge derived in the database
- Public blog with 5 posts across 4 categories, rendering ten block types including video and code snippets
- Headless CMS at `/admin`: post list with drafts, block editor, and the How-it-Works section editor (admin-only via RLS)
- Interactive globe and maps drawn from real listings, with pin clustering
- Custom 404 pages, error handling, and form validation
- Responsive design for mobile, tablet, and desktop
- Light and dark theme support

**Development Tools**

- Node.js: Runtime environment for the project
- npm: Dependency and package management
- Git / GitHub: Version control and repository hosting
- Vercel: Deployment and hosting platform for the application
- TypeScript: Static typing for safer and more maintainable code
- ESLint: Zero lint errors across `app/`, `components/`, `lib/`, and `scripts/`

# 📝 Basic Design Principles

The interface follows several core design principles:

- A semantic token system (`bg`, `surface`, `brand`, `accent`, `fg`, `muted`) — no raw hex in components, so both themes are one variable block apart
- A blue monochrome palette following the 60-30-10 rule, which stays colour-blind safe
- Consistent typography and one shared button system
- Clear emphasis on important elements such as home cards, the search bar, and CTAs
- Strong contrast between text and background (light theme measured at 14.65:1 for text and 5.23:1 for muted text)
- Structured layout with related information grouped together

These principles help make the platform easy to navigate and trustworthy at a glance.

# 🔍 Norman's 7 Strategies

The project applies Norman's strategies to make key actions discoverable, understandable, and predictable for both new and returning users.

1. ***Discoverability*** - Main navigation, search, filters, and CTAs are always visible and clearly named.
2. ***Feedback*** - Buttons, filters, save and swap actions respond with hover, active, and confirmation states.
3. ***Conceptual Model*** - Homes are shown as a familiar list-plus-map with filters and details similar to other travel sites.
4. ***Affordances*** - Interactive elements look clickable through consistent shapes, borders, and 44px touch targets.
5. ***Signifiers*** - Each search segment carries its own glyph, and labels and placeholders guide users at rest, not only on hover.
6. ***Mappings*** - Calendar, map pins, and the swap inbox tabs are ordered the way users expect.
7. ***Constraints*** - Required fields, disabled unavailable dates, and a stepped listing form prevent errors before they happen.

# 🧪 Usability Evaluation

Three heuristic evaluations were carried out using the course method — findings ranked by severity, each tied back to a lecture — and measured in headless Chrome against the running production build rather than eyeballed:

- **Explore section** — working date filters, verified hosts, and a docked search consistent with the homepage
- **Landing page** — eight fixes, including raising the search bar onto its own surface token (1.35:1 → 1.56:1 against the page) and lifting placeholder text to AA contrast (4.12:1 → 4.99:1)
- **Mobile and tablet (320–820px)** — everything below 1024px rebuilt for touch: drawer navigation, search sheets, swipe galleries, and 44px targets, with the desktop rendering left unchanged

# ⚡ Analyze the application's performance

Audited with Lighthouse 12.8.2 against the live deployment:

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| **Desktop** | 100 | 92 | 100 | 92 |
| **Mobile** | 93 | 92 | 100 | 92 |

Cumulative Layout Shift is **0** on both form factors and server response time is **30 ms**. The mobile LCP of 2.9 s is a simulated-throttling artifact — the LCP element is the server-rendered hero heading, observed on screen at 642 ms.

# 📝 Future improvements

- Points/credit system for non-simultaneous swaps
- Multi-Language Support
- Push Notifications & Emails
- Identity verification for hosts
- Personalized recommendations

# ✅ App available [here](https://swap-door.vercel.app/)
