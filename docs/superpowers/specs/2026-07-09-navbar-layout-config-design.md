# B2B Portal — Per-brand Navbar / Layout Configuration

**Date:** 2026-07-09
**Project:** `vilmers-b2b-portal`
**Builds on:** `2026-07-08-theming-and-feature-config-design.md` (theming, committed as `feat(b2b-portal): per-brand theming and centralized feature config`)
**Scope:** Frontend-only. Extends the theme preset with a `layout` block.
**Status:** Approved design, spec for review before implementation.

## Goal

Let each brand configure the navbar/header layout via its theme preset, so branded
deployments can differ in: whether the top bar shows, where the language switcher lives,
where the logo sits, and how tall the nav is (driven by logo size).

## Decisions (locked)

| Decision | Choice |
|---|---|
| Config home | **Theme preset `layout` block** (`src/themes/<brand>.ts`), selected by `NEXT_PUBLIC_THEME` |
| Nav height propagation | **One shared `--nav-height`** threaded through every dependent surface |
| Mobile language switcher | **Stays in the drawer**; navbar switcher is desktop-only |
| Config contradiction handling | **Fail the build** (same as unknown-theme throw) |

## The `layout` block (added to `Theme`)

```ts
// src/themes/types.ts
export interface ThemeLayout {
  topBar:           { show: boolean }                    // Vilmers: true
  backButton:       { show: boolean }                    // Vilmers: true; Dominari: false
  searchButton:     { show: boolean }                    // Vilmers: true; Dominari: true (knob available)
  homepageHeader:   { transparent: boolean }             // Vilmers: true (transparent+animated); Dominari: false (solid)
  newsletter:       { show: boolean }                    // content knob: Vilmers/Dominari true (knob available). AND-ed with features.newsletter
  languageSwitcher: { placement: "top-bar" | "navbar" }  // Vilmers: "top-bar"
  logo: {
    position:     "left" | "center"   // Vilmers: "center"
    height:       number              // px, desktop — drives nav height. Vilmers: 24
    heightMobile?: number             // px, optional; defaults to `height`. Vilmers: 20
    paddingY:     number              // px — navHeight = height + 2*paddingY. Vilmers: 24 -> 72
  }
}
// Theme gains:  layout: ThemeLayout
```

Vilmers values reproduce today exactly (no-op). `dominari.ts` (currently a dead, broken
copy — literally `export const vilmers`, unregistered) is repaired into a real second
theme and given DIFFERENT layout values to serve as the verification vehicle.

## Mechanism

Two channels, split by data type (mirrors the existing colors-vs-enums split):

- **Pixels → raw CSS variables.** A NEW branch in `themeToCssVars` (`src/themes/index.ts`)
  emits raw px values — NOT run through `toChannels`/the `rgb(var()/alpha)` wrapper used
  for colors:
  - `--nav-logo-height: 24px`
  - `--nav-logo-height-mobile: 20px`
  - `--nav-height: 72px`  (computed = `height + 2*paddingY`)
  - `--top-bar-height: 32px`  (the desktop top-bar height; `0px` when `topBar.show` is false)
  Consumed via Tailwind arbitrary values: `h-[var(--nav-height)]` — no `tailwind.config.js`
  change needed.
- **Enums/booleans → `import { activeTheme }`.** The client nav reads
  `activeTheme.layout.topBar.show`, `.languageSwitcher.placement`, `.logo.position` — a
  build-time constant, same model as the existing `features` import. (`themes/index.ts`
  keys off `NEXT_PUBLIC_THEME` and has no server-only guard, so client import is fine.)

## The four knobs

### 1. Top bar show/hide — `layout.topBar.show`
- `Nav` renders `<TopBar/>` only when `topBar.show` is true.
- `--top-bar-height` emitted as `0px` when false (so the search overlay offset collapses).
- The top bar's only live content today is the language switcher; hiding it is only
  sensible when the switcher is placed in the navbar (see guard).

### 2. Language switcher placement — `layout.languageSwitcher.placement`
- `"top-bar"` (today): switcher renders in `TopBar` (desktop-only, as now).
- `"navbar"`: switcher renders in the nav's RIGHT cluster, `hidden small:flex` (desktop
  only). **Mobile always keeps the drawer copy** in `mobile-menu` (unchanged).
