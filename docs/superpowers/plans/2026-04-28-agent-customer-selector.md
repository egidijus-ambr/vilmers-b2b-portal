# Agent / Admin Customer Selector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let portal users with role `agent` or `admin` pick an "acting customer" so prices, cart, orders, configurator, and checkout all behave as that customer's. Selection is per-device, persists across logout/login, and is the source of truth for both server-rendered prices and client-side cart.

**Architecture:** One new role-gated GraphQL query in `furnisystems-backend` (`searchCustomers`) returns either an agent's linked customers or — for admins — all customers. The `vilmers-b2b-portal` adds an `actingCustomerId` cookie as the persistence source of truth, a server helper `getActingCustomer()` that resolves the cookie into a hydrated customer (or `null`) on every server render, and a thin client `ActingCustomerContext` that propagates that initial value, writes the cookie on switch, and calls `router.refresh()` so server-rendered pricing-keyed pages re-fetch. The cart context, the configurator, the checkout form, and the data-layer `getCustomerFilterData()` all swap from reading the logged-in customer to reading the acting customer.

**Tech Stack:**
- Backend: Node.js, TypeScript, GraphQL Nexus, Prisma, graphql-shield
- Portal: Next.js (App Router), TypeScript, Apollo Client, Tailwind, Headless UI, vitest + @testing-library/react
- All projects use `pnpm` (workspace convention)

**Spec reference:** `docs/superpowers/specs/2026-04-28-agent-customer-selector-design.md` (commit `584b8a3`).

**Branching:** backend → develop. Portal → main. (Per workspace memory.)

---

## File Structure

### Backend (`/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend`)

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/graphql/Customer/queries/searchCustomers.ts` | `searchCustomers(query, limit, ids)` resolver, role-gated |
| Modify | `src/graphql/Customer/queries/index.ts` (or whatever barrel aggregates Customer queries) | Re-export the new resolver so Nexus picks it up |
| Modify | `src/permissions.ts` | Add a graphql-shield rule for the new query (allow `agent`/`admin`, deny others) |
| Create | `src/graphql/Customer/queries/__tests__/searchCustomers.integration.test.ts` | Integration tests for the four-row permission matrix |

### Portal (`/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal`)

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/util/roles.ts` | `isAgent`, `isAdmin`, `isAgentOrAdmin` helpers |
| Create | `src/lib/util/__tests__/roles.test.ts` | Unit tests for the three helpers |
| Create | `src/lib/util/acting-customer-cookie.ts` | Client cookie write/clear helpers |
| Create | `src/lib/util/__tests__/acting-customer-cookie.test.ts` | Unit tests for write/clear |
| Modify | `src/lib/furnisystems-sdk/modules/customer/types.ts` | Add `SearchCustomerArgs`, `SearchCustomerResult` types |
| Modify | `src/lib/furnisystems-sdk/modules/customer/index.ts` | Add `searchCustomers` SDK wrapper |
| Create | `src/lib/furnisystems-sdk/modules/customer/__tests__/searchCustomers.test.ts` | Round-trip test for the wrapper |
| Create | `src/lib/data/acting-customer.ts` | `getActingCustomerId()` and `getActingCustomer()` server helpers |
| Create | `src/lib/data/__tests__/acting-customer.test.ts` | Unit tests for the server helpers |
| Create | `src/lib/context/acting-customer-context.tsx` | `ActingCustomerProvider` + `useActingCustomer` hook |
| Create | `src/lib/context/__tests__/acting-customer-context.test.tsx` | Provider behavior tests |
| Modify | `src/lib/context/cart-context.tsx` | Re-key cart fetch to read from `useActingCustomer` |
| Modify | `src/lib/data/customer.ts` | `getCustomerFilterData()` reads acting customer instead of logged-in customer |
| Modify | `src/app/[languageCode]/(main)/layout.tsx` | Mount `ActingCustomerProvider` between `CustomerProvider` and `ShopSettingsProvider` |
| Modify | `src/app/[languageCode]/(main)/account/layout.tsx` | Same mount inside the nested `CustomerProvider` |
| Modify | `src/modules/products/components/configurator/configurator-content.tsx` | Read `price_listId` and `additional_components` from acting customer |
| Modify | `src/modules/checkout/templates/checkout-form/index.tsx` | Read `customer.id` for addresses + order from acting customer |
| Modify | `src/modules/account/components/order-details/index.tsx` | Replace inline `customer?.role === "agent" \|\| ...` with `isAgentOrAdmin` helper |
| Modify | `src/modules/account/components/orders-table/index.tsx` | Same helper replacement |
| Create | `src/modules/layout/components/customer-selector/index.tsx` | Selector popover + button, mobile sheet |
| Create | `src/modules/layout/components/customer-selector/customer-list.tsx` | Inner list + search input |
| Create | `src/modules/layout/components/customer-selector/__tests__/customer-selector.test.tsx` | Render and interaction tests |
| Create | `src/modules/layout/components/acting-customer-callout/index.tsx` | "Select a customer" banner |
| Modify | `src/modules/layout/templates/nav/index.tsx` | Conditional sub-header row hosting the selector |
| Modify | (TBD: PDP add-to-cart, cart drawer "place order") | Disable when no acting customer; tooltip "Select a customer first". Specific files identified in Task P12. |

---

## Coordination Notes

- **Order:** Backend (Tasks B1–B3) first, merged to `develop`. Portal (Tasks P1–P14) second, merged to `main`. SDK wrapper test (Task P3) is the only portal task that depends on the backend resolver being deployed; everything else is local.
- **Commit cadence:** one commit per task. Conventional-commit style (`feat(area): …`, `test(area): …`).
- **Branch:** `feat/agent-customer-selector` in both repos (backend off `develop`, portal off `main`).
- **No DB migration.** Reuses existing `Customer.managers` relation and existing `Customer` shape.

---

## Backend Tasks

### Task B1: `searchCustomers` resolver

**Files:**
- Create: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/Customer/queries/searchCustomers.ts`
- Modify: whichever Customer-queries barrel file exists (mirror neighbours like `findMany.ts`, `findUnique.ts` — these are auto-imported via Nexus's `makeSchema({ types: [...] })`; if they're imported through a barrel `src/graphql/Customer/queries/index.ts`, add the export there).
- Test: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/Customer/queries/__tests__/searchCustomers.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// src/graphql/Customer/queries/__tests__/searchCustomers.integration.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { gql } from 'graphql-tag'
import { createTestClient, seedRoles, cleanDb, prisma } from '../../../../test-utils'

const SEARCH = gql`
  query SearchCustomers($query: String, $limit: Int, $ids: [Int!]) {
    searchCustomers(query: $query, limit: $limit, ids: $ids) {
      id
      name
      account_code
      b2b_company_name
      price_listId
    }
  }
