# Newsletter Signup Block — Design

**Date:** 2026-06-22
**Project:** vilmers-b2b-portal (Next.js App Router)
**Status:** Approved design, pending implementation plan

## Goal

Add a "Newsletter signup" block that appears on the **home page** and on **category
pages**, gated behind a feature flag. The form collects an email and submits it to
MailerLite's Classic API. When the MailerLite API key is unset, submission simulates
success (useful for local dev).

Layout matches the provided mockup: a two-column band with a furniture photo on the
left and a cream panel on the right containing an eyebrow label, a heading, an email
input, and a dark pill "Submit" button.

## Decisions (resolved during brainstorming)

| Question | Decision |
|----------|----------|
| Placement | **Hardcoded** in the home + category templates, gated by a feature flag (not a CMS block type for now). Built so it can later become a CMS block. |
| Submit target | **MailerLite Classic API.** Server action reads `MAILERLITE_API_KEY`; if set → POST `{ email }` to MailerLite; if empty → simulate success. |
| Copy / i18n | **i18next keys with English fallbacks** baked in (`t('key', 'English default')`), consistent with the app; locize is the source of truth later. |
| Left image | **Static bundled asset** at `public/newsletter.jpg` (provided by user, swappable). |

## Feature flag

- **`NEXT_PUBLIC_NEWSLETTER_ENABLED`** (default `false`).
- Checked with the app's existing convention: `process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "true"`.
- Mirrors existing flags (`NEXT_PUBLIC_CONFIGURATOR_PAGE_ENABLED`, etc.).
- One global flag controls both page types.

## Submit flow

Uses the app's established **server-action + `useActionState`** form pattern (same as
`sendPartnerRequest` in `src/lib/data/partner.ts`). The API key stays server-side
(no `NEXT_PUBLIC_` needed), which avoids exposing it to the client and avoids CORS.

New server action `subscribeNewsletter(prevState, formData)` in `src/lib/data/newsletter.ts`:

1. Read and trim `email` from `formData`.
2. Validate format. Invalid/empty → return `{ success: false, error: <message> }`.
3. Read `process.env.MAILERLITE_API_KEY`.
   - **Set:** `POST` JSON `{ email }` to MailerLite's Classic API
     (`https://api.mailerlite.com/api/v2`, header `X-MailerLite-ApiKey`). Optional
     `MAILERLITE_GROUP_ID` targets a specific group; otherwise the general subscriber
     list. Non-2xx → return error state.
   - **Empty:** simulate success (no outbound call).
4. Return `{ success: true }` on success.

Return shape:

```ts
type NewsletterState = { success: boolean; error?: string }
```

## Component

`src/modules/home/components/newsletter-block/index.tsx` — `"use client"`.

- Props: `{ languageCode: string }`.
- Two-column responsive layout:
  - **Left:** `next/image` from `/newsletter.jpg`, fills its half.
  - **Right:** cream/off-white panel with eyebrow label, heading, email input, dark pill
    Submit button with an arrow icon. Stacks vertically on mobile (image on top).
- State/behavior:
  - `useTranslation()` for copy.
  - `useActionState(subscribeNewsletter, null)` + `<form action={formAction}>`.
  - Shows inline success message on success and an error message on failure; disables the
    button while pending.
- Reuses existing styling tokens (`dark-blue`) and the shared `Button` / form-input
  components where they fit; otherwise plain Tailwind matching the mockup.

## Copy (i18next keys, English fallbacks)

| Key | English fallback |
|-----|------------------|
| `newsletter-eyebrow` | `NEWSLETTER` |
| `newsletter-heading` | `Stay ahead of the trends – subscribe now for the latest arrivals and be the first` |
| `newsletter-placeholder` | `Type your Email here` |
| `newsletter-submit` | `Submit` |
| `newsletter-success` | `Thanks for subscribing!` |
| `newsletter-error` | `Something went wrong. Please try again.` |

Each rendered via `t('key', 'English default')` so the block works before locize is updated.

## Integration points

- **Home page:** `src/app/[languageCode]/(main)/page.tsx` — after the existing content-block
  loop, render `{flagOn && <NewsletterBlock languageCode={languageCode} />}`.
- **Category pages:** `src/modules/categories/templates/index.tsx` — same, after the existing
  content-block loop.

Both host files are server components; importing the client `NewsletterBlock` is fine. The
flag is `NEXT_PUBLIC_`, so it can be read in either context.

## Files touched

| File | Change |
|------|--------|
| `src/modules/home/components/newsletter-block/index.tsx` | **new** — UI component |
| `src/lib/data/newsletter.ts` | **new** — `subscribeNewsletter` server action |
| `src/app/[languageCode]/(main)/page.tsx` | inject flag-gated block after content blocks |
| `src/modules/categories/templates/index.tsx` | inject flag-gated block after content blocks |
| `public/newsletter.jpg` | **new** — image asset (already added) |
| `.env.template` | add `NEXT_PUBLIC_NEWSLETTER_ENABLED=false`, `MAILERLITE_API_KEY=`, `MAILERLITE_GROUP_ID=` |

## Verification

- Flag **off** → block absent on both home and category pages.
- Flag **on** → block present, appended after existing content blocks, matching the mockup.
- Submit **invalid email** → inline error, no outbound call.
- Submit **valid email, no `MAILERLITE_API_KEY`** → success message (simulated).
- Submit **valid email, `MAILERLITE_API_KEY` set** → outbound `POST { email }` to MailerLite; non-2xx surfaces an error.
- Responsive: columns stack on mobile.

## Out of scope (YAGNI)

- CMS-driven placement / admin editing of the block.
- Advanced MailerLite features (custom fields, resubscribe handling, webhooks).
- Double opt-in, consent checkbox, GDPR flows (revisit when the real endpoint is defined).
- Per-page or per-category flag granularity.