- **Themed variant required:** `CompactLanguageSwitcher` is currently hardcoded
  `bg-white`/gray. In the navbar it must use `text-nav-foreground` and respect the
  transparent-homepage state (white text + the inverted treatment), or it looks wrong on
  the homepage. Add a `variant`/`transparent` prop (or a themed wrapper) — do not restyle
  the top-bar usage's appearance.
- **Navbar-type right-cluster refinements (only when `placement === "navbar"`; Vilmers
  unchanged):**
  - **Order:** Search moves to AFTER the account/login block (and after cart), immediately
    before the switcher. Logged out → `Login, Search, EN`; logged in → `Cart, Account,
    Search, EN`. (Vilmers keeps Search first.)
  - **Uniform label size:** the account/Login link and the switcher (EN) trigger match the
    nav menu links' font size, so Store/Inspiration/Contact/Login/EN are visually uniform.
    Nav links are the reference (unchanged); only Login + switcher are brought to that size.

### 3. Logo position — `layout.logo.position`
- `"center"` (today): the equal-flex trick — left and right clusters both `flex-1 basis-0`,
  logo cluster no grow.
- `"left"`: logo moves to the START of the left cluster (before the desktop nav menu);
  the equal-flex balance is dropped so the logo sits left and the right cluster stays
  right-aligned. Mobile: `[hamburger][logo] ... [right cluster]`.
- Implemented by conditional layout in `nav/index.tsx` (both arrangements coded; enum picks).
- **Menu composition in logo-left (Dominari):** the nav menu is trimmed to just the `store`
  item (Inspiration + Contact Us dropped, filtered by stable `id` — not translated label —
  from `navigation.ts`), and Store is rendered on the RIGHT, leading the right group:
  `Store · Login · Search · EN`. Applied to both desktop and the mobile drawer. Center
  (Vilmers) keeps the full menu (Store, Inspiration, Contact Us) in the left cluster —
  strict no-op. (Tied to `logo.position === "left"`.)

### 4. Logo height + padding drive nav height
- `--nav-height = height + 2*paddingY` (computed at emit time in `themeToCssVars`).
- Nav header: `h-[72px]` -> `h-[var(--nav-height)]`.
- Logo `<img>`: `h-5 small:h-6` -> `h-[var(--nav-logo-height-mobile)] small:h-[var(--nav-logo-height)]`.
- Logo remains vertically centered by existing flex `items-center`; `paddingY` is a
  nav-height INPUT, not an applied padding.

### 5b. Newsletter block — `layout.newsletter.show` (content knob, not navbar)
- Per-brand show/hide for the `NewsletterBlock` (`src/modules/home/components/newsletter-block/index.tsx`),
  rendered on home + category pages. The component SELF-GATES: `if (!activeTheme.layout.newsletter.show) return null`
  at the top — so both render sites respect it without editing them (avoids touching the
  CMS-dirty `page.tsx`).
- Works ALONGSIDE the existing `features.newsletter` (`NEXT_PUBLIC_NEWSLETTER_ENABLED`, default off)
  flag: effective visibility = `features.newsletter && layout.newsletter.show`.
- Default `true` for both brands → strict no-op (the flag still governs). Set a brand's to
  `false` to force-hide the newsletter for that brand regardless of the flag.

### 5. Homepage header transparency — `layout.homepageHeader.transparent`
- `true` (Vilmers, current): on the homepage, the header starts transparent over the hero
  and animates to solid on scroll (`isTransparent = isHomePage && !isScrolled`, with the
  `transition-[background-color]` fade and the inverted logo).
