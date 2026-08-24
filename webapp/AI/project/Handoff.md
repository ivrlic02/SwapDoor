# SwapDoor – Handoff & Work Plan

> Originally written after a full pass over the codebase, with the goal of finishing the app to course-requirement quality in ~2–3 focused days, redoing the color system, and connecting **Supabase** for auth + data (headless CMS role). All three are done.
>
> **Last updated: 2026-08-23.** Read **§1** for what exists now, **"What's left to do"** for what doesn't, and the dated sections at the bottom for the reasoning behind each change (they are the raw material for the final report).

---

## 1. Where the project stands today

> This section is kept **current**. The dated sections further down are the
> historical record of how it got here — read those for the *why* behind a
> decision, this one for *what exists now*.

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, **Supabase** (auth + Postgres + Storage), Leaflet for maps.

`tsc`, `eslint` (over `app/`, `components/`, `lib/` and `scripts/`) and `next build` are all clean; the project still has **zero lint errors**.

> A note that briefly stood here recorded two faults caught mid-flight during the light-mode pass — a bare `accent` left behind in `globe.tsx` while its colours were being moved onto tokens (`TS2304`), and a `set-state-in-effect` violation in the first draft of `theme-toggle.tsx`. **Both are fixed** as of 2026-08-24 and the tree is green; the second one is written up properly in that pass's dated section, since the lint rule was pointing at a real bug rather than a style preference.

**Two themes since 2026-08-24** — dark (the default, and unchanged) and light — switched by `<ThemeToggle>` in the footer, the account menu and the mobile drawer, and applied before first paint by an inline script in [app/layout.tsx](../../app/layout.tsx). See the last dated section in this file.

**Routes** — ○ static · ● SSG · ƒ dynamic (server-rendered per request) · 🔒 login-gated in `proxy.ts`

| Route | File | State |
|-------|------|-------|
| ○ `/` | [app/(home)/page.tsx](../../app/%28home%29/page.tsx) | Nav + collapsing search + Hero + interactive map (one shared search), Trending, HowItWorks, Stats, CTA, Footer |
| ƒ `/explore` | [app/explore/page.tsx](../../app/explore/page.tsx) | Filters (pills + budget bar + amenities drawer), List/Map toggle, split map with hover-sync, everything URL-synced. A destination with no homes **widens to its country, then to everything**, saying which it did (2026-08-23) |
| ● `/explore/[id]` | [app/explore/[id]/page.tsx](../../app/explore/[id]/page.tsx) | Photo mosaic + lightbox, amenities, reviews, "Where you'll be" map, swap panel, similar homes |
| ○ `/how-it-works` | [app/how-it-works/page.tsx](../../app/how-it-works/page.tsx) | Sticky step rail (scroll-spy) beside a **live product panel per step**, trust cards, FAQ grouped into Money / Safety / Dates / Your home. Every word comes from the CMS `site_content` table (2026-08-22) |
| ƒ `/blog`, ● `/blog/[slug]` | [app/blog](../../app/blog) | Editorial list with a URL-synced category filter; posts render **ten block types** — text, list, image, gallery, quote, callout, YouTube (click-to-load), code, and a **live listing card** read from `houses`. 5 posts from Supabase `blog_posts` (2026-08-22) |
| ○ `/sign-in` | [app/sign-in/page.tsx](../../app/sign-in/page.tsx) | Real Supabase email/password sign-in + sign-up; honours `?next=` |
| ƒ `/dashboard` 🔒 | [app/dashboard/page.tsx](../../app/dashboard/page.tsx) | Saved homes (wishlist) |
| ƒ `/profile` 🔒 | [app/profile/page.tsx](../../app/profile/page.tsx) | Photo upload, name/location/bio, a **Travel & swap** block (who you travel with, what for, trip length, pets/smoking), a **Profile strength** meter, the live "how hosts see you" preview, **Your reviews**, and `#account` (change email, password, sessions, delete account) |
| ƒ `/my-listings` 🔒 | [app/my-listings/page.tsx](../../app/my-listings/page.tsx) | Homes you host, with Edit + inline-confirming Unlist |
| ƒ `/my-listings/[id]/edit` 🔒 | [app/my-listings/[id]/edit/page.tsx](../../app/my-listings/%5Bid%5D/edit/page.tsx) | The listing form reopened on an existing home; owner-only |
| ƒ `/list-your-home` 🔒 | [app/list-your-home/page.tsx](../../app/list-your-home/page.tsx) | 4-step form (3 + a review) beside a live card preview; autosaved draft, Country → City pickers over the `countries`/`cities` tables (a picked city carries its own coordinates; the geocoder only runs for a place typed freehand) + confirming map, publishes a real `houses` row owned by you |
| ƒ `/swaps` 🔒 | [app/swaps/page.tsx](../../app/swaps/page.tsx) | Swap inbox: Needs your answer / You asked / Confirmed / Past, with per-tab counts and unread badges |
| ƒ `/swaps/[id]` 🔒 | [app/swaps/[id]/page.tsx](../../app/swaps/%5Bid%5D/page.tsx) | One request: its terms, Accept / Decline / Withdraw, and the message thread |
| ƒ `/admin` 🔒 | [app/admin](../../app/admin) | **The CMS.** Post list (drafts included), block editor, and the How-it-Works section editor. Admin-only: `profiles.role = 'admin'`, enforced by RLS and re-checked in the layout (2026-08-22) |
| ƒ `/auth/callback` | [app/auth/callback/route.ts](../../app/auth/callback/route.ts) | Completes email-confirmation / OAuth sign-in |
| ○ `/privacy`, ○ `/terms` | [app/privacy/page.tsx](../../app/privacy/page.tsx) · [app/terms/page.tsx](../../app/terms/page.tsx) | The two pages the footer used to promise as “(soon)”. Both drawn by [legal-doc](../../components/legal-doc.tsx); content is specific to this codebase, not boilerplate (2026-08-22) |
| ○ 404 | [app/not-found.tsx](../../app/not-found.tsx) · [app/swaps/not-found.tsx](../../app/swaps/not-found.tsx) | Site-wide dead end, plus a swaps-scoped one whose two exits are *All my swaps* / *Browse homes* (2026-08-22) |

**Data:** everything comes from **Supabase** (project ref `jkxtknkrmctgecpeozvb`) through the single data layer in [lib/houses.ts](../../lib/houses.ts), which still falls back to the original gist if Supabase is unconfigured or a query fails. Tables: `houses`, `profiles`, `saved_homes`, `reviews`, `swap_requests`, `swap_messages`, plus the reference geography `countries` (250) and `cities` (50,154); Storage buckets: `avatars` (7 objects) and `house-photos` (55) — since **2026-08-23 every listing photo and every host avatar is served from Storage**, not hotlinked to Unsplash ([scripts/seed-storage-media.mjs](../../scripts/seed-storage-media.mjs), last dated section). Schema of record: [supabase/schema.sql](../../supabase/schema.sql), [supabase/swaps.sql](../../supabase/swaps.sql) (swap requests + messaging, applied 2026-08-21) [supabase/places.sql](../../supabase/places.sql) (the Country/City pickers, applied 2026-08-21 — seeded from GeoNames by [scripts/build-places-seed.mjs](../../scripts/build-places-seed.mjs)) [supabase/profile.sql](../../supabase/profile.sql) (the Travel & swap profile columns + the `delete_own_account()` RPC, applied 2026-08-22), [supabase/trust.sql](../../supabase/trust.sql) (what the ✓ Verified badge means, applied 2026-08-22) and [supabase/reviews.sql](../../supabase/reviews.sql) (members writing reviews + the rating trigger, applied 2026-08-22).