`

describe('searchCustomers', () => {
  let agent: { id: number; token: string }
  let admin: { id: number; token: string }
  let endCustomer: { id: number; token: string }
  let linkedCustomer: { id: number }
  let unlinkedCustomer: { id: number }

  beforeAll(async () => {
    await cleanDb()
    const seeded = await seedRoles()
    agent = seeded.agent
    admin = seeded.admin
    endCustomer = seeded.endCustomer
    linkedCustomer = await prisma.customer.create({
      data: {
        name: 'Linked',
        email: 'linked@example.com',
        is_b2b_user: true,
        b2b_company_name: 'LinkedCo',
        account_code: 'L001',
        managers: { connect: [{ id: agent.id }] },
      },
    })
    unlinkedCustomer = await prisma.customer.create({
      data: {
        name: 'Unlinked',
        email: 'unlinked@example.com',
        is_b2b_user: true,
        b2b_company_name: 'UnlinkedCo',
        account_code: 'U001',
      },
    })
  })

  afterAll(async () => {
    await cleanDb()
  })

  it('rejects unauthenticated callers', async () => {
    const client = createTestClient()
    const res = await client.query(SEARCH, {})
    expect(res.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')
  })

  it('rejects B2B end-customer callers', async () => {
    const client = createTestClient({ token: endCustomer.token })
    const res = await client.query(SEARCH, {})
    expect(res.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
  })

  it('returns only linked customers for an agent', async () => {
    const client = createTestClient({ token: agent.token })
    const res = await client.query(SEARCH, { query: '' })
    expect(res.errors).toBeUndefined()
    const ids = res.data.searchCustomers.map((c: any) => c.id)
    expect(ids).toContain(linkedCustomer.id)
    expect(ids).not.toContain(unlinkedCustomer.id)
  })

  it('returns all customers for an admin', async () => {
    const client = createTestClient({ token: admin.token })
    const res = await client.query(SEARCH, { query: '' })
    expect(res.errors).toBeUndefined()
    const ids = res.data.searchCustomers.map((c: any) => c.id)
    expect(ids).toContain(linkedCustomer.id)
    expect(ids).toContain(unlinkedCustomer.id)
  })

  it('honors `ids` filter intersected with scope (agent gets only linked id)', async () => {
    const client = createTestClient({ token: agent.token })
    const res = await client.query(SEARCH, { ids: [linkedCustomer.id, unlinkedCustomer.id] })
    expect(res.errors).toBeUndefined()
    const ids = res.data.searchCustomers.map((c: any) => c.id)
    expect(ids).toEqual([linkedCustomer.id])
  })

  it('honors `query` filter against name and account_code', async () => {
    const client = createTestClient({ token: admin.token })
    const res = await client.query(SEARCH, { query: 'L001' })
    const ids = res.data.searchCustomers.map((c: any) => c.id)
    expect(ids).toContain(linkedCustomer.id)
    expect(ids).not.toContain(unlinkedCustomer.id)
  })

  it('caps limit at 50', async () => {
    const client = createTestClient({ token: admin.token })
    const res = await client.query(SEARCH, { limit: 999 })
    expect(res.data.searchCustomers.length).toBeLessThanOrEqual(50)
  })
})
```

- [ ] **Step 2: Run the test, confirm all 7 cases fail**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
pnpm test src/graphql/Customer/queries/__tests__/searchCustomers.integration.test.ts
```

Expected: all 7 cases fail with "Cannot query field 'searchCustomers'" or similar Nexus / graphql-shield errors.

- [ ] **Step 3: Implement the resolver**

```ts
// src/graphql/Customer/queries/searchCustomers.ts
import { extendType, intArg, list, nonNull, stringArg } from 'nexus'
import type { Prisma } from '@prisma/client'

export const SearchCustomersQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('searchCustomers', {
      type: nonNull(list(nonNull('Customer'))),
      args: {
        query: stringArg(),
        limit: intArg({ default: 10 }),
        ids: list(nonNull(intArg())),
      },
      description:
        'Search customers visible to the caller. Agents see only customers linked via `managers`; admins see everything. Used by the portal customer selector.',
      resolve: async (_root, args, ctx) => {
        const role = ctx.user?.role
        if (role !== 'agent' && role !== 'admin') {
          throw new Error('forbidden')
        }

        const query = (args.query ?? '').trim()
        const limit = Math.min(args.limit ?? 10, 50)
        const ids = args.ids ?? null

        const where: Prisma.CustomerWhereInput = {
          is_b2b_user: true,
        }

        if (query.length > 0) {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { surname: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { account_code: { contains: query, mode: 'insensitive' } },
            { b2b_company_name: { contains: query, mode: 'insensitive' } },
          ]
        }

        if (ids && ids.length > 0) {
          where.id = { in: ids }
        }

        if (role === 'agent') {
          where.managers = { some: { id: ctx.user!.id } }
        }

        return ctx.prisma.customer.findMany({
          where,
          orderBy: [
            { orders: { _count: 'desc' } },
            { name: 'asc' },
          ],
          take: limit,
        })
      },
    })
  },
})
```

- [ ] **Step 4: Add the graphql-shield rule**

Open `src/permissions.ts`. Locate the `Query:` block and add:

```ts
searchCustomers: or(isAgent, isAdmin),
```

where `isAgent` / `isAdmin` are the existing role-checking shield rules already used by other queries (search the file for `isAgent` to confirm the exact import name; it should be `userIsAgent` or similar — use the exact name found there).

- [ ] **Step 5: Ensure the resolver is wired into Nexus**

If `src/graphql/Customer/queries/index.ts` exists and re-exports query files, add:

```ts
export * from './searchCustomers'
```

If queries are auto-imported by a glob, no change needed — Nexus's `makeSchema` will pick it up next run. Verify by:

```bash
pnpm dev
# look for src/generated/schema.graphql in the diff:
grep -A3 'searchCustomers' src/generated/schema.graphql
```

Expected: `searchCustomers(query: String, limit: Int, ids: [Int!]): [Customer!]!` appears.

- [ ] **Step 6: Re-run the test, confirm all pass**

```bash
pnpm test src/graphql/Customer/queries/__tests__/searchCustomers.integration.test.ts
```

Expected: 7 of 7 pass.

- [ ] **Step 7: Commit**

```bash
git add src/graphql/Customer/queries/searchCustomers.ts \
        src/graphql/Customer/queries/__tests__/searchCustomers.integration.test.ts \
        src/permissions.ts \
        src/graphql/Customer/queries/index.ts \
        src/generated/schema.graphql \
        src/generated/nexus.ts
git commit -m "feat(customer): add role-gated searchCustomers query"
```

### Task B2: Smoke-test the resolver against the running schema

**Files:** none modified — manual smoke test only.

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
docker-compose up -d
pnpm dev
```

- [ ] **Step 2: Hit the GraphQL playground at `http://localhost:4000/graphql` with three sample queries**

As an admin (use a known admin token):

```graphql
query { searchCustomers(query: "", limit: 5) { id name account_code } }
```

As an agent linked to ≥1 customer:

```graphql
query { searchCustomers { id name } }
```

Should return only that agent's linked customers.

As a B2B end-customer:

```graphql
query { searchCustomers { id } }
```

Should return a `forbidden` error.

- [ ] **Step 3: No commit — manual verification only.**

### Task B3: Push backend branch and open PR to `develop`

- [ ] **Step 1: Push and open PR**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend
git push -u origin feat/agent-customer-selector
gh pr create --base develop --title "feat(customer): role-gated searchCustomers query" --body "$(cat <<'EOF'
## Summary
Adds a single role-gated `searchCustomers(query, limit, ids)` query that returns:
- agent → customers linked via `managers`
- admin → all customers
- anyone else → forbidden

Powers the new portal customer selector. No schema migration.

## Test plan
- [ ] Integration tests pass for all 7 permission/filter scenarios
- [ ] Manual: agent token returns linked customers only
- [ ] Manual: admin token returns unscoped results
- [ ] Manual: end-customer token returns forbidden
EOF
)"
```

- [ ] **Step 2: Wait for backend deploy to dev environment before starting portal Task P3 (the SDK round-trip test).**

---

## Portal Tasks

> All portal paths below are relative to `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/`.

### Task P1: `roles.ts` helpers

**Files:**
- Create: `src/lib/util/roles.ts`
- Test: `src/lib/util/__tests__/roles.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/util/__tests__/roles.test.ts
import { describe, it, expect } from 'vitest'
import { isAgent, isAdmin, isAgentOrAdmin } from '../roles'

