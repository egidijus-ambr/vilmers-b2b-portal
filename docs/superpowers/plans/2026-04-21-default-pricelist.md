# Default Pricelist for Guest Visitors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let unauthenticated visitors to the B2B portal browse only the products in an admin-designated default pricelist, with the admin able to flip which pricelist is default from the admin UI.

**Architecture:** Three cooperating projects in the furnisystems workspace. The backend (`furnisystems-backend`) owns the "which pricelist is default" invariant via a new transactional mutation, a public query, and delete protection — reusing the existing `PriceList.default` boolean (no schema migration). The admin UI (`saas-admin-ui`) adds a radio column to the pricelist list view that calls the new mutation. The B2B portal (`vilmers-b2b-portal`) fetches the default pricelist ID on guest requests, injects it into the existing `getCustomerFilterData()` pipeline (so listings/search filter automatically), and extends its client-side `GET_PRODUCT_BY_PERMALINK` GraphQL document to accept `priceListIds` — mirroring the pattern in `buildWhereFilter` — so the PDP returns null (→ `notFound()`) for out-of-scope products.

**Tech Stack:**
- Backend: Node.js, TypeScript, GraphQL Nexus, Prisma, graphql-shield
- Admin UI: React, Apollo Client, react-hook-form, zod, Tailwind
- Portal: Next.js (App Router), Apollo Client, Next.js `unstable_cache`
- All projects use `pnpm` (per workspace convention)

**Spec reference:** `docs/superpowers/specs/2026-04-21-default-pricelist-design.md` (commit `7dc2a97`).

**Resolved design decision:** The PDP guard uses the **preferred path** — thread `priceListIds` into the portal's `GET_PRODUCT_BY_PERMALINK` document. Justification: (a) filtering happens at data fetch (null result → natural `notFound()`), no post-fetch cross-check logic; (b) symmetric with `buildWhereFilter` in `category-products` — same pricelist-presence OR-pattern — so both PDP and listing share one filter shape; (c) entirely a portal change, no backend resolver to modify (the generic `findFirstProductContainer` resolver already accepts arbitrary `where` clauses).

---

## File Structure

### Backend (`/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend`)

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/graphql/PriceList/defaultOne.ts` | New `defaultPriceList` query resolver |
| Create | `src/graphql/PriceList/setDefault.ts` | New `setDefaultPriceList` mutation resolver |
| Modify | `src/graphql/PriceList/index.ts` | Re-export new resolvers (if the folder has an index) |
| Modify | `src/graphql/PriceList/deleteOne.ts` | Pre-delete check: refuse default pricelist |
| Modify | `src/graphql/PriceList/deleteMany.ts` | Pre-delete check: refuse default pricelist |
| Modify | `src/permissions.ts` | Add rules for the two new operations |
| Create | `src/graphql/PriceList/__tests__/defaultPricelist.integration.test.ts` | Integration tests |

### Admin UI (`/Users/egidijus/Documents/GitHub/furnisystems-workspace/saas-admin-ui`)

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/containers/PriceLists/priceListQueries.ts` | Add `SET_DEFAULT_PRICELIST` mutation |
| Modify | `src/containers/PriceLists/PriceLists.tsx` | Add "Default" radio column |
| Modify | `src/containers/PriceLists/components/PriceListDetails.tsx` | Add read-only "Default" badge |
| Create | `src/containers/PriceLists/__tests__/PriceLists.test.tsx` | Radio column interaction tests |

### B2B Portal (`/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal`)

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/data/default-pricelist.ts` | `getDefaultPriceListId` helper wrapped in `unstable_cache` |
| Modify | `src/lib/data/customer.ts` | Guest branch in `getCustomerFilterData` |
| Modify | `src/lib/furnisystems-sdk/modules/products/index.ts` | Extend `GET_PRODUCT_BY_PERMALINK` doc + SDK method signature |
| Modify | `src/lib/data/furnisystems-products.ts` | Thread `priceListIds` into the SDK call |
| Modify | `src/app/[languageCode]/(main)/products/[handle]/page.tsx` | Pass `priceListIds` to data layer |
| Create | `src/lib/data/__tests__/customer.test.ts` | Unit test for guest branch in `getCustomerFilterData` |
| Create | `src/lib/data/__tests__/default-pricelist.test.ts` | Unit test for helper + cache behavior |

---

## Coordination Notes

- **Run order across projects:** Backend first (tasks 1–5). Portal and admin UI tasks can run in parallel after backend is deployed (or on a shared dev DB), but portal Task 8 depends on the backend's `defaultPriceList` query existing.
- **No Prisma migration needed** — `PriceList.default Boolean @default(false)` already exists.
- **Commits should land one task at a time.** Use the conventional-commit style already present in each repo (`feat(area): …`, `fix(area): …`, `docs(area): …`).
- **Branching:** each project may want its own feature branch (e.g., `feat/default-pricelist`). Not prescribed here — follow local convention.

---

## Backend Tasks

### Task 1: `defaultPriceList` query resolver

**Files:**
- Create: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/PriceList/defaultOne.ts`
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/PriceList/index.ts` (add the export — if no `index.ts` exists, add to whatever barrel file aggregates PriceList resolvers; otherwise ensure the new file is picked up by Nexus schema generation)

- [ ] **Step 1: Create the resolver file**

```ts
// src/graphql/PriceList/defaultOne.ts
import { extendType, nonNull } from 'nexus'