**Key components**
- **Chrome:** [navigation](../../components/navigation.tsx) (+ [user-menu](../../components/user-menu.tsx), [mobile-account](../../components/mobile-account.tsx)), [footer](../../components/footer.tsx) (+ [footer-account](../../components/footer-account.tsx), the one client-side column, so the rest stays a Server Component), [button](../../components/button.tsx) (the one button system), [avatar](../../components/avatar.tsx), [cta](../../components/cta.tsx) (the closing block — asks for a different next step signed out / signed in / hosting).
- **Brand:** [brand](../../components/brand.tsx) — the one place the logo is drawn (`<DoorMark>` the animated nav mark, `<MascotGlyph>`, `<Wordmark>`, `<Lockup>`), over the traced paths in [lib/brand-art.ts](../../lib/brand-art.ts). Motion lives in the `.door-mark` block in [globals.css](../../app/globals.css); the icons and social cards are generated by [scripts/build-brand-assets.mjs](../../scripts/build-brand-assets.mjs).
- **App-wide state:** [profile-context](../../components/profile-context.tsx) (who's signed in, loaded once), [saved-context](../../components/saved-context.tsx) (wishlist ids, loaded once), [swaps-context](../../components/swaps-context.tsx) (the account badge count) — all three providers live in [app/layout.tsx](../../app/layout.tsx).
- **Controls:** [select](../../components/select.tsx) (the one dropdown — Explore's sort, the listing form's home type, the swap panel's offered home; replaced the last three native `<select>`s, whose OS-drawn menus were the only white surfaces on the site), [suggest-input](../../components/suggest-input.tsx) (the combobox behind Country / City, static or fetched).
- **Places:** [lib/places.ts](../../lib/places.ts) — Supabase-backed country and city lookup (`searchCountries`, `searchCities`, `searchCitiesGlobal`, `findCountry`), replacing the two hand-typed arrays that used to live there.
- **Search + map:** [home-search-context](../../components/home-search-context.tsx) (the destination is structured — label + city + country + ISO code — since 2026-08-23), [search-fields](../../components/search-fields.tsx) (the "Where" panel is a real combobox with Near me / Anywhere / Recent / Whole country), [lib/place-filter](../../lib/place-filter.ts) (the one place that decides what a destination matches, shared by Explore and both maps), [lib/recent-places](../../lib/recent-places.ts), [home-hero-map](../../components/home-hero-map.tsx), [map-section](../../components/map-section.tsx) → [home-map](../../components/home-map.tsx), [explore-map](../../components/explore-map.tsx), [house-map](../../components/house-map.tsx).
- **Listings:** [house-card](../../components/house-card.tsx) (shared by Explore/Trending/My listings), [card-gallery](../../components/card-gallery.tsx), [gallery](../../components/gallery.tsx), [swap-panel](../../components/swap-panel.tsx), [reviews-section](../../components/reviews-section.tsx), [amenity-list](../../components/amenity-list.tsx), [save-button](../../components/save-button.tsx).
- **Swaps:** [swap-dock-context](../../components/swap-dock-context.tsx) (docks the panel into the nav), [swap-actions](../../components/swap-actions.tsx) (accept / decline / withdraw), [swap-thread](../../components/swap-thread.tsx) (the conversation), data layer [lib/swaps.ts](../../lib/swaps.ts) + client-safe [lib/swap-types.ts](../../lib/swap-types.ts).
- **Account:** [auth-form](../../components/auth-form.tsx), [profile-form](../../components/profile-form.tsx), [profile-strength](../../components/profile-strength.tsx), [my-reviews](../../components/my-reviews.tsx), [account-settings](../../components/account-settings.tsx), [listing-form](../../components/listing-form.tsx), [unlist-button](../../components/unlist-button.tsx), [trust-checklist](../../components/trust-checklist.tsx), [review-form](../../components/review-form.tsx) (+ [swap-review](../../components/swap-review.tsx), the accepted-swap entry point); client-safe field constants + the strength calculation in [lib/profile-types.ts](../../lib/profile-types.ts), and the Verified thresholds in [lib/trust.ts](../../lib/trust.ts).
- **Helpers:** [lib/house-types.ts](../../lib/house-types.ts) (client-safe types/constants), [lib/storage.ts](../../lib/storage.ts), [lib/geocode.ts](../../lib/geocode.ts), [lib/coordinates.ts](../../lib/coordinates.ts), [lib/explore-query.ts](../../lib/explore-query.ts), [lib/seo.ts](../../lib/seo.ts) (`pageMetadata()` — the one place a page's share tags are built; Next replaces the `openGraph`/`twitter` blocks wholesale, so they must always travel together).

---

## 2. Bugs & issues found (fix these first — they're cheap)

1. ✅ **FIXED — Invisible text on the detail page.** [app/explore/[id]/page.tsx](../../app/explore/[id]/page.tsx) used `text-gray-700` on a near-black background → unreadable. Now `text-muted`.
2. ✅ **FIXED — Wrong page metadata.** [app/layout.tsx](../../app/layout.tsx) now has a proper SwapDoor title + description. Open Graph / Twitter card images landed 2026-08-21 ([app/opengraph-image.png](../../app/opengraph-image.png)), along with `metadataBase` so they resolve to an absolute URL.
3. ✅ **FIXED — globals.css default.** [app/globals.css](../../app/globals.css) is now the single source of truth for color tokens; the Arial/`prefers-color-scheme` conflict is gone and Geist applies.
4. ✅ **FIXED — Magic hex everywhere.** All `#0f1115` / `#1a1d23` / `#13161c` / `blue-*` / `gray-*` replaced with semantic tokens across every component and page.
5. ✅ **FIXED — Hero search now works.** [components/hero.tsx](../../components/hero.tsx) uses a text "Where", a native date "When", and a numeric "Guests"; `onSubmit` builds `?q=&date=&guests=` and pushes to `/explore`, which reads those params and lands pre-filtered.
6. ✅ **FIXED — `next/image` everywhere.** Every listing/blog `<img>` is now `next/image` (explore grid, trending, detail page, blog list + post). `next.config.ts` allows `images.unsplash.com`; lint is warning-free. **Bonus:** 5 of the gist's 10 Unsplash photos had been removed upstream (404) — they're now overridden to verified-working replacements in [lib/houses.ts](../../lib/houses.ts) (`IMAGE_REPLACEMENTS`), so every card shows an image (better LCP).
7. ✅ **FIXED — No input labels.** Hero search inputs now have `aria-label`s.
8. ⬜ **Stats are invented numbers** ("50K+ Members", etc.) hardcoded in [components/stats.tsx](../../components/stats.tsx) — fine for a demo, but flag as placeholder.
9. ✅ **FIXED — Footer.** Rebuilt with real, working links; carries the brand lockup as of 2026-08-21. **Rebuilt again 2026-08-22** as a brand-led, asymmetric footer on its own surface, with the dead “Legal (soon)” column replaced by two real pages — see the dated section at the end.
10. ✅ **FIXED — Duplicated fetch logic.** [lib/houses.ts](../../lib/houses.ts) is the single data layer; the only `fetch()` left anywhere in `app/`, `components/` or `lib/` is the gist **fallback** inside it.

---

## 3. Color system (the requested rework)

### 3.1 What we use today (audit)

| Purpose | Current value | Where |
|---------|---------------|-------|
| Page background | `#0f1115` (near-black) | all pages / `<main>` |
| Section background (alt) | `#13161c` | how-it-works, cta |
| Card / input background | `#1a1d23` | trending, explore, hero search |
| Primary text | `white` | pages |
| Muted text | `gray-300 / 400 / 500` | subtitles, footer |
| Borders | `gray-600 / 700 / 800` | nav, buttons, inputs |
| Accent / brand | `blue-500 / 600 / 700` | eyebrow text, buttons, stats, step numbers, links |

**Problems:** four near-identical dark greys doing overlapping jobs, blue is the *only* real color (weak identity), no token names, and the brand described in the Overview — **dark blue wordmark + light-blue "door" accent + the Sasquatch mascot** — is not reflected anywhere.

### 3.2 Principles we're applying (from HCI Lecture 6)

- **Limit the palette to ~3 colors** + neutrals; use the **60-30-10 rule** (60% dominant surface, 30% secondary, 10% accent).
- **High contrast**, and it must survive a **grayscale check**.
- **Don't signal meaning by color alone**; pair with text/icon (color-blind safety — ~8% of men).
- **Use color consistently**; name every color by *role*, not by hex.

### 3.3 Proposed token system (semantic, theme-swappable)

Define these once in `globals.css` as CSS variables and expose them to Tailwind v4 via `@theme`. Then components reference `bg-surface`, `text-muted`, `bg-brand`, etc. — never raw hex. A future color change becomes editing ~10 lines.

```
--color-bg            page background        (60%)
--color-surface       cards, inputs, nav     (30%)
--color-surface-2     alternating sections
--color-border        hairlines / outlines
--color-fg            primary text
--color-muted         secondary text
--color-brand         primary accent (blue)  (10%) – CTAs, links, active state
--color-brand-hover   hover state of brand
--color-accent        second accent (the "door" light blue / a warm highlight)
--color-success / --color-danger   status colors (verified badge, errors)
```

**✅ DECIDED & IMPLEMENTED — "soft dark, blue-monochrome"** (per your direction: lighter dark background, readable text, blue button/accent colors that follow the logo). Now live in [app/globals.css](../../app/globals.css) as `@theme` tokens; every component was converted to use them. `next build` passes.

| Token | Value | Role |
|-------|-------|------|
| `--color-bg` | `#1A2030` | page background — **lighter** dark slate (was near-black `#0f1115`) |
| `--color-surface` | `#232B3E` | cards, nav, inputs |
| `--color-surface-2` | `#1E2536` | alternating sections |
| `--color-border` | `#33405A` | hairlines, outlines |
| `--color-fg` | `#EEF2F9` | primary text — high contrast, readable |
| `--color-muted` | `#A9B4C7` | secondary text |
| `--color-brand` | `#3B82F6` | primary blue — buttons, links, active (follows the logo) |
| `--color-brand-hover` | `#2F6FE0` | brand hover |
| `--color-accent` | `#63B3ED` | light "door" blue — eyebrows, stats, step numbers, highlights |
| `--color-success` | `#34C77B` | verified / positive |
| `--color-danger` | `#F05252` | errors / destructive |
| `--color-selected` | `#F59E0B` | selected/searched map pin — amber; blue↔orange is the colour-blind-safe high-contrast pair (Lecture 6). Added as a deliberate, sparingly-used exception to the blue-monochrome palette |
| `--color-surface-raised` | `#333F5E` | one step **above** `surface`, for controls that must read as sitting on top of the page — today the search bar in the hero and in the docked nav pill. Added 2026-08-21; see "Landing page — heuristic evaluation" at the end of this file |
| `--color-border-raised` | `#4C5B7E` | the hairline that stays visible on `surface-raised` (`border` is too close to that tone) |

Monochromatic blue (brand + accent are both blue) is the safest choice per Lecture 6 — it stays on-brand and is fully color-blind safe. To retune later, edit only these ~10 lines; the whole site follows. Utility names in components: `bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-fg`, `text-muted`, `bg-brand hover:bg-brand-hover`, `text-accent`.

**Since 2026-08-24 there is a second block below this one in `globals.css`** — the light theme, selected by `data-theme="light"` on `<html>`. Every token above keeps its name and its ROLE there and only its value changes, so no component ever learns there are two themes. Three tokens were *added* by that pass, because a theme swap needs them and a single theme did not: `--color-shade` (shadow ink), `--color-tint` (the wash a hover lays over a bare control) and `--color-door` (the logo's door panel, split out of `accent` because one is a shape and the other is text, and only text has a contrast floor). Dark stays the default.

---

## 4. Supabase integration — ✅ LIVE (connected 2026-08-17)

**Status:** connected to a live Supabase project (ref `jkxtknkrmctgecpeozvb`) and verified end-to-end. Keys are in `.env.local`, `supabase/schema.sql` is applied (tables + RLS + auto-profile trigger + seed), auth redirect + email auto-confirm are configured, and a Supabase **MCP server** is wired (project `.mcp.json`, gitignored) so the database is manageable directly from the assistant. The gist path now only remains as an automatic fallback. Full detail in the **"Supabase go-live + Hosts"** section at the bottom.

Built so far: browser/server Supabase clients + session refresh (`lib/supabase/*`, `proxy.ts`), resilient data layer with gist fallback (`lib/houses.ts`), real email/password sign-in & sign-up (`components/auth-form.tsx`), sign-out + live auth state in the navbar, email-confirmation callback (`app/auth/callback/route.ts`), and a ready-to-run SQL schema seeding all 10 houses with RLS + auto-profile trigger (`supabase/schema.sql`).

Supabase covers **two** course requirements at once: **user login** and **remote data store / headless CMS**.

### 4.1 Setup
- Create a Supabase project; add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` (and to Vercel env vars).
- `npm i @supabase/supabase-js @supabase/ssr`.
- Add a `lib/supabase/` with a browser client and a server client (SSR cookies).

### 4.2 Auth (replaces the placeholder `/sign-in`)
- Email/password + optionally Google OAuth.
- Build real Sign In / Sign Up forms; wire session via `@supabase/ssr` middleware.
- Gate private content (e.g. Dashboard, "My Saved Homes", proposing a swap) behind session.
- ✅ **Done (2026-08-18):** the nav shows the signed-in state as an **avatar + account menu** instead of always showing "Sign In" — see the dated section below.

### 4.3 Data (migrate off the gist)
- Tables: `houses` (mirror current fields), `profiles` (linked to `auth.users`), later `saved_homes`, `swaps`, `blog_posts`.
- Seed `houses` from the existing gist JSON so nothing visually breaks.
- Replace the three hardcoded `fetch(gist)` calls with one shared data module querying Supabase.
- Turn on **Row Level Security** with sensible policies (public read on `houses`/`blog_posts`, owner-only write).

### 4.4 Headless CMS angle
Supabase satisfies "remote headless CMS" for the blog and listings. If the rubric wants a *dedicated* CMS UI, the Supabase Table Editor works as the admin surface; no extra tool needed.

---

## 5. Course-requirement checklist (from Overview §5)

| Requirement | Status | Action |
|-------------|--------|--------|
| Responsive across devices | ✅ Done | Was "it fits"; since **2026-08-23** it is designed for touch. Full heuristic evaluation measured on emulated devices (320–820px) and rebuilt below `lg`: drawer, search sheets, Explore filter sheet, swipe galleries, touch targets ≥ 44px, mobile rhythm — desktop provably unchanged. See the last dated section |
| Search / filter of listings | ✅ Done | Interactive home map **+** structured filters on `/explore` (destination search, guests, max-price slider, available-from date, sort) with live count, empty state, and shareable URL params. Hero search now feeds straight into these filters |
| User login for private content | ✅ Live | Supabase Auth connected + verified. The private area is six real gated routes, not an empty gate: `/dashboard` (wishlist), `/profile` (+ account settings), `/my-listings`, `/my-listings/[id]/edit`, `/list-your-home` — which **writes** to the CMS as the signed-in host — and `/swaps` (+ `/swaps/[id]`), the request inbox and its conversation |
| Public blog (images + video + code) | ✅ Done | `/blog` + `/blog/[slug]`, **5 posts across 4 categories**, served from Supabase. The narrowed "images only" scope was reopened on 2026-08-22: the block model made video and code snippets nearly free, so the brief is now met literally |
| Content in a remote headless CMS | ✅ Live | Listings (`houses`), **blog posts (`blog_posts`) and the whole How-it-Works page (`site_content`)**, all in Supabase behind RLS. The admin surface is no longer the Supabase Table Editor but a real editor at `/admin` — see the dated section at the end (2026-08-22) |
| Deploy to cloud (Vercel/Netlify) | ❓ Unknown | Confirm Vercel project + env vars |
| Usability evaluation | ❌ Missing | Short test with 2–3 users against the personas; write up |
| PageSpeed Insights audit | ⚠️ Ready to run | `next/image` + polish done; run on the deployed URL and screenshot results |
| Final report | ❌ Missing | Compile phases + usability + performance |

---

## 6. Suggested 2–3 day plan

**Day 1 — Foundations & cleanup**
- ✅ Color token system in `globals.css` + Tailwind `@theme`; all components converted to tokens (magic-hex problem gone).
- ✅ Soft-dark blue palette applied. ✅ Invisible-text detail page fixed. ✅ Metadata set. ✅ Body font fixed (Geist, not Arial). ✅ `alt` text + input `aria-label`s added.
- ✅ `<img>` → `next/image` across the app (bug #6). ✅ **Mascot artwork landed** — [public/mascot.png](../../public/mascot.png), rendered in the hero (see the dated section at the bottom).
- ✅ **Favicon done** (2026-08-21) — the stock `create-next-app` icon is gone; [app/icon.svg](../../app/icon.svg), a 16/32/48 `app/favicon.ico` and a 180px `app/apple-icon.png` are all generated from the logo artwork.

**Day 2 — Supabase** — ✅ code done
- ✅ Clients, `proxy.ts`, `.env.local`, data layer with fallback.
- ✅ Auth: real Sign In / Sign Up, session in nav, `/dashboard` gate in `proxy.ts`.
- ✅ `houses` schema seeded from the gist; all fetches go through Supabase; RLS + profile trigger.
- ⬜ Remaining (yours, ~10 min): create the Supabase project, paste keys, run `supabase/schema.sql` — see [Supabase-Setup.md](./Supabase-Setup.md).

**Day 3 — Requirements & polish**
- Real search/filter on `/explore` + wire Hero.
- Blog: `/blog` list + `/blog/[slug]` with image + video + code snippet, backed by Supabase.
- Flesh out `/how-it-works`, footer, and stats.
- Deploy to Vercel, run PageSpeed, do a quick usability pass, start the report.

---

## 7. Nice-to-haves (if time allows)
- ✅ **Mascot in the nav + favicon — done** (2026-08-21). The logo is traced to vector in [lib/brand-art.ts](../../lib/brand-art.ts) and served by [components/brand.tsx](../../components/brand.tsx); the placeholder `DoorMark` SVG is gone, replaced by an animated one that opens on hover. See the dated section at the end of this file.
- ✅ **Light/dark theme toggle — done** (2026-08-24). The `:root` swap was the easy fifth of it; the rest was depth (shadows and hover tints are not colours), the two surfaces painted by JavaScript rather than CSS (the Leaflet basemap and the globe canvas), and artwork with its tones baked in (a second mascot ramp). See the dated section at the end of this file.
- ✅ Saved / favourite homes — **done** (auth + `saved_homes` table + `/dashboard`; see the *Explore round 2* section, 2026-08-17).
- ✅ Loading skeletons and empty/error states — **done** (`components/skeletons.tsx` + route `loading.tsx` files).
- Basic SEO: per-page metadata, `sitemap.ts`, `robots.ts`.
- ✅ User profiles — **done** (2026-08-18: `/profile` with avatar upload, account settings, and an account menu in the nav).
- ✅ Members can publish their own listings — **done** (2026-08-18: `/list-your-home` + `/my-listings`).

---

## 8. Status of what's already done
- ✅ **Color system** — soft dark, blue-monochrome; tokenized in `globals.css`, every component converted, `next build` green.
- ✅ **Quick bug fixes** — invisible detail-page text, wrong metadata, Arial/Geist font conflict, missing `alt`/`aria-label`s.
- ✅ **Supabase (LIVE)** — connected 2026-08-17 (ref `jkxtknkrmctgecpeozvb`): auth + data layer + schema/seed applied and verified end-to-end; MCP server wired. See the "Supabase go-live + Hosts" section.
- ✅ **Hosts** — every listing is owned by a real host account (7 hosts, 3 persona-linked) shown on the Explore cards + a "Hosted by" card on the detail page.
- ✅ **Explore round 2** (2026-08-17) — Est-value/swap reframe, "Recommended" sort, **Wishlist ♥ + `/dashboard`** (`saved_homes`), **Reviews** (`reviews` table, card count + detail section), **photo carousel + detail lightbox** (`houses.images[]`), and an **Airbnb-style split map/list** with hover-sync + "Search this area". Full write-up in the dated section below.
- ✅ **Account menu, profile page & real listing creation** (2026-08-18) — navbar avatar + account menu replacing the email string, `/profile` with photo upload, and a working "List Your Home" form that publishes to Supabase. Cleared the last lint error. Full write-up in the dated section below.
- ✅ **Hero artwork** (2026-08-17) — the real mascot PNG replaced the hand-drawn Bigfoot SVG, and the right-hand decoration was rebuilt as a vertical "swap loop"; both scaled to fill the title block. Full write-up in the dated section below.
- ✅ **Hero globe** (2026-08-19) — the "swap loop" is gone; the right of the headline is now a slowly turning globe drawn as a field of typographic marks, denser over land, with the ten homes as pins and a swap arc travelling between two of them. Full write-up in the dated section at the end of this file.
- ✅ **Interactive map on the home page** (`components/map-section.tsx` → `home-map.tsx`, Leaflet + CARTO dark tiles). Live search by city/country, brand-colored markers with popups linking to each home, "Use my location" (browser GPS), result count, clear button, and a no-results state. Coordinates come from the data layer (`lib/coordinates.ts`), so it works on the gist today and on Supabase later (schema now has `lat`/`lng`).
- ✅ **Blog** — `/blog` + `/blog/[slug]` with 3 image+text posts (`lib/blog.ts`), added to nav + footer.
- ✅ **Footer** rebuilt with real working links.
- ✅ **Swaps are real** (2026-08-21) — `swap_requests` + `swap_messages` with RLS, a validation trigger and a one-way status machine; `/swaps` is the inbox, `/swaps/[id]` the conversation, and the account badge is derived rather than stored. Full write-up in the dated section below.
- ✅ **Brand everywhere** (2026-08-21) — the logo traced to vector in `lib/brand-art.ts`, drawn only by `components/brand.tsx`; nav mark that opens on hover, real favicon/apple-icon/OG images, 404 page, mascot on the empty states.
- ✅ **Three dead-end and signed-in-state fixes** (2026-08-22) — a swaps-scoped 404 with its own two exits, the mascot on the `/swaps` empty tabs, and the closing CTA + footer Account column that no longer invite a signed-in member to create the account they already have. Dated sections at the end.
- ✅ **The ✓ Verified badge became true, and reviews became writable** (2026-08-22) — the badge was a hash of a listing's id; it is now a host's record (90 days + bio + location + 3 reviews averaging 4.5), computed in the database and inherited by every home they host. Members can write, edit and delete reviews, behind an RLS policy that stops self-reviews and duplicates, with a trigger keeping `houses.rating` honest. Dated section at the end.
- ✅ **The profile grew up** (2026-08-22) — a **Travel & swap** block (who you travel with, what for, trip length, pets/smoking, all three-state and all optional), a **Profile strength** meter reading the live draft, a **Your reviews** section, and account settings that can finally change an email, end every session, and delete the account. New: [supabase/profile.sql](../../supabase/profile.sql), [lib/profile-types.ts](../../lib/profile-types.ts). Dated section at the end.
- ✅ **Share metadata** (2026-08-22) — every public route emits its own `og:*`, `twitter:*` and canonical via `lib/seo.ts`; before this a shared listing showed the generic logo card on X, and every blog post previewed as the homepage. Verified 22/22 routes.

### UX notes (grounded in the course's Nielsen heuristics — see `AI/hci-knowledge-base`)
- **Visibility of system status (#3):** map shows "Showing N of M homes", a loading skeleton, and a "Locating…" state.
- **User control & freedom (#4):** Clear button resets the search; nothing traps the user.
- **Match the real world (#1):** familiar map pins + "Use my location" GPS.
- **Help recover from errors (#6):** friendly message if geolocation is denied; clear empty-state when no homes match.
- **Aesthetic & minimalist (#9):** map kept uncluttered; scroll-zoom off so the page still scrolls naturally.

- ✅ **Structured filters on `/explore`** — [components/explore-view.tsx](../../components/explore-view.tsx): destination search, guests, max-price slider, available-from date, sort (featured/price/rating), live "showing N of M", empty state, "clear all", and URL-synced params. Server page ([app/explore/page.tsx](../../app/explore/page.tsx)) reads the params so Hero/shared links land pre-filtered.
- ✅ **Hero search wired** — passes `?q=&date=&guests=` into the filters.
- ✅ **`next/image` across the app** + dead-image override (see bug #6); `next build` + `eslint` are both clean.
- ✅ **UI polish pass** — shared [HouseCard](../../components/house-card.tsx) (rating/price/guests badges, hover lift) reused by Explore + Trending; hero glow + labeled search bar; richer How-it-Works (icons + copy) and a full `/how-it-works` page (steps + trust + FAQ); nav door-mark logo; stats reframed as illustrative; CTA + detail page (sticky swap sidebar) redesigned.

### Home-screen search & interactive map overhaul (2026-08-15)

A focused pass on the home page's search + map — built as an Airbnb-style flow with SwapDoor's own touch, then audited against the HCI course material (`AI/hci-knowledge-base`).

**Unified, collapsing search bar**
- The hero's Where/When/Who bar is now the **single** search on the page — the map's old standalone search box is gone (fixes a duplication/consistency issue, Nielsen #2/#8). Shared state lives in [home-search-context](../../components/home-search-context.tsx); submitting filters the live map and smooth-scrolls to it. The map's **"See all as a list →"** carries the full query into `/explore`.
- **Collapse-on-scroll:** an `IntersectionObserver` on the hero bar docks a compact **search pill** into the sticky nav once you scroll past it; clicking it drops the full search row back down (the pill hides while expanded — never two bars at once). Pill ⇄ nav-links hand off with a coordinated **clip-path "wipe"** from opposite sides — all `motion-safe:` and GPU-cheap.
- The nav search is **home-page-only**: the context defaults to `active:false`, so every other route uses the unchanged `<Navigation>`. The Next.js dev badge is hidden via `devIndicators:false` in [next.config.ts](../../next.config.ts).

**"Simple & trusted" segment popovers** ([search-fields](../../components/search-fields.tsx)) — chosen for the low-tech personas (Hick's law, progressive disclosure):
- Each segment opens a small popover rendered via a **React portal**, so it escapes the nav drop-down's overflow/clip. **Where** = type-a-city + real destinations pulled from the listings with live "N homes to swap" counts; **When** = big duration presets (weekend / 1wk / 2wks / month+ / flexible) with exact dates behind a "prefer exact dates?" link; **Who** = a guest stepper.
- **Guests default to "Any"** (no constraint → shows every home). The stepper reads `Any → 1 → 2 …`; there is no meaningless "0 guests". A real filter (2+) narrows the map and shows up in the status line / `/explore` link.
- The active segment is an **inset, floating pill** (raised surface + brand ring + accent label) and the dividers next to it fade, so the highlight never collides with a divider.

**Interactive map** ([home-map](../../components/home-map.tsx))
- The search really drives it now: filters by **destination text and guest capacity** (`maxGuests`), and the status line echoes the committed search ("Showing N of M homes for Split · Two weeks · 3 guests") — closes the earlier Gulf-of-Evaluation gap where When/Who did nothing.
- **Scroll-to-zoom** enabled; **dark map background** (killed Leaflet's default light-grey band via `.leaflet-container`); the list link uses `next/link`.
- **Selected / searched pins** turn **amber** (`--color-selected`), grow, and **spring/bounce** (animation on the inner `<svg>` so it never fights Leaflet's positioning transform). Clicking a pin selects it (opens popup); clicking empty map, or Clear, deselects. Colour is paired with size + motion (never colour alone — Lecture 6 #4).

**HCI heuristic-evaluation fixes** (ranked by severity, against the course lectures): unified "guests" wording; removed a blanket "✔ verified" badge that sat on **every** destination (misleading trust signal); footer `Privacy/Terms` marked `(soon)` so dead ≠ live (flat-UI affordance, #2); bigger mobile-menu hit area (Fitts); reined accent back toward the 10% budget (60-30-10) by demoting decorative card icons to `text-muted`; Stats numbers de-emphasised with a full-contrast "illustrative, not real data" disclaimer; link hovers now brighten instead of darken. **Known gap:** the **`stay` preset is display-only** — listings carry a single `date`, not availability ranges, so stay can't truly *filter* until the data model gains per-listing availability.

**Next up:** deploy to Vercel + run PageSpeed on the live URL, short usability pass, final report. (Supabase activation whenever you're ready.)

### Nav centering, button system & tighter hero copy (2026-08-15)

A CRAP/consistency pass on the home screen, audited against `AI/hci-knowledge-base` (Lecture 5 CRAP, Lecture 4 Nielsen #4, Lecture 6 60-30-10). Verified in a real browser (headless Chrome screenshots at 1280px).

**Nav bar truly centered (CRAP — Alignment).** The header was a 3-child flex where the middle `flex-1` slot centered the links *between* the logo and the (wider) auth group, so "Explore / How it Works / Blog" sat ~30px left of the page centre. Fixed by making the three columns equal at `md+` (`md:flex-1` on the logo + auth wrappers in [components/navigation.tsx](../../components/navigation.tsx)), so the centred links and the docked search pill now share the page's true vertical centre — the same axis as the hero content below. Mobile layout unchanged.

**One button system (CRAP — Repetition + Nielsen #4 Consistency + 60-30-10).** Buttons were ad-hoc: the same role rendered with different radii (`rounded-full` vs `rounded-lg`) and paddings, and **three** filled-blue buttons (Search, Use my location, Get started) competed for attention. Now a single source of truth in [components/button.tsx](../../components/button.tsx) — `buttonClass(variant, size)` with three roles:
- **primary** — the ONE main action per section (filled brand blue = the 10% accent, used sparingly).
- **secondary** — other real actions (outline).
- **ghost** — navigation / dismiss / low-stakes (text only).
- sizes `sm | md | lg`. Standard button radius is `rounded-lg`; the home **search bar keeps its own `rounded-full` pill** (a distinct component / single visual unit, not a generic button).

Re-mapped every home-screen button: nav "List Your Home" → secondary, "Sign In" → ghost; hero "Search" stays the pill primary; map "See all as a list" → **primary**, "Use my location" → **secondary** (demoted from filled-blue — a GPS convenience shouldn't shout louder than the real CTA), "Clear" → ghost sm; CTA "Get started free" → primary lg, "Learn more" → secondary lg. Net effect: **at most one filled-blue action per section.**

**Hero cut 4 → 2 lines (Aesthetic & minimalist #8 + Hick's law).** The hero stacked four text blocks (eyebrow chip, headline, subtitle, "Verified…" line). Now just a short headline + one subline that folds the trust facts in ([components/hero.tsx](../../components/hero.tsx)):
- **"Swap homes. Travel the world."**
- *"Authentic local stays in 180+ countries — no booking fees."*

This also removed the `🌍` raster emoji (off the blue-monochrome palette, Lecture 6) and the bordered eyebrow chip (a false affordance — it read as clickable but wasn't).

### Explore section — search-bar reuse, filter pills, budget bar & map toggle (2026-08-16)

A UX/UI overhaul of `/explore`, designed against `AI/hci-knowledge-base` (Lecture 3 Hick's law, Lecture 4 Nielsen heuristics, Lecture 6 60-30-10). Three product decisions were taken with the user up front: **budget stays in $**, **filters go broad (Type + amenities)**, and **results get a List/Map toggle**. `next build` + `tsc` + `eslint` all clean; verified by driving the running app (SSR renders across every filter permutation, URL-seeding works, no errors).

**Reused the home search bar (Nielsen #2 consistency).** The old bespoke `<input>` on Explore is gone; the page now renders the *same* `SearchFields` (Where/When/Who) component as the home page ([components/search-fields.tsx](../../components/search-fields.tsx)). It's wired by wrapping **only** `<ExploreView>` in `HomeSearchProvider` ([app/explore/page.tsx](../../app/explore/page.tsx)) — the provider sits *below* `<Navigation>`, so the nav keeps its default look (the home-only docked search pill never appears here, since that's gated on `collapsed`, which only the home hero sets). The provider gained an optional `initialValues` prop ([home-search-context.tsx](../../components/home-search-context.tsx)) so the bar seeds from the URL: Hero search and shared links (`?q=&guests=&date=`) land on Explore pre-filled. Explore filters live off the bar's `values` (filters as you type); Where/When/Who are **not** duplicated in the pills.

**Filter pills + amenities drawer (Hick's law, progressive disclosure).** The always-open panel of 5 controls became a compact pill row ([components/explore-view.tsx](../../components/explore-view.tsx)): **Home type**, **Rating**, and **More filters** (amenities). Each opens a small panel (checkboxes / radios) rather than showing everything at once — 9 amenities live behind one pill instead of on the page (Nielsen #9). Idle pill = outline; active pill = filled brand **+ a count badge**, so state is never carried by colour alone (Lecture 6). Every panel has its own *Clear*, plus a global *Clear all*. Sort + the List/Map toggle sit on the right of the same row.

**Persistent budget bar (a deliberate 60-30-10 exception).** Unlike the other filters (hidden in pills), price gets a **permanent** full-width slider with a live value (`Up to $X` / `Any`) that updates the result count as you drag — because **cost is the #1 driver for all three personas** (Alex "cost & practicality", Sarah "cost-saving is the hook", Mateo & Elena affordability on a fixed income). The most-used filter earns permanent screen real estate; the live readout closes the Gulf of Evaluation (Lecture 3).

**List / Map toggle.** New presentational [components/explore-map.tsx](../../components/explore-map.tsx) (Leaflet, reusing the home map's `.swapdoor-pin` look + CARTO tiles) plots the currently-filtered results; the toggle switches List⇄Map, never both at once (#9). Loaded via `next/dynamic` (`ssr:false`) with the shared `MapSkeleton` so there's no layout shift. It's decoupled from the home search context (takes an already-filtered `House[]`), so the working home map was left untouched.

**Data: derived `type` + `amenities` (demo-seed until Supabase).** The `House` model had no type/amenities, so those are derived deterministically in [lib/houses.ts](../../lib/houses.ts) (`deriveType` from guests/price/keywords; `deriveAmenities` via a stable `Math.sin` seed on the id → no hydration mismatch) — the same "enrich the gist" pattern as `IMAGE_REPLACEMENTS`. To keep the Explore **Client** Component from bundling the server-only Supabase client (`next/headers`), the client-safe types + filter constants were split into [lib/house-types.ts](../../lib/house-types.ts) (`House`, `HomeType`, `Amenity`, `HOME_TYPES`, `AMENITIES`); `lib/houses.ts` re-exports them so existing imports keep working. When Supabase is live, add `type`/`amenities` columns and the UI needs no change.

**Everything URL-synced** (`q, guests, date, maxPrice, sort, types, amenities, rating, view`) via `history.replaceState` — shareable/bookmarkable, and the state survives a refresh.

**Known limitations:** the derived amenities aren't perfectly balanced (e.g. *Pool* lands on ~8/10 homes, so it barely filters) — tune the thresholds or add real columns later. The **`when` stay presets stay display-only** (a listing carries a single `date`, not an availability range), unchanged from the home-map limitation. *(Both of these are addressed in the next pass below.)*

### Explore UX overhaul II — heuristic evaluation, working dates, verified hosts & a home-style docked search (2026-08-16)

A second, deeper pass over `/explore` run as a formal **heuristic evaluation** (Lecture 4 method): issues ranked by severity, each tied to a specific lecture/heuristic, then the fixes chosen with the user (P1–P7) and extended with a verified-only filter, a working date picker, and the home page's collapse-on-scroll search docked into the nav — now carrying the filters too. `next build` + `tsc` clean; ESLint clean on every touched file (one **pre-existing** `usePresence` "setState in effect" warning in [components/navigation.tsx](../../components/navigation.tsx) remains — not introduced here). Scroll-driven bits are client-only, so they were verified by build/type/lint + SSR smoke tests rather than a headless browser.

**P1 — real availability windows; "When" now actually filters.** Each home carries `availableTo`, derived in [lib/houses.ts](../../lib/houses.ts) from the existing `date` ("available from") + a seeded 4–45 day window (same enrich-the-gist pattern; `HouseRow` gained an optional `available_to` column so a future Supabase column wins automatically). Exact date filters to homes whose window **covers** the chosen day; a duration preset ("A week", "Two weeks") requires the window to be **at least that long**. This closes the earlier Gulf-of-Evaluation gap where When/stay changed nothing. The detail page now shows the range (e.g. "June 15 – July 23, 2025"); `stay` is URL-synced.

**P2 — removable active-filter chips.** Every applied filter (destination, dates, guests, price, type, rating, verified, each amenity) renders as a chip under the controls, each with its own ✕ — recognition over recall (Nielsen #7) and per-filter undo (#4). A selection no longer vanishes the moment its pill panel closes.

**P3 — both maps genuinely dark.** The home *and* explore maps were actually using CARTO's **light** Positron tiles on the dark site (the earlier "dark tiles" note was aspirational — only the `.leaflet-container` fallback was dark). Both switched to CARTO `dark_all` + light pin strokes so the map sits on the theme instead of being a bright island (Nielsen #2 consistency). The home map was touched deliberately — darkening only Explore would have created a *new* inconsistency.

**P4 — a real verified signal, then a filter.** A per-home `verified` flag (derived, ~70% of demo homes) drives a **✓ Verified** badge on the card + detail page — shown only where it's actually true, replacing the blanket "verified" wording the home page had already dropped (honest trust cue, Nielsen #1; icon + word, never colour alone). Non-verified homes show a plain "Secure messaging" line instead. Later extended with a **"Verified hosts only"** checkbox in the *More filters* drawer (chip + URL `verified=1`; narrows to 7/10 demo homes).

**P5–P7 — polish.** Budget slider got a large 22px thumb + a **blue filled track** (Fitts' law; WebKit inline gradient + Firefox `::-moz-range-progress` in [globals.css](../../app/globals.css)). Active filter pills use a brand **outline + soft tint + brand text** instead of a solid fill, so several active filters don't flood the row with brand blue past the 10% accent budget (60-30-10). The Sort control stays a native `<select>` (accessibility) but is restyled to match the idle pills with its own chevron (CRAP repetition / Nielsen #2).

**"When" simplified + a working calendar** ([components/search-fields.tsx](../../components/search-fields.tsx)). Dropped **"A month+"** (a rare, very narrow filter) to cut choices (Hick's law). The date picker is now **always visible** (the hidden "Prefer exact dates?" link is gone — it buried the feature), capped at **today** via `min` (error prevention, Nielsen #5), and clearable. Picking a length clears the date and vice-versa, so the two modes never conflict.

**Home-style docked search on Explore — reusing the nav, not a parallel bar.** The nav's own collapse-on-scroll pill (previously home-only) now works on Explore too. The key was that on Explore `<Navigation>` sat *outside* `HomeSearchProvider`, so it could never dock; it's now **inside** the provider ([app/explore/page.tsx](../../app/explore/page.tsx)) with a new `live` mode ([home-search-context.tsx](../../components/home-search-context.tsx)) that keeps `committed` == `values` (Explore filters as-you-type, with no Search-button step to sync them). Explore drives `collapsed` with the *same* sentinel + IntersectionObserver mechanism as the home Hero. Clicking the docked pill drops the full search **plus all filters**: the filter controls are handed to the nav through the context (`dockFilters` / `setDock`), and their pop-out panels **portal to `<body>`** so the drop-down's `clip-path`/`overflow` can't crop them. The controls are one component ([`FilterControls`](../../components/explore-view.tsx)) reused on the page *and* in the drop-down (independent local `openPill`, `useId`-namespaced input ids).

**Docked pill design + declutter.** The pill shows **Where · When · Who** with a pin/calendar/guest icon per segment; the chosen value shows emphasised, the label stays as a muted placeholder. An earlier iteration also put a "Filters (N)" button + live "N homes" count in the bar, but on Explore that crowded the nav's centre slot and truncated the segments to single letters — so per the user's call they were **removed**: the docked bar is now clean and identical to home, and the filters live only in the drop-down (opened by clicking the pill).

**Still fully URL-synced** (`q, guests, date, stay, maxPrice, sort, types, amenities, rating, verified, view`).

**Resolved / remaining.** The prior "`when` stay presets are display-only" limitation is **fixed** (availability windows). Still demo-seeded until Supabase carries real columns: `type`, `amenities`, `availableTo`, `verified` (all derived deterministically, forward-compatible). Minor: clicking a segment in the docked pill opens the whole drop-down rather than that segment's own popover — a deliberate simplification.

### Supabase go-live + Hosts feature (2026-08-17)

**Supabase is now live** (project ref `jkxtknkrmctgecpeozvb`) — it replaces the gist as the real data source and turns on auth. Set up and verified end-to-end:
- **Keys** in `.env.local` use the new `sb_publishable_…` key format (not the legacy `eyJ…` anon JWT); works fine with `@supabase/ssr` + `supabase-js`. The public URL is stored **without** the `/rest/v1/` suffix.
- **Schema** applied (`supabase/schema.sql`): `houses` (10 seeded), `profiles`, RLS (public read on houses/profiles, owner-only profile writes), and the `handle_new_user` auto-profile trigger.
- **Auth** configured: `site_url=http://localhost:3000`, redirect allow-list `http://localhost:3000/**`, and **email auto-confirm ON** (instant signup for the demo — **turn OFF + add the Vercel URL before production**).
- **MCP server** wired in project `.mcp.json` (gitignored — holds the `sbp_…` personal access token; read-write, scoped to the project ref), so the DB is manageable from the assistant. DB ops were also run via the Supabase **Management API** with the PAT.
- **Security advisor clean** — hardened `handle_new_user` by revoking `EXECUTE` from `anon`/`authenticated` so it isn't callable as a PostgREST RPC (it's a trigger-only function).
- **Verified end-to-end:** REST read with the publishable key (HTTP 200); signup → auto-confirm → session → auto-created profile (with `full_name`), then the test user was cleaned up; `next build` is green (all 10 `/explore/[id]` prerender as SSG).

**Hosts — listings now feel owned by real people.** Added a host relation so every home shows who offers it (chosen with the user: persona-linked hosts, shown on cards **and** the detail page).
- **Data:** `houses.host_id → profiles`; `profiles` gained `location` + `bio`. **7 host accounts** (real auth users) own all 10 houses — 3 tied to the course personas (**Alex Chen**, **Sarah Miller**, **Mateo & Elena Ruiz**) plus **Sofia Rossi, Lars Eriksson, Kenji Tanaka, Amara Okafor**. `created_at` is back-dated (2018–2021) for a believable "Member since". Reproducible via [supabase/seed-hosts.mjs](../../supabase/seed-hosts.mjs) (creates accounts via signup) + [supabase/seed-hosts.sql](../../supabase/seed-hosts.sql) (enriches profiles + assigns houses); shared demo password `SwapDoorHost!2025`.
- **UI:** new [components/avatar.tsx](../../components/avatar.tsx) — an initials avatar (self-contained, on-palette, no external images / 404s). A host row on every [HouseCard](../../components/house-card.tsx) (Explore grid + Trending) and a richer **"Hosted by"** card on the [detail page](../../app/explore/[id]/page.tsx) (avatar, name, location, member-since, bio, ✓ Verified). A `Host` type + a PostgREST embed (`host:profiles!houses_host_id_fkey(...)`) are threaded through [lib/house-types.ts](../../lib/house-types.ts) → [lib/houses.ts](../../lib/houses.ts).

**Bug fixed (surfaced by going live):** `getHouses()`/`getHouseById()` used the cookie-based server client, but `generateStaticParams` runs at build time with no request, so `cookies()` threw and `/explore/[id]` returned **HTTP 500**. Added a cookieless **`createPublicClient()`** ([lib/supabase/server.ts](../../lib/supabase/server.ts)) for public reads (RLS allows anon), now used by the data layer; the cookie-based client stays for auth. All detail pages prerender as SSG again.

**Remaining before deploy:** turn email auto-confirm **OFF**, add the Vercel URL to Supabase `site_url` + redirects, and set the two `NEXT_PUBLIC_SUPABASE_*` env vars in Vercel.

### Explore round 2 — wishlist, reviews, photo galleries, split map (2026-08-17)

A second product pass over `/explore` and the listing card, framed by a "what would the big home-swap players do" review (Airbnb / Booking / **HomeExchange**) and chosen by the user from clickable option menus. Built in **verified increments** — each one `next build` + `eslint` green (only the **pre-existing** `usePresence` set-state-in-effect warning in [navigation.tsx](../../components/navigation.tsx) remains), then a dev-server smoke test. DB changes were applied to the **live** Supabase project via MCP and mirrored into [supabase/schema.sql](../../supabase/schema.sql) + per-feature seed files.

**Framing fix — rental → swap.** The rental-style "$/night" was relabelled to a swap **"Est. value / night"** everywhere: card (`Est. $X /night` + tooltip), detail sidebar ("No cash changes hands — swaps only"), the Explore budget bar ("Value / night"), and both Leaflet popups. The user picked this cheap wording fix over a full GuestPoints system. *(HomeExchange/Love Home Swap don't show nightly prices at all — this keeps the number but drops the rental mental model.)*

**Sort "Featured" → "Recommended."** Now sorts **verified hosts first, then rating** (JS stable sort keeps ties in source order) + a hover tooltip explaining the order. [components/explore-view.tsx](../../components/explore-view.tsx).

**Wishlist (♥) — a real login-gated feature.** New `saved_homes` table (`user_id`+`house_id` composite PK, RLS owner-only select/insert/delete). Client: [components/saved-context.tsx](../../components/saved-context.tsx) — `SavedProvider` in the root layout loads the signed-in user's saved ids **once** and every heart reads from it (no N queries); toggling is **optimistic** (reverts on error); signed-out click → `/sign-in?next=`. [components/save-button.tsx](../../components/save-button.tsx) is the heart, overlaid on the card **outside** its `<Link>` (no nested interactive), filled-brand vs outline carrying state by shape not colour alone (L6). [app/dashboard/page.tsx](../../app/dashboard/page.tsx) (force-dynamic, already proxy-gated) lists saved homes via `getSavedHouses()` in [lib/houses.ts](../../lib/houses.ts); a **"Saved"** link appears in the nav when signed in. This enriches the course "private content behind login" requirement beyond an empty gate.

**Reviews — the #1 trust driver for the cautious personas (Sarah, Mateo & Elena).** New `reviews` table (`house_id`, `author_id → profiles`, `rating`, `body`, `created_at`; RLS public-read + own-write) seeded with **33 reviews** ([supabase/seed-reviews.sql](../../supabase/seed-reviews.sql)) where the author is one of the 7 demo hosts and **never the house's own host**, with location-fitting text. A denormalised `houses.review_count` drives the card badge ("★ 4.9 · 4"); the detail page gets a full **Reviews section** (avatar, name, location, date, stars, body) via `getReviews()` + a `Review` type ([lib/house-types.ts](../../lib/house-types.ts)). Card badge moved to the image's bottom-left to free the top-right for the heart.

**Photo galleries.** New `houses.images text[]` (element 0 = the effective hero, +3 verified interior shots; [supabase/seed-images.sql](../../supabase/seed-images.sql) — **every URL was curl-checked for HTTP 200** before seeding, same spirit as `IMAGE_REPLACEMENTS`). `enrichHouse` runs each image through `fixImage` and falls back to `[image]` for the gist path. [components/card-gallery.tsx](../../components/card-gallery.tsx) = a swipe carousel on the card (arrows reveal on hover / stay on touch, dots, arrows+dots **outside** the `<Link>`, tap-photo navigates). [components/gallery.tsx](../../components/gallery.tsx) = the detail-page hero + thumbnail strip + a keyboard **lightbox** (← → / Esc / click-outside, scroll-lock). `HouseCard` was restructured so the photo area is the client gallery and the badges are a `pointer-events-none` overlay.
- **Bug fixed (browser-reported):** `next/image` with `fill` warns when its direct parent is `position: static`. The card gallery's inner `<Link>` (`<a>`, `display:block`) was static → added `relative` to it. Pool (interior) images surfaced it because they load client-side on carousel navigation, past the SSR/priority hero.

**Split map + list, hover-sync, and "Search this area."** In **Map** view on desktop (`lg+`) the results become an **Airbnb-style split** — list left (~55%), **sticky** map right (~45%); on mobile Map stays a full-width map (the List/Map toggle is unchanged), so there's only ever one Leaflet instance. **Hover-sync is bidirectional:** hovering a card ambers + grows its pin (reusing `--color-selected` + the bounce), hovering a pin rings its card; `activeId` lives in `ExploreView` and is passed to both. **"Search this area"** ([components/explore-map.tsx](../../components/explore-map.tsx)) shows a floating button only after a **real** user pan/zoom (a `programmatic` ref distinguishes our own `fitBounds` from user gestures); clicking it filters results to the visible bounds, shown as a removable **"Map area"** chip (and cleared by "Clear all"). A **`fitKey`** (signature of the non-spatial filters) means the map only re-fits when a filter actually changes — never on a pan or an area search, so there's no refit loop.

**Already existed (no work needed):** grid loading skeletons ([app/explore/loading.tsx](../../app/explore/loading.tsx) + [components/skeletons.tsx](../../components/skeletons.tsx)); the Hosts "Hosted by" card.

**Still pending from the same selection round (not yet built):**
- **Category / inspiration pills** (Airbnb-style Beachfront / Cabins / Trending strip above results).
- **Real `amenities` columns** to replace the noisy derived set (e.g. *Pool* lands on ~8/10 homes so it barely filters).
- **Verification tiers** (ID / email / phone) instead of the single derived `verified` boolean.

### Listing page (`/explore/[id]`) rebuilt + the photo-sharpness fix (2026-08-17)

A full redesign of the listing detail page, run as a heuristic evaluation first (Lecture 4 method: findings ranked by severity, each tied to a lecture) and then built from the ranked list. `next build`, `tsc` and `eslint` are green — the only remaining lint error is the **pre-existing** `usePresence` set-state-in-effect in [navigation.tsx](../../components/navigation.tsx). Verified by driving the running app in headless Chrome at 1440 / 500 / 430 px, with the browser console captured each time.

**Photos were genuinely low-resolution, not just "a bit soft".** Every seeded Unsplash URL asked for `w=800&q=80` ([schema.sql](../../supabase/schema.sql), [seed-images.sql](../../supabase/seed-images.sql)). Proof: `/_next/image?…&w=828` and `…&w=1920` returned **byte-identical** 106 137 B responses — next/image never upscales past its source, so an 800px file was being stretched across the ~976px hero (≈1950 device px on a 2× screen, a 2.4× upscale) and then *re-encoded* at q75 on top of Unsplash's own q80, which is what put grain in the sky and the pool.
- [lib/houses.ts](../../lib/houses.ts): `fixImage` now also rewrites any Unsplash URL to one 2400px master (`highRes`), so the optimizer resizes **down** per device instead of stretching up. Cards still get small files.
- [next.config.ts](../../next.config.ts): `qualities: [75, 90]` — **required in Next 16**, where the default allowlist is `[75]` alone and a `quality={90}` prop would otherwise be silently coerced back to 75 — plus `formats: ["image/avif", "image/webp"]`.
- The hero + lightbox render at `quality={90}`. Same request now returns AVIF at 1920px: 184 KB at q75, 265 KB at q90.

**Removed: the page said everything three times.** Rating appeared **5×**, availability and "sleeps" **3×** each, and the whole *"What you should know"* grid was a duplicate of the sidebar (Nielsen #9, Hick). The grid is gone; the facts live once each — in the header meta line, one chip row, and the swap panel.

**Added the data the app already had but never showed.** `amenities` drive an Explore filter yet were invisible on the page you land on after filtering by them — a textbook Gulf of Evaluation (Lecture 3). New [amenity-list.tsx](../../components/amenity-list.tsx) shows them with line-art icons matching the card set, **and lists what's missing, struck through**, so an honest listing answers the question instead of leaving it open.

**Photo mosaic instead of hero + thumbnail strip.** [gallery.tsx](../../components/gallery.tsx) is now the layout every travel site uses — one large photo, a column of three, a "Show all N photos" button (Nielsen #2, external consistency) — collapsing to the single photo on phones. The lightbox gained a thumbnail strip (#7 recognition over recall) and now **returns focus** to the tile that opened it.

**"Back to explore" no longer throws away the search.** It was a bare `/explore` link: set six filters, open a home, come back, start over (Nielsen #4 / Pottery Barn). Explore now parks its query string in sessionStorage ([lib/explore-query.ts](../../lib/explore-query.ts)) and [back-to-results.tsx](../../components/back-to-results.tsx) reads it via `useSyncExternalStore` (an external store, so no setState-in-effect), rendering a real `<Link>` that survives refresh and middle-click.

**The swap panel actually asks for a swap.** [swap-panel.tsx](../../components/swap-panel.tsx) replaces "price + a link to /sign-in": check-in/check-out **constrained to the host's real availability window** via `min`/`max` (error prevention, #5, instead of an error message afterwards), a guest stepper capped at `maxGuests`, plain-language validation (#6), and a numbered "what happens next" so pressing the button stops being a leap of faith (feedforward, Lecture 2). Signed-out users get "Sign in to propose a swap" → `/sign-in?next=…`. The est. value is deliberately **demoted** — this is a swap, not a nightly rate.

**Mobile: the primary action was ~2000px below the fold.** The `aside` stacks last on small screens, so price + CTA sat under the reviews. `MobileSwapBar` is a sticky bottom bar (price + button that scrolls to the panel), with footer clearance so it never covers the last row.

**Map, reviews, and next steps.** New [house-map.tsx](../../components/house-map.tsx) + [house-map-section.tsx](../../components/house-map-section.tsx) — "Where you'll be", CARTO dark tiles reusing the Explore map's look, **scroll-wheel zoom off** (an inline map must not eat the page scroll) and the home drawn as an approximate **circle**, not an exact pin, with a line explaining the address is shared only on confirmation. [reviews-section.tsx](../../components/reviews-section.tsx) adds a rating summary with per-star bars and shows 4 reviews behind a "Show all N" toggle (progressive disclosure). A "Similar homes" strip ends the page instead of a dead stop — its heading follows the actual picks, so "More homes in {country}" never labels homes from elsewhere.
- **Map + reviews run full width, below the two columns.** Inside the 1.6fr article column the map was a small box with a dead third of the page beside it.

**Smaller fixes.** `Stars` rounded 4.6 up to **five full stars** — an overstated rating on a page built for trust; it now fills to the tenth. Per-listing `generateMetadata` (tab titles + shareable OG previews were all the generic site title). Emoji 📍/🔒 replaced with the SVG icon set used elsewhere (CRAP repetition). `SaveButton` gained an `inline` variant so the heart appears on the detail page too, labelled. `getHouseById` is now `cache()`d — the route asks for the same house twice per render (metadata + page).

**Bug found and fixed while verifying (browser console, not a build error).** Rendering `HouseCard` from a **Server** Component logged "Each child in a list should have a unique key" — bisected to the `overlay` element prop crossing the server→client boundary into `CardGallery`, where React's dev key-check validates it. Fixed with an explicit `key` on that element in [house-card.tsx](../../components/house-card.tsx) (commented, since it looks redundant on a lone element).

**Availability dates — ✅ fixed straight after (same day, see the next section).**

### Availability windows — real future dates in Supabase (2026-08-17)

Every home's availability sat in **2025**, i.e. in the past: the detail page's date pickers opened on dead dates, and no search for a future stay could ever match anything. Two root causes, both fixed on the live project (ref `jkxtknkrmctgecpeozvb`) via MCP and mirrored into the repo.

**1. There was no `available_to` column at all.** `list_tables` confirmed it: the window END was *entirely* derived in [lib/houses.ts](../../lib/houses.ts) as start + a seeded 4-45 days. So a window could be 4 days long for no reason, and no one could fix a single home's dates from the Table Editor. Added `houses.available_to text` (nullable, so the derived fallback still covers the gist path) via `apply_migration`, and mirrored it into [schema.sql](../../supabase/schema.sql).

**2. Reseeded all 10 windows as real, future, seasonal date pairs** — [supabase/seed-availability.sql](../../supabase/seed-availability.sql), re-runnable, with the reasoning per home in the file. The rules the set was built on:
- every window starts in the future;
- each lands in **that home's own season** — Zermatt in the ski season (Jan 9 – Feb 13, 2027), the Rovaniemi igloo across the aurora months, Provence in the weeks lavender actually blooms, Kyoto on the autumn foliage, Cape Town in the southern summer;
- **lengths vary, 9 to 71 days**, so the `/explore` "When" duration presets genuinely filter — with the old uniform-ish windows every home passed every preset;
- the near months stay populated (3 homes in Sept 2026, 3 in Oct, …), so "I want to travel soon" returns results instead of an empty grid.

**Verified against the running app, not just the DB:** `/explore?date=2026-09-15` returns exactly Santorini + Siena; `/explore?date=2027-01-12` returns exactly Zermatt + Rovaniemi + Cape Town (Costa Rica correctly excluded — it opens on Jan 16). The detail page shows "Available January 9, 2027 – February 13, 2027" and the pickers clamp to that window.

**One UI change came with it:** the swap panel now prints the **year** in its dates ("open between Jan 9, 2027 and Feb 13, 2027"). A window can sit in the next calendar year, and a bare "Jan 9" reads as weeks away rather than months.

**These are fixed dates, so they will age.** From late 2027 shift the whole set forward by whole years — that keeps every home in its own season. The exact `update` statement is in the header comment of [seed-availability.sql](../../supabase/seed-availability.sql). A code-side auto-roll was deliberately **not** added: it would make the site disagree with what the Table Editor shows.

### Account menu, profile page & real listing creation (2026-08-18)

The navbar's signed-in state was `Saved · vujmatej@gmail.com · [Sign Out]`, and **"List Your Home" disappeared the moment you signed in** — it lived in the signed-out branch of a ternary, so the one state where you can actually list a home was the state without the button. Rebuilt from a clickable option menu the user picked from (full scope on all four questions). `next build`, `tsc` and `eslint` are **all green — including the previously outstanding `usePresence` error, so the project now has zero lint errors.** Verified by driving the running app in headless Chrome (44 checks, no console errors); DB changes applied to the live project via MCP and mirrored into [schema.sql](../../supabase/schema.sql).

**The navbar (Nielsen #2, #8, Hick, Fitts).** Three scattered account controls became one: an avatar trigger showing **the uploaded photo + the name's initials** ([user-menu.tsx](../../components/user-menu.tsx)). The email is not deleted — it **moves into the menu header**, where it identifies the account at the moment you act on it, instead of spending the widest slot in the header on a string the user already knows. A 32px circle near the corner is also a far bigger target than a text link. **Without a photo the circle *is* the initials**, so the label falls back to the first name — otherwise the trigger would read "MV MV".
- Menu contents follow the card-sorting sitemap in [Overview.md §4](./Overview.md) exactly (Dashboard / My Profile / Account Settings / Log Out), in three sections: **Saved homes** + **My listings** (both with live count badges) + **My swaps**, then **Profile** + **Account settings**, then **Sign out**. "My swaps" is rendered as plain text with a **Soon** chip — never a link, so it can't become a dead end (#1).
- Keyboard: ArrowDown from the trigger enters the menu, arrows rove, Escape closes **and returns focus to the trigger** (all three verified in the browser).
- **"List Your Home" now renders in both auth states**, and the account control is always the rightmost thing in the header — signed out that's "Sign In", signed in it's the avatar. Same arrangement Airbnb uses, so the corner means the same thing before and after login. The mobile drawer gets the same rows inline via [mobile-account.tsx](../../components/mobile-account.tsx) (a dropdown inside a drawer would be a menu inside a menu); both read from one `accountSections()` so they can't drift apart.
- New [profile-context.tsx](../../components/profile-context.tsx) loads the signed-in user's profile **once** app-wide (the SavedProvider pattern). The nav previously ran its own `getUser()` and only ever learned the email — it had no name or picture to show.

**Storage — the missing half of the schema.** `profiles.avatar_url` has existed since day one and **every row was null, because the project had no buckets at all.** Added `avatars` (5 MB) and `house-photos` (10 MB), public-read + owner-only write, path convention `<auth.uid()>/<file>` where the first folder segment *is* the id the policy checks. [lib/storage.ts](../../lib/storage.ts) builds and parses those paths, and replaced/unlisted files are deleted so the buckets don't collect orphans. `next.config.ts` allows `**.supabase.co` pinned to `/storage/v1/object/public/**`. **The avatars were already plumbed through the data layer** (`Host.avatarUrl`, `mapHost`) but never rendered — now shown on the listing card, the "Hosted by" block and every review.

**`/profile` — [profile-form.tsx](../../components/profile-form.tsx) + [account-settings.tsx](../../components/account-settings.tsx).** Photo upload (which uploads on selection with its own status line — a picker followed by a separate Save is a classic place people lose an upload), name / location / bio, and a **live "How hosts see you" card that renders the draft as you type**: these exact fields already drive the "Hosted by" block on every listing, so editing a bio with no preview was a textbook Gulf of Evaluation (Lecture 3). `#account` holds email, change-password and sign-out.

**`/list-your-home` — a real form ([listing-form.tsx](../../components/listing-form.tsx)).** Three steps rather than one long form: Persona 3 (Mateo & Elena) is explicitly "frustrated by complex sign-ups or too many buttons", and fifteen controls on one screen is exactly that (Hick's law + "Step 2 of 3" as a known quantity). Photos upload as they're picked, so Publish is fast and going back a step loses nothing. Publishing inserts a real `houses` row owned by you and lands on the live listing. [`/my-listings`](../../app/my-listings/page.tsx) shows them as the **same card everyone else sees on Explore**, with an **Unlist** that confirms inline (a second click on the same control, not a browser `confirm()`).

**Schema work this required** (all mirrored in `schema.sql`):
- **`houses.id` had no default at all** — the 10 demo rows were inserted with explicit ids, so a user-submitted listing could never have inserted. Added a sequence starting at 100, above the seeded range.
- Real **`type` / `amenities` / `verified` columns** (nullable, so the seeded rows keep using the derived values and no UI changed) — this starts paying down "amenities are still derived" (item 8 below) for new listings.
- Owner-only insert/update/delete RLS on `houses`, plus a `host_id` index.

**Bugs found and fixed on the way:**
1. **`?next=` was accepted everywhere and honoured nowhere.** The wishlist heart and the swap panel both push `/sign-in?next=…`, but `AuthForm` always redirected to `/`. Now honoured (same-origin paths only — `//evil.com` is discarded), and the same guard was added to the auth callback.
2. **A new listing would have crashed the card.** `house.rating.toFixed(1)` on a home with no reviews prints `★ 0.0`; a fabricated score is the same hollow trust signal the blanket "verified" badge was removed for. Card and detail page now say **"New"** / **"New listing"** until there are real reviews. (All 10 seeded homes have ≥3 reviews, so nothing existing changed.)
3. **The photo mosaic assumed four photos.** [gallery.tsx](../../components/gallery.tsx) used fixed grid rows, so a member listing with one or two photos left an empty cell beside the hero. The side column is now a flex stack that splits its height however many tiles there are, and a lone photo spans full width.
4. **The pre-existing `usePresence` lint error is gone** (item 13 below): `mounted` is now derived during render instead of set synchronously in an effect.

**Known limitations** (also carried into the list below as items 10 and 19). Listings can be created and unlisted but **not edited** — editing would mean a second pass over the same form and was left out deliberately rather than promised in copy. *(✅ Fixed 2026-08-18 — see "Listing flow, round 2" at the end of this file.)* Coordinates come from [lib/geocode.ts](../../lib/geocode.ts): the local city table first, then OpenStreetMap Nominatim, and **null on any failure** — a home missing from the map is a smaller problem than a submission that won't go through, but a listing in an unresolvable place won't appear on the maps.

---

## What's left to do (as of 2026-08-17, updated 2026-08-18)

Ranked by what actually blocks the course deliverable, not by size.

### Blocking the final submission
1. **Deploy to Vercel.** Nothing is live yet. Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars, then in Supabase add the Vercel URL to **Site URL** + the redirect allow-list. Everything else is ready; the build is green.
2. **Turn email auto-confirm OFF** before that deploy (it's ON for demo convenience — right now anyone can sign up with a fake address).
3. **Usability evaluation.** Still not done, and it's an explicit requirement. Cheapest credible version: 2-3 people, 3 tasks ("find a home in Greece for two weeks in September", "check whether it has a workspace", "start a swap request"), note where they hesitate, then rank the findings by severity as in Lecture 4. The listing page was rebuilt against the heuristics but never tested on a real person.
4. **PageSpeed Insights run** on the deployed URL + screenshot. Worth doing *after* deploy since the image work (AVIF + right-sized masters) should show up in LCP.
5. **Final report** — phases + usability findings + performance. The dated sections in this file are the raw material.

### Product gaps that a grader will notice
6. ✅ **FIXED (2026-08-21) — "Propose a swap" sends a real request.** `swap_requests` + `swap_messages` with RLS, a validation trigger and a closed status machine ([supabase/swaps.sql](../../supabase/swaps.sql)); `/swaps` is the inbox and `/swaps/[id]` the thread. See the dated section at the end of this file.
7. ✅ **FIXED (2026-08-21) — messaging exists.** A thread per swap request, private to its two participants by RLS. There is still no "Message host" *before* proposing — deliberate: the conversation is scoped to a swap, so it always has a subject.
8. ⚠️ **Amenities are still derived for the 10 seeded homes** ([lib/houses.ts](../../lib/houses.ts) `deriveAmenities`), so the noise is still there on them: *Pool* lands on ~8/10. **Half-done (2026-08-18):** real `type` / `amenities` / `verified` **columns now exist** and member-created listings write their own honest values; the seeded rows just have nulls and fall back to the derived guess. Finishing it is now only a `update public.houses set amenities = …, type = …` per demo home — no code change needed.
9. ✅ **FIXED (2026-08-22) — `verified` means something now.** It was `seeded(house.id, 7) > 0.3`, a hash of the listing's id. It is now a host's own record — 90 days a member, a bio and location, at least 3 reviews averaging 4.5+ — computed by `public.is_verified_host` in [supabase/trust.sql](../../supabase/trust.sql) and inherited by every home they offer. `/profile` carries a checklist showing exactly how far along a member is. Note that this is **reputation**, not identity: nobody's documents are checked, and the deferred ID/phone design in "Verification, designed but not built" below is still the answer if identity checking is ever wanted. See the last dated section for the full write-up.
10. ✅ **FIXED (2026-08-18) — a listing can now be edited.** [`/my-listings/[id]/edit`](../../app/my-listings/%5Bid%5D/edit/page.tsx) reopens the same four-step form on the existing row (owner-checked in the page and by the `UPDATE` policy), `/my-listings` has an **Edit listing** button, and `/explore/[id]` moved to ISR so an edit actually shows. See "Listing flow, round 2" at the end of this file.
11. **Category / inspiration pills** on Explore (Beachfront / Cabins / Trending), still unbuilt from the earlier selection round. A **Country** pill is now cheap too — `houses.country_code` exists and is indexed as of 2026-08-21 (see the last section of this file).

### Polish still outstanding
12. **Favicon is still stock Next.js** ([app/favicon.ico](../../app/favicon.ico), untouched since `create-next-app`) and the **nav still draws its own placeholder `DoorMark` SVG** instead of the real mascot that now lives in [public/mascot.png](../../public/mascot.png).
13. ✅ **FIXED (2026-08-18) — the `usePresence` lint error.** `mounted` is now derived during render instead of being set synchronously in an effect. **The project has zero lint errors**, so the report can claim a clean codebase.
14. **Stats are invented numbers** ("50K+ Members") — carry a disclaimer today, but they're still fiction on the home page.
15. **SEO basics: `sitemap.ts` and `robots.ts`** are still the open half. **Share metadata is done (2026-08-22)** — every public route now emits its own `og:*` + `twitter:*` + canonical through [lib/seo.ts](../../lib/seo.ts), verified 22/22; the site-root OG *image* landed 2026-08-21. Per-route card **images** (`opengraph-image.tsx` + `next/og`) were offered and deliberately not taken — see the last dated section for the font constraint if that changes.
16. ✅ **FIXED (2026-08-24) — light/dark toggle.** A second token block in [globals.css](../../app/globals.css) selected by `data-theme` on `<html>`, set before first paint by an inline script and flipped by one `<ThemeToggle>` in three places (footer, account menu, mobile drawer). The dark theme is provably unchanged. It does demo the design system — and it also found the four places the system was not as tokenised as this line assumed: 21 hard-coded shadows, 4 hover tints, the map tiles and the globe's greys. Dated section at the end of this file.

### Housekeeping
17. **Availability dates need a yearly roll** (see the section above) if the project is revisited after 2027.
18. **`swapdoor homepage.png` (841 KB) sits in the repo root** — it is the *source* the mascot is derived from, and since 2026-08-19 that derivation is a committed script ([scripts/derive-mascot.mjs](../../scripts/derive-mascot.mjs)), so the file now has a real job rather than being a leftover. Still worth moving somewhere deliberate (e.g. `art/`) rather than the repo root.
19. **A member-created listing gets `rating = 0` and no reviews**, so it always sorts last under "Recommended" (verified first, then rating). Fine today with one demo listing; worth revisiting if real listings pile up behind the seeded ten.
20. **Four junk test rows are live in `houses`** — ids **104** (*"agdadggaddagadg"*, Split), **107** (*"hrarhehrehre"*, Amsterdam), **110** (*"Vilic"*, Madrid) and **111** (*"123"*, Caracas), left over from form testing. They are why the site counts **14 homes rather than 10**, they are the first thing on the Explore grid, and since 2026-08-22 their names render as the `og:title` of a real share card. One statement clears them — `delete from public.houses where id in (104,107,110,111);` — but it is data, so it wants a deliberate call rather than a tidy-up. Do it before the demo.
21. **A signed-in member briefly sees the signed-out CTA** on `/` and `/how-it-works`, between first paint and the profile query landing (2026-08-22). Removing the flash means rendering the block on the server, which costs `/` its static prerender — recorded as the reason it flashes, not as a bug to chase.

---

### Hero decorations — real mascot artwork + a vertical swap loop (2026-08-17)

> **Superseded on 2026-08-19** for the right-hand half only — the `SwapLoop` described
> below was replaced by the turning globe (last section of this file). The mascot, its
> recolouring and the gutter arithmetic here are all still current.

The two flourishes beside the home headline ([components/hero-decor.tsx](../../components/hero-decor.tsx)) were replaced and then scaled up twice on request. `tsc` + `eslint` clean; verified in headless Chrome at 1024 / 1280 / 1440 / 1536 / 1920.

**Left — the real mascot instead of the hand-drawn SVG.** The hand-built `Mascot` SVG is gone; the left side now renders the actual brand artwork (`swapdoor homepage.png`, the walking Bigfoot carrying a door) through `next/image`. The source is a **near-black** silhouette that would have vanished on the `#1A2030` background, so it is pre-processed into [public/mascot.png](../../public/mascot.png): cropped to its bounding box (2048² canvas → 916×1181 of actual art) and recoloured by a luminance ramp that maps the two source tones onto the hero greys — body `#8D99B0`, door `#C6D0E0` — then rendered at `opacity-55`. Recolouring happens **once, in the asset**, not with a CSS filter, so the door stays lighter than the body. The original PNG is left untouched at the repo root; re-derive with the same crop+ramp if the artwork changes.

**Right — `JourneyScene` → `SwapLoop`.** The old two-houses-and-a-globe scene was horizontal (240×140) and unbalanced next to a tall mascot. It is now a **portrait** composition (100×180): two homes stacked with the globe between them and two dashed arrows circling down the left and back up the right — "your home goes out, theirs comes back". Each home is roof + **eave band** + a body wider than the roof is tall; the eave is what stops the silhouette reading as an *arrow* at small sizes (the first attempt did). The dashes drift toward their arrowheads via `.swap-loop-flow` in [globals.css](../../app/globals.css) — 9s linear, and `prefers-reduced-motion` turns it off, matching the file's existing animation pattern.

**Sizing.** Both grew ~4× from the original pass and now span the full height of the title block. Widths per breakpoint — mascot `w-16 / xl:w-40 / 2xl:w-72 / 3xl:w-[26rem]` (64 → 416px), loop `w-16 / xl:w-28 / 2xl:w-52 / 3xl:w-72`. **A new `--breakpoint-3xl: 112.5rem` (1800px) was registered in `@theme`** rather than writing an arbitrary `min-[1800px]:` variant — an arbitrary min-width variant **loses the cascade to `2xl:`** when both match, so the wide-desktop size silently did nothing until it was a real breakpoint. `sizes` on the `<Image>` matches those four widths so the browser never pulls the full-size source for a decoration.

**Hard constraint on going bigger — and the call taken.** The headline is a fixed 864px wide (`text-6xl`, one line), so the gutter each side is `(viewport − 864) / 2` — 528px at 1920, only **208px at 1280**. A further 3× was requested and does **not** fit: the art now sits at the maximum that clears the title on every width. The two ways past that ceiling — letting it sit **behind** the text (`-z-10`, lower opacity) or **bleeding off** the viewport edge — were put to the user, who chose to **keep the max-that-fits** so the headline stays fully legible.

### `/list-your-home` UX overhaul — review step, live preview, drafts & a confirmed address (2026-08-18)

A full pass over the listing flow, run as a **heuristic evaluation** first (Lecture 4 method: findings ranked by severity, each tied to a lecture) and then built from the ranked list, with the scope chosen by the user from a clickable option menu ("full pass"). `tsc`, `eslint` (whole `app/`, `components/`, `lib/`) and `next build` are all green, and every `/explore/[id]` still prerenders as SSG. Verified by driving the running app in headless Chrome — **22 checks, zero console errors** — including a real publish, after which the two test listings and their uploaded photos were deleted again.

**S1 — Publish was a one-way door with no review, and nothing said it had worked.** Listings can be unlisted but not edited, yet Publish fired from a screen showing only dates and value; the name, city, description and photos were two steps away and invisible at the moment of commitment (Nielsen #5: confirm before an irreversible action; #4's Pottery Barn effect). There is now a fourth **"Review"** step: the exact Explore card, plus every detail as a summary row with its own **Edit** jumping back to where it was typed, and a line saying plainly that this is the last stop because listings can't be edited yet.
- The form already redirected to `/explore/<id>?published=1` and **nothing had ever read that parameter** — you landed on an ordinary listing page with no confirmation (Gulf of Evaluation, Lecture 3). New [published-banner.tsx](../../components/published-banner.tsx) renders "Your home is live" with *See it on Explore* / *My listings* / *Copy link*, then strips the flag from the URL so a refresh or a shared link doesn't congratulate the next visitor. It's rendered inside `<Suspense>` so reading the query string doesn't drag the statically prerendered listing pages into dynamic rendering.
- **Bug found while verifying:** the URL cleanup first ran during render — but Next patches `history.replaceState` to drive its own router, so it updated the Router *while* the banner was rendering; React warned and the remount wiped the banner's state, making the message flash and vanish. Moved into an effect.

**S2 — The host never saw what they were making.** New [listing-preview.tsx](../../components/listing-preview.tsx) mirrors [house-card.tsx](../../components/house-card.tsx) (same radii, badges, "Est. $X /night", host row) minus everything interactive — a preview that could be clicked would be a false affordance (Lecture 2). It sits **sticky beside the form** on desktop and at the top of the review on phones. `/profile` had solved exactly this with its "How hosts see you" card; the bigger commitment now gets the same treatment.

**S3 — Work was lost, and photos leaked.** The whole form autosaves to localStorage ([lib/listing-draft.ts](../../lib/listing-draft.ts), per-user, versioned, quota-safe) and restores with a "picked up where you left off" line plus an inline-confirming **Start over**. `removePhoto` used to splice state only, so every removed or abandoned upload stayed in the `house-photos` bucket forever even though `storagePathFromUrl` existed for this; removal is now **undoable for 8 seconds** and then really deletes the file, and Start over / Publish clear whatever is left.

**S4 — Validation said "something's missing", never what.** The disabled Continue and its single generic hint are gone. Continue is **always enabled**; pressing it marks the step, renders a plain-language message under each offending field (`aria-invalid` + `aria-describedby`, red border) and **moves focus to the topmost one** (Nielsen #6). Messages clear as the fields are fixed, and the description counts down the characters it still needs.

**S5 — Photos.** A drag-and-drop zone; a per-file status line ("Uploading 2 of 3 — kitchen.jpg") because a handful of 10 MB files is far past Nielsen's 5-second limit, with skeleton tiles for the ones still in flight (supabase-js reports no byte progress, so the honest unit is files, not a fake percentage); and **always-visible** ← → ★ ✕ controls per tile instead of the old `group-hover` bar, which simply didn't exist on a phone. Order is also draggable on desktop.

**S6 — The address is confirmed while it's typed.** `geocode()` used to run silently inside publish: if it failed, `lat/lng` went null and the home never appeared on any map, and nobody was told. The city+country now resolve 800ms after typing stops (Nominatim's rate limit) and the step shows **"✓ Found Split, Croatia"** with a small [MiniMap](../../components/mini-map.tsx) — the same dark tiles and approximate circle the listing page uses — or a constructive warning that publishing still works but the home won't be on the maps. Publish reuses the resolved coordinates instead of looking them up again.

**S7 — a11y bug:** `<label htmlFor="listingGuests">` pointed at a `<span>`. A label only binds to a form control, so the guest stepper had no accessible name; it's now a `role="group"` with `aria-labelledby` and an `<output>`.

**S8/S9 — grouping, wording, layout.** Amenities moved off the "when is it free" step onto the home step, directly under the description — matching the listing page's own *About this home → What this home offers* order (proximity, Lecture 5). Step 1 is split into three labelled groups (Hick's "restructure into groups", not "show less"). The stepper is now **clickable** for any reached step (forward still runs the same check, so it can't skip a problem), a progress bar sits above it, "Est. value / night" matches the site's wording with a `$` prefix, and the action bar is **fixed to the bottom of the phone screen** (the mobile-swap-bar pattern) so Continue isn't a screenful below the fold.

**Known limitation at the time:** listings still couldn't be **edited** after publishing — the review step was the mitigation, not a fix. *(✅ Fixed later the same day — see "Listing flow, round 2" below.)*

### Listing flow, round 2 — quick-pick places, the shared calendar, a clickable stepper & **editing** (2026-08-18)

Six changes asked for after using the new flow, all verified in headless Chrome (**22 checks, zero console errors**) and cleaned up afterwards. `tsc`, `eslint` (whole `app/`, `components/`, `lib/`) and `next build` are green.

**1. The preview no longer shows an empty photo box.** [listing-preview.tsx](../../components/listing-preview.tsx) renders the image area only once a photo exists — on step 1 the card is just the details. An empty 4:3 "your cover photo shows here" panel filled the sidebar with a step the host hadn't reached yet (Nielsen #9). Add photos and go back to step 1 and the photo is there, because the condition is *has a photo*, not *is on step 2*.

**2. The steps look like the controls they are.** They were flat number-plus-label text, which reads as a progress indicator, not a button — the flat-UI ambiguity Nielsen #2 warns about — so nobody realised a finished step could be clicked. Each step is now a bordered pill with hover lift, a **pencil** on every step you can open, dashed/greyed styling for steps you haven't reached, plus a one-line signifier: *"Click any step above to go back and change it — nothing is lost."* Forward jumps still run the same validation Continue does, so the stepper can't skip a problem.

**3. City and country can be picked, not just typed.** New [suggest-input.tsx](../../components/suggest-input.tsx) is a real combobox (role, ↑ ↓, Enter, Escape, `aria-activedescendant`) — free typing still works. The City list leads with **real SwapDoor destinations and their live "N homes to swap here" counts** (passed in from the server via `topDestinations`), then falls back to [lib/places.ts](../../lib/places.ts). **Picking a city fills the country too** — two fields, one decision — and it also protects the map, since a picked place is spelled the way the geocoder expects (recognition over recall, Nielsen #7).

**4. One date picker on the whole site.** The search bar's month calendar moved out to [components/calendar.tsx](../../components/calendar.tsx) and both use it: the same Monday-first grid, the same range band, the same "N nights" header and Clear. The listing form's two `<input type="date">` boxes are gone — they were a third, browser-dependent look on the darkest page of the site (Nielsen #2). Range logic comes free: first click sets the first free day, second the last.

**5. The est. value field lost its spinner.** `type="number"` gave ±1 arrows for a figure nobody tunes a dollar at a time (and it hijacked the scroll wheel). It's now a numeric text field that filters non-digits, capped at six of them, with the `$` still inside the box.

**6. Listings can be edited — the biggest gap in the previous pass is closed.** New route [`/my-listings/[id]/edit`](../../app/my-listings/%5Bid%5D/edit/page.tsx) reopens the *same* four-step form on an existing row (`ListingForm` gained `initial` + `houseId`), so there is one form to maintain, not two. Details worth knowing:
- **Ownership** is checked in the page (the `/my-listings` prefix is already gated by `proxy.ts`) and enforced again by the owner-only `UPDATE` policy on `houses`.
- The page reads the **raw row** for photos and dates rather than the enriched `House`: `enrichHouse` rewrites Unsplash URLs and invents an availability window when the column is empty, and saving those derived values back would be silent data invention.
- Every step is **reachable immediately** when editing — the usual reason to open it is to change one date.
- The update touches only the fields the form owns; **rating, review count and `verified` belong to the listing's history**, not to an edit of it.
- Removing a photo while editing **doesn't delete the file on the undo timer** — the live row still points at it, so an abandoned edit would leave a broken image on a published listing. Those go to a graveyard and are deleted only after the save succeeds.
- Landing back on the listing shows **"Your changes are live"** — [published-banner.tsx](../../components/published-banner.tsx) now handles `?published=1` and `?updated=1`.
- `/my-listings` gained an **Edit listing** button per card (a price or a date changes far more often than a home stops being offered, so Unlist stays the quiet one).
- **`/explore/[id]` is now ISR (`revalidate = 60`)** instead of frozen at build time — a page prerendered once would have kept serving the pre-edit copy forever.
- Every "listings can't be edited yet" line — review step, page intro, the trust list, the success banner — was replaced, since it is no longer true.

**Bug found and fixed while verifying:** [house-map.tsx](../../components/house-map.tsx) never cleared its `setTimeout(… invalidateSize, 120)`, so a map unmounted within 120ms threw `Cannot read properties of undefined (reading '_leaflet_pos')` into the console. Harmless before, when maps only ever mounted with the page; the form's live location preview disappears the moment you leave step 1, which surfaced it twice per run.

**Item 10 in "What's left to do" (a listing can be created and unlisted, but not edited) is done.** Still open from that list: the swap request itself doesn't send anything (item 6) and there is no messaging (item 7).

### Hero globe — a turning world of glyphs, pins and swap arcs (2026-08-19)

The right-hand hero decoration was replaced again, this time from a reference image the
user supplied: a large sphere built out of thousands of tiny typographic marks, turning
like a globe. The options were put to the user as a clickable menu (globe variant ×
placement × what happens to the mascot); they picked **glyphs + real continents + SwapDoor
pins and swap arcs**, **bigger but fully visible** (no bleeding off-screen, no sitting
behind the text), and **mascot unchanged**. `tsc`, `eslint` (whole `app/`, `components/`,
`lib/`) and `next build` are green, and every check below was measured in headless Chrome
against the running app rather than eyeballed.

**What it draws** ([components/globe.tsx](../../components/globe.tsx)). An evenly spread
point cloud (Fibonacci sphere — a lat/lng grid would pile points up at the poles), each
point tagged land or ocean once at build time and given one of eight marks: dot, bars,
square, `⌐`, `T`, `⌙`, arc. Land takes the heavier marks in the light decoration grey
(`#C6D0E0`) at full size; ocean takes the light marks in the dark line grey (`#5E6B85`)
at 75% size and 60% alpha, so **the continents carry the contrast** (Lecture 5) without
introducing a colour. On top of that sit the **ten seeded homes** as pins — read from
[lib/coordinates.ts](../../lib/coordinates.ts), the same table the Leaflet maps use — in
`--color-accent`, and one **swap arc** at a time: a great-circle hop between two of those
cities, lifted off the surface, drawn over 2.2s with a dot riding its leading end, held,
faded, then a new pair. That arc is what carries over the meaning the old two-houses-and-
arrows loop had. The accent is read from the CSS token at mount, so a palette change still
follows; only the two decoration greys are literals, as in `hero-decor.tsx`.

**The land mask** ([lib/land-mask.ts](../../lib/land-mask.ts)). Natural Earth's
public-domain `ne_110m_land` outline, rasterised once to a 1°-per-cell grid (360 × 180,
33.2% land), packed one bit per cell and base64'd: 10 800 characters in the file, ~3 KB
gzipped over the wire, no runtime dependency and no network call. It is regenerated only
if the resolution ever needs to change.

**Why `<canvas>` and not `<svg>`** (the user asked for "an SVG"). At these sizes it is
900–4 200 marks, every one of which moves every frame. As SVG that is a DOM write per mark
per frame; on canvas each is a single `drawImage` from a sprite pre-rendered once per size,
which is also why the marks are drawn as vector shapes rather than set as text — a real
glyph set would depend on whichever mono font the visitor happens to have. Costs are kept
deliberately small: the far hemisphere is never drawn, the loop is capped at 30fps, the
projection writes into one shared slot instead of allocating per point, and the whole thing
stops when it scrolls out of view or the tab is hidden. `prefers-reduced-motion` gets a
single static frame — **verified**: sampling the canvas twice 1.5s apart returns two
different images normally and an identical one under `--force-prefers-reduced-motion`.

**Sizing — the 2026-08-17 gutter problem, solved in CSS instead of breakpoints.** The
headline is a fixed 864px, so the room beside it is `(viewport − 864) / 2` and nothing
else. Rather than four hand-picked breakpoint widths, `.hero-globe` in
[globals.css](../../app/globals.css) derives the width from `100vw` (`clamp(0px,
calc((100vw − 891px) / 2 − 0.375rem), 520px)` — 891 = the headline, plus ~15px because
`vw` counts the scrollbar and the layout does not, plus 12px for a 6px gap at each end).
Measured in the browser: **60.5px at 1024, 188.5px at 1280, 316.5px at 1536, 508.5px at
1920 — with exactly 6px of clearance to the headline at every one of them**, against
64/112/208/288px before. The globe is anchored to the whole `<section>` rather than to the
headline block, so it centres against the hero instead of the title line.

**Bugs found and fixed while verifying:**
- The effect bailed out (`if (!layout()) return`) when the canvas had no box at mount —
  which is exactly the case below `lg`, where it is `display: none`. Widening the window
  past 1024 afterwards would then have left a permanently blank globe, because the
  ResizeObserver had never been attached. Measurement and repaint now live in one
  `refresh()` that the observers call unconditionally.
- The 30fps cap advanced the spin by only the last frame's `dt` while swallowing the
  skipped ones, so the globe turned at half the intended speed.
- `width` could evaluate negative on narrow viewports, which drops the declaration and
  falls back to the canvas's 300px intrinsic width; `clamp()`'s 0px floor makes that safe
  even if the globe is ever shown below `lg`.

**Checked:** no console errors at any width; no horizontal overflow at 400 / 768 / 1024
(`scrollWidth === clientWidth`); hidden below `lg` exactly as the mascot is; `next build`
still prerenders `/` as static.

**Known limitation.** At 1024–1150px the gutter is genuinely only ~60–90px, so the globe is
small there and the texture reads as a dense speck rather than a world. That is the same
ceiling documented on 2026-08-17: the only ways past it are letting the art sit behind the
headline or bleed off the viewport, both of which the user has now declined twice.

### Mascot re-toned — the door is the lighter element again (2026-08-19)

The hero mascot was replaced with a new export of the source artwork, which turned out to be **three near-identical dark tones**: body `#2C3444`, door `#20202C`, knob near black. Two problems at once — everything sat within a hair of the `#1A2030` page background, and the *door*, which is the brand's whole idea, was **darker than the bigfoot carrying it**.

It is now derived by a committed script, [scripts/derive-mascot.mjs](../../scripts/derive-mascot.mjs) (`node scripts/derive-mascot.mjs`), which does the whole pipeline in one place:
- **crops to the alpha bounding box** (2048² canvas → 917×1181 of actual art), so size is controlled purely by the width class in [hero-decor.tsx](../../components/hero-decor.tsx);
- **re-tones by luminance**, which separates the three source tones cleanly (≈51 / ≈34 / ≈11) with a soft window at each boundary so the artwork's own anti-aliasing survives → body `#3E4A66`, door `#7A88A6`, knob `#2A3245`. Pixels with `alpha < 200` are always body: the door is fully interior, so every silhouette edge belongs to the body, and that rule is what keeps a light halo from forming around the outline.

It happens **once, in the asset** rather than with a CSS filter, because a filter shifts both tones together and could never invert their order. Position is unchanged — the mascot stays anchored to the left of the headline (`right-full`), with the globe in the right gutter. The dependency-free PNG decode/encode in the script exists so this needs no image library.

**Note if the mascot looks wrong after replacing the artwork:** `next/image` caches by URL, and the URL doesn't change when the file does — the dev server served the *previous* mascot for a while after the PNG was swapped. `rm -rf .next/cache/images` clears it.

### Globe round 2 — the continents were mirrored, and unreadable (2026-08-19)

Reported as "the continents on the globe are badly done". Diagnosed before proposing
anything, by rendering the shipped mask through the component's own projection maths
offline and by cutting the globe out of a full-size screenshot. Three separate faults, of
which only the first was a bug:

1. **The world was mirrored.** `project()` had `proj[0] = size / 2 + xr * radius`, which
   puts east on the left: at 12 000 points the render shows Madagascar west of Africa and
   the Arabian peninsula in the top *left*. Fixed by negating the screen x and making the
   spin count **down**, which together put east on the right and drift the surface
   rightwards — Earth as it is seen from space with north up. Verified two ways: Africa now
   matches the flat mask, and the horizontal centre of mass of the drawn marks measurably
   moves right over six seconds.
2. **Far too few marks.** The cap was 4 200 points over the whole sphere — about 2 100
   reaching the screen, one per ~9px, which cannot resolve a coastline. The same mask at
   12 000 renders a perfectly legible Africa, Mediterranean, Arabia and Madagascar.
3. **Land and ocean were nearly the same.** They differed only by alpha 0.95 vs 0.6 and a
   little size, and drew from the same mark vocabulary, so the continent never separated
   from the ground (Lecture 5, contrast: "for contrast to be effective, the two contrasted
   elements must be very different"). On top of that the Fibonacci spiral drew visible
   spiral arms that competed with the shapes.

The mask itself was fine — rendered flat it is a correct world map, 33.2% land.

**What was built, from a clickable menu of four packages: "land only".** The ocean is now
drawn as *nothing at all*, and the sphere's edge is a dashed limb ring in the dark tone —
the only thing that says "sphere" where the visible face is water, dashed so it stays in
the same dotted language instead of ruling a hard circle. Since land is a third of the
sphere, the spiral can be sampled **~4-6px apart instead of 6.5-10** (up to 16 000 points,
of which ~3 700 are kept and ~1 900 drawn) and still put *fewer* marks on screen than the
version it replaces. Coastlines are anti-aliased by a new `landCoverage()` in
[land-mask.ts](../../lib/land-mask.ts) — a five-tap cross half a cell wide — so a mark
straddling the coast comes out smaller and dimmer than one well inland. Below ~5px the
mark vocabulary drops to dot/square/bar, since a `T` or a `⌙` that small is mush.
Antarctica stays, by the user's call.

**Measured, not estimated** (headless Chrome, software rendering, so a worst case; the page
with the globe hidden measures 0.0%):

| viewport | globe | script | task |
|---|---|---|---|
| 1280 | 188px | 2.9% | 10.0% |
| 1920 | 508px | 8.4% | 23.7% |

The loop was also dropped from 30 to **24fps** and the canvas capped at **1.5× device
pixels** — at one revolution a minute a mark moves well under a pixel per frame, and the
marks are a few pixels across, so neither is visible, but together they cut the largest
size by about an eighth and halve the cost on a retina screen. `prefers-reduced-motion`
still renders one static frame (verified: identical canvas twice, 1.5s apart).

**Worth knowing for next time:** after replacing a file in `public/`, `next dev` keeps
serving the *old* optimised bytes from **`.next/dev/cache/images`** — not the
`.next/cache/images` of earlier versions. Clearing it while the server is running does
nothing either, because the live server rewrites its in-memory copy back. Stop the server,
delete that directory, then start it.

### The listing page's date picker — one availability calendar instead of two browser ones (2026-08-19)

Reported as "the calendar on the listing page doesn't look right, and it needs **one**
calendar for check-in and check-out, not two — and it should actually work". Both halves
were true, and they had the same root cause.

**What was actually there.** [swap-panel.tsx](../../components/swap-panel.tsx) collected the
dates with two native `<input type="date">` boxes. Clicking either one opened **the
browser's own calendar** — so the page really did show two separate pickers, each drawn by
Chrome / Safari / Firefox in its own way, on the one page whose entire job is to look
trustworthy. The only thing holding them to the palette was a `[color-scheme:dark]` hack.
This was also the **last** corner of the site still ignoring
[components/calendar.tsx](../../components/calendar.tsx): the search bar's "When" and the
listing form had both moved onto the shared grid on 2026-08-18 under the heading *"One date
picker on the whole site"*, and this panel was simply missed (Nielsen #2 *consistency and
standards*, CRAP *repetition*).

**What it is now — a host's availability calendar, not a generic date field.** One month
grid for both ends of the stay: first click sets check-in, second sets check-out, hovering
previews the range. The scope was picked by the user from a clickable menu of four
placements; they chose the **availability-first calendar with length presets**, plus a
**mobile bottom sheet**.
- **The host's window is drawn, not just enforced.** Days outside `available_from →
  available_to` are **struck through**, not merely dimmed. Colour alone must never carry a
  meaning (Lecture 6, guideline 4) — the strike is the redundant signifier that survives a
  grayscale check and every kind of colour-blindness. A three-item legend (*Your dates* /
  *Open to swap* / *Host not free*) sits under the grid, since a struck-out date is the
  unusual state on this page.
- **Month paging is clamped at both ends.** `Calendar` already refused to page before
  `min`; it now refuses to page past `max` too. A month in which every single day is struck
  out is a dead end, not information (Nielsen #5).
- **Three length presets** — *1 week*, *2 weeks*, *Whole window* — extend from the check-in
  you already picked, or from the host's first free day if you haven't picked one, so a
  preset is never a surprise jump into another month. A preset that **wouldn't fit inside
  the window is disabled rather than silently clamped**: on the 9-day Costa Rica window and
  the 11-day one, *2 weeks* is greyed out; on the other eight homes both fit. That is error
  prevention doing the work an error message used to do, and an accelerator for the common
  cases (Hick's law, Nielsen #8).
- **The status line always names the end you are choosing** — *Select check-in* → *Select
  check-out* → *7 nights*, with **Clear** beside it (Nielsen #3, #4).
- **A window that has already closed** no longer renders a calendar of nothing but
  struck-out days: the panel says so in words, keeps *Save this home* available, and
  disables *Propose a swap*.

**Phones get the same picker as a bottom sheet.** Inline, a month grid would have pushed
the guest count and the primary CTA a full screen further down a page that already stacks
the panel last. The **Dates** row opens a sheet anchored to the bottom edge — bigger targets
under the thumb (Fitts) — with three ways out (backdrop, Escape, an explicit *Done · N
nights*), the page scroll locked behind it, and `.swap-sheet` in
[globals.css](../../app/globals.css) rising it from the edge it belongs to, `prefers-
reduced-motion` respected like every other animation in the file. It is portaled to `<body>`
at `z-[60]`, above the sticky `MobileSwapBar` at `z-40`. Desktop and sheet render **the same
single `<DateChooser>` instance**, so there is never more than one calendar on the page.

**Changes to the shared calendar** ([calendar.tsx](../../components/calendar.tsx)) are
additive, so the search bar and the listing form are untouched: a new optional `max`, a
`markUnavailable` flag for the strike styling, an exported `addDays()` (the presets need
it), the clamped next-month button, and a readable `aria-label` on struck-out days —
`"September 1 — not available"` rather than the machine's `2026-09-01` (Nielsen #1).

**Also fixed while in there:** the guest stepper's `<output id>` was pointed at by a
`<label htmlFor>`-style `id` that no longer had a label bound to it; it is now a
`role="group"` with `aria-labelledby`, matching the fix already made in the listing form on
2026-08-18. The panel gained `lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto` so the taller
sidebar can still be scrolled to its CTA on a short laptop screen.

**Verified**, not eyeballed: `tsc`, `eslint` over `app/`, `components/` and `lib/`, and
`next build` are all green, and the built page was served and read back for all ten seeded
homes.
- Zero `type="date"` inputs left anywhere on the page.
- Santorini (Sept 5 – Sept 27, 2026) opens **on September 2026**, with 1–4 and 28–30 struck
  out and **both** month arrows disabled — the window fits in one month.
- Provence (Oct 3 – Dec 6, 2026) has *previous* disabled and *next* enabled, i.e. the
  clamp follows the window, not the calendar.
- Preset disabling matches the window lengths exactly: 1 disabled preset on the two homes
  with sub-fortnight windows, 0 on the other eight.

### Landing page — heuristic evaluation, then eight fixes (2026-08-21)

The home page was evaluated against the course heuristics (Lecture 4 method: findings
ranked by severity, each tied back to a lecture) and then rebuilt from the ranked list. The
scope was chosen by the user from a clickable menu of options per finding. `tsc`, `eslint`
over `app/`, `components/` and `lib/`, and `next build` are green; `/` still prerenders as
static. Everything below was **measured in headless Chrome over CDP against the running
production build**, not eyeballed — the raw numbers are quoted inline.

**The diagnosis.** The first screen was visually accomplished and sold the *idea* well, but
it contained no evidence: no rating, no face, no photo, no number that was true. Meanwhile
the two largest, brightest objects on it were the mascot and the globe, neither of which
carries meaning, and the one control that matters — the search bar — was very nearly the
same value as the page behind it. For a product whose stated primary barrier is *"wary of
scams"* (Overview §3), that is the wrong thing to put first.

**S1 — Nothing above the fold said anyone had ever used SwapDoor. (Half reverted.)**
A **trust strip** was built under the search bar — three reviewers' initials, the star
average, the review count and the home/country count, every figure *counted* from the
listings the page already loaded rather than written down. It rendered correctly (*"★ 4.8 ·
from 33 member reviews · 12 homes in 12 countries"*, matching the database exactly) and was
then **removed at the user's request** along with the S6 chips — they did not like the band
of small text under the bar. The supporting `communityStats()` helper was deleted with it
rather than left as dead code; the marquee below now carries the social proof on its own.

What **did** stay from S1 is the fold itself: the hero came down from `88vh` to **`76vh`**.
At 88 the first screen was the hero and nothing else, so nothing suggested the page
continued. Measured at a 950px viewport, the next section's "Find homes on the map" heading
now sits at y=867 — **83px above the fold**.

**S2 — The mascot was beating the headline.** At `3xl` it was 416px wide at full opacity,
making the biggest and highest-contrast object on the first screen the one carrying no
meaning (Lecture 5: the dominant element should be the important one). First pass shrank it
and put it to `opacity-70`; **superseded the same day** — see "Mascot re-placed" at the end
of this section for where it actually landed.

**S3 + S5 — The search bar looked like static text, on a background it nearly matched.**
Two faults with one cause, so they were fixed together.

- Each segment now carries a **glyph** (pin / calendar / person) as its resting-state
  signifier. Before, the cells had no border, no caret and no icon, and only announced
  themselves as controls **on hover** — which on a touchscreen is never (Lecture 2:
  an affordance nobody can perceive is not signified).
- The bar moved onto the new **`surface-raised`** token. `surface` on `bg` measured
  **1.35:1** of luminance — the site's primary control was held apart from the page by a
  hairline alone (Lecture 5: contrasted elements must be *very* different). It now measures
  **1.56:1**. The whole lift/dim mechanic is unchanged, just shifted one step lighter:
  verified in the browser, opening a segment drops the bar to `rgb(35,43,62)` while the
  active chip rises to `rgb(51,63,94)` and its neighbours dim to `opacity: 0.6`. Hover also
  **lightens** now instead of darkening, which on a raised bar had read as the cell sinking
  away from the pointer.

**S4 — Placeholder text failed AA, on the words that say the field is fillable.**
`text-muted/70` on the bar computed to **4.12:1**, under the 4.5:1 floor for text that size.
Now plain `text-muted`: **measured 4.99:1** in the browser. The same class was fixed in the
"Type a city" input and on the footer's copyright line, which is now de-emphasised by
**size** (`text-sm`) rather than by fading the ink — the right way round.

**S6 — The hero assumed you already had a city in mind. (Reverted.)** Three **destination
chips** plus a *Browse all homes →* link were added under the bar, built from the
`topDestinations` the page was already computing and passing into the provider but never
showing outside the Where popover (recognition over recall, Nielsen #7). They worked, and
were **removed at the user's request** together with the trust strip above.

The `submitWith(patch)` addition to
[home-search-context.tsx](../../components/home-search-context.tsx) that the chips needed
was reverted with them, so `submit()` is back to its original single form. Worth knowing if
the chips ever return: `submit()` reads `values` from its closure, so a chip that calls
`setValues({where})` and then `submit()` in the same handler commits the value from
*before* its own click — it needs the patch and the commit to happen together.

**S7 — The hero opened with a number the page later disclaims.** *"Authentic local stays in
180+ countries"* sat two screens above a Stats block that has to carry a *"not real platform
data"* footnote. It now reads **"Swap your home for someone else's. No nightly rate, no
booking fees."** — which is true, and describes the actual model rather than a scale that
does not exist. (Item 14 in "What's left to do" is **narrowed, not closed**: `Stats` still
prints its invented 50K/180+/100K, it just is no longer the *first* claim the site makes.)

**S8 — The nav never said where you were.** Every link rendered identically on every route,
so it answered "where can I go" but never "where am I" (Nielsen #1). New `NavLink` in
[navigation.tsx](../../components/navigation.tsx) marks the current section, in the desktop
row and the mobile drawer alike. `/blog/some-post` still counts as Blog; `"/"` is matched
exactly so it can never light up everywhere. Current is signalled **twice — colour *and* an
underline** — because a state carried by colour alone is invisible to the ~8% of men with a
colour vision deficiency and does not survive a grayscale check (Lecture 6, guideline 4),
plus `aria-current="page"` for assistive tech. Verified: 0 marked links on `/`, exactly 2 on
`/explore` and 2 on `/blog` (desktop + drawer).

#### The reviews marquee (new)

Two rows of **real** guest reviews drifting in opposite directions, between How-it-works and
the sign-up CTA — the last thing read before the ask is other members saying it worked.
[reviews-marquee.tsx](../../components/reviews-marquee.tsx), fed by the new
`getFeaturedReviews()` in [lib/houses.ts](../../lib/houses.ts).

- **Why it moves.** A single testimonial reads as one cherry-picked quote; a wall of them
  that keeps arriving reads as a population, which is the thing the cautious personas are
  actually weighing. Opposite directions stop the pair scanning as one block of sliding text.
- **Nothing is invented.** 33 reviews already existed in Supabase across 10 homes, 47–107
  characters each, with a named author and city — short enough to be read while moving. Each
  card names the home and **links to it**, so the claim is checkable in one click.
- **`rating >= 4` is a floor, not a whitewash.** It exists so a future genuinely bad review
  stays on its listing, where a buyer needs it, instead of being hoisted onto the marketing
  page — and it hides nothing: the listing page still shows every review, and the aggregate
  the trust strip prints is computed from **all** of them. Today it excludes nothing at all.
- **Zero JavaScript.** The motion is CSS (`.rv-marquee` in [globals.css](../../app/globals.css)),
  so the whole section is server-rendered. Each track holds the list twice and translates
  exactly `-50%`, which lands copy 2 where copy 1 started; the duplicate is `aria-hidden` and
  carries no links, so a keyboard user tabs each review **once** — measured: 32 cards, 16
  duplicates, **16 focusable links**.
- **Motion is decoration, never the carrier.** Everything is readable while paused, and the
  pause is offered three ways. Verified in the browser: the transform advances over 1.5s;
  under a synthetic hover it does **not**; and under `prefers-reduced-motion` the animation
  is `none`, the duplicate copy is `display: none`, and the strip becomes an ordinary
  `overflow-x: auto` scroller.

#### Shared components touched (they are used elsewhere — all re-checked)

- **`SearchFields`** is used in **three** places — the hero, the docked nav pill, and
  Explore ([explore-view.tsx](../../components/explore-view.tsx)). The icons, the raised
  surface and the contrast fix therefore land on **Explore too**, which is the point
  (CRAP: repetition). Confirmed present in the `/explore` HTML.
- **`Navigation`** is on 10+ routes, so S8 is site-wide.
- **`Stars`** was exported from `reviews-section.tsx`, a **Client Component** — importing it
  dragged the whole reviews UI into the bundle of any page that only wanted to draw a
  rating. It now lives in its own hook-free [stars.tsx](../../components/stars.tsx) and is
  **re-exported** from `reviews-section.tsx`, so the listing page's existing
  `import { ReviewsSection, Stars }` is untouched while the marquee and the trust strip ship
  no JS for it.
- **`Avatar`**, **`Footer`**, **`home-search-context`** — as described above.

#### Verified, not eyeballed

`tsc` clean · `eslint` clean · `next build` green, `/` still `○ (Static)`, all 12 listings
still prerender · **zero console errors** · **no horizontal overflow at 390 / 768 / 1024 /
1280 / 1900** (`scrollWidth === clientWidth` at every one).

#### Known limitations / follow-ups

- ~~The marquee's avatars are **initials, not photos** — none of the seeded reviewers has an
  `avatar_url`. `Avatar` already prefers a real photo when one exists, so this fixes itself
  if the demo profiles ever get pictures.~~ ✅ **FIXED 2026-08-23** — all seven demo hosts
  now carry a portrait in the `avatars` bucket, and the marquee renders them. See the last
  dated section.
- Long home names **truncate** in a marquee card (*"Swapped into Provencal Lavender Estate,
  Prov…"*), taking the trailing arrow with them. Fine at 19rem; worth a shorter label if the
  card ever narrows.
- `Stats` (item 14) still prints invented figures (50K/180+/100K), and with the counted
  trust strip pulled back out, the home page's **only** hard numbers are now the invented
  ones. That makes finishing item 14 more worthwhile, not less: derive `Stats` from the
  listings the page already loads — the deleted `communityStats()` is in this file's git
  history and did exactly that — or drop the block.

#### Mascot re-placed — off the headline, onto the hero (2026-08-21, same day)

Reported after seeing the first pass: the mascot *"sits too far up"*, should be **fainter
still**, and — once lowered — **bigger top-to-bottom**. All three had one cause.

**Why it floated.** The mascot was anchored to the headline, not to the hero: it lived
inside the `h1`'s `relative inline-block` wrapper at `right-full top-1/2 -translate-y-1/2`,
so it was centred on the **title's** midpoint. The title sits near the top of a section that
is much taller than it, so the art was pinned high and drifted out of the composition —
while the globe, moved onto the `<section>` back on 2026-08-19, was correctly centred. The
two decorations were being positioned by two different rules.

**What it is now.** The mascot is anchored to the `<section>` exactly as the globe is
(`left-1.5 top-1/2 -translate-y-1/2`), and sized by a matching `.hero-mascot` clamp in
[globals.css](../../app/globals.css) on the same gutter arithmetic. Measured in the browser
at four widths, the mascot's vertical centre, the globe's vertical centre and the hero's
own centre are now **the same pixel** (445 at 1920; 407 at 1536 / 1280 / 1024).

- **Lower** — it centres on the hero instead of on one line of text.
- **Fainter** — `opacity-50` (from `opacity-70`, itself from an effective 100%). *Taken
  further to `opacity-35` in the follow-up below.*
- **Taller** — freed from the title's midpoint its height is no longer bounded by a line of
  text, so the cap went to **400px wide → 515px tall** at 1920, against 320×412 before.
  Capped lower than the globe's 520 precisely because the artwork is portrait (917×1181):
  520px of width would be 670px of height in a 722px section.

**The `sizes` attribute had to follow.** [hero-decor.tsx](../../components/hero-decor.tsx)
still named the old breakpoint widths (416/288/160/64), which no longer describe anything
now that the width comes from a clamp — the browser would have picked the wrong candidate
file. It now names the widths the clamp actually reaches (400px at ≥1704, ~316 at 1536, ~188
at 1280, ~60 at 1024), written as media queries because `sizes` support for `clamp()` is
patchy.

**One measurement worth not misreading.** The mascot's right edge overlaps the `h1`'s
*element box* by ~10px below 1920. That box is `max-w-4xl` (896px) and full-width, but the
headline **text** inside it is centred and narrower, so the real clearance to the first
letter is ~13px at 1280 and the overlap is into empty space. Verified visually at every
width; nothing touches the text.

**Verified:** `tsc`, `eslint` (`app/`, `components/`, `lib/`) and `next build` green, `/`
still `○ (Static)` · **zero console errors** · no horizontal overflow at 1024 / 1280 / 1536 /
1920 · the hero's entire interactive content is now exactly four controls (Where, When, Who,
Search) · the reviews marquee is untouched by the rollback — still 32 cards, 16 focusable
links, animating.

#### The docked pill had not followed the bar, and the mascot was pinned to the edge (2026-08-21, same day)

**The search box changed colour depending on whether it was docked.** Reported as *"it is
not the same colour on home and on Explore, up in the nav bar, as when it is shown in
full"* — and it was exactly that. The compact pill in the header is **its own component**,
`SearchPill` in [navigation.tsx](../../components/navigation.tsx) — reasonably so, since it
is one button that opens the real bar rather than three popover triggers — so when the full
bar moved onto `surface-raised` earlier in the day, the pill stayed behind on `surface`.
One control, two colours, on the same page (Nielsen #4, consistency and standards; CRAP
repetition). The pill and its two dividers now use `surface-raised` / `border-raised`, and
a note above `PillSeg` records that this component has to track `SearchFields` by hand.

That was the last of it: the search box exists in **six** places, and all six were measured
in the browser as `rgb(51,63,94)` on `rgb(76,91,126)` — home hero bar, home docked pill,
home drop-down bar, Explore in-page bar, Explore docked pill, Explore drop-down bar.

**The mascot was pinned to the window edge instead of centred in its gutter.** Reported as
*"too far left"*. `left-1.5` was right only while the width filled the gutter exactly; above
~1700px the 400px cap starts biting and all the leftover slack piled up on the headline
side, leaving the art jammed against the window with a gap beside the text. `.hero-mascot`
now computes its own `left` as `(gutter − width) / 2`, so the slack is spent evenly.
Measured: it moves **right by 51px at 1920** (left 6 → 57) and by ~0 at 1536 / 1280 / 1024,
where the cap is not reached and there is no slack to spend — which is the correct
behaviour, since at those widths it is already close to the text. Clearance to the first
letter of the headline is 65px at 1920 and 11px below it. Opacity went **0.50 → 0.35**.

**Verified:** `tsc`, `eslint`, `next build` green · zero console errors · no horizontal
overflow at 1024 / 1280 / 1536 / 1920 · mascot still centred on the hero at every width
(its centre, the globe's centre and the section's centre remain the same pixel).

**Spotted while verifying, not fixed (not in scope):** the Explore grid is showing two
leftover **test listings** — *"agdadggaddagadg"* (Split, a photo of a skid-steer loader) and
*"hrarhehrehre"* (Amsterdam, the SwapDoor logo as its cover photo). They are real rows in
`houses` from earlier form testing, and they are why the counts read 12 homes rather than
10. Worth deleting before the demo — a grader will see them on the first Explore screen.
*(Update 2026-08-22: there are now **four** — ids 104, 107, 110 (*"Vilic"*, Madrid) and 111
(*"123"*, Caracas), which is why the count is 14. They are also now the `og:title` of a real
share card. Tracked as item 20 below.)*

### "Propose a swap" became real — requests, an inbox, and a conversation (2026-08-21)

Reported as three things at once: the docked search bar should also exist on a
listing page once you scroll past the swap panel; the calendar should be a
drop-down with the card moving like Airbnb's; and *"the Propose a swap button
does almost nothing — it isn't connected"*, which should bring notifications and
a conversation between the two hosts with it. The scope for each was picked by
the user from a clickable menu. `tsc`, `eslint` over `app/`, `components/` and
`lib/`, and `next build` are green; `/` and all 12 listings still prerender.

**The diagnosis was the third item, and the other two follow from it.** The panel
collected dates and guests, validated them, showed a review step — and then said,
in so many words, that messaging was not built yet. Everything above it was
honest scaffolding around a button that wrote nothing anywhere. That is also why
the panel was so tall (it had nothing to do but show its own form) and why the
page had no reason to keep the CTA reachable (there was nothing to reach).

#### The database first — [supabase/swaps.sql](../../supabase/swaps.sql)

Two tables. `swap_requests` (house, host, guest, the home offered back, dates,
guests, note, status) and `swap_messages` (one thread per request). The thread
hangs off the request, so **the request's two participants ARE the thread's
access list** — there is no membership table that could drift out of agreement
with who is actually in a swap.

Three things are enforced in the database rather than in the form:

- **The recipient is not the client's to choose.** A `before insert` trigger
  overwrites `host_id` with the home's real owner. Verified: an insert that
  addressed the request to Sarah Miller landed with Sofia Rossi as host.
- **The calendar's rules are real rules.** The picker strikes out unavailable
  days and disables presets that would not fit — good UI, and client-side. The
  same window, the same guest cap and "not your own home" are checked in the
  trigger, in the users' own words: *"This home sleeps 8, so 12 guests will not
  fit."*, *"The host is not open to swaps after 2026-09-27."* Those strings are
  shown to the user as they are; the app writes no error copy of its own for them.
- **A status machine that only moves one way.** RLS says *whether* you may touch
  a row; it cannot say "the host may answer but may not quietly move the dates".
  So an update trigger freezes every term of the deal and allows exactly two
  moves out of `pending` — host → accepted/declined, guest → cancelled. Verified:
  a host accepting *and* rewriting the dates to their own window in one statement
  got the acceptance and none of the rewrite.

Plus a **one-open-request-per-home partial unique index** (a double-click used to
be two identical rows in a host's inbox), and `my_swap_badge()`, a
`security invoker` function returning "requests waiting on you + messages since
you last opened their thread".

**Everything above was tested by impersonating real accounts** (`set local role
authenticated` + a `request.jwt.claims` sub) rather than reasoned about: own-home,
over-capacity, out-of-window, offering a home you don't host, duplicate pending,
guest-accepting, host-rewriting-terms, answering twice, an outsider reading a
request (**0 rows**) and an outsider writing into a thread (**RLS refusal**) —
each one refused, with the message a person would want. Alex's badge read `1`
with one unread message; Sofia's read `0`, having written it.

#### The badge is derived, not stored

There is no `notifications` table. [swaps-context](../../components/swaps-context.tsx)
calls `my_swap_badge()` once per load and on tab focus, and the number is
computed from the rows that already exist. A stored counter is a second source of
truth that has to be kept correct by every write path; a derived one cannot
disagree with reality — answer a request in one tab and the other tab's badge is
already right. It costs one query per page load per signed-in user, which is the
right side of that trade at this size.

It surfaces twice: a **dot on the nav avatar** (a signal, not a count — the
number lives on the row it belongs to) and a **count on "My swaps"** in the
account menu. The dot is mirrored in the trigger's `aria-label`, since a coloured
dot alone says nothing to a screen reader (Lecture 6, guideline 4). The account
menu's **"My swaps — Soon" chip is gone**; it had been a placeholder since the
menu was built.

#### `/swaps` — four tabs, in the order the work arrives

**Needs your answer** → **You asked** → **Confirmed** → **Past**. The split
between the first two is the point: one is a decision you owe someone, the other
is a decision you are owed, and they are not the same job even though the rows
look alike. The page **opens on the tab that has something waiting** rather than
always on the first one — an inbox that greets you with an empty tab while three
requests sit unanswered is answering the wrong question. Every tab carries a
count, and the count turns brand-filled when something in it is unread, so the
shape of the work is visible before anything is clicked (Nielsen #1).

`/swaps/[id]` puts the terms at the top — dates, guests, who, and **the home
offered back** — so neither side has to hold them in their head while they talk
(recognition over recall, #7). "Not yours" and "does not exist" deliberately
render the same 404: RLS returns nothing either way, and a swap between two other
people should not be probeable by id.

**Declining and withdrawing ask once**, inline, replacing the button they are
confirming rather than opening a modal — the status machine has no route back,
and the question belongs next to the thing it is about (CRAP proximity).

#### The conversation

[swap-thread](../../components/swap-thread.tsx). Your own messages sit on the
right **and** in brand blue, so which side of a conversation a line is on never
rests on colour alone. Opening a thread writes one read mark, which is what the
badge reads. An empty thread suggests the first move instead of sitting blank,
and it says a different thing to each side ("ask what you need before you
answer" vs "say hello"). Enter sends, Shift+Enter is a newline.

Freshness without a socket: the thread re-reads on tab focus and every 15s while
the tab is actually visible. Supabase **Realtime** would make it instant and is a
small change (`supabase.channel().on("postgres_changes", …)` on `swap_messages`)
— it was left out because a conversation people answer in minutes does not need
it yet, and it is infrastructure to explain in the report for no user-visible
gain today.

A declined or withdrawn request keeps its thread, **read-only**. The record of
what was agreed is worth more than tidiness.

#### The calendar is an accordion, and the sticky card finally sticks

The panel's own comment used to argue the opposite: *"dates are the whole
decision, so hiding them behind a click costs a step for nothing — the sidebar
has the room."* That reasoning held only while the panel fitted on a screen, and
it did not. Price + month grid + legend + presets + guests + CTA + three
next-steps stacked past a laptop viewport, so the panel had been given
`overflow-y-auto` just to reach its own button — and **a sticky card whose inner
scroller is always active does not read as sticky, it reads as frozen**, because
the thing that moves under your cursor is its contents rather than the card.

It is now a **single dates row** that opens the month grid in place, using the
same `grid-rows-[0fr]→[1fr]` reveal as the nav's own search drop-down, so the
site has one way of opening things. (It was briefly two cells — see the
correction section below.) Verified in the built page: the accordion ships closed
(`grid-rows-[0fr]` present, `[1fr]` absent) and there is exactly one calendar in
the document.
**Phones keep the bottom sheet** — that was a Fitts' law decision about thumbs
and it still holds; only the desktop path changed. The `max-height` guard stays
as a fallback for one state (accordion open on a short window) instead of being
the permanent condition.

#### The nav dock now carries whichever thing the page is about

The home page and Explore dock their search bar into the nav's centre slot when
it scrolls away. A listing page has no search to dock — but it has the same
problem, and a worse version of it: the page's only action scrolls away and stays
away for two thousand pixels of reviews and similar homes.

So the mechanism was **reused rather than copied**. `Navigation` now computes a
`mode` — `"search"` or `"swap"` — and one set of presence rules drives both: the
same 380ms cross-wipe (pill in from the left, links out to the right), the same
`grid-rows` drop-down, the same `surface-raised` / `border-raised` tokens. The two
are mutually exclusive by construction, since the search provider is mounted on
home/Explore and the swap dock only on a listing page.

`SwapPill` carries the home, the dates and guests chosen so far, and a chip
reading **the same words as the real CTA below it** — a control that renames
itself between two places is two controls to a user. Clicking it drops down the
**same `<SwapBody>` component** the sidebar renders, off one piece of state:
pick dates in the nav and the panel already agrees, because it is not a copy.
`<SwapPanel>` publishes that node through
[swap-dock-context](../../components/swap-dock-context.tsx), exactly as Explore
hands its filter pills to the nav.

The sentinel sits **after** the two-column section, not inside the sidebar: a
sentinel inside a `sticky` element never leaves the viewport, so it would never
fire. It is also **desktop-only** (`matchMedia`, re-evaluated on resize) — on a
phone the panel already has a bar pinned to the bottom edge, and a second copy of
the primary action at the top of the screen would put two CTAs on one page with
the wrong one nearer the thumb.

#### The mobile bar stopped lying

It was labelled **"Propose a swap"** and only scrolled the page. One label, two
different actions, on the primary control on phones (Nielsen #2 and #4). It could
not do better, because as a separate component at page level it had no way to
know whether any dates existed. It now renders from inside the panel and says
what it will do: **"Add dates"** opens the picker, **"Propose a swap"** proposes,
**"Sign in to propose"** signs you in, **"Open conversation"** when you have
already asked. It also disappears once the panel is showing the review or the
confirmation — its whole job is reaching a control that is off screen, and by
then the control is on screen.

#### Smaller things that came with it

- **A swap has two sides.** The review step asks which of *your* homes you are
  offering, from your real listings — optional, with "You haven't listed a home
  yet… list your home to make it a two-way swap" when there are none, because a
  gate on the site's primary CTA would be worse than an honest blank.
- **You cannot propose on your own listing.** The panel says so and points at
  `/swaps` instead of offering a button whose only outcome is a refusal.
- **Already asked?** The panel says *"Waiting on Sofia"* with an **Open
  conversation** link instead of a form the one-pending index is about to reject.
  The 23505 path is handled too, for the second tab.
- `House` gained `hostId`, so a page can tell whether the viewer is the host
  without a second query.
- `/swaps` is gated in [proxy.ts](../../proxy.ts) via `PRIVATE_PREFIXES`.
  Verified: `/swaps` and `/swaps/1` both 307 to `/sign-in?next=…`.

#### Verified, not eyeballed

`tsc` clean · `eslint` clean over `app/`, `components/`, `lib/` (the project's
zero-lint-errors claim still holds) · `next build` green, `/` still `○ (Static)`,
all 12 listings still `●` · every database rule exercised against real accounts
(above) · the built listing page served and read back: panel present, accordion
closed, no `type="date"` anywhere, and the old *"Host messaging is the next thing
we're building"* sentence **gone**, because the thing it apologised for exists.

#### Known limitations / follow-ups

- **No email notification.** The badge is in-app only. Sending mail needs an Edge
  Function + a provider (Resend), which is real infrastructure and was left out.
- **Nothing blocks a double-booking.** Two guests can hold accepted swaps over
  the same dates on one home; accepting does not close the window. Worth a
  follow-up if the demo ever has volume.
- **The thread polls rather than streams** (see above) — Realtime is a small,
  deliberate upgrade.
- **Reviews are still ungated.** Now that a confirmed swap exists as a row, the
  obvious next step is to require one before someone can review a home; today the
  RLS policy only checks that you are who you say you are.
- **Two demo rows were seeded** so both sides of the feature are visible without
  a second browser session: Sofia Rossi asking for one of the owner's homes (with
  a message), and one request sent to Kenji Tanaka. Remove with
  `delete from public.swap_requests;` — the thread cascades with it.

### Three corrections after seeing it on screen (2026-08-21, same day)

All three were reported from screenshots of the working feature, and all three
were the same class of mistake: a design that reasons well on paper and fails at
the size it actually renders at.

**The docked pill was four ellipses in a row.** It read
`🏠 Malibu O… | 📅 A… | 👤 2… | [Propose a swap]`. Three segments mirroring the
search pill's Where-When-Who was the wrong analogy: those are short words
("Greece", "Sep 26", "2"), a home name is not, and the nav's centre slot is an
even third of the header. Every segment collapsed, so the pill carried three
labels saying nothing.

Two changes, because the content was too long *and* the box too small:

- **Two segments, not three.** Dates and guests were never two thoughts —
  they are one line now: *"Sep 26 – Oct 3 · 2 guests"*. The room saved goes to
  the home name, and the second segment only appears from `lg` up.
- **A wider centre slot, but only where there is width to give.** From `lg` the
  slot takes `flex-[1.7]` instead of an even third *while the swap pill is
  docked*; the logo and the account controls have fixed-width content and were
  padding empty space with their share. Below `lg` the split stays even, because
  at those widths the right-hand controls genuinely need their third.
  `List Your Home` gained `shrink-0` so it can never be squeezed by the change.

**The drop-down looked pushed to one side.** The docked copy had its own
horizontal layout — dates box left, a CTA as wide as it right — spread across a
768px row for three small controls. It is now the **same vertical arrangement as
the sidebar panel**, in a centred `max-w-md` column. That also deleted the
`dockish` branching inside `SwapBody`: the variant now sets a wrapper width and
nothing else, so there is one layout to keep right instead of two.

**The two-cell CHECK-IN | CHECK-OUT row was confusing, and it was.** The original
reasoning — *"a target you can name is a target you can aim at"* — is a real
principle applied to the wrong thing. Two cells side by side promise that
pressing "check-out" takes you somewhere different from pressing "check-in", and
it does not: one calendar sets both ends. Two controls that are really one
control is a **false affordance** (Lecture 2), and both of them read "Add date",
which is the same instruction printed twice.

It is one row now, shaped like every other opener on the site — glyph, small
muted label, current value, and a chevron that turns when it is open:

- *"Add your dates"* → *"Sep 26 – add a check-out"* → *"Sep 26 – Oct 3 · 7
  nights"*. The half-picked state is named on purpose: it is the one people get
  stuck in.
- The desktop-vs-phone split stopped being two hidden buttons. The breakpoint is
  read at click time (`matchMedia`), so the row is **one element in the DOM and
  one target to a user** — accordion where there is room, bottom sheet where
  there is not.
- The night count came out of the "Host is open to swaps between…" line below,
  since the row prints it now. Twice on one card is noise, not emphasis.

**Verified:** `tsc`, `eslint` and `next build` green · the built listing page
contains **zero** "CHECK-IN"/"CHECK-OUT" cells, exactly **one** `aria-expanded`
dates control, one *"Add your dates"*, one *"Host is open to swaps"* line, and
the accordion still ships closed · `/`, `/explore`, `/explore/[id]`, `/blog` and
`/how-it-works` all 200, and the wider centre slot is emitted **only** on a
listing page with the pill docked, so the search pill's layout is untouched.

---

## Brand: the logo becomes a component, and the nav mark opens (2026-08-21)

**The problem.** The logo existed as one PNG at the repo root (`imSDSADADage.png`,
1024², 365 KB): a walking Sasquatch carrying a door, above a "SwapDoor"
wordmark. It reached exactly one surface — the hero, via the re-toned
`public/mascot.png`. Everywhere else the brand was either a placeholder or
absent: the navbar drew its own three-rectangle `DoorMark` SVG (whose comment
still said "until the mascot lands"), the tab still showed `create-next-app`'s
icon, the footer had no mark at all, and a shared link previewed as a grey box.

A PNG could not fix any of that. At 16 px it is mush; its tones are baked in, so
it can never follow the tokens in `globals.css`; and the door cannot move
independently of the body — which rules out the one thing the mark most wanted
to do.

### 1. The artwork, traced once

[scripts/trace-logo.mjs](../../scripts/trace-logo.mjs) vectorises the source and
writes [lib/brand-art.ts](../../lib/brand-art.ts). It classifies pixels by
colour, crack-follows each mask into closed staircase loops, simplifies them
(Douglas-Peucker) and re-smooths them into cubic beziers (Catmull-Rom). Four
shapes come out, ~16 KB in total:

| Constant | What it is |
|---|---|
| `MASCOT_SILHOUETTE` | body + door as one solid — the figure seen in a doorway |
| `MASCOT_BODY` | the same, with the door punched out (`fill-rule="evenodd"`) |
| `MASCOT_DOOR` | the carried door alone, so it can swing on its own hinge |
| `WORDMARK_PATH` | all eight letters and their five counters, one path |

The useful discovery: **the door is fully enclosed by the body.** Separating them
leaves a door-shaped hole in his torso. That is not a defect to work around, it
is the idea — the animated mark fills the hole with the lit doorway *behind* the
door, so opening it reveals somewhere else rather than a gap.

[components/brand.tsx](../../components/brand.tsx) is the only thing that reads
those paths: `<DoorMark>`, `<MascotGlyph>`, `<Wordmark>`, `<Lockup>`. Nothing
else in the app draws a door or a mascot — one definition, every surface follows
it, the same discipline `globals.css` applies to colour.

### 2. The nav mark opens (the requested micro-interaction)

Six behaviours were prototyped and compared at real size; the chosen one is
"Doorway". At rest the mark is a **closed door** in the logo's two blues. On
hover — or `:focus-visible`, so a keyboard user gets the same thing — the panel
swings open on its hinge, warm light fills the opening, and the mascot walks out
and stands beside the frame.

All of the geometry and motion live in the `.door-mark` block at the end of
[globals.css](../../app/globals.css), expressed as fractions of a single `--dm`
(the mark's height, set inline by the component) so one component is correct at
16 px and at 120 px. Notes on the decisions:

- **The mark grew from 24 px to 30 px.** Below ~30 the mascot is a blue smudge.
  The box is fixed at `1.1 × --dm` wide — wider than the door, which is where he
  stands once he is out — so the wordmark beside it never shifts by a pixel.
- **Only `transform` and `opacity` animate.** Nothing reflows, nothing repaints
  the header.
- **Timing borrows the site's own curve**, `cubic-bezier(0.76, 0, 0.24, 1)` at
  380 ms — the one the docked search pill already uses. A new moving thing in
  the header that moves like the existing ones reads as part of the same system
  (CRAP *repetition*; Nielsen #4).
- **`prefers-reduced-motion` keeps the state and drops the travel** (1 ms
  transitions). Removing it entirely would cost those users the feedforward the
  whole thing exists for.
- **The perspective is 5 × the mark's height.** Shallower, and the leading edge
  balloons as it swings toward the viewer.
- **Why it earns its place (Lecture 2, *feedforward*).** The mark IS the home
  link and had never said so — no label, no `aria-current`, nothing but a
  pointer cursor. It now carries `aria-label="SwapDoor — home"` and
  `aria-current` on `/`, and the animation sits on top of those as a bonus.
  The label is not decorative: while the search pill is docked on a phone the
  wordmark is hidden and the mark is `aria-hidden`, so without it the link would
  have announced as nothing at all.
- **The warm light is the palette's existing exception, not a new one.** The
  glow runs `--color-doorlight` → `--color-selected`, an amber the tokens
  already sanction for the selected map pin, on the Lecture 6 grounds that
  blue↔orange is the colour-blind-safe high-contrast pair. No new hue enters a
  deliberately blue-monochrome system.

### 3. Everywhere else the brand was missing

| Surface | What landed | File |
|---|---|---|
| Tab icon | Mascot + door, vector. The wordmark is dropped — eight letters at 16 px are a smear, and the mascot is the half that both reads and is distinctive | [app/icon.svg](../../app/icon.svg) |
| Legacy favicon | 16/32/48 PNGs packed into an ICO; the `create-next-app` file is gone | `app/favicon.ico` |
| iOS home screen | 180 px on the page colour — iOS ignores transparency | `app/apple-icon.png` |
| Link previews | 1200×630 lockup on the hero's brand glow, plus `metadataBase`, `openGraph` and `twitter` metadata so it resolves absolutely | `app/opengraph-image.png`, `app/twitter-image.png` |
| Footer | The brand column's heading is now the lockup itself; still a heading, so the outline is unchanged | [footer.tsx](../../components/footer.tsx) |
| Sign in | The mascot above the form. The page that asks for a password should say whose password it is — two of the three personas commit on trust, not price | [app/sign-in/page.tsx](../../app/sign-in/page.tsx) |
| 404 | New page: faded mascot, "This door doesn't open", and the two doors that *are* open as real buttons (Nielsen #9 — name it, don't blame, offer the way out). A swaps-scoped sibling landed 2026-08-22 with the same shape and its own two exits | [app/not-found.tsx](../../app/not-found.tsx), [app/swaps/not-found.tsx](../../app/swaps/not-found.tsx) |
| Empty states | Faded mascot at 30% on the four full-panel empties — Explore's no-results, `/dashboard`, `/my-listings`, and `/swaps` (added 2026-08-22). An empty result is a moment of doubt ("is it broken, or did I over-filter?") and a piece of the brand answering it says the page rendered fine | [explore-view.tsx](../../components/explore-view.tsx), [dashboard](../../app/dashboard/page.tsx), [my-listings](../../app/my-listings/page.tsx), [swaps](../../app/swaps/page.tsx) |

Deliberately left alone: **the hero**. `public/mascot.png` is already re-toned
and placed there, and it is the one spot where the mascot is meant to be big and
soft-focus; a crisp vector would compete with the headline. Also left alone: the
two **map** empty states, which are small floating toasts over a map and have no
room for artwork.

Icons and social cards are generated by
[scripts/build-brand-assets.mjs](../../scripts/build-brand-assets.mjs) — re-run
both scripts if the artwork ever changes:

```
node scripts/trace-logo.mjs          # artwork  → lib/brand-art.ts
node scripts/build-brand-assets.mjs  # paths    → app/icon.svg, favicon.ico, apple-icon.png, og images
```

`tsc`, `eslint` and `next build` are all clean.

---

## The hero globe now draws the real listings (2026-08-21)

**The bug, and why it was invisible.** A home published through
`/list-your-home` appeared on Explore and on both Leaflet maps, but never on the
hero globe — it kept drawing the same ten dots forever. Three layers of the same
cause:

1. `<Globe>` took no data at all — its only prop was `className`, so no listing
   had a route to it.
2. Its pins came from `Object.values(CITY_COORDS)`, the ten-entry literal in
   [lib/coordinates.ts](../../lib/coordinates.ts). That table predates Supabase;
   its own comment says it exists for "when the data source doesn't carry
   lat/lng itself (the gist doesn't; the Supabase schema does)". The globe was
   still reading the pre-Supabase source.
3. Even given the data, the whole renderer lives in one `useEffect(…, [])`, so
   the pin list was captured at mount and closed over by the draw loop.

The data path itself was never wrong: `houses.lat` / `houses.lng` are real
columns, `enrichHouse` in [lib/houses.ts](../../lib/houses.ts) prefers a home's
own coordinates and falls back to `CITY_COORDS` only when they are missing, and
the listing form geocodes live. `app/(home)/page.tsx` was already fetching
`houses` and passing them to `<HomeHeroMap>` — the globe sat two prop hops away
from data it never asked for.

**The fix.** `houses` now flows `HomeHeroMap → Hero → Globe`. `CITY_COORDS` is
no longer imported by the globe; it remains what its comment claims, the
geocoding fallback inside the data layer.

- **One pin per place, not per listing.** Two homes in the same town are one
  place on a globe: at this size a degree of arc is two or three pixels, so
  drawing them separately produced a smeared dot rather than the information
  that there are two. `clusterHomes()` merges them, and the pin grows
  logarithmically (capped at +55%) with how many homes are there — the fact
  worth carrying at this scale is *where* SwapDoor has homes and roughly how
  thickly, not a per-listing count nobody can read off a 2px mark.
- **The merge threshold is 1.2° of arc**, tested as a dot product between unit
  vectors so it means the same thing at the poles as at the equator. Checked
  against the seeded data: the closest genuinely distinct pair is Zermatt ↔
  Provence at 2.40°, so real destinations stay separate with a 2× margin, while
  four homes scattered around Santorini (including Oia, 8 km out) collapse to
  one pin. Homes that never geocoded are skipped rather than stacked at 0°/0°.
- **The pins are read through a ref, not closed over.** New listings therefore
  appear without the setup effect tearing the canvas down and restarting the
  spin from Greenwich mid-scroll. The arc's two endpoints are re-picked from the
  current list each cycle, and clamped, so a list that shrinks between frames
  cannot blank the arc.

Still open, deliberately: **no cap on the number of pins.** Clustering by place
means the count grows with distinct destinations rather than with listings, so
this is a much slower curve than it first looked — but past roughly forty
destinations the globe will start reading as a rash rather than a constellation,
and will want a cap at that point.

---

## One dropdown, one layout, and real geography (2026-08-21)

Three things asked for after using the site: the **Recommended** control on
Explore didn't look like the pills beside it, **/list-your-home** felt "moved
across", and the **City / Country** fields didn't work like a pair. All three
were verified by driving the running app in headless Chrome — the sort control,
the listing form at 1440/1280/900px, the site-wide search box, a real publish,
and the swap panel — **zero console errors**, and `tsc`, `eslint` (whole `app/`,
`components/`, `lib/`, `scripts/`) and `next build` are green. The options were
put to the user as a clickable menu; they took the recommendation on all three,
plus `houses.country_code` and the same picker in the search bar.

### 1. The sort dropdown was the only OS-drawn control on the page

The **closed** state of that `<select>` had been styled to match the idle filter
pills — same radius, border, hover, its own chevron. The **open** state cannot be
styled at all: the list that drops out of a native select is drawn by the
operating system, so on Windows it was a white, square, system-font menu landing
on a `#1A2030` page, directly beside *Home type* and *Rating* opening the app's
own dark popover. Two controls doing the same job looked like two different
products (Nielsen #4; the CRAP answer is one form repeated — Lecture 5).

It was not one control but **three**: Explore's sort, the listing form's *Type of
home*, and the swap panel's *Your home in the swap* — and `globals.css` set no
`color-scheme`, so all three opened white. New
[components/select.tsx](../../components/select.tsx) replaces all of them, built
on the panel, rows and tick the filter pills already use, with three variants
(`pill` for Explore, `field` for form inputs, `inset` for a field inside a raised
panel).

- **A variant, not a className override.** Two background utilities on one element
  are resolved by their order in the generated stylesheet, not the order they
  were written — an override that happens to work is not one that will keep
  working.
- **The behaviours people already have from the native control are kept**, since
  they are the reason not to build this lightly: `role="listbox"`, Up / Down /
  Home / End, Enter / Space to commit, Escape closes and returns focus to the
  trigger, and typing a letter jumps to the next match. Opening lands on the
  **current** choice, never row one — anywhere else quietly offers to change a
  setting the user only meant to look at.
- The panel **portals to `<body>`** and flips above the trigger when there is no
  room below, so it cannot be clipped by the nav's overflow or trapped under the
  fold on a phone.
- Selection is carried by a **tick**, not by colour (Lecture 6).

### 2. `/list-your-home` did not line up with the site it is part of

The grid maths were right; the container was wrong. `<Navigation>`, `/explore`,
`/my-listings` and `/dashboard` all sit on `max-w-7xl`, and this page was
`max-w-6xl` — so its content started **64px to the right of the logo above it**.
Nothing was broken, which is exactly why it read as "moved" rather than as a bug:
the page was simply off the site's alignment axis (CRAP alignment, Lecture 5;
Nielsen #4). `/profile` and `/my-listings/[id]/edit` carried the same mismatch and
moved with it. Measured afterwards: the `h1` and the logo now both start at 104px.

The columns were rebalanced at the same time. `1.5fr / 1fr` meant the preview
card — whose whole job is to show members exactly what they will see — was a
different width on every screen, while the form column shrank on the narrow ones
where it could least afford to. It is now `minmax(0,1fr) / 380px`: a fixed rail,
with the form taking whatever is left (804px at 1440).

**The preview no longer disappears below `lg`.** The rail is desktop-only, and the
small-screen copy of the card only existed on the review step — so a host on a
tablet built the entire listing blind and met the card at the end. It now follows
the fields on exactly the steps the rail covers, and the card itself is built
**once** and rendered in all three places, so they cannot drift apart.

### 3. Country → City, from a real gazetteer, in Supabase

The two fields were independent boxes over two hand-typed arrays in
`lib/places.ts` — 45 cities, 57 countries. Picking a city filled the country, but
picking a country did nothing to the city list, so **"Kyoto, Croatia" was a
publishable address**; and anyone listing a home in Rijeka or Graz got no help at
all, so "pick one, or type your own" was in practice just "type your own" — recall,
the exact thing the picker existed to replace (Nielsen #7).

**New tables** ([supabase/places.sql](../../supabase/places.sql)): `countries`
(250 ISO 3166-1 entries — the two GeoNames still carries that ISO has withdrawn,
`AN` and `CS`, are dropped) and `cities` (**50,154**), public-read RLS with no
write policy at all, `pg_trgm` GIN indexes in the `extensions` schema, and three
ranked search RPCs (`search_countries`, `search_cities`, `search_cities_global`).
The ranking is the point: a prefix match beats a match found mid-string, and
inside each tier the bigger place wins — so "san" offers San Francisco before
Sandnes, and an empty query offers a country's largest cities rather than
whichever rows the planner reached first.

- **The seed is a committed script, not committed SQL.**
  [scripts/build-places-seed.mjs](../../scripts/build-places-seed.mjs) downloads
  GeoNames and emits ~4 MB of INSERTs; the script is the record, the SQL is
  gitignored. Same reasoning as `scripts/derive-mascot.mjs` — data in the database
  should be reproducible from a command, not a one-off nobody can repeat.
- **Which cities make the cut** is not a flat population floor. Everything with
  15,000+ people, *plus* enough of each country's next-largest places to give it
  at least 300 entries — because a flat cut-off deletes precisely the homes that
  most need to be findable: Hvar (4.2k) and Zermatt (6.6k) are both in the seed
  data. Two places GeoNames drops below its own 1,000-person floor —
  **Santorini (Firá)** and **Camps Bay** — are a short, commented exceptions list,
  the same convention as `IMAGE_REPLACEMENTS` in `lib/houses.ts`.
- **Searching by the name people type.** Each country's `search_name` carries its
  aliases, so "usa", "uk", "holland", "türkiye" and "hrvatska" all land on the
  right row while the row still *shows* its proper name. Diacritics are folded in
  JS on both sides (`normalizePlaceQuery`), which keeps the query a plain LIKE the
  trigram index can serve — `unaccent()` is not IMMUTABLE and so cannot be indexed.
- **Country leads and City is scoped to it**, which makes the impossible pair
  unreachable rather than merely discouraged — a constraint, not a warning
  (Lecture 2). Free typing survives on both fields: a home in a hamlet no
  gazetteer lists must still be publishable.
- **SwapDoor's own destinations still lead the city list**, with their live "N
  homes to swap here" count — the one thing GeoNames cannot tell a host.
- **A picked city *is* its coordinates.** `lib/geocode.ts`'s Nominatim round-trip
  — debounced 800ms for a one-request-a-second policy, and silently null whenever
  it failed — now only runs for a place typed freehand. Picking Hvar shows
  "✓ Found Hvar, Croatia" and its map instantly.

**`houses.country_code` + `houses.city_id`** were added and backfilled. This
took two passes: the first matched country names with `=`, which missed
Amsterdam, because GeoNames spells its country "The Netherlands" and
`search_name` leads with the form people type ("netherlands the netherlands
holland"). Matching with a prefix instead — the version in
[places.sql](../../supabase/places.sql) — resolves all 14 rows to a country and
11 to a city (`location` values like "California",
"Provence" and "Costa Rica" are a state, a region and a country, so their
`city_id` stays null rather than being forced onto a point that isn't theirs). A
publish test wrote `PT` / Lisbon with the city's own coordinates; the test
listing, its photo and its account were removed again afterwards.

**The site-wide "Where" box uses the same data.** Before, the only searchable
places were the handful of cities SwapDoor already hosts a home in, so typing
"Lisbon" produced "No matches" — which reads as *the search is broken*, not as
*nobody has listed there yet* (Nielsen #1). It now has two sections: **Homes to
swap here** (real inventory, with counts) first, then **Anywhere else** from the
`cities` table. The more useful group keeps the stronger position (Lecture 5).

### Bugs found while building this

1. **`useState(load)` was calling the loader.** React reads a function passed to
   `useState` as a lazy initialiser — so storing the fetcher in state invoked it
   immediately, with no argument, and `normalizePlaceQuery(undefined)` threw on
   mount. It is wrapped in an object now; the same trap applies to setters, which
   read a function as an updater.
2. **`countryByCode` could never have worked.** It paged the whole country list
   looking for one code, but the RPC caps its limit at 50. It is now
   `findCountry`, which reads the row directly (RLS allows it) and accepts either
   a code *or* the country name — needed because every listing published before
   this change carries only the name its host typed, and re-opening one for
   editing has to land on the same country or the City field would open locked.
3. **Windows has no glyph for flag emoji.** Regional-indicator pairs fall back to
   the two letters, so the picker showed a bare "HR". They now sit in a sized,
   tinted chip that reads as a country-code badge on Windows and holds the flag
   everywhere else — deliberate either way, and the rows stay aligned.
4. **`pg_trgm` was installed into `public`** (Supabase's linter flags it). Moved
   to the `extensions` schema; the GIN indexes still resolve and are still used
   (checked with `EXPLAIN ANALYZE` — Bitmap Index Scan, ~3 ms).
5. **Editing a listing would have wiped its `city_id`** — introduced by this
   pass, caught by running the edit flow rather than by reading it. `city_id`
   and `country_code` are written from form state, and `ListingInitial` did not
   carry them, so state started null and a save that never opened step 1 nulled
   the columns out. `ListingInitial` carries both now, and the edit page reads
   them from the **raw row** — the same rule the photos and dates already
   followed: values that get written back come from the row, not from the
   enriched `House`.
6. **Editing a listing silently moved its pin.** Opening the form left
   `resolved` empty, so the geocode effect fired for an address nobody had
   touched and saved OpenStreetMap's answer over the gazetteer's. Verified in
   the database: a listing created at Hvar's GeoNames point (43.1725, 16.44278)
   came back from an unrelated rename at 43.1739, 16.5565 — the island's centre
   rather than the town's. `ListingInitial` now carries the row's own `lat`/`lng`
   and seeds the lookup with them, so an edit that leaves the address alone
   makes no request and writes the same point back. Re-tested after the fix: the
   coordinates hold to the decimal.

### Verified, then cleaned up

Both publish and edit were driven end to end against the live database — create
a listing in Lisbon, confirm `country_code = 'PT'` and `city_id` = GeoNames'
Lisbon with **that row's coordinates** (38.72509, -9.1498, exact to the decimal,
so the Nominatim path really is skipped); then rename an existing listing twice
and confirm nothing about its place changed. Afterwards the test listings, their
uploaded photos and their accounts were removed, and the counts checked back to
where they started: 14 houses, 8 users, 8 profiles, 15 photos.

One wrinkle worth recording: **an orphaned upload cannot simply be deleted.**
`storage.objects` has a `protect_delete` trigger that refuses direct SQL (it
would strand the actual file in S3), and the bucket's policies are keyed on the
*path's first folder* — which is the id of an account that no longer exists. The
way out is to reassign the row's path and owner to a live account and let that
account call the Storage API, which removes the row and the file together.

### Left open

- **No alternate city names.** GeoNames' `name` is the common international one,
  so "Vienna" and "Munich" work but "Wien" and "München" do not. Adding the Latin
  alternates means a second searchable column and a ranking decision.
- **`houses.country_code` is not a filter yet.** The column and its index exist,
  so a **Country** pill on Explore is now cheap — it was on the menu and left for
  later, along with item 11's category pills.
- **Leaked-password protection is still off** in Supabase Auth (advisor warning,
  pre-existing). One toggle in the dashboard, worth doing before deploying.

---

### The swaps section got its own dead end, and its empty tabs got the mascot (2026-08-22)

Two small things, one idea: `/swaps` was the last part of the app where a dead
end still handed you generic copy and generic exits. Verified by driving the
running production build in headless Chrome over CDP, signed in as a real demo
host (`sofia.rossi@swapdoor.dev`) — the pages below are what the browser
actually painted, not what the HTML looked like. `tsc`, `eslint` over `app/`,
`components/`, `lib/` and `next build` are green; `/` still `○ (Static)`, all 14
listings still `●`.

**A 404 in the swaps section pointed at the wrong doors.** `/swaps/[id]` calls
`notFound()` twice — for a non-numeric id, and for a request the reader is not
part of — and with no boundary of its own it fell through to the site-wide
[app/not-found.tsx](../../app/not-found.tsx). That page is correct for a mistyped
URL, but its two exits are *Browse homes* and *Back to home*, and neither is
where someone who was reading their inbox wants to be put (Nielsen #4: the exit
has to be a way out of **this** state, not a way out in general).

New [app/swaps/not-found.tsx](../../app/swaps/not-found.tsx) is the nearest
boundary for everything under `/swaps`. It is deliberately the *same shape* as
the site-wide one — faded mascot at `opacity-40`, `ERROR 404` eyebrow, "This door
doesn't open", then two exits as real buttons (CRAP repetition; Nielsen #4) — and
differs only where it should: the copy, and the doors. **All my swaps** is the
primary, **Browse homes** the secondary.

- **The copy had one hard constraint.** `/swaps/[id]` turns "not yours" and "does
  not exist" into the same 404 on purpose: RLS returns nothing either way, and a
  swap between two other people must not be probeable by id. So this page must
  not resolve that ambiguity either. It says the request isn't in *your* inbox
  and gives the two innocent reasons — withdrawn, or someone else's link —
  without ever confirming that a request with that id exists.
- **Measured:** `/swaps/99999999` and `/swaps/not-a-number` both return a real
  HTTP **404** with `<meta name="robots" content="noindex">`, and paint exactly
  one `<h1>` ("This door doesn't open"), the swaps copy, the 128px mascot at
  opacity 0.4, and the two buttons resolving to `/swaps` (filled brand
  `rgb(59,130,246)`) and `/explore` (outline). Nav and footer render, no
  horizontal overflow.
- **Nothing else moved.** `/definitely-not-a-page` and `/my-listings/99999/edit`
  still render the site-wide 404 with its own copy and its own two exits,
  re-checked in the same browser run.

**The four swap tabs were the last full-panel empty state without the mascot.**
The 2026-08-21 brand pass put a faded mascot on Explore's no-results,
`/dashboard` and `/my-listings`, but `/swaps` shipped after that list was
written, so its `EmptyState` was still a bare panel. It now carries the identical
`MascotGlyph` at `h-20 … opacity-30` above **unchanged** copy — the four states
already named the next thing to do, and rewriting working sentences to fit an
icon would have been the wrong trade. Measured on an empty tab: one svg, 80px,
opacity 0.3 — the same numbers as the other three, so the four read as one
system rather than four similar ideas.

**Left alone, deliberately:** the two **map** empty toasts (`home-map.tsx`,
`explore-map.tsx`) — small floating boxes over a live map, with no room for
artwork, exactly as the 2026-08-21 pass argued — and the thread's *"No messages
yet"* line, which is a hint inside a scrolling message list, not a panel.

**Worth knowing (framework behaviour, pre-existing).** A `notFound()` thrown from
a `force-dynamic` route serves an `__next_error__` shell and streams the UI in,
so the tab title ends up as the *page's* metadata ("Swap request · SwapDoor")
rather than the not-found file's, even though the served HTML carries the right
`<title>`. `/my-listings/99999/edit` behaves identically against the untouched
site-wide 404 ("Edit listing · SwapDoor"), so this is Next 16's behaviour and not
something this pass introduced. The only console message on any of these pages is
the document's own 404 status, which the site-wide 404 logs too.

### The closing CTA (and the footer) still spoke to someone who wasn't signed in (2026-08-22)

Reported from the home page: *"when I'm signed in this still stands, and clicking
it takes me to the sign in / sign up screen even though I'm already signed in."*
Exactly right, and it was one fault in three places.

**What was wrong.** [components/cta.tsx](../../components/cta.tsx) was a fixed
pitch — *"Join the global community · Create a free account…"* with **Get started
free** pointing at `/sign-in` — which is the correct ask for precisely one
visitor: a signed-out one. A signed-in member met a page inviting them to make
the account they already had, behind a button whose only outcome was a screen
they had already been through. That is Nielsen #1 (the system should say where
you actually are) and #4 (a control must do what its label promises), on the last
thing the home page says.

**Three states, because "signed in" is not one situation.** The section now asks
for the next thing that is actually true of the reader:

| State | Heading | Primary → Secondary |
|---|---|---|
| signed out | Join the global community | Get started free → `/sign-in?mode=sign-up` · Learn more |
| signed in, no listing | You're in. Now open your door. | List your home · Browse homes |
| signed in, hosting | Your door is open. Where to next? | Browse homes · My swaps |

The middle state is the one worth having: listing a home is what makes a swap
possible at all, and its body copy is the sentence `/my-listings` already uses,
so the two places that make this argument make it in the same words.

**Read from `useProfile()`, not from the server — deliberately.** `/` and
`/how-it-works` are statically prerendered, and reading the session on the server
would turn both into per-request renders to personalise one block at the bottom.
The trade is that the prerendered HTML carries the signed-out pitch and a member
sees it swap once the profile lands — which is the behaviour the navbar has
always had ("Sign In" → avatar), so it is one pattern on the page rather than
two. `listingCount` was already on the context for the account menu's badge, so
the third state costs no extra query.

**Two smaller faults fixed with it, both the same "label ≠ destination" class:**

- **"Get started free" landed on the Sign In tab.** `AuthForm` hard-coded
  `useState<Mode>("sign-in")`, so a button promising a new account dropped you on
  the wrong half of the form and left you to find the other one. It now seeds
  from `?mode=sign-up`; anything else — a mistyped value, or no parameter —
  keeps the sign-in default, which is right for every `?next=` link that gates an
  action behind login. Verified: `?mode=sign-up` opens Sign Up **with** the
  full-name field; `/sign-in`, `?mode=bogus` and `?next=/dashboard` all still
  open Sign In.
- **The footer's Account column had both problems at once** — it offered
  *"Sign in"* to a signed-in member, and *"List your home"* pointed at
  `/sign-in`, not at the listing flow. Split into
  [footer-account.tsx](../../components/footer-account.tsx) so the rest of
  `<Footer>` stays a Server Component: signed out it reads *Sign in · List your
  home*, signed in *My swaps · List your home*, two rows either way so the
  column height never shifts. **`/list-your-home` does not need to point at
  sign-in to be safe** — `proxy.ts` gates it and carries a guest through with
  `?next=`, landing them back on the form, which is strictly better than the old
  link that dropped them on the homepage afterwards.

**Verified, not eyeballed.** `tsc`, `eslint` over `app/`, `components/`, `lib/`
and `next build` green; **`/`, `/how-it-works` and `/sign-in` all still
`○ (Static)`** — the client component did not drag anything into dynamic
rendering. Every state below was read out of headless Chrome over CDP against the
running production build, with a real session cookie, **zero console errors**:

- signed out on `/` and `/how-it-works` → the original pitch, unchanged;
- signed in **hosting** (Sofia Rossi) → *Your door is open* + Browse homes / My swaps;
- signed in **with no listing** → *You're in. Now open your door.* + List your home / Browse homes;
- footer Account column correct in both states, on a static page and a dynamic one.

The no-listing state needed an account that hosts nothing, so one was created via
signup, used, and **deleted again** — counts checked back to the baseline
afterwards: 8 users, 8 profiles, 14 houses.

**Also fixed while in there:** the copy of this section that sits **on**
`/how-it-works` had *Learn more* linking to `/how-it-works` — a button that
reloads the page you are reading. Those readers get *Browse homes* instead; they
have just read the how.

**Known limitation.** A signed-in member still sees the signed-out heading for
the moment between first paint and the profile query resolving. Removing it
entirely means rendering the section on the server, which costs `/` its static
prerender — not worth it for one block, but worth recording as the reason it
flashes.

### Link previews: every shared link was previewing as the homepage (2026-08-22)

Picked from a clickable menu: **metadata only, no new card images** — the site
card stays as it is, and no per-route `opengraph-image.tsx` was built. That was
the right call, because the images were never the problem. The tags were.

**The artifact's "todo in handoff" badge was stale, but only half stale.**
`app/opengraph-image.png` + `twitter-image.png` have existed since 2026-08-21, so
the root card was done. What nobody had checked is what the *other* routes were
actually emitting. Read out of the running production build, before:

| Route | What it shared |
|---|---|
| `/explore/[id]` | `og:*` correct (villa + photo) — but `twitter:*` still said **"SwapDoor – Swap Homes. Travel Better."** with the logo card, and `og:type`, `og:site_name`, `og:url` were all **absent** |
| `/blog/[slug]` | title, description **and** image all the homepage's, despite `generateMetadata` setting `title` and `description` |
| `/blog` | same — its `description` never reached `og:description` |
| `/explore`, `/how-it-works` | **no metadata at all**; both shared as the homepage |
| every route | `og:url` said `/`, because the root sets it and nothing overrode it |

**One Next.js rule explains all of it: `openGraph` and `twitter` are replaced
wholesale, not merged field by field.** So a page that sets a top-level
`description` keeps the root's `og:description`; a page that sets `openGraph`
keeps the root's *twitter* card and loses the root's `og:type`/`og:site_name`;
and a page that sets neither shares the homepage entirely. That is why the same
listing showed the villa on Facebook and the SwapDoor logo on X — a discrepancy
no one would find by reading the code, only by reading the tags.

**The fix is one function, [lib/seo.ts](../../lib/seo.ts).** `pageMetadata()`
takes a title, a share title, a description, a path and optionally a picture,
and always emits **both** blocks fully populated plus a canonical. Making it a
function rather than a convention is the point: the failure mode here is silent
and invisible in review, so the type system now asks for the fields that were
being forgotten. Applied to `/explore/[id]`, `/blog/[slug]`, `/blog`, `/explore`
and `/how-it-works`; `/` gained only the canonical it was missing.

**A regression I introduced and caught by measuring, not by reading.** Declaring
`openGraph` on `/blog`, `/explore` and `/how-it-works` **removed** the site card
from them — `app/opengraph-image.png` cascades by file convention only to routes
that declare no `openGraph` of their own. Those three briefly emitted no
`og:image` at all, which several platforms render as a bare text link. A page
without its own picture now names the site card explicitly (`/opengraph-image.png`,
the unhashed path Next also serves it at — verified 200, image/png).

**Two smaller things fixed in passing, both now visible on a card someone else
sees:**

- **A dead listing previewed as the homepage.** `generateMetadata`'s
  `if (!house)` branch returned only a title, so the root block applied: the
  preview promised the front door and the click delivered a 404 (Nielsen #1). It
  now reads *"This home is no longer listed"* and points at the homes that are.
- **`/explore/10` shared as "Rainforest Treehouse — Costa Rica, Costa Rica."**
  Some listings carry a region or a country in `location` rather than a city, and
  the title glued the two together unconditionally. Deduped.

**Verified, not eyeballed.** `tsc`, `eslint` over `app/`, `components/`, `lib/`
and `next build` green; every route kept its rendering mode. A sweep over the
running production build checks 11 tags (`og:title/description/image/url/
site_name/type`, `twitter:card/title/description/image`, `rel=canonical`) plus
two traps — an `og:title` equal to the site default, and an `og:url` still
pointing at `/` — across all 22 public URLs: **22/22 fully and specifically
tagged**, including all 14 listings, all 3 posts, and a nonexistent listing id.

**Worth acting on before the demo, unchanged by this pass.** The junk test rows
are now **four**, not the two recorded on 2026-08-21 — ids 104
(*"agdadggaddagadg"*, Split), 107 (*"hrarhehrehre"*, Amsterdam), 110 (*"Vilic"*,
Madrid) and 111 (*"123"*, Caracas). They are why the site counts 14 homes rather
than 10, and their names now render on real share cards. Deleting them is a
one-liner but it is data, so it was left to a deliberate call.

**Still open, deliberately (the menu's other options, not taken):** per-listing
and per-post card *images* via `opengraph-image.tsx` + `next/og`. Two notes for
whoever picks that up: `next/og` ships with Next, but satori reads only
`ttf`/`otf`/`woff` — **not woff2**, which is the only format Geist exists as in
this project — so it needs a committed font file or a build-time fetch. And
`metadataBase` still resolves to `localhost:3000` until the Vercel env var is
set, so every card URL above is absolute-but-local until deploy.

---

### The profile stopped being three text boxes (2026-08-22)

`/profile` had five editable things on it — photo, name, location, bio, password — and `profiles` had exactly five columns to match. That is a thin basis for the decision the page exists to support: a host reading it is deciding whether to hand a stranger the keys to their home. Persona 2 (Sarah, "fear of misrepresented listings, uncertainty about who she's swapping with") and Persona 3 (Mateo & Elena, "wary of scams") both commit or walk away on what this page says.

Four changes were chosen from an options menu; a fifth (verification) was offered, deferred, and written up separately below. The layout was deliberately left alone — the ask was more to edit, not a different page. `tsc`, `eslint` and `next build` are all clean, and the result was driven in a real browser (headless Edge over CDP, signed in as a seeded demo host) rather than only compiled.

**1. Travel & swap — the questions a host actually asks.** Five new nullable columns on `profiles` ([supabase/profile.sql](../../supabase/profile.sql)): `travel_with`, `travel_style[]`, `typical_trip`, `has_pets`, `smoker`. They render as chip groups rather than free text, so answers are comparable between profiles and skimmable at a glance (Hick's law: recognise, don't compose). The allowed values are enforced by `CHECK` constraints as well as by the form — RLS lets any authenticated client `PATCH` its own row directly, so the form is not the only writer and cannot be the only validator.

The two booleans are **three-state on purpose**: `null` means "hasn't answered", which is not the same claim as "no pets". Tapping the chosen answer again returns to unanswered, which is the only way back once something is picked (#3, user control and freedom). Unanswered fields render *nothing* in the preview — never "Pets: not specified", which fills a card with the shape of information and none of the substance (#8).

**2. Profile strength.** The form asked for input and reported nothing back — you typed into boxes and learned neither what it was worth nor what was still missing, a textbook Gulf of Evaluation (Lecture 3). [profile-strength.tsx](../../components/profile-strength.tsx) reads the **draft**, not the saved row, so the bar moves as you type, and it names the single highest-value missing thing as a link straight to that field. The weights are deliberately unequal — a photo is worth 30 and the pets/smoking pair 5 — because that is roughly the ratio in which they move a host's decision.

It is **not** a red→amber→green traffic light. The palette is blue-monochrome by design (Lecture 6) and a colour ramp would be the only thing carrying the message; here the percentage, the named next step and the checklist all say it in words, and colour marks only the finished state. In the checklist, done vs. not-done is a filled tick vs. an empty ring — a shape — with an `sr-only` "— done" / "— still to do" behind it.

**3. Your reviews.** The *My Reviews* node from the card-sorting sitemap ([Overview.md §4](./Overview.md)) had never been built; reading your own reputation meant opening each listing and scrolling past your own photos. [my-reviews.tsx](../../components/my-reviews.tsx) gathers every review left on every home you host, with one average across all of them, and each card names and links the home it was written about — away from a listing page, a review with no subject is an anonymous compliment.

**Reviews *you have written* were deliberately left out.** `reviews` has an owner-only `INSERT` policy but no UI behind it, so writing one isn't possible yet and that list could only ever be permanently empty. A section that can never fill is the same hollow signal as a badge nobody earned — see the blanket "✔ verified" removed on 2026-08-15. It goes in when reviewing is real.

Both empty states use the site's shared shape — `<MascotGlyph>` at 30%, a title, a line, and one way onward — the same as Explore's no-results, `/dashboard`, `/my-listings` and the `/swaps` tabs. They differ in their exit, because the two nothings are different: a member with no listing can act now ("List your home"), while one who is already hosting simply has to wait, and telling *them* to list a home would be advice they have already taken.

**4. Account settings grew the three things it was missing.**
- **Change email.** The card used to say *"Changing it isn't available yet"* — a dead end dressed as a setting (Nielsen #1). It now calls `auth.updateUser({ email })` and leads with the mechanism: nothing changes until the confirmation link is opened, so a typo is recovered by simply not clicking (#5). **Note for whoever tests this:** Supabase's *Secure email change* setting decides whether a link goes to one address or both, and the copy covers both cases rather than promising one.
- **Sessions.** Signing out ended the session on this device only, with nothing said about that; a shared or lost machine had no remedy. There are now two exits, and the difference is spelled out rather than implied by the word "everywhere".
- **Delete account.** There was no way to leave — the clearest possible violation of user control and freedom (#3). Consequences are listed *before* the control appears (and name the member's actual listing count), the confirm requires typing `DELETE` so a double-click can't do it, and "Keep my account" is the nearer, easier option — the same inline two-step [unlist-button.tsx](../../components/unlist-button.tsx) uses, so destructive actions behave alike across the site (#4).

**Why deletion needed a database function.** A browser holding the publishable key cannot delete an `auth.users` row — that is a service-role operation. Rather than an Edge Function, `public.delete_own_account()` is `SECURITY DEFINER`, **takes no arguments**, and derives its target from `auth.uid()`, so it can only ever delete the caller. `EXECUTE` is revoked from `public`/`anon` and granted to `authenticated` only (verified in `pg_proc.proacl`). It deletes the member's `houses` first, because `houses.host_id` is `ON DELETE SET NULL` and the cascade from `auth.users` would otherwise leave their listings on `/explore` as ownerless rows. Storage is not covered by any cascade, so the client clears the member's own `avatars/` and `house-photos/` folders first; a failure there is non-fatal, since an orphaned file is a smaller problem than an account that refuses to be deleted.

**One Save, and it follows you.** The form grew a second section, and two Save buttons each owning half the fields would make the member track which half they changed — recognition over recall, the wrong way round (#6). Everything typed is now governed by one Save, and while there are unsaved changes the action row sticks to the bottom of the viewport, so the way out is always in reach (#1, and Fitts: the screen edge is the cheapest target there is).

**A layout bug caught by looking at it.** "Your household" first rendered as two labels above four buttons side by side, which reads as a single row of four — you had to work out which pair belonged to which question. That is proximity (Lecture 5) failing at the exact job it does. Each question now owns a row with its answer on the same line, inside one bordered group.

**Also changed:** [app/auth/callback/route.ts](../../app/auth/callback/route.ts) handled only `?code=` (the PKCE exchange). An email-change link can arrive as `?token_hash=…&type=…` instead, which would have bounced the member to `/sign-in?error=auth` with their address unchanged and no explanation; both shapes are handled now.

**Verified in the browser** (headless Edge over CDP, signed in as a seeded host, no console errors): the strength meter moved 40% → 65% as chips were picked and every one of its anchors resolved to a real element; the preview picked up the travel answers live; the three-state toggles went unanswered → Yes → unanswered → No with the preview following each step; "Your reviews" rendered 7 real reviews with an aggregate of 4.7, and the empty state rendered with the mascot; and "Delete permanently" stayed disabled on an empty box **and** on lower-case `delete`, enabling only on the exact phrase. The `CHECK` constraints were confirmed against the live database by trying to write an unknown value and being rejected.

**Left open:** the strength weights are a judgement call, not a measurement — if the usability evaluation puts real people in front of this, what they actually look for first is worth more than what this file guessed.

---

### Verification, designed but not built (2026-08-22)

> ⚠️ **Superseded in part, later the same day.** The badge was defined as *reputation* instead — time on the site plus real guest reviews — and shipped; see the last section of this file. What follows is still the design of record if **identity** checking (phone, government ID) is ever wanted, which is a different claim from the one the badge makes today. The two could coexist as separate marks.

Offered alongside the profile work above and **deliberately deferred** — recorded here in enough detail that building it later is execution, not another design round. This is the fix for item 9 in "What's left to do".

**The problem, restated.** `verified` is one derived boolean on `houses`, seeded true for ~7 of the 10 demo homes and honestly `false` for anything a member creates. Nothing explains what it means, and there is no route to earning it. Trust in a home *swap* attaches to a **person** — you are letting them into your house — so the flag is on the wrong table.

**Three tiers, on `profiles`.**

| Tier | Mechanism | Cost / caveat |
|---|---|---|
| **Email** | Already exists and is already ignored: `auth.users.email_confirmed_at` is populated and nothing reads it. Free. | Meaningless while **email auto-confirm is ON** (blocking item 2). Turning it off is a prerequisite, not a side effect — do that first and this tier becomes real for nothing. |
| **Phone** | 6-digit OTP: generate server-side, store hashed with a ~10-minute expiry, verify on submit. | Real SMS needs a Twilio provider (paid). For the demo, show the code in a **clearly labelled** `Demo mode — in production this arrives by SMS` banner. Honest, free, and the whole flow is genuine except the transport. |
| **ID** | Upload to a **private** `verification-docs` bucket → row goes `pending` → approve in the Supabase Table Editor → a trigger stamps `profiles.id_verified_at`. | The Table Editor is already the documented admin surface (§4.4), so no new tool. Manual approval is a live-demo risk — see the open decisions below. |

**Schema sketch.**

```sql
alter table public.profiles
  add column if not exists phone             text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists id_verified_at    timestamptz;

create table if not exists public.verification_requests (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles on delete cascade,
  kind            text not null check (kind in ('phone','id')),
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  document_path   text,          -- private bucket path; never a public URL
  code_hash       text,          -- phone only
  code_expires_at timestamptz,   -- phone only
  reason          text,          -- why it was rejected; shown to the member
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);
-- RLS: the owner may SELECT and INSERT their own rows.
-- UPDATE of `status` must be service-role only — a member who can approve
-- their own request has verified nothing.
```

**The bucket is the part to get right.** `avatars` and `house-photos` are public-read by design. `verification-docs` must **not** be: owner-write, no public read, and served (if ever) through a signed URL. A passport scan behind a guessable public URL is a considerably worse bug than anything else in this codebase.

**The section, and its four states.** Every row is one tier, and the state is always a word plus a shape, never a colour alone (Lecture 6).

```
Verification                                ✓ 2 of 3 complete
Complete these to get the ✓ Verified badge on your listings
and swap requests.            [ What does Verified mean? ⌄ ]

┌────────────────────────────────────────────────────────────┐
│ ✓  Email address                                Verified   │
│    you@example.com · confirmed 12 Aug 2026                 │
├────────────────────────────────────────────────────────────┤
│ ✓  Phone number                                 Verified   │
│    +385 ·· ··· 4821                            [ Change ]  │
├────────────────────────────────────────────────────────────┤
│ ◷  Government ID                               In review   │
│    Submitted today · usually takes 1–2 days                │
│    passport.jpg                              [ Withdraw ]  │
└────────────────────────────────────────────────────────────┘
```

- **Not started** — `[ Verify ]`
- **In review** `◷` — says when it was submitted and roughly how long it takes, and offers *Withdraw*. This is the state most worth building: a member who uploads a document and sees nothing happen assumes it failed (#1).
- **Verified** `✓` — carries the date it was confirmed.
- **Couldn't verify** `✕` — must state the reason from `verification_requests.reason` and offer *Try again*. A rejection with no reason is a dead end.

The phone step is one small dialog, and the only interesting part is that the code entry must survive a mistyped number — "Wrong number? Change it" beside the resend timer, so the way back doesn't require abandoning the flow.

**The explainer is not optional.** Today nothing says what the badge means, which makes it decoration on the exact page where a cautious member is deciding. Proposed copy, including the honest limit:

> **What "Verified" means on SwapDoor**
> ✓ Email confirmed — they clicked a link we sent to their address
> ✓ Phone confirmed — they entered a code we sent them
> ✓ ID checked — a government photo ID was matched to the name on the profile
> *Verification confirms identity. It is not a promise about the home or about how someone behaves — read the reviews too.*

That last line matters. This project has already removed one badge for claiming more than it could support (the blanket "✔ verified" on every destination, 2026-08-15); a tiered badge that quietly implies "safe" would repeat the mistake at higher resolution.

**Propagation, and the bonus it pays.** Once a person can be verified, a member's listing derives its flag from its host rather than being permanently false:

```ts
verified: row.verified ?? Boolean(row.host?.id_verified_at)
```

`??` and not `||`: the seeded rows carry an explicit boolean and must keep winning, so only a genuine `null` falls through to the host. This also pays down half of item 8 — the seeded homes stop being the only ones that can ever show the badge.

**Where it plugs in.** The section belongs on `/profile` between "Travel & swap" and "Your reviews", and the badge state wants to ride along on [profile-context.tsx](../../components/profile-context.tsx) (which already loads the profile once, app-wide) rather than being queried again by each consumer. [components/profile-strength.tsx](../../components/profile-strength.tsx) should then gain verification as a weighted item, since it is the highest-value thing a profile can carry.

**Two decisions left open on purpose.**
1. **Manual approval vs. demo auto-approve.** Manual keeps the `In review` state, which is the interesting part; it also means a grader clicking *Verify* during a demo sees nothing resolve unless someone is watching the Table Editor. Auto-approving after a few seconds demos better and teaches less. Pick per audience — the two differ by one trigger.
2. **What earns the badge.** ID alone, or ID + phone? Requiring both makes the badge scarcer and more meaningful; requiring ID alone makes it reachable. Whichever is chosen, the explainer copy above must be edited to match, or it becomes a false claim.

---

### "Verified" stopped being a lie, and members can finally write reviews (2026-08-22)

Two changes that only make sense together. The badge now means *this host has been here a while and the people who stayed with them said so* — which requires reviews to exist; and reviews written by members are worth having only if writing one cannot be abused to manufacture the badge.

**What the badge used to be.** One line in [lib/houses.ts](../../lib/houses.ts):

```ts
function deriveVerified(house: House): boolean {
  return seeded(house.id, 7) > 0.3;   // a hash of the listing's id
}
```

A ✓ that touched no fact about anybody, on roughly 70% of homes because that is where the threshold happened to fall. A member's own listing was hardcoded to `verified: false` by the listing form, permanently, with no route to changing it. The earlier design in "Verification, designed but not built" below proposed fixing this with identity checks — phone codes and ID uploads. That was set aside in favour of something the data already supported: **reputation, not documents.**

**The rule.** A host is Verified when all five are true:

| Requirement | Why it's in |
|---|---|
| Member for **90 days** | An account made this morning has no record to read |
| A **bio** | A blank profile is not a known person |
| **Where they live** | The single most-asked question before a swap |
| At least **3 reviews** | One happy guest is an anecdote |
| Average **4.5+** | Reviews only mean something if a bad one counts |

**Not required: a profile photo.** It belongs in this rule on the merits — the profile page itself calls it "the single strongest trust signal on a swap request". It is out because **no seeded host has one** (`avatar_url` is null for all 7), so requiring it today would mean nobody is verified and every badge on the site vanishes. Recorded as a decision, not an oversight: seed host avatars and the line goes back in.

> **Unblocked 2026-08-23.** All seven demo hosts now have an avatar in Storage, so
> the reason above no longer holds. Putting the line back into `is_verified_host()`
> is a one-line change — deliberately **not** made at the same time, because it
> changes who wears a badge and that is a product call. See the last dated section.

**Where the rule lives.** In the database, once: `public.is_verified_host(profiles)` in [supabase/trust.sql](../../supabase/trust.sql), exposed to PostgREST as a **computed column**. A function whose single argument is the table's row type can be selected as though it were a stored field, so the existing host embed just asks for it:

```
host:profiles!houses_host_id_fkey(full_name, …, is_verified_host, host_review_count, host_rating)
```

Nothing in the app decides who is verified, so no surface can disagree with another about it. `lib/trust.ts` duplicates the four *thresholds* for the member-facing checklist, and only the thresholds — if those ever drift, the checklist goes wrong and the badge stays right, never the reverse.

*Scale note:* each call runs a subquery per row, which is free at 14 homes and would not be at 100k. The upgrade is denormalised counters on `profiles` maintained by the review trigger; the function signature would not change, so nothing above it moves.

**Inheritance, which was the ask.** A home takes its badge from whoever hosts it:

```ts
verified: house.verified ?? Boolean(house.host?.verified)
```

`??` and not `||`, so `houses.verified` survives as a deliberate per-home override: NULL (the normal case) means "ask the host", true/false force the answer from the Table Editor. The four member-created rows carried an explicit `false` and were reset to NULL, and [listing-form.tsx](../../components/listing-form.tsx) now writes NULL — otherwise a new listing would have been pinned to unverified forever no matter how good its owner's record became.

**Result on the live data:** all 7 seeded hosts qualify (5–8 years, 3–7 reviews, 4.67–5.00), so 10 of the 14 homes carry the badge; the 4 test listings do not. Explore's "Verified hosts only" filter goes 14 → 10.

**The checklist.** [trust-checklist.tsx](../../components/trust-checklist.tsx) on `/profile` shows all five requirements with where *this* member actually stands — "You've been here 4 days — 86 to go", "No guest has reviewed a home you host yet". All five are shown, met or not, because "3 of 5" means nothing without the other two on screen. Only the two they can act on now (bio, location) get a Fix link: there is no button for "get more reviews", and offering one would be a promise the page can't keep. The live badge beside the heading is read from `is_verified_host`, not from the count, so what a member reads about themselves is decided by the same rule strangers see.

---

**Reviews.** `reviews` has had an INSERT policy since day one and nothing able to use it — every review on the site came from a seed script. Two things had to be true first, and both were problems in their own right.

**1. The old policy was wide open.**

```sql
with check (auth.uid() = author_id)   -- that was all of it
```

Any signed-in member could review any home — **including their own, any number of times**. Putting a form on top of that would have made the badge farmable by its own host, five stars at a time. [supabase/reviews.sql](../../supabase/reviews.sql) adds "not a home you host" to the check and a unique index on `(author_id, house_id)`, plus the UPDATE policy that was missing so a typo isn't permanent and public (#3).

**2. `houses.rating` and `review_count` were refreshed by hand.** schema.sql literally carries `-- Refresh with: update public.houses …`. Fine while a seed script was the only writer; useless the moment members write reviews, when every card would keep showing the rating it had on seeding day. Worse, `rating` is one of the five inputs to the badge, so a stale value would decide who wears it. A trigger now maintains both. It has to be `SECURITY DEFINER`: the reviewer is by definition not the home's host, and the UPDATE policy on `houses` is owner-only.

**Who can review — the decision.** Gating on a completed swap was offered and **not** taken; anyone signed in can review any home they don't host, once. The trade was stated at the time and is worth recording: a review no longer evidences a stay, and since reviews feed the badge, **seven co-operating accounts could manufacture a Verified host.** Acceptable for a course demo, not for production — the fix is the swap gate, and the status machine to hang it on already exists.

**Where it lives.** One `<ReviewForm>` ([review-form.tsx](../../components/review-form.tsx)), reachable from two places: the listing's Reviews section, and an accepted swap at `/swaps/[id]`, which is the moment someone is most willing to write one. One component, so validation, the one-per-home rule and the edit/delete path cannot drift apart (#4).

**It is deliberately all client-side.** `/explore/[id]` is prerendered (SSG + ISR) and had to stay that way; asking the server "has this viewer already reviewed this home?" would have made every listing visit dynamic. So the form asks the database from the browser, after paint, and only for someone signed in. `next build` still lists all 14 detail pages as ● SSG.

**Details worth keeping:** the star picker is a real radio group (arrow keys work, and each option is announced with its word — "4 stars — Great"), because a row of divs with click handlers is the usual way star ratings become unusable without a mouse; the rating is printed as "4 / 5 · Great" beside the stars so colour and shape aren't carrying it alone (Lecture 6); the list updates in place on save, since a prerendered page would otherwise not show the review until the next revalidation and would look like it failed; and the host of a home is *told* they can't review it rather than just not being offered a button — an absent control is not an explanation (#1).

**`/profile` reviews are now two-directional.** "About your homes" and "Written by you", as tabs with counts. The second half was deliberately left unbuilt earlier the same day because writing a review was impossible and the list could only ever have been empty; that reason is gone.

**A false claim, fixed.** `/how-it-works` said *"Every profile is verified so you always know who you're swapping with."* That stopped being true the moment the badge started meaning something — most new members don't have it. It now describes how the badge is earned. This is the same failure the blanket "✔ verified" destination badge was removed for on 2026-08-15, so leaving it would have contradicted a decision this project had already made.

**Verified against the live database and in a real browser** (headless Edge over CDP, no console errors):
- The rule returns true for all 7 seeded hosts and false for the 4-day-old account.
- PostgREST serves `is_verified_host` through the house embed (HTTP 200, correct values).
- **RLS, as a signed-in user:** reviewing your own home → `403` RLS violation; another host's home → `201`; the same home twice → `409` on the unique index; deleting your own → `204`.
- **The trigger:** house 1 read 4 reviews @ 4.75 → inserting a 1-star made it 5 @ 4.00 → deleting made it 4 @ 4.75 again. Zero houses in the database disagree with their own reviews.
- **In the browser:** submitting an empty form says "Pick a star rating first."; posting adds the card and flips the button to "Edit your review"; deleting removes it and restores "Write a review"; a host on their own listing gets the notice and no button; a signed-out visitor gets "Sign in to write a review". Explore reads 14 of 14 with 10 badges, and 10 of 14 under "Verified hosts only".
- No test rows left behind.

**Left open:** the farming risk above; the photo requirement waiting on seeded avatars; and `rating`/`review_count` staying denormalised, which is right for now and is the thing to revisit before this ever carries real traffic.

### The footer was four equal columns, one of which was empty (2026-08-22)

Asked for a UI/UX pass on the footer. It was offered as a set of directions to
pick from; the choice was a **brand-led, asymmetric** layout, **real Privacy and
Terms pages**, and the **accessibility/contrast bundle**, plus a back-to-top
control and the repo/pitch links. Adding `/dashboard` and *Trust & safety* to the
columns was offered and declined, so the link set is unchanged apart from one
label.

**What was actually wrong.** Six faults, five of them straight out of the course
material:

| # | Fault | Principle |
|---|---|---|
| 1 | **The Legal column was dead.** Privacy and Terms were `<span>`s reading "(soon)" — a quarter of the footer's width promising two documents that did not exist | Nielsen #1, #4 |
| 2 | **`text-muted/50` measured 3.0:1** on `bg`, under the 4.5:1 AA floor. The copyright line had already been fixed for exactly this reason ("de-emphasised by size, not by fading the ink"); Legal was the copy of the mistake that survived | Lecture 6 |
| 3 | **Column headings looked like their links** — same `text-sm`, differing only in weight and colour | CRAP *Contrast* |
| 4 | **The footer did not read as its own region** — same `bg` as the page, resting on a hairline | CRAP *Contrast* |
| 5 | **The brand had no weight** — the logo was one column of four, the same width as a list of three links, and was not even a link home | CRAP *Contrast* |
| 6 | **`<h4>` in a document that runs h1 → h2** — a skipped heading level | a11y |

**The layout.** Twelve columns: the brand takes five, the two link lists take
three each starting at column seven. The brand block is the lockup (now a link
to `/`), the tagline, one sentence of what SwapDoor is, and the mascot at 6%
behind it, anchored to the bottom-right corner where the column would otherwise
be dead space. Below a rule, a bottom bar carries the copyright, Privacy, Terms,
the two external links and *Back to top*. Below `lg` the brand spans the full
width and the two lists sit side by side; the watermark is dropped rather than
shrunk, because at phone width it would sit under the copy instead of beside it.

The footer now sits on `surface-2` — the token alternating sections already use,
so this introduced no new colour. Measured on it: body text 7.3:1, the accent
eyebrows 6.7:1. Both clear AA, and the body text clears AAA.

**Two real legal pages, not boilerplate.** `/privacy` and `/terms`, both static,
both drawn by the shared [legal-doc](../../components/legal-doc.tsx) so they
cannot drift apart in type scale. The content is specific to this repository
rather than generated: the tables named in Privacy are the tables in
`schema.sql`, the four third parties named are the four the app actually calls
(Supabase, the CARTO tile CDN, Nominatim, Unsplash), and the deletion route named
is the RPC that exists, `delete_own_account()`. Terms describes what the database
already enforces — no self-reviews, no duplicate reviews — as rules rather than
requests, because that is what they are. Both open with the same note: this is
coursework, no money changes hands, the site may be reset.

A privacy page listing services the app does not use would be worse than no page
at all, which is the reason none of this was pasted from a generator.

**"Back to top" is a fragment link, not a component.** `<a href="#top">` against
`id="top"` on `<body>`: no client component, no JavaScript, and it still works if
the bundle fails to load. The smooth scroll is opted into with
`@media (prefers-reduced-motion: no-preference)` — written that way round so that
anyone who has asked their OS to stop moving things simply never opts in.

**One Next 16 trap worth recording.** Previous versions forced
`scroll-behavior: auto` around every SPA navigation and restored it afterwards,
so a globally smooth `<html>` still jumped instantly between routes. **Next 16
stopped doing that by default.** Without `data-scroll-behavior="smooth"` on
`<html>` — now set in [app/layout.tsx](../../app/layout.tsx) — the smooth scroll
this footer wants for one anchor would have animated the scroll-to-top of every
route change on the site. It is documented in
`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

**The label correction, reported mid-build.** The footer said *Browse homes* for
a link to `/explore`, while the navbar three inches above it called the same page
*Explore*. One destination, two names, on the same screen (Nielsen #4). *Explore*
is now the link and *Browse homes* is the column's heading, where it names a
group instead of competing with the navbar for the page's label. The same fix was
applied to the legal pages' footer nav. It was deliberately **not** applied to
the *Browse homes* buttons in `cta.tsx`, the two 404s and `my-reviews.tsx` —
those are action buttons, where a verb phrase is right, not entries in a list of
navigation labels sitting beside the navbar's own.

**Verified.** `tsc`, `eslint` over `app/`, `components/`, `lib/` and
`next build` all green. `/privacy` and `/terms` build as `\u25cb (Static)`, and `/`,
`/how-it-works` and `/sign-in` are **still** `\u25cb (Static)` — the footer stayed a
Server Component, with `<FooterAccount>` still the only client-side piece. The
rendered HTML of the production build was read back and checked rather than
eyeballed: no `text-muted/50` and no "(soon)" anywhere, two `aria-labelledby`
nav landmarks, an `sr-only` h2 for the footer, 11 focus rings where there were
none, both external links carrying `rel="noopener noreferrer"` and an accessible
name that says they open a new tab, and `id="top"` +
`data-scroll-behavior="smooth"` present on the document. Screenshotted at desktop
and below `sm`.

**Known limitation, unchanged.** The Account column still swaps *Sign in* →
*My swaps* once the profile query lands, for the same reason the closing CTA
flashes: personalising it on the server would cost `/` its static prerender.

**Files:** rebuilt [footer.tsx](../../components/footer.tsx); new
[footer-link.ts](../../components/footer-link.ts) (the one link look, shared by
the Server and Client halves), [legal-doc.tsx](../../components/legal-doc.tsx),
[app/privacy/page.tsx](../../app/privacy/page.tsx),
[app/terms/page.tsx](../../app/terms/page.tsx); touched
[footer-account.tsx](../../components/footer-account.tsx),
[app/layout.tsx](../../app/layout.tsx), [globals.css](../../app/globals.css).

---

### The blog and How-it-Works became a real CMS, with a real editor (2026-08-22)

Two things were true at the start of this pass, and only the first was written
down. The first: `houses` had been served from Supabase since 2026-08-17, and
this file recorded the course requirement "content in a remote headless CMS" as
satisfied on that basis. The second, which it did not record: **the blog and the
entire How-it-Works page were hardcoded `.tsx`**. Every post lived in a
`POSTS` array in `lib/blog.ts`, and the four steps, three trust cards and three
FAQ answers were `const` arrays inside their components. Changing one FAQ
answer meant editing a file and shipping a deploy — which is precisely the thing
a CMS exists to stop, so the requirement was half met and reported as whole.

Four decisions were put to the user before any code was written; all four were
taken as recommended.

#### Which CMS

The options were a dedicated product (Sanity with its Studio mounted at
`/studio`, or an external dashboard like Contentful), Supabase tables edited
through the Supabase Table Editor, or **Supabase plus an admin built into the
app**. The last was chosen.

The reasoning that decided it: this app already has accounts, roles-adjacent
infrastructure, RLS, Storage and a session layer, and a second content backend
would mean a second set of keys to configure on Vercel, a second free tier to be
at the mercy of during a demo, and content living outside the repository. What a
dedicated CMS buys over that is an editor someone else wrote — and the editor is
the interesting part of the deliverable in a *user interfaces* course, not the
part worth outsourcing. Editing JSONB by hand in the Supabase Table Editor (the
cheap option) was rejected for the obvious reason: it is not an interface, and
it would be the one screen in the project nobody could defend.

#### The schema — [supabase/cms.sql](../../supabase/cms.sql)

`blog_posts` (slug, title, excerpt, cover, category, author, status,
`published_at`, `read_minutes`, `content jsonb`) and `site_content`
(`key text primary key`, `value jsonb`). Content is `jsonb` rather than a table
of block rows because a post is always read whole and never queried
block-by-block; a join per paragraph would buy nothing and cost an ordering
column.

Three triggers do work the application would otherwise have to remember to do,
and would eventually forget:

- `blog_posts_touch` / `site_content_touch` keep `updated_at` honest, so a row
  edited from psql or the Table Editor does not lie about when it changed.
- `blog_posts_stamp_published` sets `published_at` the first time a draft goes
  live and **never moves it again**, so correcting a typo in a published post
  does not reorder `/blog`.

**The security hole this opened, and the trigger that closes it.** Adding
`profiles.role` to a table that already carried the policy *"Users can update
their own profile"* — whose check is `auth.uid() = id`, i.e. any column of your
own row — would have let any signed-in member run
`update profiles set role = 'admin' where id = auth.uid()` and hand themselves
the CMS. RLS cannot express "every column except this one", so
`profiles_guard_role` is a `BEFORE UPDATE` trigger that raises
`insufficient_privilege` when `role` changes and `public.is_admin()` is false.
Without it, every write policy in the file would have been decorative. This is
the kind of thing worth naming in the report: the vulnerability was created by
the feature, not inherited, and it was created by a policy that had been correct
for months.

#### The fallback, which is the reason nothing can go dark

[lib/cms.ts](../../lib/cms.ts) is the single data layer, and every public read
degrades to seed content instead of failing — the same discipline
[lib/houses.ts](../../lib/houses.ts) applies with its gist fallback. If Supabase
is unconfigured, unreachable, or returns an empty set, `/blog` and
`/how-it-works` render the five posts and four sections committed in
[lib/cms-seed.json](../../lib/cms-seed.json). `getHowItWorks()` merges **per
section**, so an admin who has only ever edited the FAQ still gets the seeded
steps, and one malformed row cannot take the page down with it.

That JSON is also the seed: [scripts/build-cms-seed.mjs](../../scripts/build-cms-seed.mjs)
turns it into [supabase/seed-cms.sql](../../supabase/seed-cms.sql), the same way
`build-places-seed.mjs` generates the geography seed. One source, two consumers,
so the fallback can never drift from what was seeded.

#### `/admin` — the editor

Gated twice. [proxy.ts](../../proxy.ts) sends a signed-*out* visitor to
`/sign-in?next=/admin`; [app/admin/layout.tsx](../../app/admin/layout.tsx)
answers **404** to a signed-in member who is not an admin, because "this exists
and you may not have it" is itself information. Neither is the real defence —
the RLS policies are, and they run where they cannot be skipped. The layout
check exists so a member never reaches a screen whose every button would fail.

The post editor is a **block editor, not a rich-text box**, and that is the
decision the rest of the screen follows from. A WYSIWYG would let an editor
paste styled HTML out of Word and put type on the page the design system has no
rule for; a stack of typed blocks can only produce combinations
[post-body.tsx](../../components/post-body.tsx) already knows how to draw. CRAP
*Repetition* held in place by architecture rather than by asking nicely. The
trade is that inserting a paragraph is a click on "Paragraph" instead of pressing
Enter — acceptable at a few posts a month, and it is what keeps `/blog` looking
like one publication.

The How-it-Works editor draws the same boundary harder. An editor owns every
word, the order of the steps, and the grouping of the FAQ. They do **not** own
the layout, and the "product panel" beside each step is a dropdown over five
live components rather than an image upload — because a CMS that lets you upload
a screenshot per step produces a page whose illustrations rot the next time the
UI changes, and one that lets you pick a component cannot (Lecture 2,
*constraints*: make the wrong action impossible rather than merely discouraged).

There is no autosave. A post is a document with a publish state, and silently
persisting half a thought as the live version of a published page is worse than
an explicit button.

#### `/how-it-works` — the duplicate page problem

`<HowItWorks />`, the four-card grid, was rendered **identically** on `/` and on
`/how-it-works`. Clicking "How it Works" in the nav delivered the exact block the
visitor had just scrolled past on the homepage. The nav label set an expectation
the destination did not meet — Nielsen #1 — and the page had no reason to exist.

It does now. A **sticky rail** on the left tracks the section crossing the middle
of the viewport (`IntersectionObserver`, `rootMargin: -45% 0 -50%`), so the rail
changes when the reader's eye reaches a section rather than when its top edge
appears; the marker is filled / ringed / hollow, three states told by **shape as
well as colour** so it survives a greyscale check (Lecture 6). It is visibility
of system status (#3) on a long explainer, and it makes the page navigable
rather than merely scrollable (#7).

On the right, each step shows **the part of the product it is about** rather than
an emoji and a promise — see [hiw-panels.tsx](../../components/hiw-panels.tsx).
The "listings" panel is real: it reads two live homes out of Supabase, verified
ones first, and is rendered on the server and passed to the client rail as a
prop. The three panels showing private states (a message thread, an agreed swap,
a completed review) are reconstructions — they must be, since a signed-out
visitor has no thread — but they are built from the same tokens and classes as
the real screens, so a redesign carries them along.

This matters most for exactly the two personas the page is written for: Sarah,
who will not commit to what she cannot see, and Mateo and Elena, who abandon
anything that looks complicated. "Show" beats "tell" for both, and neither of
them was being shown anything.

The FAQ went from three questions to eight, grouped into **Money / Safety /
Dates / Your home**, and it now answers what people actually hesitate over
rather than what is comfortable to answer: *who pays if something breaks*
(you do, we are not an insurer, check your policy), *do both homes have to be
swapped at the same time* (no), and *I rent, can I still swap* (check the
tenancy, tell the landlord). Eight in a flat list would be a wall; four named
groups let someone jump to the one worry they arrived with (Hick's law), and
every answer still ships closed.

The homepage keeps the four-card summary, now ending in a link to the real page.
It is deliberately **not** read from the CMS: `/` is statically prerendered with
no per-request work, and four words per step is chrome, not content.

#### `/blog` — from three cards to a publication

Category filter (Travel / Hosting / Trust & safety / Guides) synced to the URL
rather than held in client state, the same call `/explore` made: a filtered view
becomes a link you can send, the back button steps through filters, and the list
is real HTML that works with no JavaScript. Categories with no published posts
are dropped rather than rendered as dead ends. The featured card appears only on
the unfiltered view — inside a category the posts are peers, and promoting one
of three would be a hierarchy the content does not have.

The cost is that `/blog` is now `ƒ` rather than `○`: one query per request
instead of a cached page. At five posts that is the right trade, and it means a
post published in `/admin` is on `/blog` the moment it is saved.
`/blog/[slug]` stays prerendered with a 60s revalidate.

#### Two typographic defects, both real, both fixed in the renderer

1. **Proximity.** The old post page put every block in one `gap-6` flex column
   and gave headings `mt-4` — so a heading sat **closer to the paragraph above it
   than to the text it introduced**. That is the textbook proximity failure from
   Lecture 5, on the one element whose entire job is to group what follows.
   Spacing is now per-block: `mt-14 mb-3`, roughly four times the space above as
   below.
2. **Measure.** Body copy was 18px inside `max-w-3xl` (768px) — about 95
   characters a line, well past the 60–75 where the eye reliably finds the start
   of the next one. Text blocks are now capped at `66ch` while media is allowed
   to be wider, which is also what makes the column read as a column.

#### Emoji are gone

`/how-it-works` and the homepage section drew their step and trust icons as
emoji — 🔍 💬 🔑 🌏 🛡️ ⭐. Emoji are font glyphs the operating system chooses:
Apple draws a colour cartoon, Windows a flat two-tone, Android something else
again. The most prominent element in each card was the one element that looked
different on every machine, on the page whose job is to look trustworthy, in a
project whose brand is otherwise entirely traced vector
([lib/brand-art.ts](../../lib/brand-art.ts)). Replaced by
[components/icons.tsx](../../components/icons.tsx) — one stroked 24×24 set on
`currentColor`, so they take the accent colour like everything else.

#### Performance, since PageSpeed is still a deliverable

The `video` block does **not** load YouTube until it is clicked. A plain
`<iframe src="youtube.com/embed/…">` pulls roughly a megabyte of third-party
JavaScript on load whether or not anyone watches — on a page otherwise made of
text and one photo it would be the heaviest thing by an order of magnitude, and
exactly what a PageSpeed run reports as unused JavaScript and third-party
blocking time. [video-embed.tsx](../../components/video-embed.tsx) renders the
poster frame (`i.ytimg.com`, added to `next.config.ts`) and swaps in the real
iframe on the first click with `autoplay=1`, so the click that reveals the player
is the click that starts it.

Similarly, `code` blocks are highlighted by a ~40-line tokeniser rather than by
Shiki or Prism: 200KB+ of dependency to colour two snippets, on a site whose
Lighthouse score is itself being graded, is not a trade worth making.

#### Content

Five posts, up from three, across all four categories — two of them new
(*A Neighbourhood Guide to Kyoto*, bylined to the Kyoto host and carrying live
listing cards; *Working From Someone Else's Kitchen Table*, bylined to the
digital-nomad persona and carrying a code block). The existing three were kept
and extended. Between them they now use every block type, including the project's
own pitch video, which means the brief's "images, videos, code snippets" is met
literally rather than by an agreed narrowing.

Posts by a persona resolve `author_id` against `profiles.full_name`, so they pick
up that member's real photo and bio; a byline with no matching profile ("The
SwapDoor Team") simply leaves `author_id` null and shows `author_name`. That is
why both columns exist.

#### Verified, not eyeballed

`tsc`, `eslint` (zero errors) and `next build` are all clean; 34 routes
generated. The production build was started and read back over HTTP rather than
assumed: `/blog`, `/blog?category=hosting`, `/blog/why-home-swapping`,
`/blog/kyoto-neighborhood-guide` and `/how-it-works` all 200. The category filter
was checked to actually filter (`?category=hosting` returns *Prepare Your Home*
and not the Kyoto guide). `/how-it-works` was confirmed to emit all four step
anchors (`step-browse`, `step-ask`, `step-agree`, `step-swap`), the panel chrome,
and the new FAQ. `/admin` signed-out returns **307 → `/sign-in?next=%2Fadmin`**.

#### Left open

- **The database still has to be seeded.** `supabase/cms.sql` is applied, but the
  content write and the admin promotion were blocked by this environment's write
  guard, so `blog_posts` and `site_content` are still empty and the site is
  running on the JSON fallback. Two SQL runs finish it — `supabase/seed-cms.sql`,
  and one `update public.profiles set role = 'admin'`. `/admin` says so on screen
  until then, because "I edited a post and nothing changed" is otherwise an hour
  of looking for a bug that is not there.
- **Image uploads.** Cover images and in-post images are URL fields. The
  `house-photos` Storage bucket and the upload helper in
  [lib/storage.ts](../../lib/storage.ts) already exist, so wiring a real uploader
  into the block editor is a contained piece of work, not a new system.
- **No preview of a draft.** A draft can be read in the editor but not seen as it
  will look. A `?preview=<token>` route reusing the same renderer is the obvious
  shape.
- **Categories are a CHECK constraint** plus a constant in
  [lib/cms-types.ts](../../lib/cms-types.ts), so adding a fifth needs a migration.
  Deliberate at this size — a free-text tag field grows a long tail nobody
  prunes — but it is a constraint, not an oversight.
- **`estimateReadMinutes` is duplicated** in `scripts/build-cms-seed.mjs`,
  because that script is plain `.mjs` and the original is TypeScript. Harmless
  (the app recomputes when the stored value is missing) but it is drift waiting
  to happen.

### The phone and the tablet stopped being a narrow desktop (2026-08-23)

The site had always *fitted* on a phone — nothing overflowed, nothing was
unreachable by luck — but it had never been *designed* for one. Every screen
below `lg` was the desktop layout with its columns stacked, its hover
affordances forced visible, and its spacing unchanged. This pass was a
heuristic evaluation (Lecture 4 method: findings ranked by severity, each tied
back to a lecture) carried out **on the device**, followed by fixes scoped so
that **nothing above 1023px changed at all**.

**How it was measured.** A CDP driver drove headless Chrome with real device
metrics — 320×700, 360×740, 390×844, 640, 768×1024, 820×1180 — and, for the
gated routes, signed in as a demo host. Every number quoted below was read out
of the running page, not estimated. `document.scrollWidth === clientWidth` at
every width before and after, so none of this was fixing an overflow; it was
fixing a design.

**Where "mobile" ends: `lg` (1024px).** The desktop nav used to switch on at
`md` (768px), which is where a tablet lives — measured at 768, "How it Works"
wrapped onto two lines and the header's three groups fought for the row. The
brief was explicitly that tablets count as mobile, so the nav, the layout
switches and the sheets all now hold until `lg`. Two things use `sm` (640px)
instead, and deliberately: Explore's filter pills and the compact search bar
both still read well at 768–1023, and collapsing a control that works is not
mobile design.

#### The ranked findings, and what each became

**S1 — The drawer was a trap (Nielsen #4, Fitts).** The backdrop carried no
handler and nothing listened for Escape, so the only exit from the one panel a
phone user actually opens was a 24px ✕ in the far corner. The page kept
scrolling behind it. It appeared and vanished instantly inside a header where
everything else cross-wipes. And its three destinations were bare text ~20px
tall, directly above account rows that `MobileAccount` had already built at
48px with an icon each — two row systems in one panel (CRAP repetition).
It now slides in on the same `usePresence` helper the search pill uses, closes
on backdrop tap and on Escape, locks the body, and gives each destination a
52px row with a mark from the shared icon set. Current is signalled by weight,
an accent bar and a tinted row — never colour alone (Lecture 6, guideline 4).
The `☰` text character became a drawn `MenuIcon` in a 44px square: an OS font
glyph was the one part of the header not traced vector.

**S2 — The tablet band.** See above: `md:` → `lg:` on the nav's three slots.

**S3 — Explore buried its results under its controls (Hick's law, Nielsen #9,
CRAP alignment).** Measured at 390×844: the title, the stacked search bar, three
wrapped filter pills, a sort control alone on its own line and the budget card
filled **~620px**, so the page whose entire purpose is to show homes showed no
home without scrolling. The sort control sat on `ml-auto`, breaking the left
edge every other element shared. Two changes:

- The **compact search bar collapses to one row** below `sm` — icon plus value,
  the same cells the docked nav pill already uses, so one control looks like
  itself in both places. Below 360px the glyph drops so "Where" and "When" stop
  truncating to the same "Wh…". The hero bar is untouched: it is the point of
  that screen and it has the room.
- The pills, the sort and the budget slider move into **one "Filters" button
  and a bottom sheet**, badge-counted, footer reading "Show 14 homes" rather
  than "Apply" so the effect is visible before it is committed to (#3). A sheet
  rather than narrower pills because the pill panels are anchored popovers —
  see S4, they have the same fatal bug. First home now appears at **y≈340
  instead of y≈780**.

**S4 — Part of the search was physically unreachable on a phone (Nielsen #4).**
The worst finding of the pass, and it was invisible from a desktop. The "When"
popover measured 492px tall starting at y=498 on a 390×844 screen: it ran to
y=990, and being `position: fixed` the page could not be scrolled to reach the
rest. The whole "Or stay flexible" block — four duration choices — could not be
got to at all. Below `lg` every search popover now docks to the bottom edge as
a sheet with its own scroll, using the same `.swap-sheet` rise the listing
page's date picker already had. Above `lg`, byte-identical.

**S5 — The reviews marquee was unreadable at 390px (Lecture 5, contrast).** Two
rows of 19rem cards is a wall of testimony on a wide screen. On a phone it is
one card at a time, and the 5rem fade at each end covered **160px of a 390px
viewport**, so every card on screen was partly faded — and it was moving. The
mechanism meant to make the reviews read as a *population* was stopping them
being read at all. Below `lg` it is one row, no motion, no mask, scroll-snap:
the reader holds a card still for as long as they like, which is what the
section is for. Desktop keeps both drifting rows.

**S6 — The home map was a 520px box with two light-grey bands.** Leaflet ships
`.leaflet-container { background: #ddd }` in a stylesheet injected *after*
`globals.css`, so it beats the token rule. On a wide screen it never shows: the
fitted world is taller than the box. On a portrait phone the world took about a
third of the container and the rest was the brightest thing in the section,
meaning nothing. Fixed by height (`320 / 420 / 520`) plus a doubled-class
override to out-specify Leaflet — and `surface-2` is exactly the colour the
map's own section is painted, so the bands stop existing rather than merely
darkening. Leaflet's 30px white zoom buttons and its white attribution strip
went the same way: 44px, on-theme, mobile-scoped.

**S7 — Targets under the thumb floor (Fitts, Lecture 3: "do increase the size
of tiny targets").** Card-gallery arrows 32px, its dots 6px, Leaflet's controls
30px, the lightbox close 40px, the drawer trigger ~36px. All now ≥44px on
touch, or replaced — see S8.

**S8 — Hover UI was being forced onto touch screens.** The brief asked for this
explicitly, and the code said so itself: the card gallery's arrows live at
`opacity-0` and appear under a pointer, and were force-shown with
`max-md:opacity-100` — two discs parked permanently over the middle of every
photo on the page. Below `lg` they are gone and the photo answers a **swipe**,
which is what a finger on a photo already expects (Nielsen #1: follow the
platform's real-world convention). The dots stay, because without them the
swipe would be a gesture you had to know about rather than see (Lecture 2), and
they grow into a ~28×36px strip since on touch they are the only explicit
control left. A swipe that ends on a link no longer opens the listing. The
lightbox got the same treatment: swipe, arrows `lg`-only, thumbnail strip as
the visible signifier. Also removed on touch: the **fake browser chrome** (three
dots and `swapdoor.app/explore`) on the `/how-it-works` panels — a picture of a
desktop browser, shown to someone who is not looking at one.

**S9 — The card header collided.** `Malibu Oceanfront M… Est. $2,500` — a
truncated name hard against the price with 12px between them, so the two most
important facts read as one run-on string and the *name*, the thing being
scanned for, was the half that got cut. Below `lg` they stack; the name gets
the full width and two lines. The listing page's availability chip had the same
shape of problem — 48 characters inside a rounded pill wrapped onto three lines
— and now renders a short date form below `sm`.

**S10 — The listing page showed its primary action twice.** Scrolled to the
swap panel on a phone, the page carried "Sign in to propose a swap" as a
full-width button in the panel *and* "Sign in to propose" in the fixed bar
200px below it: one action, two wordings, on screen together (Nielsen #2). The
bar is the fallback, so the bar yields — an `IntersectionObserver` on a
sentinel after the panel's CTA hides it while the real control is in view.

**S11 — `Enter` sent half-written messages.** In the swap thread, Enter sends
and Shift+Enter makes a new line, which is right on a keyboard and a trap on a
phone: a touch keyboard has no Shift+Enter, and its return key is how a person
starts a second line. The first paragraph break sent an unfinished message to
a stranger you are asking to swap homes with — a **slip** in Norman's sense
(right goal, automatic action misfires) on an action that cannot be undone.
Below `lg`, return does what its own keyboard says it does. The
"Shift + Enter" hint — instructions for a device the reader is not holding —
is hidden there too, and Send goes full width now that it is alone on its row.

**S12 — Vertical rhythm.** `py-20`/`py-24` and 40px titles are desktop
measurements. Below `lg` sections come down to `py-14`, gutters to 16px, page
titles one step, and the four How-it-Works cards lie down into icon-left rows
instead of four centred cards costing ~900px of scroll to say four words. The
home page went from **7104px to 5746px** — 19% shorter — with nothing removed.

**S13 — The last white surfaces.** Unchecked native checkboxes in the listing
form rendered as white squares: on a dark page the strongest contrast on the
screen was pointing at the options that are *off*. `color-scheme: dark` fixes
every native control at once.

#### How the scoping works

Every rule that could reach the desktop lives in **one block at the bottom of
[globals.css](../../app/globals.css)**, inside `@media (max-width: 1023.98px)`,
so the desktop rendering is provably untouched — nothing in there can reach it.
Everything else is Tailwind: a mobile-first base with an `lg:` (or `sm:`) escape
restoring the previous value exactly. Desktop was re-screenshotted at 1280 after
every step of the pass; the home page, Explore, the listing page, `/how-it-works`
and the marquee are pixel-unchanged.

Two things are **deliberately left as they were on desktop**, both mobile-scoped
here rather than fixed globally, because the brief was not to touch it:

1. **Leaflet's `#ddd` container background and its white zoom controls** are
   still there above `lg`. They are invisible on the home map at that width, but
   the controls are genuinely off-theme everywhere.
2. **`color-scheme: dark`** — the white native checkboxes are a desktop problem
   too. Moving both to `:root` is a one-line change when wanted.

#### What was checked

`tsc`, `eslint` over `app/`, `components/` and `lib/`, and `next build` are all
clean; `/` and `/how-it-works` still prerender static and the blog and listing
pages still SSG. No horizontal overflow at 320, 360, 390, 640, 768 or 820.
Verified on device: the drawer closes three ways, the When sheet's flexible
block is reachable, the filter sheet scrolls with a fixed footer, the mobile
action bar disappears when the panel's CTA is on screen, Leaflet's controls
measure 44px on mobile and 30px on desktop, and the reviews strip is a
scroll-snap container on mobile and an animating marquee on desktop.

### Two blog posts were making the reader parse code to get the point (2026-08-23)

Reported from the page: *"in some posts pieces of code just sit there instead of
being styled text."* Correct, and it was worse than a styling problem — in both
cases the **substance of the passage only existed inside the snippet**.

- `working-from-a-swap` is a post about three questions to ask a host before a
  long remote-work stay. All three existed only as string literals in a
  TypeScript array, and the two sentences qualifying them were `//` comments.
  A reader who does not read code got a heading promising three questions and
  then a `const` declaration.
- `trust-and-safety` is the post a cautious member reads to find out what
  ✓ Verified means. The exact rule — 90 days, a bio, a location, three reviews,
  4.5 average — appeared **only** in SQL. The prose above it said "long enough
  to have a record, and … that record be good", which is not a rule.

That is Nielsen #1 the wrong way round: the page was speaking the system's
language instead of the reader's, on the two paragraphs that mattered most.

**What changed.** The content came out of the code and became what it always
was — an ordered list of three checks plus a callout in one post, an unordered
list of five conditions in the other, both in the site's own type. The
TypeScript snippet is gone entirely: it was a travel post, and nothing in it
was about code. The SQL stays, because that post genuinely *is* about how the
badge is computed — but **collapsed**, behind one line reading *"Show the SQL
behind it"*, as evidence for a claim the prose has now already made.

**New: `collapsed` on the code block.** [cms-types.ts](../../lib/cms-types.ts)
gained `code.collapsed?: boolean`, [code-block.tsx](../../components/code-block.tsx)
renders a `<details>` when it is set, and the `/admin` block editor has a
**Display** dropdown (Collapsed / Always open). New code blocks default to
**collapsed**, deliberately: if a snippet is the only place a fact appears, the
fact is in the wrong place.

**Course requirement.** Overview §5 asks the blog to carry code snippets. It
still does — one, in `trust-and-safety` — but it is now a disclosure rather
than a wall. If a grader wants a code block open on the page, flipping that one
block's Display to *Always open* in `/admin` is the whole change.

#### Two defects found while in there

**The snippets were unreadable on a phone.** `<pre>` was `overflow-x: auto`,
which is right on a desktop and useless on touch, where no scrollbar is drawn.
Measured at 390px: the two blocks were **602px and 632px wide inside a 356px
box — 41% and 44% of every line off-screen**, with nothing saying the block
scrolled. Long lines now wrap, with a 2ch hanging indent below `sm` so a broken
line still reads as one line. Re-measured: `scrollWidth === clientWidth`, 0%
hidden. Desktop is untouched — both snippets already fitted exactly (718 =
718px), so there is nothing there to wrap, and the hanging indent is `sm`-scoped
so it cannot skew the unwrapped lines.

**Every apostrophe had been stripped from the seed.** The post title read
*"Working From Someone Else Kitchen Table"*, and the body carried *"we do not
inspect anyone documents"* and *"The Philosopher path"*. Repaired in
[cms-seed.json](../../lib/cms-seed.json) with the typographic apostrophe the
rest of the site uses. Worth knowing the title is also the `og:title` on a
shared link, so this was visible outside the site too.

#### Still open, and not touched here

**`public.blog_posts` is empty.** `supabase/cms.sql` was applied (the table
exists) but **`supabase/seed-cms.sql` was never run**, so `/blog` has been
serving the committed fallback in `lib/cms-seed.json` this whole time. It
renders identically, which is why nothing looked wrong — but the "content in a
remote headless CMS" requirement is currently satisfied by a file in the repo,
not by the database, and `/admin` shows no posts to edit. One paste of the
regenerated `supabase/seed-cms.sql` into the SQL editor fixes it; it upserts on
`slug`, so it is safe to run more than once. The same applies to
`site_content` for `/how-it-works` — check it before the demo.

`tsc`, `eslint` and `next build` clean; all five posts still prerender.

### The "Where" button stopped losing what you picked (2026-08-23)

Asked for as a pass over the search bar's **Where** control, on the home page
and on Explore. It was evaluated as a heuristic evaluation first (Lecture 4
method: findings ranked, each tied to a lecture), the scope was chosen from a
clickable menu — **all three packages**, and **widen to the country, then to the
world** for an empty result — and then built from the ranked list. `tsc`,
`eslint` over `app/`, `components/` and `lib/`, and `next build` are green; `/`
is still `○ (Static)`, all 14 listings and all 5 posts still `●`. Every number
below was read out of headless Chrome over CDP against the running production
build: **39 checks, zero console errors**.

#### The panel was good. Everything after the click was not.

The popover itself had been rebuilt on 2026-08-21 to search the whole `cities`
table, precisely so that typing a real place could never look like a broken
search. It worked. But a pick then threw away all of its own knowledge, and the
filter behind it could not read what the panel printed.

**S1 — Typing back what the panel had just shown you returned nothing.** The
filter was one concatenated blob — `name + location + country`, lowercased,
`includes(query)` — with no comma anywhere in it, while every row in the panel
reads *"Santorini, Greece"*. So the exact words the product offered were the
words it could not find (Nielsen #1, speak the user's language; #2, two things
that mean the same must behave the same). Matching is per token now
([lib/place-filter.ts](../../lib/place-filter.ts)), split on anything that is
neither a letter nor a number, so punctuation is punctuation. Measured on the
built page: `?q=Santorini, Greece` went **0 → 1**, and so did `Kyoto, Japan` and
`Camps Bay, South Africa`; `greece villa` now works for the same reason.

**S2 — The worst one: a pick died on the click.** `onPick` stored the bare city
name, so by the time the grid was empty nothing knew which *country* had been
asked about. That is why searching a city nobody hosts in — Lisbon, say — ended
on *"No homes match your filters"* under a faded mascot. The panel had just told
the reader Lisbon exists; the results said nothing about Lisbon at all. Textbook
Gulf of Evaluation (Lecture 3): the action was performed, the outcome was
visible, and it could not be interpreted.

A row now hands over a whole `PlaceFilter` — label, city, country, ISO code —
and all four survive the URL (`?q=&city=&country=&cc=`) and the hop from the
home page to Explore.

**S3 — It was not a combobox.** No `role`, no `aria-activedescendant`, no arrow
keys, and Enter skipped to "When" instead of taking the row under the cursor: a
keyboard user could read the suggestions and not choose one. Meanwhile
[suggest-input.tsx](../../components/suggest-input.tsx), the picker the listing
form uses for the same job, is a full combobox — one site, two destination
pickers, two behaviours (Nielsen #2; CRAP *repetition*). ↑ ↓ rove and wrap,
Home/End jump, Enter commits the highlight, Escape closes, `role="status"`
announces the count.

**S4 — A raw 🏠 on every row**, plus the country flag alone. Exactly the defect
[icons.tsx](../../components/icons.tsx) was written to fix on 2026-08-22
("Emoji are gone"), left behind on the site's *primary control* because the
panel predates the set. Two new marks (`LocateIcon`, `ClockIcon`) and the
existing `HomeIcon` / `GlobeIcon` replace it; the country badge keeps its sized,
tinted chip, which is what makes Windows' letters-instead-of-flags fallback read
as deliberate. Verified in the browser: **zero emoji code points in the list**.
The last raw 📍 on "Use my location" in
[home-map.tsx](../../components/home-map.tsx) went with it.

**S5 — The panel demanded a city.** Persona 3 (Mateo & Elena) plans a trip by
region, and Persona 1 goes wherever the work allows; neither arrives with an
address. Untyped, the panel now opens on four labelled groups rather than one
list — which is Hick's prescribed shape ("restructure into groups"), not a
longer list:

| Group | What it is |
|---|---|
| **Near me** | Geolocation → the *closest destination that actually has homes*, named with its distance |
| **Anywhere** | Clears the destination; every home on the site |
| **Recent** | The last five, in `localStorage`, with a Clear |
| **Whole country** | Every country with a home in it, with live counts — the first thing ever to read `houses.country_code` |

**Near me answers with a place, not a radius.** A radius can legitimately
contain nothing, and a shortcut that can come back empty reads as broken
(Nielsen #1). It also does **not** auto-advance to "When" the way a typed pick
does: the panel chose the city on the user's behalf, so it stays open long
enough to say which one and why. Measured from Zagreb: *"Closest to you: Split,
Croatia — about 259 km away."* A denied permission gets the same sentence the
map already uses, not silence (#6).

*Caught by the browser, not by reading:* Near me first searched only the eight
destinations the panel **displays**, so from Zagreb it answered Siena (461 km)
while Split (259 km) sat outside the display cap — a quietly wrong answer to
"nearest". The cap is a display decision, so it moved into the panel and the
data layer now hands over every destination.

#### The empty result, which was the point

[explore-view.tsx](../../components/explore-view.tsx) evaluates the same filter
at three place scopes — `exact`, `country`, `any` — and shows the narrowest one
that has anything, naming what it did:

1. **Same country.** *"No homes in Athens yet — nobody is offering a swap there
   right now, here is 1 home in Greece instead"*, with **Search all of Greece**
   as a real button.
2. **Everywhere.** *"No homes in Lisbon yet — nobody is offering a swap there or
   anywhere else in Portugal right now, here are all 14 that match the rest of
   your search."*
3. **Neither.** The destination was never the problem, so the original message
   comes back rather than a widening that would not help.

Three passes over fourteen homes costs nothing, and the alternative is a second
definition of what a filter means.

**Two things it is careful about.** *"Search all of Greece"* commits as an
ordinary filter — it lands in the URL, appears as a removable chip and the back
button undoes it — instead of being a view that only exists on this screen. And
the other exit clears **only the destination**, leaving the dates and price the
user also chose alone; a "Reset filters" button that silently dropped those
would be the same label-vs-behaviour fault this pass exists to remove
(Nielsen #2, #4).

**It also stopped blaming the wrong filter.** Search Santorini with a $100
budget and there genuinely *is* a home in Santorini — the price is the blocker.
A fourth check asks whether the place has homes at all, ignoring everything
else; if it does, the message is *"No homes in Santorini match your filters"*
and no widening is offered, because pointing at the destination would send the
reader to fix the one thing that was already right.

**And "Showing 0 of 14 homes" is now suppressed above the widening block** — a
status line contradicting a grid of six visible home cards. The live region
moves down to the block, so assistive tech still gets exactly one announcement.

#### Files

New: [lib/place-filter.ts](../../lib/place-filter.ts) (pure matcher + scopes;
`normalizePlaceQuery` moved here and is **re-exported** by
[lib/places.ts](../../lib/places.ts), so there is still one folding rule and the
map does not pull in the Supabase client to get it — the same split as
`house-types.ts` vs `houses.ts`) and
[lib/recent-places.ts](../../lib/recent-places.ts).
Touched: [search-fields.tsx](../../components/search-fields.tsx),
[home-search-context.tsx](../../components/home-search-context.tsx),
[explore-view.tsx](../../components/explore-view.tsx),
[home-map.tsx](../../components/home-map.tsx),
[map-section.tsx](../../components/map-section.tsx),
[home-hero-map.tsx](../../components/home-hero-map.tsx),
[icons.tsx](../../components/icons.tsx), [lib/houses.ts](../../lib/houses.ts)
(`House.countryCode`, a richer `Destination`, new `topCountries`),
[lib/house-types.ts](../../lib/house-types.ts),
[app/(home)/page.tsx](../../app/%28home%29/page.tsx),
[app/explore/page.tsx](../../app/explore/page.tsx).

**Two lint rules shaped the code, and they were worth it.** Reading
`localStorage` in an effect and reading it during render are both wrong (one is
a synchronous setState in an effect, the other a hydration mismatch), so recent
places is a **`useSyncExternalStore`** source with a referentially stable
snapshot — the call [back-to-results.tsx](../../components/back-to-results.tsx)
already made, for the same reason. The highlighted row is stored *with the list
it belongs to* and reset during render rather than in an effect, which is the
2026-08-18 `usePresence` fix applied again. **The project still has zero lint
errors.**

#### Verified, not eyeballed

`tsc` · `eslint` (`app/`, `components/`, `lib/`) · `next build` all clean, 34
routes, no route changed its rendering mode. Driven in headless Chrome against
the production build — **39 checks, zero console errors**: the panel is a
combobox with working ↑↓ / Home / End / Enter / Escape; four groups untyped and
three typed; no emoji and no nested buttons inside `role="option"`; a pick is
remembered *with its country and code*; the widening block names the place,
offers the country, renders the homes and suppresses the count line; "Search all
of Greece" reaches the URL; Near me resolves, explains and fails gracefully; the
sheet still docks to the bottom edge at 390×844 with no horizontal overflow; and
`/`, `/explore`, `/explore/[id]`, `/how-it-works` and `/blog` all render
unchanged at 1280.

#### Left open

- **`houses.country_code` is a shortcut, not yet an Explore pill.** The panel's
  "Whole country" rows set the filter, but there is still no Country pill beside
  Home type / Rating (item 11's sibling).
- **suggest-input.tsx is still the older shape** — a `<button>` inside
  `role="option"`, which makes every suggestion a tab stop and announces each row
  twice. The "Where" panel now does it the way the ARIA combobox pattern
  specifies. That file sits in the publish flow, so aligning it wants a pass that
  can re-verify a real listing being created.
- **A city name colliding across countries** resolves to whichever homes match
  the name, since `exact` scope tests the city without also demanding the
  country. Deliberate at 14 listings — requiring both would drop a home whose
  `country` is spelled differently from the gazetteer's ("USA" vs "United
  States") — but it is the thing to tighten first if the catalogue grows.
- **"Near me" is a one-shot lookup**, not a live position, and it is only as good
  as the destinations that carry coordinates.

### The photos stopped being borrowed — demo media moved into Supabase Storage (2026-08-23)

Asked as a question first: *are the house photos and the fake profiles' avatars
saved in Supabase Storage or not — and if not, move them there and make sure they
load.* The answer was **no** on both counts, and the two halves turned out to be
different problems.

**What was actually there.** The ten seeded homes carried forty
`images.unsplash.com` URLs — the originals from [schema.sql](../../supabase/schema.sql)
and [seed-images.sql](../../supabase/seed-images.sql), never touched since. The
`house-photos` bucket held **15 objects, every one of them the owner's own upload
from form testing** — the photos belonging to the four junk listings (104, 107,
110, 111). The `avatars` bucket was **completely empty**, and `profiles.avatar_url`
was NULL for all seven demo hosts, which is why every host rendered as an initials
circle.

So the site's listing photography was hotlinked to a third party that **has
already removed five of these exact photos once** — that is the entire reason
`IMAGE_REPLACEMENTS` exists in [lib/houses.ts](../../lib/houses.ts). A demo that
depends on someone else's CDN not deleting anything is a demo that can break on
the morning it is graded.

#### What was built — [scripts/seed-storage-media.mjs](../../scripts/seed-storage-media.mjs)

One committed, re-runnable command (`--dry-run` supported), following the same
rule as [build-places-seed.mjs](../../scripts/build-places-seed.mjs) and
[derive-mascot.mjs](../../scripts/derive-mascot.mjs): data in the database should
be reproducible from a command, not from a one-off nobody can repeat. It also
writes [supabase/seed-media.sql](../../supabase/seed-media.sql) — 17 idempotent
updates — as the readable record of the rows it changed.

- **It authenticates as the hosts, not as a service role.** The Storage policies
  key on an object path's **first folder segment** being `auth.uid()`. Rather
  than reach for a service-role key that is not in `.env.local` anyway, the
  script signs in as each demo host with the shared password from
  [seed-hosts.mjs](../../supabase/seed-hosts.mjs) and uploads their own media as
  them. The paths, the ownership and the RLS story therefore come out **identical
  to a real member uploading through the app** — including the useful
  consequence that unlisting a seeded home can now actually delete its files,
  because `storagePathFromUrl` finally recognises them.
- **The photo list is written down, not read back out of the database.** The
  script carries `HOUSE_PHOTOS`, the same forty ids as the `pool` CTE in
  `seed-images.sql` with that file's dead-photo replacements already applied.
  This was **fixed after the first version got it wrong**: sourcing from
  `houses.images` made the script self-referential the moment it had run once —
  the rows now hold Storage URLs, so a second run re-downloaded the project's own
  copies rather than the originals, and would have failed outright if the bucket
  were ever emptied. A fixed manifest is what makes "safe to re-run" true rather
  than accidentally true. (It produced identical bytes either way, because a
  stored file *is* the Unsplash file verbatim — which is why the mistake was
  invisible in the output and had to be reasoned about.) Only `host_id` is still
  read live, since which host owns which home is the one genuinely dynamic fact.
- **Five homes had a hero that disagreed with itself.** `houses.image` (the card
  hero) and `houses.images[0]` (the gallery hero) differed on half the seeded
  homes, because `image` still held a URL Unsplash had removed and only
  `images[0]` carried the replacement — the app hid it by running both through
  `fixImage()` at render time. Both columns are now written from one uploaded
  file, so the data agrees with the screen instead of relying on a runtime repair.
- **Quality is a pure relocation, deliberately.** The download asks Unsplash for
  `w=2400&q=80` — byte for byte the same `UNSPLASH_MASTER` that `highRes()` in
  `lib/houses.ts` was already requesting — so next/image resizes the same master
  down per device and nothing about sharpness changes. Measured after the move:
  the 1920px hero returns **259 KB of AVIF at q90**, against the 265 KB recorded
  on 2026-08-17 when it was served from Unsplash.
- **`fm=jpg`, not `auto=format`.** The bucket accepts jpeg/png/webp only, and
  `auto` lets the CDN choose from an `Accept` header a script does not control.
  Every download is also checked for the `FF D8` JPEG magic before it is
  uploaded, so a CDN error page can never be stored as though it were a photo —
  which would fail silently and surface only as a broken image on the site.
- **Deterministic paths** (`<uid>/seed/house-<id>-<n>.jpg`, `<uid>/host-avatar.jpg`)
  plus `x-upsert`, so a second run overwrites rather than accumulating orphans.
  The app's own uploader uses random names ([lib/storage.ts](../../lib/storage.ts))
  because it must never clobber a photo a member still wants; a seed has exactly
  one avatar and wants precisely the opposite.

#### The avatars were not a move, they were a decision

There was nothing to relocate — no seeded host had ever had a picture. Seven
Unsplash portraits were chosen against the personas in
[Overview.md §3](./Overview.md) and **looked at** at the size the avatar actually
renders, using `fit=facearea&facepad=2.6` so Unsplash's own face detection centres
the crop rather than leaving a chin inside `components/avatar.tsx`'s circle. Alex
Chen, Sarah Miller and Mateo & Elena Ruiz are matched to Personas 1, 2 and 3.

**This closes two things this file had recorded as blocked:**

1. The reviews marquee's *"avatars are initials, not photos — none of the seeded
   reviewers has an `avatar_url`"* (2026-08-21). `Avatar` already preferred a real
   photo when one existed, so it fixed itself: **7 host photos now render in the
   marquee**.
2. The ✓ Verified rule's *"Not required: a profile photo … it is out because no
   seeded host has one, so requiring it today would mean nobody is verified"*
   (2026-08-22). That reason is gone. Adding the line back to
   `is_verified_host()` in [trust.sql](../../supabase/trust.sql) is now a one-line
   change — **deliberately not made here**, since it changes who wears a badge,
   and that is a product call rather than a side effect of moving files.

#### Verified, not eyeballed

- **47 objects uploaded, 27.8 MB** — 7 avatars, 40 listing photos. The buckets now
  hold 7 (`avatars`) and 55 (`house-photos`, the 15 pre-existing test uploads
  included). Largest file 1.4 MB, well under the bucket's 10 MB limit.
- **Database:** 0 of 10 homes still on Unsplash, 0 of 40 gallery URLs still on
  Unsplash, 7 of 7 profiles carrying an `avatar_url`, and `image === images[0]`
  on all ten.
- **All 57 public URLs fetched anonymously with no `apikey` header** — a public
  bucket has to serve a plain browser — and every one returned HTTP 200 with the
  JPEG magic bytes. **0 failures, 36 MB served.**
- **Through the app**, against the running dev server: `/`, `/explore`,
  `/explore/1` and `/explore/6` render **zero** `images.unsplash.com` sources, and
  every `next/image` src points at `/storage/v1/object/public/`. 66 sampled
  optimizer requests across those four routes returned `image/avif`, **0
  failures** — so `next.config.ts`'s `**.supabase.co` remote pattern really does
  cover these paths, and `highRes()` really does pass a non-Unsplash URL through
  untouched.
- **Screenshotted** at 1280px: the Explore grid, and `/explore/1` showing Sofia
  Rossi's actual portrait in the "Hosted by" card where an initials circle used to
  be.

#### Found while verifying, and NOT fixed (pre-existing, not this pass)

The working tree does not currently compile, and neither fault is related to this
change or to any file it touches:

1. **`components/globe.tsx:416`** — `ctx.strokeStyle = accent`, where the
   surrounding code uses `palette.accent`. `tsc` reports
   `TS2304: Cannot find name 'accent'`. This is an uncommitted edit (`git status`
   shows the file as modified) and it is worse than a type error: the line sits in
   the swap-arc draw path, so it throws a `ReferenceError` the first time an arc
   is drawn, a few seconds into the home page.
2. **`components/theme-toggle.tsx:66`** — an untracked new file that trips
   `react-hooks/set-state-in-effect`, which is the one lint rule this project has
   twice gone out of its way to satisfy (2026-08-18, 2026-08-23).

Together they mean **`next build` fails and the "zero lint errors" claim in §1 is
currently false**, so verification for this pass was done against `next dev`
rather than a production build. Whoever left that work in progress should finish
it before the demo.

#### Left open

- **Blog images are still hotlinked.** The covers and in-post images in
  [lib/cms-seed.json](../../lib/cms-seed.json) (and therefore `seed-cms.sql`) are
  ~15 more `images.unsplash.com` URLs — out of scope for this pass, and moot for a
  second reason below, but they are the remaining third-party dependency on the
  site. The script's shape would extend to them cheaply. The `/admin` block
  editor's image fields are still URL boxes rather than uploaders, which is the
  related gap recorded on 2026-08-22.
- **`blog_posts` and `site_content` are still empty** (0 rows) — unchanged from
  the 2026-08-23 note above. `supabase/seed-cms.sql` has never been run, so
  `/blog` and `/how-it-works` are still serving the committed JSON fallback and
  `/admin` has nothing to edit. Also **nobody is an admin yet**: `profiles.role`
  is `member` for all 8 accounts, the owner's included, so `/admin` is currently
  unreachable by anyone. Both are one SQL run each and both want doing before the
  demo.
- **`schema.sql` / `seed-images.sql` still carry Unsplash URLs, on purpose.** A
  fresh project has empty buckets and needs something to bootstrap from; the
  script is the second step, and a note at the top of `seed-images.sql` now says
  so.
- **The four junk test rows are still there** (ids 104, 107, 110, 111), still 4 of
  the 14 homes on Explore, still one `delete` away — unchanged from item 20, and
  still a deliberate data call.

### Light mode (2026-08-24)

The site had one theme. It now has two, and the dark one is untouched — every
number below was read out of headless Chrome over CDP against the running
production build (**42 automated checks, zero console errors**), not eyeballed.
`tsc`, `eslint` over `app/`, `components/`, `lib/` and `scripts/`, and
`next build` are green; all 34 routes kept their rendering mode, `/` is still
`○ (Static)` and the 14 listings and 5 posts are still `●`.

This closes item 16 in "Polish still outstanding" and the nice-to-have in §7.
Both of those called it "trivial once tokens exist — just swap the `:root`
variable block". The variable block took about twenty minutes. The rest of this
section is the other four fifths of the job, which is the part worth reading.

#### The palette

A second block in [globals.css](../../app/globals.css), selected by
`data-theme="light"` on `<html>`. Every token keeps its ROLE — `bg` is still the
60%, `surface` the 30%, `brand`/`accent` the 10% — and the palette stays the
blue monochrome Lecture 6 recommends: the light blues are shades of the same
hue, not new hues, which is what keeps the brand recognisable across the switch.

| Token | Dark | Light | Note |
|---|---|---|---|
| `bg` | `#1A2030` | `#EAEFF7` | soft blue-tinted off-white, deliberately **not** `#fff` |
| `surface` | `#232B3E` | `#FFFFFF` | white lifts off the page |
| `surface-2` | `#1E2536` | `#DFE6F2` | one step **down** from the page, mirroring the dark ramp |
| `border` | `#33405A` | `#CCD7E8` | |
| `surface-raised` / `border-raised` | `#333F5E` / `#4C5B7E` | `#FFFFFF` / `#A9BAD6` | see below |
| `fg` / `muted` | `#EEF2F9` / `#A9B4C7` | `#131C33` / `#55637F` | |
| `brand` / `brand-hover` / `accent` | `#3B82F6` / `#2F6FE0` / `#63B3ED` | `#2158D8` / `#1A49B8` / `#1668C9` | |
| `success` / `danger` | `#34C77B` / `#F05252` | `#12703B` / `#C62020` | |
| `selected` / `doorlight` | `#F59E0B` / `#FFD9A0` | `#D97706` / `#FDE3B0` | |

**The page does not go to pure white**, and that is the one decision the whole
ramp hangs off. A `#fff` page behind `#fff` cards has no ramp left to spend on
elevation, and `surface-raised` exists precisely because the site's primary
control has to read as sitting ON the page rather than in it (the 2026-08-21
finding S3/S5). Off-white page, white cards is also what Airbnb and Booking do,
so it costs nothing in external consistency (Nielsen #2).

**Contrast measured on the painted page**, not calculated from the hex and
hoped for: fg **14.65:1**, muted **5.23:1**, accent **4.71:1**, white on the
primary button **6.08:1**. The dark theme's own muted measures 4.99:1, so both
themes are held to one floor rather than the new one being waved through. The
blues *had* to move — `#3b82f6` as text on `#eaeff7` is 3.1:1, and the eyebrows,
links and step numbers drawn in `accent` are text.

**One honest asymmetry.** In the dark theme `surface-raised` is a lighter slate
than `surface`, so opening a search segment visibly lifts the chip and drops the
bar. In the light theme both are white, because white is already the top of the
ramp — there is nowhere lighter to go. The lift is carried by the shadow, a
stronger hairline, the brand ring and the dimming of the neighbouring segments
instead, which is the light-mode idiom rather than a workaround. Verified in the
browser: the open state still reads.

#### Three things a variable block cannot do

**1. Depth is not a colour.** Twenty-one `shadow-black/NN` classes and four
`bg-white/[0.0x]` hover tints were tuned against a near-black page. The same
black at the same alpha is a soft lift on a dark page and a bruise on a white
one, and a hover that *adds* light is wrong on a light surface. Both became
tokens — `--color-shade` and `--color-tint` — so the retune is two values rather
than twenty-five edits. `shade` is already translucent in the light theme
(`rgb(15 23 42 / 0.55)`) and Tailwind's `/NN` modifier multiplies into it, so
`shadow-shade/50` lands at alpha 0.28 and `shadow-shade/20` at 0.11. Read back
out of the browser: dark computes `oklab(0 0 0 / 0.2)` — pure black, identical
to what `shadow-black/20` produced before — and light computes
`oklab(0.207678 … / 0.109804)`.

**2. Two things are painted by JavaScript, not CSS.** The Leaflet basemap and
the hero globe cannot follow a custom property on their own.
- New [map-basemap.ts](../../components/map-basemap.ts) is now the one place
  that decides what a map is made of, shared by the home, Explore and listing
  maps. CARTO publishes Dark Matter and Positron as the same cartography at two
  lightnesses, so the swap is a URL — same zoom levels, same labels, same
  attribution, no second provider to explain. It listens for a theme event and
  calls `setUrl`, which swaps the template on the existing layer rather than
  replacing it: a fresh layer would drop the tile cache and flash the container
  through while it re-fetched. Before this the URL was copy-pasted in three
  files; with a second theme that would have been six.
- [globe.tsx](../../components/globe.tsx) reads its two decoration greys and the
  accent from CSS at mount and again on a theme change, and rebuilds its mark
  sprites — they are pre-rendered once per size with the land colour baked in,
  so re-reading without rebuilding would recolour the limb and the pins and
  leave every continent in the other theme's grey.

**3. Baked-in artwork ships twice.** The hero mascot's three tones are burnt
into a PNG by [derive-mascot.mjs](../../scripts/derive-mascot.mjs). A CSS filter
was rejected for the same reason that script exists at all — a filter shifts
both tones together and could never keep the door reading as the prominent one.
The script now writes a second ramp, `public/mascot-light.png`, and CSS hides
the wrong copy.

The two ramps are **not** mirror images. On a dark page prominence is *lighter*;
on a pale one it is *darker*. So the body/door ORDER flips while their roles do
not, and the knob follows the door because it has to read against the door and
not against the page. Measured on the rendered hero, the two themes come out
almost exactly symmetric: the body sits at **1.20:1** against its own background
in both, and the door at 1.64:1 (dark) / 1.35:1 (light). A whisper either way,
which is what the 2026-08-21 S2 finding requires and what the user asked for in
as many words.

> **The source artwork is gone.** `swapdoor homepage.png` was filed as loose
> clutter in item 18 and has since left the repo root, so the script now falls
> back to re-toning `public/mascot.png` — the dark file it produced itself. That
> needs a *second* set of luminance windows, because the tone ORDER differs
> between the two sources (`knob 11 < door 34 < body 51` in the original;
> `knob 50 < body 74 < door 135` in the derived file, since making the door the
> lighter element is exactly what the dark ramp did). Reading one with the
> other's windows silently paints the door as body. Put the original back at
> that path and the full two-ramp run returns with no other change. Verified by
> counting tones in both files: 74.0% body / 25.6% door / 0.3% knob in the light
> file against 73.6 / 25.5 / 0.3 in the dark one.

#### `--color-door`, and why `accent` could not do this job

The logo's door panel was drawn in `--color-accent`. That token is also the
eyebrows, the links and the step numbers, i.e. **text**, and text has a contrast
floor against the page — so on the light theme `accent` went dark, the jamb
(`brand`) and the panel converged, and the nav mark rendered as a solid blue
square with a dot in it. The mascot glyph on `/sign-in`, the 404 and the footer
went the same way.

They are two jobs, and they only look like one while there is a single theme.
`--color-door` is now its own token, drawn only by `.door-mark__panel` and
`MASCOT_DOOR`, and it is measured against its own frame rather than against the
page: `#7CB0F2` on the `#2158D8` jamb is the same figure/ground relationship the
dark theme has, from the other end. Its dark value is `#63B3ED` — the value it
already had — so the dark rendering is byte-identical.

#### The bug that only a screenshot found

The first version of `<ThemeToggle>` read the stored theme in a lazy `useState`
initialiser and silenced the resulting hydration mismatch with
`suppressHydrationWarning`. Every assertion passed. The page went light, and the
control sat there with **Dark** filled in.

`suppressHydrationWarning` does not mean "ignore this difference" — it means
*the DOM wins*. That is exactly right for the inline-script pattern the Next
docs describe, where a script has already corrected the DOM. Here nothing had
corrected the toggle's DOM, so React kept the server's stale markup and threw
away the correct client render. `aria-pressed` was right the whole time, which
is why the automated check passed and only a screenshot caught it.

Two changes, and both are worth keeping:
- The state is a **`useSyncExternalStore`** source ([lib/theme.ts](../../lib/theme.ts)) —
  it hydrates with the server snapshot so the markup matches, then re-renders
  with the real value. It is the same call [back-to-results.tsx](../../components/back-to-results.tsx)
  and [lib/recent-places.ts](../../lib/recent-places.ts) already make, and it
  avoids the `set-state-in-effect` lint error this project has paid for twice.
  It also subscribes to `storage`, so two open tabs follow each other.
- **Which segment looks selected is decided by CSS**, off `data-theme` — the
  same attribute the palette hangs off. React cannot do it: it correctly renders
  the *server* snapshot during hydration, so for one tick it believes Dark is
  selected. On the page that is invisible (CSS painted it light before React
  existed); on this one control it is the entire message. `aria-pressed` stays
  React's, since an attribute cannot be painted.

**And a second bug underneath it.** The re-assertion effect was keyed on that
same state — `useLayoutEffect(() => syncThemeAttribute(theme), [theme])` — so on
the hydration render it wrote the server's `"dark"` back over the bootstrap's
`"light"`, flipping the whole page dark for the rest of the tick and handing
that window to anything reading the theme in its own mount effect. The globe
caught it every time and painted the dark continents onto a white page; the
basemap caught it about half the time, which is exactly the kind of flake that
survives a test suite. Found by sampling the canvas: it was painting
`#c6d0e0` — the dark land — while `getComputedStyle` reported `#4e5b78`. The
effect now reads storage and runs on mount only.

#### Everything else that was measured

- **The globe was a whole step too pale.** First pass put light land at
  `#7c8aa8`; sampled off the rendered canvas its typical mark was **1.33:1**
  against the page where the dark theme's is 2.96:1 — less than half the
  presence, on the decoration the 2026-08-19 "round 2" pass exists to make
  legible. Retuned to `#4e5b78` / `#7c89a6`, which brings ink coverage to
  **15.1%** of the globe's box against dark's 14.8% and the typical mark to
  1.94:1. The limb ring matches dark's 3.03:1 exactly.
- **The nav drop-down's click-away backdrop** was `bg-black/20`, chosen against
  a near-black page where it is barely there. On a white one the same value dims
  the whole site and makes an ordinary drop-down look like a dialog. It is
  `bg-shade/20` now (~11% in light). The genuinely modal backdrops — the drawer,
  the mobile sheets, the lightbox — stay `black`, because a modal *should*
  darken the page, in both themes.
- **`color-scheme` moved to `:root`.** It used to sit in the mobile block scoped
  to `max-width: 1023.98px`, with a note calling the move "a one-line change
  when wanted". A second theme is when: the unchecked checkbox that prompted it
  is a white square on a dark page and, left there, a dark square on a white one.
- **The drawer's Appearance row needed `mb-5`**: signed out, what follows it is
  `<MobileAccount>`'s bare Sign In button, which carries no top margin because
  until now nothing rendered above it but a button that did.

#### Where the control is, and why

One `<ThemeToggle>`, three placements, so the site cannot grow two ways of doing
the same thing (CRAP repetition):

| Surface | Why there |
|---|---|
| **Footer bottom bar** | Its home. Every route, both auth states — so a signed-out visitor, which is most of them, can find it. Its own group at the far end rather than a fourth item in the link row, because it is not a destination (proximity, Lecture 5) |
| **Account menu** | Between "my stuff" and the exit, where a signed-in member looks for a setting. Deliberately not a `data-menu-item`: the arrow keys rove between destinations, and a two-button control inside that order would make ArrowDown mean two things |
| **Mobile drawer** | The footer is several screens away on a phone and the account copy only exists when signed in. Above the account block, because sign out is the exit and stays last (Nielsen #4) |

**It is a two-segment control, not a switch or a lone moon icon.** A single glyph
cannot say whether it reports the state you are IN or the state it takes you TO,
and half the web picks each convention — that is recall, on a control whose whole
job is a preference (#7). Both options are shown with the current one filled, so
the setting is read rather than deduced (#1). It is also the shape the site
already has for a binary choice (Explore's List/Map toggle, the sign-in tabs), and
each segment carries a mark **and** its word, so selection never rests on colour
alone (Lecture 6, guideline 4).

#### The default is still dark

`<html data-theme="dark">` ships in the prerendered HTML, and an inline script in
`<head>` — the pattern in
`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md` —
rewrites it to `light` only if the visitor has chosen that. It runs during HTML
parsing, before the first paint and long before React, which is the whole reason
it is a script and not an effect: a `useLayoutEffect` runs after hydration, so on
a slow connection the visitor would watch a full dark page repaint to light.

**`prefers-color-scheme` is deliberately not honoured.** Dark is what this
project has been designed and screenshotted against since the palette was
chosen, and a mentor opening it on a light-mode OS should see the design the
report describes. Making the OS the default is one line in `lib/theme.ts`
(`storedTheme()` falling back to `matchMedia("(prefers-color-scheme: light)")`
instead of `DEFAULT_THEME`) if that is ever wanted.

The site also still works with JavaScript off: the prerendered HTML is complete
and coherent in the dark theme, and nothing about the switch is required to read
the page.

#### Verified, not eyeballed

42 checks over the running production build. A cold visit is dark with nothing
in storage; the switch moves the attribute, the storage, `color-scheme`, every
token, the mascot, the globe greys and the shadow ink; the choice survives a
reload and a route change; the contrast figures above; both mascot files are in
the DOM with exactly one displayed; the map serves 18 light tiles after the
switch and 18 dark ones after switching back; the prerendered HTML still carries
`data-theme="dark"` and the bootstrap ships in the head; and a whole section
asserts the dark theme is unchanged where the pass touched it — `shade` still
`#000`, `tint` still `#fff`, the door panel still painting `rgb(99, 179, 237)`,
the rest of the dark ramp byte-identical, and every painted `shadow-shade` shadow
still pure black. Screenshotted at 1280 and 390 across the home page, Explore, a
listing, How-it-Works, the blog, a post, sign-in, the footer, the mobile drawer,
the account menu, the sort dropdown and the Where popover.

#### Left open

- **`prefers-color-scheme`**, above — a decision, not an oversight.
- **No transition on the swap.** The repaint is instant. A cross-fade would need
  a rule broad enough to catch every element, which fights the hover transitions
  already on most of them.
- **The mascot ships two PNGs (~70KB each)** and the browser fetches both, since
  the hidden copy is `display: none` rather than absent. Choosing in React would
  mean either a client component in the middle of a statically prerendered fold
  or a visible change of artwork one frame after paint; two files is the cheaper
  problem. It is `lg`-only and decorative either way.
- **Leaflet's popups** are its own white bubbles in both themes. They were
  already light on the dark site, so this pass did not make them worse — but
  they are the last surface that does not follow the tokens.
