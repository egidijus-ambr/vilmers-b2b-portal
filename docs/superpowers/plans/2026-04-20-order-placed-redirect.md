# Order Placed Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After checkout success, redirect to `/{lang}/account/orders/details/{orderId}?placed=1`, show a dismissible success banner at the top of that page, and refresh the client cart so the header reflects the now-empty backend cart.

**Architecture:** Six self-contained changes — (1) add i18n key, (2) create presentational `OrderPlacedBanner`, (3) wire it into the order details page (page owns visibility + URL cleanup), (4) update `CheckoutForm` to await `refreshCart()` and redirect to the new URL, (5) update the secondary `cart.ts` redirect, (6) delete the legacy `/order/[id]/confirmed` route. Each task produces a working increment that can be committed.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, `react-i18next` via `useTranslations("account")` wrapper at `@lib/i18n`.

---

## Deviations from defaults

**No automated tests.** The repo has no Jest/Vitest/Playwright setup (`package.json` has no test script and no config file). Adding a test framework is out of scope for this feature. Each task instead ends with an explicit **manual verification** step using the running dev server (`pnpm dev`, port 3002 per workspace CLAUDE.md). If test infrastructure is added later, retrofitting component tests for the banner is trivial.

**Banner path.** The spec said `src/modules/orders/components/order-placed-banner/`. That `modules/orders/` directory does not exist; order UI currently lives under `src/modules/account/components/`. Using `src/modules/account/components/order-placed-banner/` to match the existing convention.

---

## File map

| File | Change |
|---|---|
| `src/lib/i18n/locales/en/account.json` | Add key `order-successfully-placed` |
| `src/lib/i18n/locales/de/account.json` | Add key `order-successfully-placed` |
| `src/lib/i18n/locales/da/account.json` | Add key `order-successfully-placed` |
| `src/lib/i18n/locales/fr/account.json` | Add key `order-successfully-placed` |
| `src/lib/i18n/locales/lt/account.json` | Add key `order-successfully-placed` |
| `src/modules/account/components/order-placed-banner/index.tsx` | **Create** — presentational dismissible banner |
| `src/app/[languageCode]/(main)/account/orders/details/[id]/page.tsx` | Read `placed` search param, own banner visibility, strip param via `router.replace` |
| `src/modules/checkout/templates/checkout-form/index.tsx` | Destructure `refreshCart` from `useCart`; await it and redirect to new URL at line ~202 |
| `src/lib/data/cart.ts` | Update secondary `redirect()` call targeting `/order/${id}/confirmed` |
| `src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx` | **Delete** |
| `src/app/[languageCode]/(main)/order/[id]/confirmed/loading.tsx` | **Delete** |
| `src/app/[languageCode]/(main)/order/[id]/confirmed/` (folder) | **Delete** (after both files gone) |

---

## Task 1: Add `order-successfully-placed` i18n key to all locales

**Files:**
- Modify: `src/lib/i18n/locales/en/account.json`
- Modify: `src/lib/i18n/locales/de/account.json`
- Modify: `src/lib/i18n/locales/da/account.json`
- Modify: `src/lib/i18n/locales/fr/account.json`
- Modify: `src/lib/i18n/locales/lt/account.json`

- [ ] **Step 1: Read `en/account.json` and add key**

Open `src/lib/i18n/locales/en/account.json`. Inside the top-level object, add a new key placed alphabetically near similar `order-*` keys:

```json
"order-successfully-placed": "Order successfully placed"
```

- [ ] **Step 2: Add same key to the other four locale files**

For each of `de/account.json`, `da/account.json`, `fr/account.json`, `lt/account.json`, add the same key. For a first pass, use these translations (may be refined later by a native speaker):

```json
"order-successfully-placed": "Bestellung erfolgreich aufgegeben"
```
(German — `de/account.json`)

```json
"order-successfully-placed": "Ordre afgivet"
```
(Danish — `da/account.json`)