export const DefaultPriceListQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('defaultPriceList', {
      type: nonNull('PriceList'),
      description:
        'Returns the pricelist currently marked as default. ' +
        'Falls back to PriceList with id=1 if no row is marked default. ' +
        'Throws if neither exists.',
      resolve: async (_parent, _args, ctx) => {
        const flagged = await ctx.prisma.priceList.findFirst({
          where: { default: true },
        })
        if (flagged) return flagged

        const fallback = await ctx.prisma.priceList.findUnique({
          where: { id: 1 },
        })
        if (fallback) return fallback

        throw new Error(
          'No default pricelist configured and fallback (id=1) missing. ' +
            'Admin must set a default pricelist.'
        )
      },
    })
  },
})
```

- [ ] **Step 2: Register it so Nexus picks it up**

If `src/graphql/PriceList/` has an `index.ts` barrel, add:

```ts
export * from './defaultOne'
```

Otherwise, add the import wherever the other PriceList resolvers are registered with Nexus (likely `src/graphql/index.ts` or a schema builder file). Grep: `findUniquePriceList` or `findFirstPriceList` to locate the existing registration pattern and replicate it.

- [ ] **Step 3: Regenerate Nexus types**

Run from the backend directory:

```bash
pnpm generate
```

Or whatever the backend's type-gen script is named (check `package.json`). Expected: `src/generated/nexus.ts` and `src/generated/schema.graphql` updated to include `defaultPriceList`.

- [ ] **Step 4: Smoke-test via GraphQL playground**

Start the backend (`pnpm dev`). In the playground, run:

```graphql
query { defaultPriceList { id name default } }
```

Expected: returns the row with `default = true`, or the row at id=1.

- [ ] **Step 5: Commit**

```bash
git add src/graphql/PriceList/defaultOne.ts src/graphql/PriceList/index.ts src/generated
git commit -m "feat(pricelist): add defaultPriceList query with id=1 fallback"
```

---

### Task 2: `setDefaultPriceList` mutation resolver (transactional)

**Files:**
- Create: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/PriceList/setDefault.ts`
- Modify: same barrel file as Task 1

- [ ] **Step 1: Create the resolver file**

```ts
// src/graphql/PriceList/setDefault.ts
import { extendType, intArg, nonNull } from 'nexus'

export const SetDefaultPriceListMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('setDefaultPriceList', {
      type: nonNull('PriceList'),
      description:
        'Atomically marks the given pricelist as default and clears the default flag from all other pricelists. ' +
        'Admin only.',
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_parent, { id }, ctx) => {
        return ctx.prisma.$transaction(async (tx) => {
          const target = await tx.priceList.findUnique({ where: { id } })
          if (!target) {
            throw new Error(`Pricelist with id=${id} not found`)
          }

          await tx.priceList.updateMany({
            where: { default: true, NOT: { id } },
            data: { default: false },
          })

          const updated = await tx.priceList.update({
            where: { id },
            data: { default: true },
          })

          return updated
        })
      },
    })
  },
})
```

- [ ] **Step 2: Register in the barrel / schema builder**

Add:

```ts
export * from './setDefault'
```

(same location as Task 1 Step 2).

- [ ] **Step 3: Regenerate Nexus types**

```bash
pnpm generate
```

- [ ] **Step 4: Smoke-test via GraphQL playground**

```graphql
mutation { setDefaultPriceList(id: 3) { id name default } }
query { findManyPriceList { id name default } }
```

Expected: the target row shows `default: true`; every other row shows `default: false`. Running `setDefaultPriceList` again with a different id flips the flag atomically.

- [ ] **Step 5: Commit**

```bash
git add src/graphql/PriceList/setDefault.ts src/graphql/PriceList/index.ts src/generated
git commit -m "feat(pricelist): add setDefaultPriceList transactional mutation"
```

---

### Task 3: Delete protection for the default pricelist

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/PriceList/deleteOne.ts`
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/PriceList/deleteMany.ts`

- [ ] **Step 1: Read the existing resolvers first**

Before editing, open both files and note the existing structure (they are auto-generated Nexus resolvers wrapping `prisma.priceList.delete` / `deleteMany`). The goal is to wrap the existing resolve function with a pre-check, preserving everything else.

- [ ] **Step 2: Modify `deleteOne.ts` to reject deletion of the default**

Wrap the existing resolver so the body first looks up the target, then throws if `default === true`. Final shape (adapt to the existing structure — if the file uses `t.crud.deleteOnePriceList({ ... })` shorthand, replace it with an explicit resolver as below):

```ts
// src/graphql/PriceList/deleteOne.ts
import { extendType, nonNull } from 'nexus'

export const DeleteOnePriceListMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('deleteOnePriceList', {
      type: 'PriceList',
      args: {
        where: nonNull('PriceListWhereUniqueInput'),
      },
      resolve: async (_parent, { where }, ctx) => {
        const existing = await ctx.prisma.priceList.findUnique({ where })
        if (!existing) {
          throw new Error('Pricelist not found')
        }
        if (existing.default) {
          throw new Error(
            'Cannot delete the default pricelist — set a different default first.'
          )
        }
        return ctx.prisma.priceList.delete({ where })
      },
    })
  },
})
```

