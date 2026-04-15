# Auth-Gate: Configurator, Cart Button, and Cart Page

## Goal

Restrict product configurator, cart button, and cart page access to logged-in (or impersonated) users only. Non-logged-in users should not see these features or be able to access the cart route.

## Changes

### 1. Product Configurator Button — Hide when not logged in

**File:** `src/modules/products/components/configurator/configurator-button.tsx`

- Use `useCustomer()` hook to get auth state
- Add early return `if (!customer) return null` alongside the existing `if (!isAdvancedProduct) return null`

### 2. Cart Button in Nav — Hide when not logged in

**File:** `src/modules/layout/templates/nav/index.tsx`

- The nav already has `const isLoggedIn = !!customer`
- Wrap the desktop cart link (`<LocalizedClientLink href="/cart">`) with `{isLoggedIn && (...)}`
- Also conditionally render the `CartDropdown` component (or its parent `CartButton`) based on login state

### 3. Cart Page — Redirect to login when not logged in

**File:** `src/app/[languageCode]/(main)/cart/page.tsx`

- Use `useCustomer()` hook (page is already a client component)
- If `!customer`, redirect to `/account` via `router.push`
- Return `null` during the redirect to avoid flash of content

## Pattern

All changes follow the existing auth-check pattern used throughout the codebase:
- Client components use `useCustomer()` hook from `@lib/context/customer-context`
- Conditional rendering with `if (!customer) return null` or `{isLoggedIn && ...}`
- No middleware changes — auth checks stay in components

## Scope

- 3 files modified
- No new files, components, or dependencies
- No API changes