- `false` (Dominari): the header is ALWAYS solid — no transparency, no fade, no logo
  inversion. Gate: `isTransparent = homepageHeader.transparent && isHomePage && !isScrolled`
  (so it's always false); optionally drop the transition classes and skip the scroll
  listener when disabled.
- **Hero interaction (must handle):** the homepage hero's `-mt-[var(--nav-height)]` /
  `pt-[var(--nav-height)]` overlap (hero slides UNDER the transparent nav) applies ONLY when
  `transparent` is true. When `false`, the solid nav would hide the top of the hero, so the
  overlap is removed and the hero flows normally below the solid nav. `hero/index.tsx` reads
  `activeTheme.layout.homepageHeader.transparent` (build-time constant) to branch this.

## Nav-height threading (every hardcoded 72/32 site)

Nav height is TWO quantities — logo-driven nav height, and top-bar height (32 desktop / 0
mobile / 0 when hidden). Each site gets the right combination:

| Site | File | Today | Becomes |
|---|---|---|---|
| Nav header height | `nav/index.tsx` | `h-[72px]` | `h-[var(--nav-height)]` |
| Mobile drawer offset/height | `mobile-menu/index.tsx` | `top: 72px`, `height: calc(100vh - 72px)` | `var(--nav-height)` (top bar absent on mobile) |
| Homepage hero overlap | `home/.../hero/index.tsx` | `-mt-[72px]`, `pt-[72px]` | `-mt-[var(--nav-height)]`, `pt-[var(--nav-height)]` — **implementer verifies in browser** whether the hero overlaps nav-only (expected) or nav+topbar; adjust if it also clears the top bar |
| Search overlay | `search/.../search-modal/index.tsx` | `h-[72px]`, `top-0 small:top-[32px]` | **OVERLAY the nav header band** (as today — search replaces the nav area, it does NOT sit below it): `top-0 small:top-[var(--top-bar-height)]`; height `h-[var(--nav-height)]`. When the top bar is hidden, `--top-bar-height` is `0`, so it overlays from the very top. Reconcile the stale "36px" comment — actual value is 32. |

## Guards & no-op fidelity

- **Build-time guard (fail fast):** if `languageSwitcher.placement === "top-bar"` AND
  `topBar.show === false` -> throw a clear error at theme resolution (same place/style as
  the unknown-`NEXT_PUBLIC_THEME` throw). Do NOT silently drop or auto-relocate the switcher.
- **No-op fidelity:** logo is responsive today (20px mobile / 24px desktop). `heightMobile`
  preserves that for Vilmers (20/24) so the refactor is a true no-op. **Verify by measuring
  the rendered mobile logo height (must stay 20px)** — do not assume.

## Files touched (~9)

**Modified:**
- `src/themes/types.ts` — add `ThemeLayout` + `layout` on `Theme`.
- `src/themes/index.ts` — raw-px branch in `themeToCssVars`; the fail-fast guard.
- `src/themes/vilmers.ts` — `layout` block with current values.
- `src/themes/dominari.ts` — repair into a valid registered second theme with DISTINCT
  layout values (verification vehicle) + register in the `themes` registry in `index.ts`.
- `src/modules/layout/templates/nav/index.tsx` — central: gate `<TopBar/>`, logo
  position, logo-height vars, nav-height var, navbar-right switcher.
- `src/modules/layout/components/top-bar/index.tsx` — switcher rendered only when
  placement is `"top-bar"`.
- `src/modules/layout/components/mobile-menu/index.tsx` — `--nav-height` for offsets.
- `src/modules/home/components/hero/index.tsx` — `--nav-height` for overlap.
- `src/modules/search/components/search-modal/index.tsx` — `--nav-height` + `--top-bar-height`.
- `src/lib/i18n/components/language-switcher.tsx` — themed/transparent-aware variant for
  the navbar placement.

## Verification

1. `pnpm build` exit 0.
2. **Vilmers no-op:** render home/category/product with default `vilmers`; nav, top bar,
   logo (measure mobile logo = 20px), search overlay, hero overlap identical to pre-change.
3. **Knobs proven with a second theme:** set `NEXT_PUBLIC_THEME=dominari` with logo LEFT,
   top bar OFF, switcher in NAVBAR, and a taller logo (e.g. 40px -> nav 88px). Browser-check:
   nav is taller and consistent, logo left-aligned, no top bar, switcher on the navbar right
   (desktop) themed correctly incl. homepage-transparent state, mobile switcher still in the
   drawer, homepage hero overlap correct at the new height, search overlay covers the nav
   band from the very top (no 32px top-bar offset, since the top bar is hidden). Console clean.
4. **Guard:** a throwaway theme with `placement:"top-bar"` + `topBar.show:false` fails the
   build with a clear message.

## Out of scope

- Configurable top-bar CONTENT (it stays switcher-only / empty).
- Runtime (non-build) switching of layout.
- Per-deploy env override of layout (stays per-brand in the preset).
- Restyling the mobile drawer switcher.