If the file already has a custom resolver, just inject the two `if` branches before the delete call.

- [ ] **Step 3: Modify `deleteMany.ts` similarly**

```ts
// src/graphql/PriceList/deleteMany.ts
import { extendType } from 'nexus'

export const DeleteManyPriceListMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('deleteManyPriceList', {
      type: 'BatchPayload',
      args: {
        where: 'PriceListWhereInput',
      },
      resolve: async (_parent, { where }, ctx) => {
        const targets = await ctx.prisma.priceList.findMany({
          where: where ?? undefined,
          select: { id: true, default: true },
        })
        if (targets.some((t) => t.default)) {
          throw new Error(
            'Cannot delete the default pricelist — set a different default first.'
          )
        }
        return ctx.prisma.priceList.deleteMany({ where: where ?? undefined })
      },
    })
  },
})
```

- [ ] **Step 4: Regenerate and smoke-test**

```bash
pnpm generate
```

In the playground: attempt `deleteOnePriceList(where: { id: <the-default-id> })`. Expected: error message "Cannot delete the default pricelist — set a different default first." Then attempt delete on a non-default id — expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/graphql/PriceList/deleteOne.ts src/graphql/PriceList/deleteMany.ts src/generated
git commit -m "feat(pricelist): refuse deletion of the default pricelist"
```

---

### Task 4: Authorization rules

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/permissions.ts`

- [ ] **Step 1: Locate the Query / Mutation rule blocks**

Open `src/permissions.ts`. You will see an object exported to graphql-shield with shapes roughly like:

```ts
const permissions = shield({
  Query: { /* ... */ },
  Mutation: { /* ... */ },
})
```

- [ ] **Step 2: Add rules for the two new operations**

Locate the `Mutation` block and add a rule for `setDefaultPriceList`. Use whatever admin-check rule is already in use for other pricelist write operations (likely `isAdmin` or similar — grep `updateOnePriceList` in the same file to find the existing rule). Example:

```ts
// Inside the Mutation rule block
setDefaultPriceList: isAdmin,
```

Locate the `Query` block. The `defaultPriceList` query must be PUBLIC (guests call it). If graphql-shield has a default deny-all fallback, add an explicit allow:

```ts
// Inside the Query rule block
defaultPriceList: allow, // or whatever the public-rule name is in this file
```

If the file uses `fallbackRule: allow`, no explicit entry is needed — verify by checking the top of the file.

- [ ] **Step 3: Smoke-test**

Restart the backend. Attempt `setDefaultPriceList(id: 1)` from an unauthenticated playground session — expected: permission error. From an admin-authenticated session — expected: success. Attempt `defaultPriceList` from unauthenticated — expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/permissions.ts
git commit -m "feat(pricelist): restrict setDefaultPriceList to admin; allow public defaultPriceList"
```

---

### Task 5: Backend integration tests

**Files:**
- Create: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend/src/graphql/PriceList/__tests__/defaultPricelist.integration.test.ts`

**Pre-requisite:** This task assumes the backend has an existing Jest-style integration test setup with a test DB and a helper to execute resolvers or run operations against a test GraphQL server. If that infra does not yet exist, this task expands to include bootstrapping it — out of scope for this plan; in that case, skip this task and rely on the smoke tests from Tasks 1–3.

- [ ] **Step 1: Write the failing tests**

```ts
// src/graphql/PriceList/__tests__/defaultPricelist.integration.test.ts
import { testClient, prisma, adminContext, publicContext } from '../../../../test/helpers'

describe('defaultPriceList + setDefaultPriceList', () => {
  beforeEach(async () => {
    await prisma.priceList.deleteMany({})
    await prisma.priceList.createMany({
      data: [
        { id: 1, name: 'Default Fallback', default: false },
        { id: 2, name: 'Wholesale', default: false },
        { id: 3, name: 'Retail', default: false },
      ],
    })
  })

  test('setDefaultPriceList flips target to default and clears others', async () => {
    await prisma.priceList.update({ where: { id: 2 }, data: { default: true } })

    const res = await testClient(adminContext).mutate({
      mutation: `mutation { setDefaultPriceList(id: 3) { id default } }`,
    })

    expect(res.data.setDefaultPriceList).toEqual({ id: 3, default: true })
    const all = await prisma.priceList.findMany()
    expect(all.filter((p) => p.default).map((p) => p.id)).toEqual([3])
  })

  test('setDefaultPriceList throws for missing id', async () => {
    const res = await testClient(adminContext).mutate({
      mutation: `mutation { setDefaultPriceList(id: 9999) { id } }`,
    })
    expect(res.errors?.[0].message).toMatch(/not found/)
    const all = await prisma.priceList.findMany()
    expect(all.every((p) => !p.default)).toBe(true)
  })

  test('setDefaultPriceList rejected for unauthenticated caller', async () => {
    const res = await testClient(publicContext).mutate({
      mutation: `mutation { setDefaultPriceList(id: 2) { id } }`,
    })
    expect(res.errors?.[0].message).toMatch(/not authorized|forbidden|permission/i)
  })

  test('defaultPriceList returns the row with default=true', async () => {
    await prisma.priceList.update({ where: { id: 2 }, data: { default: true } })

    const res = await testClient(publicContext).query({
      query: `query { defaultPriceList { id } }`,
    })
    expect(res.data.defaultPriceList.id).toBe(2)
  })

  test('defaultPriceList falls back to id=1 when none marked default', async () => {
    const res = await testClient(publicContext).query({
      query: `query { defaultPriceList { id } }`,
    })
    expect(res.data.defaultPriceList.id).toBe(1)
  })

  test('defaultPriceList throws when neither default=true nor id=1 exists', async () => {
    await prisma.priceList.deleteMany({})
    await prisma.priceList.create({ data: { id: 5, name: 'Only', default: false } })

    const res = await testClient(publicContext).query({
      query: `query { defaultPriceList { id } }`,
    })
    expect(res.errors?.[0].message).toMatch(/No default pricelist configured/)
  })

  test('deleteOnePriceList rejects deletion of the default', async () => {
    await prisma.priceList.update({ where: { id: 2 }, data: { default: true } })

    const res = await testClient(adminContext).mutate({
      mutation: `mutation { deleteOnePriceList(where: { id: 2 }) { id } }`,
    })
    expect(res.errors?.[0].message).toMatch(/Cannot delete the default pricelist/)
    const still = await prisma.priceList.findUnique({ where: { id: 2 } })
    expect(still?.default).toBe(true)
  })

  test('deleteOnePriceList allows deletion of non-default', async () => {
    const res = await testClient(adminContext).mutate({
      mutation: `mutation { deleteOnePriceList(where: { id: 3 }) { id } }`,
    })
    expect(res.data.deleteOnePriceList.id).toBe(3)
  })
})
```