describe('roles', () => {
  it('isAgent returns true only for role === "agent"', () => {
    expect(isAgent({ role: 'agent' })).toBe(true)
    expect(isAgent({ role: 'admin' })).toBe(false)
    expect(isAgent({ role: 'b2b' })).toBe(false)
    expect(isAgent(null)).toBe(false)
    expect(isAgent(undefined)).toBe(false)
    expect(isAgent({})).toBe(false)
  })

  it('isAdmin returns true only for role === "admin"', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'agent' })).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })

  it('isAgentOrAdmin returns true for either', () => {
    expect(isAgentOrAdmin({ role: 'agent' })).toBe(true)
    expect(isAgentOrAdmin({ role: 'admin' })).toBe(true)
    expect(isAgentOrAdmin({ role: 'b2b' })).toBe(false)
    expect(isAgentOrAdmin(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, confirm all 3 cases fail**

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
pnpm test src/lib/util/__tests__/roles.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/util/roles.ts
type WithRole = { role?: string | null } | null | undefined

export const isAgent = (c: WithRole): boolean => c?.role === 'agent'
export const isAdmin = (c: WithRole): boolean => c?.role === 'admin'
export const isAgentOrAdmin = (c: WithRole): boolean => isAgent(c) || isAdmin(c)
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm test src/lib/util/__tests__/roles.test.ts
```

Expected: 3 of 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/util/roles.ts src/lib/util/__tests__/roles.test.ts
git commit -m "feat(util): add role helpers (isAgent/isAdmin/isAgentOrAdmin)"
```

### Task P2: SDK `searchCustomers` wrapper (types + method)

**Files:**
- Modify: `src/lib/furnisystems-sdk/modules/customer/types.ts`
- Modify: `src/lib/furnisystems-sdk/modules/customer/index.ts`
- Test: `src/lib/furnisystems-sdk/modules/customer/__tests__/searchCustomers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/furnisystems-sdk/modules/customer/__tests__/searchCustomers.test.ts
import { describe, it, expect, vi } from 'vitest'
import { CustomerModule } from '../index'

describe('CustomerModule.searchCustomers', () => {
  it('passes query/limit/ids and returns parsed results', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        data: {
          searchCustomers: [
            { id: 1, name: 'Acme', surname: null, email: 'a@x.com', account_code: 'A1', b2b_company_name: 'AcmeCo', price_listId: 5, role: null },
          ],
        },
      }),
    }
    const customer = new CustomerModule(mockClient as any)
    const result = await customer.searchCustomers({ query: 'acme', limit: 5, ids: [1, 2] })
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { query: 'acme', limit: 5, ids: [1, 2] },
      }),
    )
    expect(result).toEqual([
      { id: 1, name: 'Acme', surname: null, email: 'a@x.com', account_code: 'A1', b2b_company_name: 'AcmeCo', price_listId: 5, role: null },
    ])
  })

  it('omits undefined args', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ data: { searchCustomers: [] } }),
    }
    const customer = new CustomerModule(mockClient as any)
    await customer.searchCustomers({})
    const call = mockClient.query.mock.calls[0][0]
    expect(call.variables).toEqual({ query: undefined, limit: undefined, ids: undefined })
  })
})
```

- [ ] **Step 2: Run test, confirm fail**

```bash
pnpm test src/lib/furnisystems-sdk/modules/customer/__tests__/searchCustomers.test.ts
```

Expected: FAIL — `searchCustomers is not a function`.

- [ ] **Step 3: Add the types**

Append to `src/lib/furnisystems-sdk/modules/customer/types.ts`:

```ts
export type SearchCustomerArgs = {
  query?: string
  limit?: number
  ids?: number[]
}

export type SearchCustomerResult = {
  id: number
  name: string
  surname: string | null
  email: string | null
  account_code: string | null
  b2b_company_name: string | null
  price_listId: number | null
  role: string | null
}
```

- [ ] **Step 4: Add the SDK method**

In `src/lib/furnisystems-sdk/modules/customer/index.ts`, locate the existing query-document `const` declarations near the top (e.g. `GET_ME_QUERY`). Add:

```ts
const SEARCH_CUSTOMERS_QUERY = gql`
  query SearchCustomers($query: String, $limit: Int, $ids: [Int!]) {
    searchCustomers(query: $query, limit: $limit, ids: $ids) {
      id
      name
      surname
      email
      account_code
      b2b_company_name
      price_listId
      role
    }
  }
`
```

In the `CustomerModule` class body, add:

```ts
async searchCustomers(args: SearchCustomerArgs): Promise<SearchCustomerResult[]> {
  const { data } = await this.client.query({
    query: SEARCH_CUSTOMERS_QUERY,
    variables: {
      query: args.query,
      limit: args.limit,
      ids: args.ids,
    },
    fetchPolicy: 'no-cache',
  })
  return data.searchCustomers
}
```

(Confirm the import path for `gql` matches what neighbouring queries in the same file use — likely `import { gql } from "@apollo/client"`.)

Also export the new types from the module's barrel:

```ts
export type { SearchCustomerArgs, SearchCustomerResult } from './types'
```

- [ ] **Step 5: Run test, confirm pass**

```bash
pnpm test src/lib/furnisystems-sdk/modules/customer/__tests__/searchCustomers.test.ts
```

Expected: 2 of 2 pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/furnisystems-sdk/modules/customer/types.ts \
        src/lib/furnisystems-sdk/modules/customer/index.ts \
        src/lib/furnisystems-sdk/modules/customer/__tests__/searchCustomers.test.ts
git commit -m "feat(sdk): add searchCustomers wrapper"
```

### Task P3: Cookie helpers (client)

**Files:**
- Create: `src/lib/util/acting-customer-cookie.ts`
- Test: `src/lib/util/__tests__/acting-customer-cookie.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/util/__tests__/acting-customer-cookie.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  ACTING_CUSTOMER_COOKIE,
  setActingCustomerCookie,
  clearActingCustomerCookie,
  readActingCustomerCookie,
} from '../acting-customer-cookie'

describe('acting-customer-cookie', () => {
  beforeEach(() => {
    document.cookie = `${ACTING_CUSTOMER_COOKIE}=; Max-Age=0; Path=/`
  })

  it('writes the cookie with the expected attributes', () => {
    setActingCustomerCookie(42)
    expect(document.cookie).toContain(`${ACTING_CUSTOMER_COOKIE}=42`)
  })

  it('reads back what was written', () => {
    setActingCustomerCookie(123)
    expect(readActingCustomerCookie()).toBe(123)
  })

  it('clears the cookie', () => {
    setActingCustomerCookie(99)
    clearActingCustomerCookie()
    expect(readActingCustomerCookie()).toBe(null)
  })

  it('returns null for absent or non-numeric cookie', () => {
    expect(readActingCustomerCookie()).toBe(null)
    document.cookie = `${ACTING_CUSTOMER_COOKIE}=notanumber; Path=/`
    expect(readActingCustomerCookie()).toBe(null)
  })
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test src/lib/util/__tests__/acting-customer-cookie.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/util/acting-customer-cookie.ts
export const ACTING_CUSTOMER_COOKIE = 'actingCustomerId'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function setActingCustomerCookie(id: number): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  document.cookie = `${ACTING_CUSTOMER_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
}

export function clearActingCustomerCookie(): void {
  if (typeof document === 'undefined') return
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  document.cookie = `${ACTING_CUSTOMER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

export function readActingCustomerCookie(): number | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ACTING_CUSTOMER_COOKIE}=([^;]*)`),
  )
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) && Number.isInteger(n) ? n : null
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm test src/lib/util/__tests__/acting-customer-cookie.test.ts
```

Expected: 4 of 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/util/acting-customer-cookie.ts \
        src/lib/util/__tests__/acting-customer-cookie.test.ts
git commit -m "feat(util): add acting-customer cookie helpers"
```

### Task P4: `getActingCustomer()` server helper

**Files:**
- Create: `src/lib/data/acting-customer.ts`
- Test: `src/lib/data/__tests__/acting-customer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/data/__tests__/acting-customer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
vi.mock('next/headers', () => ({ cookies: () => cookieStore }))

const getMeMock = vi.fn()
const searchCustomersMock = vi.fn()
vi.mock('../customer', () => ({ getMe: getMeMock }))
vi.mock('@/lib/furnisystems-sdk', () => ({
  furnisystemsSdk: { customer: { searchCustomers: searchCustomersMock } },
}))

import { getActingCustomer, getActingCustomerId } from '../acting-customer'

describe('acting-customer server helper', () => {
  beforeEach(() => {
    cookieStore.get.mockReset()
    cookieStore.set.mockReset()
    cookieStore.delete.mockReset()
    getMeMock.mockReset()
    searchCustomersMock.mockReset()
  })

  it('getActingCustomerId returns null when cookie absent', async () => {
    cookieStore.get.mockReturnValue(undefined)
    expect(await getActingCustomerId()).toBeNull()
  })

  it('getActingCustomerId parses cookie value', async () => {
    cookieStore.get.mockReturnValue({ value: '42' })
    expect(await getActingCustomerId()).toBe(42)
  })

  it('returns null for guest', async () => {
    getMeMock.mockResolvedValue(null)
    cookieStore.get.mockReturnValue(undefined)
    expect(await getActingCustomer()).toBeNull()
  })

  it('returns logged-in customer for end-customer (passthrough)', async () => {
    getMeMock.mockResolvedValue({ id: 1, role: 'b2b', price_listId: 9 })
    cookieStore.get.mockReturnValue(undefined)
    const result = await getActingCustomer()
    expect(result).toMatchObject({ id: 1, role: 'b2b' })
  })

  it('returns null for agent with no cookie', async () => {
    getMeMock.mockResolvedValue({ id: 7, role: 'agent' })
    cookieStore.get.mockReturnValue(undefined)
    expect(await getActingCustomer()).toBeNull()
    expect(searchCustomersMock).not.toHaveBeenCalled()
  })

  it('returns hydrated customer for agent with valid cookie', async () => {
    getMeMock.mockResolvedValue({ id: 7, role: 'agent' })
    cookieStore.get.mockReturnValue({ value: '99' })
    searchCustomersMock.mockResolvedValue([{ id: 99, name: 'X', price_listId: 5 }])
    const result = await getActingCustomer()
    expect(result).toMatchObject({ id: 99, price_listId: 5 })
    expect(searchCustomersMock).toHaveBeenCalledWith({ ids: [99] })
  })

  it('clears cookie and returns null when stored id is no longer linked', async () => {
    getMeMock.mockResolvedValue({ id: 7, role: 'agent' })
    cookieStore.get.mockReturnValue({ value: '99' })
    searchCustomersMock.mockResolvedValue([])
    const result = await getActingCustomer()
    expect(result).toBeNull()
    expect(cookieStore.delete).toHaveBeenCalledWith('actingCustomerId')
  })
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test src/lib/data/__tests__/acting-customer.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/lib/data/acting-customer.ts
import 'server-only'
import { cookies } from 'next/headers'
import { getMe } from './customer'
import { furnisystemsSdk } from '@/lib/furnisystems-sdk'
import { ACTING_CUSTOMER_COOKIE } from '@/lib/util/acting-customer-cookie'
import { isAgentOrAdmin } from '@/lib/util/roles'
import type { SearchCustomerResult } from '@/lib/furnisystems-sdk/modules/customer/types'

export async function getActingCustomerId(): Promise<number | null> {
  const cookie = cookies().get(ACTING_CUSTOMER_COOKIE)
  if (!cookie) return null
  const n = Number(cookie.value)
  return Number.isFinite(n) && Number.isInteger(n) ? n : null
}

export async function getActingCustomer(): Promise<SearchCustomerResult | any | null> {
  const me = await getMe()
  if (!me) return null
  if (!isAgentOrAdmin(me)) return me

  const storedId = await getActingCustomerId()
  if (storedId == null) return null

  const results = await furnisystemsSdk.customer.searchCustomers({ ids: [storedId] })
  if (results.length === 0) {
    cookies().delete(ACTING_CUSTOMER_COOKIE)
    return null
  }
  return results[0]
}
```

(Confirm the import path `@/lib/furnisystems-sdk` matches the project's existing alias — adjust to whatever neighbouring `src/lib/data/*.ts` files use.)

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm test src/lib/data/__tests__/acting-customer.test.ts
```

Expected: 7 of 7 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/acting-customer.ts \
        src/lib/data/__tests__/acting-customer.test.ts
git commit -m "feat(data): add getActingCustomer server helper"
```

### Task P5: `ActingCustomerContext` (client provider)

**Files:**
- Create: `src/lib/context/acting-customer-context.tsx`
- Test: `src/lib/context/__tests__/acting-customer-context.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/context/__tests__/acting-customer-context.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActingCustomerProvider, useActingCustomer } from '../acting-customer-context'
import { CustomerProvider } from '../customer-context'

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock }) }))

const cookieMock = {
  setActingCustomerCookie: vi.fn(),
  clearActingCustomerCookie: vi.fn(),
}
vi.mock('@/lib/util/acting-customer-cookie', () => cookieMock)

function Probe() {
  const { actingCustomer, setActingCustomer, clearActingCustomer, isAgentOrAdmin } = useActingCustomer()
  return (
    <div>
      <span data-testid="acting-id">{actingCustomer?.id ?? 'null'}</span>
      <span data-testid="role">{isAgentOrAdmin ? 'agent-or-admin' : 'other'}</span>
      <button onClick={() => setActingCustomer({ id: 99, name: 'New', price_listId: 5 } as any)}>set</button>
      <button onClick={() => clearActingCustomer()}>clear</button>
    </div>
  )
}

describe('ActingCustomerProvider', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    cookieMock.setActingCustomerCookie.mockReset()
    cookieMock.clearActingCustomerCookie.mockReset()
  })

  it('passes through logged-in customer for end-customer', () => {
    render(
      <CustomerProvider customer={{ id: 1, role: 'b2b' } as any}>
        <ActingCustomerProvider initialActingCustomer={{ id: 1, role: 'b2b' } as any}>
          <Probe />
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    expect(screen.getByTestId('acting-id').textContent).toBe('1')
    expect(screen.getByTestId('role').textContent).toBe('other')
  })

  it('returns null actingCustomer for agent with no initial value', () => {
    render(
      <CustomerProvider customer={{ id: 7, role: 'agent' } as any}>
        <ActingCustomerProvider initialActingCustomer={null}>
          <Probe />
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    expect(screen.getByTestId('acting-id').textContent).toBe('null')
    expect(screen.getByTestId('role').textContent).toBe('agent-or-admin')
  })

  it('writes cookie and refreshes on setActingCustomer (agent)', async () => {
    const user = userEvent.setup()
    render(
      <CustomerProvider customer={{ id: 7, role: 'agent' } as any}>
        <ActingCustomerProvider initialActingCustomer={null}>
          <Probe />
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    await user.click(screen.getByText('set'))
    expect(cookieMock.setActingCustomerCookie).toHaveBeenCalledWith(99)
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('acting-id').textContent).toBe('99')
  })

  it('clearActingCustomer clears cookie and refreshes', async () => {
    const user = userEvent.setup()
    render(
      <CustomerProvider customer={{ id: 7, role: 'agent' } as any}>
        <ActingCustomerProvider initialActingCustomer={{ id: 99, name: 'X', price_listId: 5 } as any}>
          <Probe />
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    await user.click(screen.getByText('clear'))
    expect(cookieMock.clearActingCustomerCookie).toHaveBeenCalled()
    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('acting-id').textContent).toBe('null')
  })

  it('setActingCustomer is a no-op for end-customer', async () => {
    const user = userEvent.setup()
    render(
      <CustomerProvider customer={{ id: 1, role: 'b2b' } as any}>
        <ActingCustomerProvider initialActingCustomer={{ id: 1, role: 'b2b' } as any}>
          <Probe />
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    await user.click(screen.getByText('set'))
    expect(cookieMock.setActingCustomerCookie).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('acting-id').textContent).toBe('1') // unchanged
  })
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test src/lib/context/__tests__/acting-customer-context.test.tsx
```

- [ ] **Step 3: Implement**

```tsx
// src/lib/context/acting-customer-context.tsx
'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from './customer-context'
import { isAgentOrAdmin as roleIsAgentOrAdmin } from '@/lib/util/roles'
import {
  setActingCustomerCookie,
  clearActingCustomerCookie,
} from '@/lib/util/acting-customer-cookie'
import type { SearchCustomerResult } from '@/lib/furnisystems-sdk/modules/customer/types'

type ActingCustomer = SearchCustomerResult | { id: number; role?: string | null; price_listId?: number | null } | null

type ActingCustomerContextValue = {
  actingCustomer: ActingCustomer
  setActingCustomer: (c: SearchCustomerResult | null) => void
  clearActingCustomer: () => void
  isAgentOrAdmin: boolean
}

const ActingCustomerContext = createContext<ActingCustomerContextValue | null>(null)

type ProviderProps = {
  initialActingCustomer: ActingCustomer
  children: React.ReactNode
}

export function ActingCustomerProvider({ initialActingCustomer, children }: ProviderProps) {
  const { customer } = useCustomer()
  const router = useRouter()
  const isAgentOrAdmin = roleIsAgentOrAdmin(customer)

  // For non-agent/admin callers, the acting customer is always the logged-in customer.
  // For agent/admin, we maintain selectable state seeded from the server.
  const [acting, setActing] = useState<ActingCustomer>(
    isAgentOrAdmin ? initialActingCustomer : (customer as ActingCustomer),
  )

  const setActingCustomer = useCallback(
    (c: SearchCustomerResult | null) => {
      if (!isAgentOrAdmin) return
      if (c) {
        setActingCustomerCookie(c.id)
      } else {
        clearActingCustomerCookie()
      }
      setActing(c as ActingCustomer)
      router.refresh()
    },
    [isAgentOrAdmin, router],
  )

  const clearActingCustomer = useCallback(() => {
    setActingCustomer(null)
  }, [setActingCustomer])

  return (
    <ActingCustomerContext.Provider
      value={{
        actingCustomer: isAgentOrAdmin ? acting : (customer as ActingCustomer),
        setActingCustomer,
        clearActingCustomer,
        isAgentOrAdmin,
      }}
    >
      {children}
    </ActingCustomerContext.Provider>
  )
}

export function useActingCustomer(): ActingCustomerContextValue {
  const ctx = useContext(ActingCustomerContext)
  if (!ctx) throw new Error('useActingCustomer must be used inside ActingCustomerProvider')
  return ctx
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm test src/lib/context/__tests__/acting-customer-context.test.tsx
```

Expected: 5 of 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/context/acting-customer-context.tsx \
        src/lib/context/__tests__/acting-customer-context.test.tsx
git commit -m "feat(context): add ActingCustomerProvider with cookie + router.refresh"
```

### Task P6: Mount `ActingCustomerProvider` in root layout

**Files:**
- Modify: `src/app/[languageCode]/(main)/layout.tsx`

- [ ] **Step 1: Read the layout to confirm current shape**

```bash
sed -n '40,70p' src/app/[languageCode]/(main)/layout.tsx
```

You should see (around line 51):

```
<CustomerProvider customer={customer}>
  <ShopSettingsProvider initialShopSettings={shopSettings}>
    <CartProvider>
      ...
```

- [ ] **Step 2: Modify the layout**

Just before `<CustomerProvider …>` is rendered, fetch the acting customer:

```tsx
import { getActingCustomer } from '@/lib/data/acting-customer'
import { ActingCustomerProvider } from '@/lib/context/acting-customer-context'
// ...
const acting = await getActingCustomer()
```

Then wrap the existing tree:

```tsx
<CustomerProvider customer={customer}>
  <ActingCustomerProvider initialActingCustomer={acting}>
    <ShopSettingsProvider initialShopSettings={shopSettings}>
      <CartProvider>
        ...
      </CartProvider>
    </ShopSettingsProvider>
  </ActingCustomerProvider>
</CustomerProvider>
```

- [ ] **Step 3: Smoke-build**

```bash
pnpm typecheck
pnpm build
```

Expected: typecheck and build pass with no errors. (No tests for layout files — the integration test in Task P14 covers this.)

- [ ] **Step 4: Commit**

```bash
git add src/app/[languageCode]/(main)/layout.tsx
git commit -m "feat(portal): mount ActingCustomerProvider in root layout"
```

### Task P7: Mount `ActingCustomerProvider` in account layout

**Files:**
- Modify: `src/app/[languageCode]/(main)/account/layout.tsx`

- [ ] **Step 1: Apply the same pattern**

Inside the existing `<CustomerProvider customer={customer}>` (around line 74), insert `<ActingCustomerProvider initialActingCustomer={acting}>`. Add the `getActingCustomer()` call alongside the existing customer fetch.

- [ ] **Step 2: Smoke-build**

```bash
pnpm typecheck && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/[languageCode]/(main)/account/layout.tsx
git commit -m "feat(portal): mount ActingCustomerProvider in account layout"
```

### Task P8: Re-key `cart-context.tsx`

**Files:**
- Modify: `src/lib/context/cart-context.tsx`
- Test: extend `src/lib/context/__tests__/cart-context.test.tsx` if it exists; otherwise create one

- [ ] **Step 1: Read the file**

```bash
sed -n '1,60p' src/lib/context/cart-context.tsx
```

Confirm line 26 reads `customer?.id` and line 36 calls `sdk.cart.getOrCreateActiveCart(customerId)`.

- [ ] **Step 2: Write the failing test**

If `cart-context.test.tsx` doesn't exist, create it:

```tsx
// src/lib/context/__tests__/cart-context.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CustomerProvider } from '../customer-context'
import { ActingCustomerProvider } from '../acting-customer-context'
import { CartProvider, useCart } from '../cart-context'

const getOrCreate = vi.fn().mockResolvedValue({ id: 'cart-99', items: [] })
vi.mock('@/lib/furnisystems-sdk', () => ({
  furnisystemsSdk: { cart: { getOrCreateActiveCart: getOrCreate } },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/util/acting-customer-cookie', () => ({
  setActingCustomerCookie: vi.fn(),
  clearActingCustomerCookie: vi.fn(),
}))

function Probe() {
  const { cart } = useCart()
  return <span data-testid="cart-id">{cart?.id ?? 'null'}</span>
}

describe('cart-context re-keying', () => {
  it('uses actingCustomer.id, not logged-in customer.id', async () => {
    render(
      <CustomerProvider customer={{ id: 7, role: 'agent' } as any}>
        <ActingCustomerProvider initialActingCustomer={{ id: 99, role: 'b2b' } as any}>
          <CartProvider>
            <Probe />
          </CartProvider>
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    await waitFor(() => expect(getOrCreate).toHaveBeenCalledWith(99))
    expect(screen.getByTestId('cart-id').textContent).toBe('cart-99')
  })

  it('does not fetch when no actingCustomer (agent without selection)', async () => {
    getOrCreate.mockClear()
    render(
      <CustomerProvider customer={{ id: 7, role: 'agent' } as any}>
        <ActingCustomerProvider initialActingCustomer={null}>
          <CartProvider>
            <Probe />
          </CartProvider>
        </ActingCustomerProvider>
      </CustomerProvider>,
    )
    await new Promise((r) => setTimeout(r, 10))
    expect(getOrCreate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run, confirm fail**

```bash
pnpm test src/lib/context/__tests__/cart-context.test.tsx
```

Expected: FAIL — cart still calls `getOrCreateActiveCart(7)` (logged-in id).

- [ ] **Step 4: Modify the cart context**

In `src/lib/context/cart-context.tsx`:

```ts
// before:
import { useCustomer } from './customer-context'
const { customer } = useCustomer()
const customerId = customer?.id ? Number(customer.id) : undefined

// after:
import { useActingCustomer } from './acting-customer-context'
const { actingCustomer } = useActingCustomer()
const customerId = actingCustomer?.id ? Number(actingCustomer.id) : undefined
```

Add a stale-response guard if not already present. Look for the effect that calls `getOrCreateActiveCart`:

```ts
useEffect(() => {
  if (!customerId) {
    setCart(null)
    return
  }
  let cancelled = false
  const requestedId = customerId
  sdk.cart.getOrCreateActiveCart(requestedId).then((next) => {
    if (cancelled) return
    if (requestedId !== customerId) return // a newer switch superseded
    setCart(next)
  })
  return () => {
    cancelled = true
  }
}, [customerId])
```

- [ ] **Step 5: Run, confirm pass**

```bash
pnpm test src/lib/context/__tests__/cart-context.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/context/cart-context.tsx \
        src/lib/context/__tests__/cart-context.test.tsx
git commit -m "feat(cart): re-key cart fetch to acting customer"
```

### Task P9: Swap `getCustomerFilterData()` to read acting customer

**Files:**
- Modify: `src/lib/data/customer.ts`

- [ ] **Step 1: Read lines 505–531 of `src/lib/data/customer.ts`**

```bash
sed -n '500,535p' src/lib/data/customer.ts
```

Identify how `customer` is obtained today (likely from `getMe()` at the top of the function).

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/data/__tests__/customer-filter-data.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getActingCustomerMock = vi.fn()
vi.mock('../acting-customer', () => ({ getActingCustomer: getActingCustomerMock }))

const getDefaultPriceListIdMock = vi.fn().mockResolvedValue(1)
vi.mock('../default-pricelist', () => ({ getDefaultPriceListId: getDefaultPriceListIdMock }))

import { getCustomerFilterData } from '../customer'

describe('getCustomerFilterData', () => {
  beforeEach(() => {
    getActingCustomerMock.mockReset()
  })

  it('uses acting customer price_listId for agent', async () => {
    getActingCustomerMock.mockResolvedValue({ id: 99, price_listId: 42, tags: ['vip'] })
    const data = await getCustomerFilterData()
    expect(data.priceListIds).toContain(42)
    expect(data.tags).toContain('vip')
  })

  it('falls back to default pricelist when acting customer is null', async () => {
    getActingCustomerMock.mockResolvedValue(null)
    const data = await getCustomerFilterData()
    expect(data.priceListIds).toContain(1) // default
  })
})
```

- [ ] **Step 3: Run, confirm fail**

```bash
pnpm test src/lib/data/__tests__/customer-filter-data.test.ts
```

- [ ] **Step 4: Modify `getCustomerFilterData()`**

Replace the call that today reads `customer.price_listId` / `customer.tags` from the logged-in customer (typically `await getMe()`) with `await getActingCustomer()`. Keep the existing default-pricelist fallback for the `null` branch unchanged.

```ts
// near the top of the file:
import { getActingCustomer } from './acting-customer'

// inside getCustomerFilterData:
const customer = await getActingCustomer()
// existing logic continues unchanged: read customer?.price_listId, customer?.tags, etc.
```

- [ ] **Step 5: Run, confirm pass**

```bash
pnpm test src/lib/data/__tests__/customer-filter-data.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/customer.ts src/lib/data/__tests__/customer-filter-data.test.ts
git commit -m "feat(data): getCustomerFilterData reads acting customer"
```

### Task P10: Swap configurator reads

**Files:**
- Modify: `src/modules/products/components/configurator/configurator-content.tsx`

- [ ] **Step 1: Read lines 50–90, 310–340**

```bash
sed -n '50,90p' src/modules/products/components/configurator/configurator-content.tsx
sed -n '310,340p' src/modules/products/components/configurator/configurator-content.tsx
```

Locate the three uses of `customer?.price_listId` / `customer.additional_components` (lines 57–59, 81–86) and the debug strings at 317–318 and 338.

- [ ] **Step 2: Replace `useCustomer` with `useActingCustomer`**

```tsx
// before:
import { useCustomer } from '@/lib/context/customer-context'
const { customer } = useCustomer()

// after:
import { useActingCustomer } from '@/lib/context/acting-customer-context'
const { actingCustomer: customer } = useActingCustomer()
```

(Aliasing as `customer` keeps the rest of the file's references working unchanged.)

- [ ] **Step 3: Smoke-build**

```bash
pnpm typecheck
```

- [ ] **Step 4: Manual smoke**

Open a PDP that uses the configurator while logged in as an agent with no selected customer → configurator should not render or should disable add-to-cart (covered in Task P12). With a selected customer → configurator should show their pricing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/components/configurator/configurator-content.tsx
git commit -m "feat(configurator): use acting customer for price_listId and components"
```

### Task P11: Swap checkout reads

**Files:**
- Modify: `src/modules/checkout/templates/checkout-form/index.tsx`

- [ ] **Step 1: Read lines 100–110 and 180–190**

```bash
sed -n '100,110p' src/modules/checkout/templates/checkout-form/index.tsx
sed -n '180,190p' src/modules/checkout/templates/checkout-form/index.tsx
```

Confirm:
- Line 105: `fetchCustomerAddresses(Number(customer.id))`
- Line 184: `customer_accountId: customer?.id ? String(customer.id) : undefined`

- [ ] **Step 2: Swap source**

```tsx
// at the top of the file:
import { useActingCustomer } from '@/lib/context/acting-customer-context'

// inside the component:
const { actingCustomer: customer } = useActingCustomer()
// remove the prior useCustomer() destructure (or alias)
```

- [ ] **Step 3: Smoke-build**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/checkout/templates/checkout-form/index.tsx
git commit -m "feat(checkout): record orders against acting customer"
```

### Task P12: Selector component (button + popover + mobile sheet + search)

**Files:**
- Create: `src/modules/layout/components/customer-selector/index.tsx`
- Create: `src/modules/layout/components/customer-selector/customer-list.tsx`
- Test: `src/modules/layout/components/customer-selector/__tests__/customer-selector.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/modules/layout/components/customer-selector/__tests__/customer-selector.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerProvider } from '@/lib/context/customer-context'
import { ActingCustomerProvider } from '@/lib/context/acting-customer-context'
import CustomerSelector from '../index'

const search = vi.fn()
vi.mock('@/lib/furnisystems-sdk', () => ({
  furnisystemsSdk: { customer: { searchCustomers: search } },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/util/acting-customer-cookie', () => ({
  setActingCustomerCookie: vi.fn(),
  clearActingCustomerCookie: vi.fn(),
}))

function withProviders(child: React.ReactNode, opts: { actingId?: number | null } = {}) {
  return render(
    <CustomerProvider customer={{ id: 7, role: 'agent' } as any}>
      <ActingCustomerProvider
        initialActingCustomer={
          opts.actingId
            ? ({ id: opts.actingId, account_code: 'A1', b2b_company_name: 'AcmeCo', name: 'Acme' } as any)
            : null
        }
      >
        {child}
      </ActingCustomerProvider>
    </CustomerProvider>,
  )
}

describe('CustomerSelector', () => {
  it('renders "Select customer" when nothing chosen', () => {
    withProviders(<CustomerSelector />)
    expect(screen.getByRole('button', { name: /select customer/i })).toBeInTheDocument()
  })

  it('renders chosen customer summary', () => {
    withProviders(<CustomerSelector />, { actingId: 99 })
    expect(screen.getByRole('button', { name: /A1.*AcmeCo/ })).toBeInTheDocument()
  })

  it('opens popover and fetches default 10 on open', async () => {
    search.mockResolvedValue([
      { id: 11, name: 'Alpha', account_code: 'A11', b2b_company_name: 'AlphaCo', email: 'a@x.com', price_listId: 1, role: null, surname: null },
    ])
    const user = userEvent.setup()
    withProviders(<CustomerSelector />)
    await user.click(screen.getByRole('button', { name: /select customer/i }))
    await waitFor(() => expect(search).toHaveBeenCalledWith({ query: '', limit: 10 }))
    expect(screen.getByText('AlphaCo')).toBeInTheDocument()
  })

  it('debounces typed query and re-fetches', async () => {
    search.mockResolvedValue([])
    const user = userEvent.setup()
    withProviders(<CustomerSelector />)
    await user.click(screen.getByRole('button', { name: /select customer/i }))
    const input = screen.getByPlaceholderText(/search customers/i)
    await user.type(input, 'foo')
    await waitFor(() => expect(search).toHaveBeenCalledWith({ query: 'foo', limit: 20 }), { timeout: 500 })
  })

  it('shows empty state for no matches', async () => {
    search.mockResolvedValue([])
    const user = userEvent.setup()
    withProviders(<CustomerSelector />)
    await user.click(screen.getByRole('button', { name: /select customer/i }))
    await user.type(screen.getByPlaceholderText(/search/i), 'zzz')
    await waitFor(() => expect(screen.getByText(/no customers found/i)).toBeInTheDocument(), { timeout: 500 })
  })
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm test src/modules/layout/components/customer-selector/__tests__/customer-selector.test.tsx
```

- [ ] **Step 3: Implement the inner list**

```tsx
// src/modules/layout/components/customer-selector/customer-list.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useActingCustomer } from '@/lib/context/acting-customer-context'
import { furnisystemsSdk } from '@/lib/furnisystems-sdk'
import type { SearchCustomerResult } from '@/lib/furnisystems-sdk/modules/customer/types'

const DEBOUNCE_MS = 250

type Props = { onPick: () => void }

export default function CustomerList({ onPick }: Props) {
  const { setActingCustomer } = useActingCustomer()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCustomerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    const seq = ++seqRef.current
    const handle = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await furnisystemsSdk.customer.searchCustomers(
          query ? { query, limit: 20 } : { query: '', limit: 10 },
        )
        if (seq !== seqRef.current) return
        setResults(data)
      } catch (e) {
        if (seq !== seqRef.current) return
        setError('Could not load customers. Try again.')
      } finally {
        if (seq === seqRef.current) setLoading(false)
      }
    }, query ? DEBOUNCE_MS : 0)
    return () => clearTimeout(handle)
  }, [query])

  return (
    <div className="w-full">
      <input
        type="text"
        autoFocus
        placeholder="Search customers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border-b px-3 py-2 text-sm outline-none"
      />
      <p className="px-3 pt-2 text-xs uppercase text-neutral-500">
        {query ? 'Results' : 'Recent'}
      </p>
      {loading && <p className="px-3 py-4 text-sm text-neutral-500">Loading…</p>}
      {error && (
        <p className="px-3 py-4 text-sm text-red-600">
          {error}{' '}
          <button onClick={() => setQuery((q) => q)} className="underline">
            Retry
          </button>
        </p>
      )}
      {!loading && !error && results.length === 0 && (
        <p className="px-3 py-4 text-sm text-neutral-500">No customers found</p>
      )}
      <ul className="max-h-72 overflow-y-auto">
        {results.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left hover:bg-neutral-50"
              onClick={() => {
                setActingCustomer(c)
                onPick()
              }}
            >
              <span className="font-mono text-xs text-neutral-500">{c.account_code}</span>{' '}
              <span className="font-medium">{c.b2b_company_name ?? c.name}</span>
              <span className="block text-xs text-neutral-500">{c.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Implement the outer popover/sheet**

```tsx
// src/modules/layout/components/customer-selector/index.tsx
'use client'

import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useActingCustomer } from '@/lib/context/acting-customer-context'
import CustomerList from './customer-list'

export default function CustomerSelector() {
  const { actingCustomer, clearActingCustomer } = useActingCustomer()
  const labelTop = actingCustomer
    ? `${(actingCustomer as any).account_code ?? ''} · ${(actingCustomer as any).b2b_company_name ?? (actingCustomer as any).name}`
    : 'Select customer'

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <div className="flex items-center gap-2">
            <PopoverButton
              className={`flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${
                actingCustomer ? 'border-neutral-300' : 'border-amber-500 text-amber-700'
              }`}
            >
              <span>{labelTop}</span>
              <ChevronDownIcon className="h-4 w-4" />
            </PopoverButton>
            {actingCustomer && (
              <button
                type="button"
                onClick={clearActingCustomer}
                aria-label="Clear acting customer"
                className="rounded border border-neutral-300 p-1"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            )}
          </div>
          <Transition
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 -translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-75"
          >
            <PopoverPanel className="absolute left-0 z-30 mt-1 w-[360px] rounded border border-neutral-200 bg-white shadow-lg sm:w-[360px]">
              <CustomerList onPick={() => close()} />
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
```

(Mobile-sheet variant is deferred to Task P13 since the basic popover works on tablets and the audit confirmed Headless UI Popover is already mobile-acceptable. If a follow-up Playwright run shows it's too cramped, swap to `Dialog` per spec §6.8.)

- [ ] **Step 5: Run tests, confirm pass**

```bash
pnpm test src/modules/layout/components/customer-selector/__tests__/customer-selector.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/layout/components/customer-selector/
git commit -m "feat(layout): add customer selector with debounced search"
```

### Task P13: Sub-header row + callout

**Files:**
- Modify: `src/modules/layout/templates/nav/index.tsx`
- Create: `src/modules/layout/components/acting-customer-callout/index.tsx`

- [ ] **Step 1: Add the sub-header row**

In `nav/index.tsx`, locate the closing tag of the existing 72px header bar. Immediately after it, add:

```tsx
import { isAgentOrAdmin } from '@/lib/util/roles'
import CustomerSelector from '../../components/customer-selector'
// ...
{isAgentOrAdmin(customer) && (
  <div className="sticky top-[72px] z-20 flex h-10 items-center border-b border-neutral-200 bg-neutral-50 px-4">
    <CustomerSelector />
  </div>
)}
```

(Confirm the `top-[72px]` offset matches the header's actual height/sticky positioning in the file.)

- [ ] **Step 2: Implement the callout**

```tsx
// src/modules/layout/components/acting-customer-callout/index.tsx
'use client'

import { useCustomer } from '@/lib/context/customer-context'
import { useActingCustomer } from '@/lib/context/acting-customer-context'
import { isAgentOrAdmin } from '@/lib/util/roles'

export default function ActingCustomerCallout() {
  const { customer } = useCustomer()
  const { actingCustomer } = useActingCustomer()
  if (!isAgentOrAdmin(customer)) return null
  if (actingCustomer) return null

  return (
    <div
      role="status"
      className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800"
    >
      You're viewing the general catalog. Select a customer to see their pricing and place an order.
    </div>
  )
}
```

- [ ] **Step 3: Render the callout in the catalog/PDP/cart routes**

The simplest place is inside the same nav template, directly after the sub-header row:

```tsx
import ActingCustomerCallout from '../../components/acting-customer-callout'
// inside the JSX, after the sub-header row:
<ActingCustomerCallout />
```

(If the nav is shared across routes that shouldn't show the callout — e.g. account pages — gate `<ActingCustomerCallout />` on a pathname check using `usePathname()` to limit it to `/products`, `/categories`, `/cart`, `/[productHandle]`. Decide based on the current `nav` template's scope.)

- [ ] **Step 4: Smoke-build**

```bash
pnpm typecheck && pnpm build
```

- [ ] **Step 5: Manual check**

Run `pnpm dev`. Log in as an agent (use the existing `auth/impersonate` flow from saas-admin-ui or seeded credentials) and:
- Confirm the sub-header appears with "Select customer" button.
- Confirm the callout appears on `/products` and disappears after a customer is picked.
- Log out, log in as a normal B2B end-customer → no sub-header, no callout.

- [ ] **Step 6: Commit**

```bash
git add src/modules/layout/templates/nav/index.tsx \
        src/modules/layout/components/acting-customer-callout/
git commit -m "feat(layout): add sub-header + acting-customer callout"
```

### Task P14: Disable cart actions when no acting customer

**Files (identify in step 1):**
- Modify: PDP add-to-cart button component (likely `src/modules/products/components/.../add-to-cart.tsx` or similar)
- Modify: Cart drawer / cart page "Place order" / "Checkout" button

- [ ] **Step 1: Locate the buttons**

```bash
grep -rln "addToCart\|add-to-cart\|placeOrder\|place-order" src/modules src/app | head -20
```

Identify:
- The "Add to cart" button used on PDPs (and from the configurator).
- The "Place order" / checkout-trigger button in the cart UI.

- [ ] **Step 2: Add the gate**

In each:

```tsx
import { useCustomer } from '@/lib/context/customer-context'
import { useActingCustomer } from '@/lib/context/acting-customer-context'
import { isAgentOrAdmin } from '@/lib/util/roles'

const { customer } = useCustomer()
const { actingCustomer } = useActingCustomer()
const blocked = isAgentOrAdmin(customer) && !actingCustomer

<button
  disabled={existingDisabled || blocked}
  title={blocked ? 'Select a customer first' : undefined}
  onClick={blocked ? undefined : existingHandler}
>
  ...
</button>
```

- [ ] **Step 3: Smoke-build**

```bash
pnpm typecheck
```

- [ ] **Step 4: Manual check**

As an agent with no acting customer:
- PDP "Add to cart" → disabled, tooltip "Select a customer first".
- Cart drawer / cart page checkout button → same.

After selecting a customer → both enabled.

- [ ] **Step 5: Commit**

```bash
git add <each modified file>
git commit -m "feat(cart,pdp): disable add-to-cart and checkout without acting customer"
```

### Task P15: Replace inline role checks with helper

**Files:**
- Modify: `src/modules/account/components/order-details/index.tsx:32`
- Modify: `src/modules/account/components/orders-table/index.tsx:136`

- [ ] **Step 1: Replace the magic strings**

In each file:

```tsx
// before:
const isAgent = customer?.role === 'agent' || customer?.role === 'admin'

// after:
import { isAgentOrAdmin } from '@/lib/util/roles'
const isAgent = isAgentOrAdmin(customer)
```

(Variable name kept as `isAgent` since the rest of the file uses it; see spec §6.1 — naming change is out of scope.)

- [ ] **Step 2: Smoke-build**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/account/components/order-details/index.tsx \
        src/modules/account/components/orders-table/index.tsx
git commit -m "refactor(account): use isAgentOrAdmin helper for role check"
```

### Task P16: Manual end-to-end checklist

**Files:** none.

Run the dev server and walk the spec §8 E2E checklist with a real agent account:

- [ ] **Step 1:** Log in as an agent (impersonate from saas-admin-ui or use seeded credentials). Confirm sub-header shows "Select customer", catalog shows the callout, "Add to cart" is disabled.

- [ ] **Step 2:** Open the selector. Confirm the default 10 list loads (server log shows `searchCustomers({ query: "", limit: 10 })`).

- [ ] **Step 3:** Type "ac" — confirm a debounced re-fetch happens (one network request after typing pauses), and results filter.

- [ ] **Step 4:** Pick customer X. Confirm:
  - Cookie `actingCustomerId` is set in DevTools.
  - Page server-refreshes (check Network tab).
  - Catalog shows X's prices.
  - Cart icon shows the empty state for X.
  - Add an item to cart.

- [ ] **Step 5:** Switch to customer Y. Confirm:
  - Cookie value updates.
  - X's cart items disappear from view.
  - Y starts fresh (or shows Y's previously saved cart if any).

- [ ] **Step 6:** Switch back to X. Confirm X's cart contents are restored.

- [ ] **Step 7:** Log out, log back in same browser. Confirm X is still selected (cookie persisted).

- [ ] **Step 8:** Open in a fresh browser/incognito → no cookie, no selection.

- [ ] **Step 9:** Log in as a normal B2B end-customer. Confirm no sub-header, no callout, no behavior change. "Add to cart" works as before.

- [ ] **Step 10:** Place an order while acting as X. Confirm in admin UI that the order is recorded against customer X (not the agent's id).

If any step fails: open an issue or amend the relevant task in this plan, do not skip.

### Task P17: Push portal branch and open PR

- [ ] **Step 1:** Push and open PR

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal
git push -u origin feat/agent-customer-selector
gh pr create --base main --title "feat(portal): agent/admin customer selector" --body "$(cat <<'EOF'
## Summary
- Cookie-backed acting-customer selection for agent/admin roles
- Server-side getActingCustomer() drives prices, configurator, checkout
- Per-customer carts (each customer keeps their own)
- Sub-header selector with server-side debounced search
- Callout + disabled cart actions when no customer is selected

## Test plan
- [ ] Backend `searchCustomers` query merged to develop (depends on backend PR)
- [ ] All portal unit tests pass
- [ ] Manual E2E checklist (spec §8) walked end-to-end
- [ ] B2B end-customer logged in → no behavior change

## Spec
docs/superpowers/specs/2026-04-28-agent-customer-selector-design.md
EOF
)"
```

---

## Self-Review Notes (run before merging)

Spec coverage check:

- §4 backend → Task B1 ✓
- §5 SDK wrapper → Task P2 ✓
- §6.1 roles helpers → Task P1, used in P13/P15 ✓
- §6.2 cookie persistence → Tasks P3 (client) + P4 (server) ✓
- §6.3 ActingCustomerContext → Task P5 ✓
- §6.4 provider mount (root + account) → Tasks P6, P7 ✓
- §6.5 cart re-key → Task P8 ✓
- §6.6 swap surface (5 sites) → Tasks P9 (data layer), P10 (configurator), P11 (checkout); cart already in P8 ✓
- §6.7 sub-header row → Task P13 ✓
- §6.8 selector component → Task P12 ✓
- §6.9 callout → Task P13 ✓
- §6.10 disabled cart actions → Task P14 ✓
- §6.11 out-of-scope items deferred — no tasks needed ✓
- §8 testing — all tests defined inline; manual checklist as Task P16 ✓
- §9 rollout — Tasks B3, P17 ✓
- §10 risks — race guard in Task P8 step 4; stale cookie clearing in Task P4 step 3; selector mobile sheet noted as follow-up in Task P12 step 4 ✓

No placeholders in normative tasks. Function/type names consistent: `getActingCustomer`, `getActingCustomerId`, `useActingCustomer`, `setActingCustomer`, `clearActingCustomer`, `ActingCustomerProvider`, `actingCustomer`, `ACTING_CUSTOMER_COOKIE`, `setActingCustomerCookie`, `clearActingCustomerCookie`, `readActingCustomerCookie`, `searchCustomers`, `SearchCustomerArgs`, `SearchCustomerResult` — used identically across all tasks.