```json
"order-successfully-placed": "Commande passée avec succès"
```
(French — `fr/account.json`)

```json
"order-successfully-placed": "Užsakymas sėkmingai pateiktas"
```
(Lithuanian — `lt/account.json`)

- [ ] **Step 3: Verify JSON validity**

Run:
```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
for f in src/lib/i18n/locales/*/account.json; do
  echo "=== $f ==="
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('ok')" || echo "INVALID JSON"
done
```
Expected: `ok` printed once per file. No `INVALID JSON`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/locales/*/account.json
git commit -m "i18n(account): add order-successfully-placed key"
```

---

## Task 2: Create `OrderPlacedBanner` component

**Files:**
- Create: `src/modules/account/components/order-placed-banner/index.tsx`

- [ ] **Step 1: Create the banner component**

Create `src/modules/account/components/order-placed-banner/index.tsx` with:

```tsx
"use client"

import { useTranslations } from "@lib/i18n"

type OrderPlacedBannerProps = {
  onClose: () => void
}

export default function OrderPlacedBanner({ onClose }: OrderPlacedBannerProps) {
  const { t } = useTranslations("account")

  return (
    <div
      role="status"
      data-testid="order-placed-banner"
      className="flex items-center justify-between gap-3 p-4 mb-6 bg-green-50 border border-green-200 text-green-800"
    >
      <span className="text-sm font-medium">
        {t("order-successfully-placed")}
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="text-green-800 hover:opacity-70 text-lg leading-none px-2"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```
Expected: No errors referencing the new file. (Warnings about unrelated files are fine — don't fix them here.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/account/components/order-placed-banner/index.tsx
git commit -m "feat(account): add OrderPlacedBanner component"
```

---

## Task 3: Wire banner into the order details page

**Files:**
- Modify: `src/app/[languageCode]/(main)/account/orders/details/[id]/page.tsx`

This task adds:
1. Reading `placed` from `useSearchParams()`.
2. Capturing its initial value in a `useState` so we can strip the URL param without losing visibility.
3. Rendering `<OrderPlacedBanner />` above `<OrderDetailsTemplate />` inside `<PageContent>`.
4. Calling `router.replace(pathname)` once on mount if banner was shown, so a refresh does not re-show it.

- [ ] **Step 1: Add imports and hooks at the top of the page component**

At the top of `src/app/[languageCode]/(main)/account/orders/details/[id]/page.tsx`, update the imports block and add the `useSearchParams` + `usePathname` hooks.

Change the `next/navigation` import line from:
```tsx
import { useRouter, useParams } from "next/navigation"
```
to:
```tsx
import { useRouter, useParams, useSearchParams, usePathname } from "next/navigation"
```

Add this import after the existing component imports (e.g. after the `PageHeader` import):
```tsx
import OrderPlacedBanner from "@modules/account/components/order-placed-banner"
```

- [ ] **Step 2: Add searchParams + banner visibility state**

Inside `OrderDetailsPage`, immediately after the line:
```tsx
const orderId = params?.id as string
const languageCode = params?.languageCode as string
```
add:
```tsx
const searchParams = useSearchParams()
const pathname = usePathname()
const [showPlacedBanner, setShowPlacedBanner] = useState(
  searchParams?.get("placed") === "1"
)

useEffect(() => {
  if (showPlacedBanner && searchParams?.get("placed") === "1") {
    router.replace(pathname, { scroll: false })
  }
  // Run once on mount; intentionally omit deps to avoid re-triggering
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 3: Render the banner inside `<PageContent>`**

Find the successful-render return block near the end of the file:
```tsx
return (
  <>
    <PageHeader
      title={t("order-details")}
      breadcrumbItems={breadcrumbItems}
    />
    <PageContent>
      <OrderDetailsTemplate order={order} />
    </PageContent>
  </>
)
```

Replace with:
```tsx
return (
  <>
    <PageHeader
      title={t("order-details")}
      breadcrumbItems={breadcrumbItems}
    />
    <PageContent>
      {showPlacedBanner && (
        <OrderPlacedBanner onClose={() => setShowPlacedBanner(false)} />
      )}
      <OrderDetailsTemplate order={order} />
    </PageContent>
  </>
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```
Expected: No new errors.

- [ ] **Step 5: Manual verification — banner visibility**

In a terminal:
```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm dev
```

Ensure `NEXT_PUBLIC_FEATURE_ORDER_DETAILS=true` is set in the env. Log in as a B2B user who has at least one order, then:

1. Navigate to `http://localhost:3002/en/account/orders/details/{realOrderId}` (no query param). **Expected:** no banner.
2. Navigate to `http://localhost:3002/en/account/orders/details/{realOrderId}?placed=1`. **Expected:** green banner "Order successfully placed" visible above order details. URL in the browser bar updates to remove `?placed=1` shortly after mount.
3. Click the ✕ on the banner. **Expected:** banner disappears; rest of page unchanged.
4. Reload the page (now without `?placed=1`). **Expected:** no banner.

If any step fails, fix before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/[languageCode]/\(main\)/account/orders/details/\[id\]/page.tsx
git commit -m "feat(account): show success banner on ?placed=1"
```

---

## Task 4: Update `CheckoutForm` — await `refreshCart` and redirect to new URL

**Files:**
- Modify: `src/modules/checkout/templates/checkout-form/index.tsx`

- [ ] **Step 1: Destructure `refreshCart` from `useCart()`**

Near the top of the component, find the line that calls `useCart()` (the `items` field is destructured from it — look for a line matching `useCart(`). Update that destructure to also include `refreshCart`. For example, if the current line is:

```tsx
const { items } = useCart()
```

change it to:
```tsx
const { items, refreshCart } = useCart()
```

(If additional fields are already destructured, keep them and add `refreshCart`.)

- [ ] **Step 2: Replace the redirect block**

Find the block near line 202:
```tsx
if (result.success && result.orderId) {
  router.push(`/${languageCode}/order/${result.orderId}/confirmed`)
} else {
  setError(result.error || "Failed to place order. Please try again.")
}
```

Replace with:
```tsx
if (result.success && result.orderId) {
  await refreshCart()
  router.push(
    `/${languageCode}/account/orders/details/${result.orderId}?placed=1`
  )
} else {
  setError(result.error || "Failed to place order. Please try again.")
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```
Expected: No new errors.

- [ ] **Step 4: Manual verification — end-to-end checkout**

With `pnpm dev` still running:

1. Log in as a B2B test user.
2. Add at least one item to the cart (product configurator or cart page).
3. Navigate to checkout, fill required fields, submit.
4. **Expected:**
   - URL lands at `/{lang}/account/orders/details/{orderId}?placed=1`, which then drops the `?placed=1`.
   - Green "Order successfully placed" banner visible at the top of the content.
   - Header cart badge/count shows empty (no items).
   - Order details render correctly below the banner.
5. Refresh the page. **Expected:** no banner, cart still empty.

If cart badge still shows old items, re-verify Step 1 destructure and that `refreshCart` is awaited.

- [ ] **Step 5: Commit**

```bash
git add src/modules/checkout/templates/checkout-form/index.tsx
git commit -m "feat(checkout): redirect to order details and refresh cart after placement"
```

---

## Task 5: Update secondary redirect in `cart.ts`

**Files:**
- Modify: `src/lib/data/cart.ts`

This handles the other caller found in the explore pass. If this code path is no longer reachable, updating it is still cheap and prevents future drift.

- [ ] **Step 1: Locate and update the redirect**

Open `src/lib/data/cart.ts` and search for:
```
/order/
```

You should find a line similar to:
```tsx
redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
```

Replace with:
```tsx
redirect(
  `/${countryCode}/account/orders/details/${cartRes?.order.id}?placed=1`
)
```

Keep the surrounding conditional / error handling unchanged. Do **not** rename `countryCode` to `languageCode` — preserve the existing variable name so unrelated code stays untouched.

- [ ] **Step 2: Grep to confirm no other callers remain**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
grep -rn "/order/" src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "/order-" | grep -v "account/orders" | grep "/confirmed"
```

Expected output: empty (no lines). If any result appears, update that caller too following the same pattern (swap to `account/orders/details/{id}?placed=1`).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm tsc --noEmit
```
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/cart.ts
git commit -m "fix(cart): redirect legacy cart-complete flow to new order details URL"
```

---

## Task 6: Delete the legacy `/order/[id]/confirmed` route

**Files:**
- Delete: `src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx`
- Delete: `src/app/[languageCode]/(main)/order/[id]/confirmed/loading.tsx`
- Delete: `src/app/[languageCode]/(main)/order/[id]/confirmed/` (folder)

**Do not** delete the `transfer/` sibling folder or the parent `order/[id]/` folder.

- [ ] **Step 1: Remove the files**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
rm "src/app/[languageCode]/(main)/order/[id]/confirmed/page.tsx"
rm "src/app/[languageCode]/(main)/order/[id]/confirmed/loading.tsx"
rmdir "src/app/[languageCode]/(main)/order/[id]/confirmed"
```

- [ ] **Step 2: Grep for any missed imports of the deleted route**

```bash
grep -rn "order/\[id\]/confirmed" src --include="*.ts" --include="*.tsx" || echo "clean"
grep -rn "/confirmed" src --include="*.ts" --include="*.tsx" | grep -v "node_modules" || echo "clean"
```

Expected: either `clean` or no results. If any match shows up in an import path or string, resolve it (likely by removing the dead reference).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Manual verification — 404 on legacy URL**

With `pnpm dev` running, in the browser visit:
`http://localhost:3002/en/order/99999/confirmed`

Expected: Next.js not-found or 404 page. (The sibling `/en/order/{id}/transfer/...` routes should still work if tested.)

- [ ] **Step 5: Commit**

```bash
git add -A "src/app/[languageCode]/(main)/order"
git commit -m "refactor(order): remove legacy /order/[id]/confirmed route"
```

---

## Task 7: Final end-to-end verification

- [ ] **Step 1: Start dev server from a clean state**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm dev
```

- [ ] **Step 2: Full golden path**

1. Log in as a B2B user with an empty cart.
2. Add items to cart.
3. Go to checkout, fill fields, submit.
4. Land on `/en/account/orders/details/{orderId}` with:
   - Green "Order successfully placed" banner at the top
   - URL stripped of `?placed=1` after mount
   - Header cart count = 0
5. Dismiss banner via ✕ — it disappears.
6. Refresh the page — banner does not reappear.
7. Navigate back to cart — it is empty.

- [ ] **Step 3: Negative checks**

1. Visit `/en/account/orders/details/{orderId}` directly (no query param) — no banner.
2. Visit `/en/order/{orderId}/confirmed` — 404.
3. Try a second locale (e.g. `/de/account/orders/details/{orderId}?placed=1`) — banner shows translated text.

- [ ] **Step 4: If any check fails, fix in a new commit**

Do **not** amend earlier commits. Each fix is a new commit with an explicit message.

- [ ] **Step 5: Done**

All tasks verified. Push the branch when ready.

---

## Risks & rollback

- **Feature flag `NEXT_PUBLIC_FEATURE_ORDER_DETAILS` off in an environment.** The redirect target would bounce back to `/account/orders` (existing behavior). Mitigation: verify the flag is `true` in every deployed env before merging.
- **Translations for non-EN locales.** The suggested translations are unverified by native speakers. Flag for a native-speaker review pass before production release.
- **Rollback.** Revert the merge commit. No schema or backend changes, so rollback is safe.