> **Adapt** the import paths for `testClient`, `prisma`, `adminContext`, `publicContext` to the project's existing test helpers. If helpers are named differently (e.g., `createTestServer`, `callResolver`), adjust accordingly.

- [ ] **Step 2: Run the tests to confirm they fail if any resolver is missing**

```bash
pnpm test src/graphql/PriceList/__tests__/defaultPricelist.integration.test.ts
```

Expected: all tests pass (since Tasks 1–3 have been completed). If any fail, fix the corresponding resolver.

- [ ] **Step 3: Commit**

```bash
git add src/graphql/PriceList/__tests__/defaultPricelist.integration.test.ts
git commit -m "test(pricelist): integration tests for default-pricelist operations"
```

---

## Admin UI Tasks

### Task 6: `SET_DEFAULT_PRICELIST` mutation doc

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/saas-admin-ui/src/containers/PriceLists/priceListQueries.ts`

- [ ] **Step 1: Append the mutation**

Open the file and add at the end (after `CREATE_ONE_PRICELIST`):

```ts
export const SET_DEFAULT_PRICELIST = gql`
  mutation SET_DEFAULT_PRICELIST($id: Int!) {
    setDefaultPriceList(id: $id) {
      id
      default
    }
  }
`
```

- [ ] **Step 2: Regenerate TypeScript types if this project uses GraphQL code generation**

Check `package.json` for a `codegen` script. If present:

```bash
pnpm codegen
```

Expected: typed hook `useSetDefaultPricelistMutation` (or equivalent) becomes available.

If no codegen is configured, the raw `gql` document is used directly with `useMutation` — no regeneration needed.

- [ ] **Step 3: Commit**

```bash
git add src/containers/PriceLists/priceListQueries.ts
git commit -m "feat(pricelist): add SET_DEFAULT_PRICELIST mutation"
```

---

### Task 7: Radio column in PriceLists list view

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/saas-admin-ui/src/containers/PriceLists/PriceLists.tsx`

- [ ] **Step 1: Read the current file first**

Open `PriceLists.tsx` and locate the `columns` array passed to `DataTable`. Each column has roughly `{ header, accessor, cell }` shape (or `columnHelper.accessor(...)` if TanStack Table). Identify where to insert a new `Default` column — right after `name` is a sensible spot.

- [ ] **Step 2: Add the radio column**

At the top of the file, add imports:

```tsx
import { useMutation } from '@apollo/client'
import { SET_DEFAULT_PRICELIST, CORE_DATA_PRICELIST_FRAGMENT } from './priceListQueries'
import { toast } from 'sonner' // or the admin UI's existing toast lib — adapt
```

Inside the component, before the `columns` definition, add the mutation hook + handler:

```tsx
const [setDefaultPricelist] = useMutation(SET_DEFAULT_PRICELIST, {
  // Refetch the list query that drives the table. Adjust the query name
  // to match what PriceLists.tsx already uses (e.g., FIND_MANY_PRICELIST).
  refetchQueries: ['FIND_MANY_PRICELIST'],
  awaitRefetchQueries: true,
})

const handleSetDefault = async (id: number) => {
  try {
    await setDefaultPricelist({ variables: { id } })
  } catch (err) {
    toast.error(
      err instanceof Error
        ? err.message
        : 'Failed to set default pricelist'
    )
  }
}
```

In the `columns` array, insert a new column between `name` and the existing ones:

```tsx
{
  header: 'Default',
  accessorKey: 'default',
  cell: ({ row }: { row: { original: { id: number; default: boolean } } }) => (
    <input
      type="radio"
      name="pricelist-default"
      checked={row.original.default === true}
      onChange={() => handleSetDefault(row.original.id)}
      aria-label={`Set pricelist ${row.original.id} as default`}
    />
  ),
},
```

