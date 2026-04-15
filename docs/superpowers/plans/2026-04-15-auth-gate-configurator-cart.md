# Auth-Gate: Configurator, Cart Button, Cart Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the product configurator button, cart nav button, and cart page from non-logged-in users.

**Architecture:** Three conditional rendering changes using the existing `useCustomer()` hook and `customer` prop pattern. No new components, no middleware changes, no API changes.

**Tech Stack:** Next.js App Router, React client components, existing `useCustomer()` context hook

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/modules/products/components/configurator/configurator-button.tsx` | Modify | Hide configurator button when not logged in |
| `src/modules/layout/templates/nav/index.tsx` | Modify | Hide desktop cart link when not logged in |
| `src/app/[languageCode]/(main)/cart/page.tsx` | Modify | Redirect to `/account` when not logged in |

---

### Task 1: Hide Product Configurator Button for non-logged-in users

**Files:**
- Modify: `src/modules/products/components/configurator/configurator-button.tsx`

- [ ] **Step 1: Add `useCustomer` import**

Add this import at the top of the file, after the existing imports:

```tsx
import { useCustomer } from "@lib/context/customer-context"
```

- [ ] **Step 2: Add customer check inside the component**

Inside the `ConfiguratorButton` component, right after the `useState` call on line 24, add:

```tsx
const { customer } = useCustomer()
```

Then change the existing guard on line 26 from:

```tsx
if (!isAdvancedProduct) return null
```

to:

```tsx
if (!isAdvancedProduct || !customer) return null
```

- [ ] **Step 3: Verify locally**

Run the dev server (`pnpm dev`), visit a product page with a configurator button:
- Logged in: button should be visible
- Not logged in: button should be hidden

- [ ] **Step 4: Commit**

```bash
git add src/modules/products/components/configurator/configurator-button.tsx
git commit -m "feat: hide product configurator button for non-logged-in users"
```

---

### Task 2: Hide Cart Button in Nav for non-logged-in users

**Files:**
- Modify: `src/modules/layout/templates/nav/index.tsx`

- [ ] **Step 1: Wrap the desktop cart link with `isLoggedIn` check**

The nav already has `const isLoggedIn = !!customer` on line 46. Wrap the desktop cart `<LocalizedClientLink>` block (lines 159-172) with a conditional:

Change:

```tsx
            {/* Desktop Cart Button */}
            <LocalizedClientLink
              href="/cart"
              className={`hidden small:flex items-center gap-x-2 text-base font-medium font-['Montserrat'] transition-colors ${
                isTransparent ? "text-white hover:text-white/80" : "text-dark-blue hover:text-dark-blue/80"
              }`}
              data-testid="nav-cart-link"
            >
              <span>Cart</span>
              {totalCartItems > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-dark-blue text-white text-xs font-semibold leading-none">
                  {totalCartItems}
                </span>
              )}
            </LocalizedClientLink>
```

To:

```tsx
            {/* Desktop Cart Button */}
            {isLoggedIn && (
              <LocalizedClientLink
                href="/cart"
                className={`hidden small:flex items-center gap-x-2 text-base font-medium font-['Montserrat'] transition-colors ${
                  isTransparent ? "text-white hover:text-white/80" : "text-dark-blue hover:text-dark-blue/80"
                }`}
                data-testid="nav-cart-link"
              >
                <span>Cart</span>
                {totalCartItems > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-dark-blue text-white text-xs font-semibold leading-none">
                    {totalCartItems}
                  </span>
                )}
              </LocalizedClientLink>
            )}
```

- [ ] **Step 2: Verify locally**

Check the nav bar:
- Logged in: cart button visible with item count
- Not logged in: cart button hidden

- [ ] **Step 3: Commit**

```bash
git add src/modules/layout/templates/nav/index.tsx
git commit -m "feat: hide cart button in nav for non-logged-in users"
```

---

### Task 3: Redirect cart page to login for non-logged-in users

**Files:**
- Modify: `src/app/[languageCode]/(main)/cart/page.tsx`

- [ ] **Step 1: Add imports for auth check and redirect**

Add these imports at the top of the file:

```tsx
import { useCustomer } from "@lib/context/customer-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect } from "react"
```

Note: `useRouter` and `useParams` are from `next/navigation` — merge with any existing import from that package.

- [ ] **Step 2: Add auth check with redirect**

Inside the `Cart` component, before the `breadcrumbItems` definition, add:

```tsx
const { customer } = useCustomer()
const router = useRouter()
const { languageCode } = useParams() as { languageCode: string }

useEffect(() => {
  if (!customer) {
    router.push(`/${languageCode}/account`)
  }
}, [customer, router, languageCode])

if (!customer) return null
```

- [ ] **Step 3: Verify locally**

- Not logged in: navigating to `/en/cart` redirects to `/en/account`
- Logged in: cart page loads normally

- [ ] **Step 4: Commit**

```bash
git add src/app/[languageCode]/(main)/cart/page.tsx
git commit -m "feat: redirect cart page to login for non-logged-in users"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full flow test**

Test the complete flow:
1. Log out — verify configurator button is hidden, cart button is hidden, `/cart` redirects to login
2. Log in — verify all three elements appear and function normally
3. If impersonation is available, test that impersonated sessions also see all elements