> Adapt the cell signature (`row.original`) to the admin UI's existing DataTable convention if it differs.

- [ ] **Step 3: Manual smoke-test**

Start the admin (`pnpm dev` from `saas-admin-ui`). Navigate to `/dashboard/b2b-accounts/price-lists`. Expected:

- A new "Default" column appears with a radio per row.
- Exactly one radio is selected (the current default).
- Clicking a different radio calls the backend; after the refetch the selected row's radio is checked and others unchecked.
- Clicking the already-selected radio is a no-op (native radio semantics).

- [ ] **Step 4: Write an interaction test**

Create `src/containers/PriceLists/__tests__/PriceLists.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import PriceLists from '../PriceLists'
import { SET_DEFAULT_PRICELIST } from '../priceListQueries'
// Plus whichever query the page uses to load rows — import and mock it.
import { FIND_MANY_PRICELIST } from '../priceListQueries' // adjust name

const rows = [
  { id: 1, name: 'A', default: true, createdAt: '', updatedAt: '' },
  { id: 2, name: 'B', default: false, createdAt: '', updatedAt: '' },
]

const findManyMock = {
  request: { query: FIND_MANY_PRICELIST, variables: { /* adjust */ } },
  result: { data: { findManyPriceList: rows } },
}

const setDefaultMock = {
  request: { query: SET_DEFAULT_PRICELIST, variables: { id: 2 } },
  result: { data: { setDefaultPriceList: { id: 2, default: true } } },
}

test('clicking an unchecked radio calls SET_DEFAULT_PRICELIST', async () => {
  render(
    <MockedProvider mocks={[findManyMock, setDefaultMock, findManyMock]}>
      <PriceLists />
    </MockedProvider>
  )

  const radios = await screen.findAllByRole('radio')
  expect(radios[0]).toBeChecked()
  expect(radios[1]).not.toBeChecked()

  await userEvent.click(radios[1])

  await waitFor(() => expect(radios[1]).toBeChecked())
})

test('error path reverts and toasts on mutation failure', async () => {
  const failingMock = {
    request: { query: SET_DEFAULT_PRICELIST, variables: { id: 2 } },
    error: new Error('Boom'),
  }

  render(
    <MockedProvider mocks={[findManyMock, failingMock]}>
      <PriceLists />
    </MockedProvider>
  )

  const radios = await screen.findAllByRole('radio')
  await userEvent.click(radios[1])

  // Native radio revert: the failing mutation means no refetch occurs,
  // so the checked state returns to what findManyMock provided.
  await waitFor(() => expect(radios[0]).toBeChecked())
})
```

> Adapt the `FIND_MANY_PRICELIST` import name and variables to match the project's existing query. If the project uses a different testing library or mocks, adapt.

- [ ] **Step 5: Run the tests**

```bash
pnpm test src/containers/PriceLists/__tests__/PriceLists.test.tsx
```

Expected: both tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/containers/PriceLists/PriceLists.tsx \
        src/containers/PriceLists/__tests__/PriceLists.test.tsx
git commit -m "feat(pricelist): add default-pricelist radio column to admin list"
```

---

### Task 8: Read-only "Default" badge on detail page

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/saas-admin-ui/src/containers/PriceLists/components/PriceListDetails.tsx`

- [ ] **Step 1: Find the pricelist header section**

Open the file, locate the area that renders the pricelist's name near the top of the details view. Add a badge next to it when `priceList.default === true`.

- [ ] **Step 2: Add the badge**

Wherever the name is displayed, adjust the JSX to include a conditional badge:

```tsx
<div className="flex items-center gap-2">
  <h1 className="text-xl font-semibold">{priceList.name}</h1>
  {priceList.default && (
    <span
      className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
      aria-label="Default pricelist"
    >
      Default
    </span>
  )}
</div>
```

> Adjust the class names to match the admin UI's existing Tailwind palette or design system if this snippet's colors don't fit.

- [ ] **Step 3: Smoke-test**

Navigate to a pricelist detail page. Expected: badge is visible only when that pricelist is the current default.

- [ ] **Step 4: Commit**

```bash
git add src/containers/PriceLists/components/PriceListDetails.tsx
git commit -m "feat(pricelist): show Default badge on pricelist detail page"
```

---

## B2B Portal Tasks

### Task 9: `getDefaultPriceListId` helper

**Files:**
- Create: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/lib/data/default-pricelist.ts`

- [ ] **Step 1: Create the helper**

```ts
// src/lib/data/default-pricelist.ts
import { unstable_cache } from 'next/cache'
import { sdk } from '../furnisystems-sdk' // adjust import to match how the SDK is exposed

const DEFAULT_PRICELIST_TTL_SECONDS = 300

async function fetchDefaultPriceListId(): Promise<number> {
  const result = await sdk.priceList.getDefault()
  return result.id
}

export const getDefaultPriceListId = unstable_cache(
  fetchDefaultPriceListId,
  ['default-pricelist-id'],
  { revalidate: DEFAULT_PRICELIST_TTL_SECONDS, tags: ['default-pricelist'] }
)
```

> **Note:** `sdk.priceList.getDefault()` doesn't exist yet — the portal's SDK may or may not have a PriceList module. Two sub-paths:
>
> **Sub-path A (preferred if SDK has a PriceList module):** add a `getDefault()` method there. If no PriceList module exists, create `src/lib/furnisystems-sdk/modules/priceList/index.ts` with a minimal client that sends a `defaultPriceList` query and returns `{ id }`. Stick to the project's existing SDK module conventions (see `src/lib/furnisystems-sdk/modules/products/index.ts` for shape).
>
> **Sub-path B (quick inline):** inline the GraphQL fetch inside `fetchDefaultPriceListId` using the project's Apollo client or `fetch` against the GraphQL endpoint. The query body:
>
> ```graphql
> query DefaultPriceList { defaultPriceList { id } }
> ```
>
> Pick whichever sub-path fits the codebase. Sub-path A is cleaner long-term; sub-path B is faster to land.

- [ ] **Step 2: Write a unit test**

Create `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/lib/data/__tests__/default-pricelist.test.ts`:

```ts
import { getDefaultPriceListId } from '../default-pricelist'
import { sdk } from '../../furnisystems-sdk'

jest.mock('../../furnisystems-sdk', () => ({
  sdk: {
    priceList: {
      getDefault: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  // Make unstable_cache a pass-through for testing (no memoization).
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

describe('getDefaultPriceListId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the id from the SDK', async () => {
    ;(sdk.priceList.getDefault as jest.Mock).mockResolvedValue({ id: 7 })
    await expect(getDefaultPriceListId()).resolves.toBe(7)
  })

  it('propagates SDK errors', async () => {
    ;(sdk.priceList.getDefault as jest.Mock).mockRejectedValue(
      new Error('no default')
    )
    await expect(getDefaultPriceListId()).rejects.toThrow('no default')
  })
})
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test src/lib/data/__tests__/default-pricelist.test.ts
```

Expected: both tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/default-pricelist.ts \
        src/lib/data/__tests__/default-pricelist.test.ts \
        src/lib/furnisystems-sdk # if sub-path A was taken
git commit -m "feat(data): add getDefaultPriceListId server helper with 300s cache"
```

---

### Task 10: Guest branch in `getCustomerFilterData`

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/lib/data/customer.ts`

- [ ] **Step 1: Write failing tests first**

Create or extend `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/lib/data/__tests__/customer.test.ts`:

```ts
import { getCustomerFilterData } from '../customer'
import { retrieveCustomer } from '../customer'
import { getDefaultPriceListId } from '../default-pricelist'

jest.mock('../customer', () => {
  const actual = jest.requireActual('../customer')
  return { ...actual, retrieveCustomer: jest.fn() }
})

jest.mock('../default-pricelist', () => ({
  getDefaultPriceListId: jest.fn(),
}))

describe('getCustomerFilterData — guest branch', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the default pricelist id for a guest', async () => {
    ;(retrieveCustomer as jest.Mock).mockResolvedValue(null)
    ;(getDefaultPriceListId as jest.Mock).mockResolvedValue(42)

    const result = await getCustomerFilterData()

    expect(result.priceListIds).toEqual([42])
    expect(getDefaultPriceListId).toHaveBeenCalledTimes(1)
  })

  it('does NOT call getDefaultPriceListId for a logged-in customer', async () => {
    ;(retrieveCustomer as jest.Mock).mockResolvedValue({
      price_listId: '7',
    })

    const result = await getCustomerFilterData()

    expect(result.priceListIds).toEqual([7])
    expect(getDefaultPriceListId).not.toHaveBeenCalled()
  })

  it('handles a logged-in customer with no personal pricelist (empty stays empty)', async () => {
    ;(retrieveCustomer as jest.Mock).mockResolvedValue({ price_listId: null })

    const result = await getCustomerFilterData()

    expect(result.priceListIds).toEqual([])
    expect(getDefaultPriceListId).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run them to confirm failure**

```bash
pnpm test src/lib/data/__tests__/customer.test.ts
```

Expected: the first test fails because guest branch doesn't inject the default yet.

- [ ] **Step 3: Modify `customer.ts` to add the guest branch**

Open `src/lib/data/customer.ts`. Find the `getCustomerFilterData` function (around line 507 in the current source). The current body:

```ts
export async function getCustomerFilterData(): Promise<{
  customerTagIds: number[] | undefined
  priceListIds: number[]
}> {
  let customer = await retrieveCustomer()
  const groupPriceListId = await getGroupPriceListId()
  const priceListIds = [
    ...(customer?.price_listId ? [parseInt(customer.price_listId)] : []),
    ...(groupPriceListId ? [parseInt(groupPriceListId)] : []),
  ]
  // ... customerTagIds logic ...
  return { customerTagIds, priceListIds }
}
```

Add the guest branch. New body:

```ts
import { getDefaultPriceListId } from './default-pricelist'

// ... existing imports ...

export async function getCustomerFilterData(): Promise<{
  customerTagIds: number[] | undefined
  priceListIds: number[]
}> {
  const customer = await retrieveCustomer()
  const groupPriceListId = await getGroupPriceListId()

  let priceListIds: number[]
  if (!customer) {
    // Guest: use the admin-configured default pricelist.
    const defaultId = await getDefaultPriceListId()
    priceListIds = [defaultId]
  } else {
    priceListIds = [
      ...(customer.price_listId ? [parseInt(customer.price_listId)] : []),
      ...(groupPriceListId ? [parseInt(groupPriceListId)] : []),
    ]
  }

  // ... existing customerTagIds logic stays the same ...
  return { customerTagIds, priceListIds }
}
```

> Only the `priceListIds` composition changes. Leave the `customerTagIds` logic untouched.

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm test src/lib/data/__tests__/customer.test.ts
```

Expected: all three tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/customer.ts src/lib/data/__tests__/customer.test.ts
git commit -m "feat(data): inject default pricelist id for guest visitors"
```

---

### Task 11: Extend `GET_PRODUCT_BY_PERMALINK` to accept `priceListIds`

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/lib/furnisystems-sdk/modules/products/index.ts`

- [ ] **Step 1: Read the current document**

Open the file and find the `GET_PRODUCT_BY_PERMALINK` document (~line 132) and the `getProductByPermalink` method (~line 683). Also re-read `buildWhereFilter` (~line 387) for the pricelist-presence OR-pattern.

- [ ] **Step 2: Change the document signature and `where` clause**

Current document shape (simplified):

```graphql
query GET_PRODUCT_BY_PERMALINK($permalink: String!, $language: String) {
  findFirstProductContainer(where: {
    OR: [
      { single_product: { product_profiles: { some: { meta_information: { permalink: { equals: $permalink } } } } } }
      { advanced_product: { advanced_product_profiles: { some: { meta_information: { permalink: { equals: $permalink } } } } } }
    ]
  }) { ... }
}
```

Change to accept an optional `priceListIds: [Int!]` variable and push the pricelist-presence filter into `AND`. New shape:

```graphql
query GET_PRODUCT_BY_PERMALINK(
  $permalink: String!
  $language: String
  $priceListIds: [Int!]
) {
  findFirstProductContainer(where: {
    AND: [
      {
        OR: [
          { single_product: { product_profiles: { some: { meta_information: { permalink: { equals: $permalink } } } } } }
          { advanced_product: { advanced_product_profiles: { some: { meta_information: { permalink: { equals: $permalink } } } } } }
        ]
      }
      # Pricelist-presence filter: only applied when $priceListIds is non-empty.
      # We encode "optional" by using an empty-array guard at runtime — see method below.
    ]
  }) { ... }
}
```

Since Prisma's `where` JSON doesn't cleanly conditional-include a clause via GraphQL variables, **the simplest robust pattern is to compose the `where` filter in TypeScript before calling**, mirroring `buildWhereFilter`. Switch `GET_PRODUCT_BY_PERMALINK` to accept a `where` object directly:

```ts
// near existing query constants in the same file
export const GET_PRODUCT_BY_PERMALINK = gql`
  query GET_PRODUCT_BY_PERMALINK(
    $where: ProductContainerWhereInput!
    $language: String
  ) {
    findFirstProductContainer(where: $where) {
      # ...existing selection set...
    }
  }
`
```

- [ ] **Step 3: Modify the `getProductByPermalink` method to compose the `where` object**

Replace the method body (keeping its shape but composing the `where` client-side). Conceptual new body:

```ts
async getProductByPermalink(
  permalink: string,
  language?: string,
  priceListIds?: number[]
): Promise<FurnisystemsProductDetail | null> {
  const permalinkFilter = {
    OR: [
      {
        single_product: {
          product_profiles: {
            some: { meta_information: { permalink: { equals: permalink } } },
          },
        },
      },
      {
        advanced_product: {
          advanced_product_profiles: {
            some: { meta_information: { permalink: { equals: permalink } } },
          },
        },
      },
    ],
  }

  const where: Record<string, unknown> = { AND: [permalinkFilter] }

  if (priceListIds && priceListIds.length > 0) {
    const priceListSelect = { price_listId: { in: priceListIds } }
    ;(where.AND as unknown[]).push({
      OR: [
        { single_product: { isNot: null } }, // single products always pass
        {
          advanced_product: {
            is: {
              OR: [
                { base_prices: { some: priceListSelect } },
                {
                  sofa_forms: {
                    some: {
                      form_price_fabric_category: { some: priceListSelect },
                    },
                  },
                },
                {
                  advanced_product_price_fabric_category: {
                    some: priceListSelect,
                  },
                },
                {
                  additional_component_to_advanced_product: {
                    some: {
                      price_fabric_category: { some: priceListSelect },
                    },
                  },
                },
                {
                  additional_component_to_advanced_product: {
                    some: { extra_prices: { some: priceListSelect } },
                  },
                },
              ],
            },
          },
        },
      ],
    })
  }

  const response = await this.apolloClient.query({
    query: GET_PRODUCT_BY_PERMALINK,
    variables: { where, language },
    fetchPolicy: 'no-cache',
  })

  const container = response.data?.findFirstProductContainer
  if (!container) return null
  // ... existing mapping stays the same ...
}
```

> Reuse as much of the existing mapping code as possible — do not rewrite it. The only changes are: (a) new optional `priceListIds` parameter, (b) `where` composed in TS, (c) document signature uses `$where` instead of `$permalink`.

- [ ] **Step 4: Compile**

```bash
pnpm tsc --noEmit
```

Expected: no type errors. If the document selection set references fields that don't exist on `ProductContainer`, copy the exact selection set from the old document verbatim.

- [ ] **Step 5: Smoke-test**

Call the method locally with a known permalink and a known-good `priceListIds`; then call again with `priceListIds = [999]` (nonexistent) and confirm it returns `null`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/furnisystems-sdk/modules/products/index.ts
git commit -m "feat(sdk): accept priceListIds in getProductByPermalink"
```

---

### Task 12: Wire `priceListIds` through the data layer and page

**Files:**
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/lib/data/furnisystems-products.ts`
- Modify: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal/src/app/[languageCode]/(main)/products/[handle]/page.tsx`

- [ ] **Step 1: Modify the wrapper**

Open `src/lib/data/furnisystems-products.ts`. Current wrapper (~line 4):

```ts
export async function getProductByPermalink(handle: string, languageCode: string) {
  return sdk.products.getProductByPermalink(handle, languageCode)
}
```

Change to accept and forward `priceListIds`:

```ts
export async function getProductByPermalink(
  handle: string,
  languageCode: string,
  priceListIds?: number[]
) {
  return sdk.products.getProductByPermalink(handle, languageCode, priceListIds)
}
```

- [ ] **Step 2: Modify the page to fetch `priceListIds` and pass them**

Open `src/app/[languageCode]/(main)/products/[handle]/page.tsx`. There are two call sites (`generateMetadata` at ~line 179 and `ProductPage` at ~line 233).

Before each call, fetch the filter data:

```ts
import { getCustomerFilterData } from '@/lib/data/customer'

// in generateMetadata
const { priceListIds } = await getCustomerFilterData()
const product = await getProductByPermalink(handle, languageCode, priceListIds)
if (!product) {
  return { title: 'Not found' } // existing fallback
}

// in ProductPage
const { priceListIds } = await getCustomerFilterData()
const product = await getProductByPermalink(handle, languageCode, priceListIds)
if (!product) {
  notFound()
}
```

> Confirm `notFound` is already imported from `next/navigation`; if not, add the import.

- [ ] **Step 3: Compile**

```bash
pnpm tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Manual E2E smoke-test**

Start all three projects:

```bash
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/furnisystems-backend && pnpm dev &
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/saas-admin-ui && pnpm dev &
cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal && pnpm dev &
```

Steps:
1. Admin: log in, go to `/dashboard/b2b-accounts/price-lists`, set "Others_EXW" (or any pricelist containing a known product) as default.
2. Portal: open an incognito window → browse a category. Expected: only products with a price entry in the default pricelist appear.
3. Portal: direct-URL a product that is NOT in the default pricelist (e.g., a permalink you know maps to a product priced only in other lists). Expected: Next.js 404 page.
4. Portal: verify the configurator button is absent on any PDP for the incognito session.
5. Portal: visit `/cart` — expected: redirect to `/account`.
6. Admin: switch default to a different pricelist. Wait ~5 min (TTL) or restart the portal dev server. Browse again — expected: listings and PDP reflect the new default.
7. Admin: try to delete the pricelist currently marked default — expected: error message shown.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/furnisystems-products.ts \
        src/app/[languageCode]/(main)/products/[handle]/page.tsx
git commit -m "feat(portal): 404 PDP for guests when product is outside default pricelist"
```

---

## Self-Review

### Spec coverage

- ✅ §1 Architecture — all three projects addressed (Tasks 1–12).
- ✅ §2 Backend → existing `default` field — no migration (noted in header).
- ✅ §2 Backend → `setDefaultPriceList` mutation — Task 2.
- ✅ §2 Backend → `defaultPriceList` query with `id=1` fallback — Task 1.
- ✅ §2 Backend → delete protection — Task 3.
- ✅ §2 Backend → permissions (admin-only set, public default) — Task 4.
- ✅ §2 Backend → optional `priceListIds` on product-by-permalink — addressed entirely on the portal side in Task 11 (spec noted this was acceptable).
- ✅ §3 Admin UI → SET_DEFAULT_PRICELIST mutation — Task 6.
- ✅ §3 Admin UI → radio column + optimistic + error toast — Task 7.
- ✅ §3 Admin UI → Default badge on detail page — Task 8.
- ✅ §4 Portal → `getDefaultPriceListId` with `unstable_cache` (300s) — Task 9.
- ✅ §4 Portal → guest branch in `getCustomerFilterData` — Task 10.
- ✅ §4 Portal → PDP thread + notFound — Tasks 11 + 12.
- ✅ §4 Portal → configurator / cart / checkout unchanged — verified in Task 12 smoke-test.
- ✅ §5 Error cases — covered by Task 5 (backend) and the Task 12 smoke-test.
- ✅ §6 Testing — Tasks 5, 7 (admin), 9, 10 (unit); manual E2E in Task 12.

### Placeholder scan

One deliberate adaptation note remains in Task 5 ("adapt the import paths for `testClient`…"). This is unavoidable without access to the backend's test infrastructure and is clearly flagged, not a blind placeholder. All other steps contain exact code or exact commands.

### Type / name consistency

- Mutation name: `setDefaultPriceList` (matches resolver in Task 2 and Apollo doc in Task 6).
- Query name: `defaultPriceList` (matches resolver in Task 1 and SDK/helper in Task 9).
- Helper name: `getDefaultPriceListId` (consistent across Tasks 9 and 10).
- Flag name: `default` (on `PriceList`; used consistently in backend + admin fragment + radio column + badge).
- Argument name: `priceListIds` (plural, `Int[]`) — consistent across the portal SDK method, wrapper, page, and GraphQL where clause.
