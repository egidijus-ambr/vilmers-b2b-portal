# Editable Prices in Offer Overview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the PRICE column in the B2B portal offer overview editable, with all dependent prices (row subtotal, grand subtotal, VAT, total, and per-item detail TOTAL) recomputing from entered values, client-side only.

**Architecture:** All changes in one client component: `src/app/[languageCode]/(main)/account/carts/details/[id]/offer/page.tsx`. A `priceOverrides` state map (global item index → overridden **unit** price) plus an `effectiveTotalNet(item, globalIdx)` helper replace every read of `item.totalNet`. The PRICE cell becomes a chrome-less controlled input. The exported PDF needs no changes — it rasterizes this same DOM.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind, TypeScript. Package manager: **pnpm**.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-28-offer-editable-prices-design.md`
- Client-only persistence — NO backend, SDK, or `generate-offer-pdf.ts` changes.
- `totalNet` on `OfferItem` is the **line total** (not unit price). Item detail TOTAL renders it directly; overview derives unit price as `totalNet / quantity`.
- `cartItemId` is `number | null` — do NOT key overrides by it. Key by global item index into `data.items`.
- Invalid input (NaN, negative) is a no-op; clearing the field removes the override.
- The input must render indistinguishably from the current text when unfocused (the PDF is a DOM raster).
- Working directory: `/Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal`

---

### Task 1: Override state + effective totals wired into all computations

**Files:**
- Modify: `src/app/[languageCode]/(main)/account/carts/details/[id]/offer/page.tsx`

**Interfaces:**
- Produces: component-scope state `priceOverrides: Record<number, number>` / `setPriceOverrides`, state `editingPrice: { idx: number; text: string } | null` / `setEditingPrice`, and helper `effectiveTotalNet(item: OfferItem, globalIdx: number): number`. Task 2 relies on these exact names.

- [ ] **Step 1: Add state and helper**

After the existing `showPrices` state (line ~98, after the `useToggleState` block ending line ~103), add:

```tsx
  // Client-side price overrides for the offer preview/PDF, keyed by the
  // item's global index in data.items (cartItemId can be null). Value is
  // the overridden UNIT price; totalNet stays the source of truth when no
  // override exists. Lost on reload by design.
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>(
    {}
  )
  const [editingPrice, setEditingPrice] = useState<{
    idx: number
    text: string
  } | null>(null)

  const effectiveTotalNet = (item: OfferItem, globalIdx: number) => {
    const override = priceOverrides[globalIdx]
    if (override == null) return item.totalNet
    return item.quantity > 0 ? override * item.quantity : override
  }
```

- [ ] **Step 2: Wire into the item detail page (renderItem)**

`renderItem` already receives the global index as `idx` (line ~176: `const renderItem = (item: OfferItem, context: OfferContext, idx: number)`). Replace the three `item.totalNet` reads (lines ~426, ~433, ~437):

```tsx
                  <span className="text-lg font-bold">
                    {eur(effectiveTotalNet(item, idx))}
                  </span>
```

```tsx
                    <p>
                      {t("vat")} ({(vatRate * 100).toFixed(0)}%):{" "}
                      {eur(effectiveTotalNet(item, idx) * vatRate)}
                    </p>
                    <p>
                      {t("total-incl-tax")}:{" "}
                      {eur(effectiveTotalNet(item, idx) * (1 + vatRate))}
                    </p>
```

- [ ] **Step 3: Wire into renderOverview grand totals**

Line ~567, change the reduce to pass the global index:

```tsx
    const subtotal = items.reduce(
      (sum, item, i) => sum + effectiveTotalNet(item, i),
      0
    )
```

(`vat` and `total` on the next lines derive from `subtotal` — leave unchanged.)

- [ ] **Step 4: Wire into the overview table rows**

The rows render inside `overviewPages.map((pageItems, pageIndex) => ...)` → `pageItems.map((item, idx) => ...)` (line ~616). `idx` there is **page-local**. Inside the inner map callback, compute the global index and use it (`ITEMS_PER_PAGE` is defined at line ~585 in the same function):

```tsx
          {pageItems.map((item, idx) => {
            const globalIdx = pageIndex * ITEMS_PER_PAGE + idx
            const lineTotal = effectiveTotalNet(item, globalIdx)
            const unitPrice =
              item.quantity > 0 ? lineTotal / item.quantity : lineTotal
```

and change the SUBTOTAL cell (line ~660) from `{eur(item.totalNet)}` to:

```tsx
                <span className="text-right text-[0.7875rem] font-medium">
                  {eur(lineTotal)}
                </span>
```

- [ ] **Step 5: Typecheck**

Run: `cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal && pnpm exec tsc --noEmit`
Expected: no NEW errors versus `git stash && pnpm exec tsc --noEmit` baseline (if the repo has pre-existing errors, only compare). Unused-variable warnings for `editingPrice`/`setEditingPrice` are acceptable until Task 2 (tsc does not flag unused consts by default; if lint does, note it and proceed — Task 2 uses them).

- [ ] **Step 6: Commit**

```bash
git add "src/app/[languageCode]/(main)/account/carts/details/[id]/offer/page.tsx"
git commit -m "feat(offer): compute offer totals from client-side price overrides

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Inline editable PRICE cell

**Files:**
- Modify: `src/app/[languageCode]/(main)/account/carts/details/[id]/offer/page.tsx`

**Interfaces:**
- Consumes: `priceOverrides`, `setPriceOverrides`, `editingPrice`, `setEditingPrice`, `effectiveTotalNet` from Task 1 (exact names).
- Produces: `commitPriceEdit(): void` helper; the PRICE cell is an `<input data-testid="offer-price-input">`.

- [ ] **Step 1: Add the commit helper**

Directly after the `effectiveTotalNet` helper from Task 1, add:

```tsx
  const commitPriceEdit = () => {
    if (!editingPrice) return
    const { idx, text } = editingPrice
    setEditingPrice(null)
    const trimmed = text.trim().replace(",", ".")
    if (trimmed === "") {
      // Cleared field → drop the override, restoring the backend price.
      setPriceOverrides((prev) => {
        const next = { ...prev }
        delete next[idx]
        return next
      })
      return
    }
    const parsed = Number(trimmed)
    // NaN / negative → no-op, keep whatever was committed before.
    if (!Number.isFinite(parsed) || parsed < 0) return
    setPriceOverrides((prev) => ({ ...prev, [idx]: parsed }))
  }
```

- [ ] **Step 2: Replace the PRICE cell with the input**

Replace the PRICE `<span>` (lines ~653–655):

```tsx
                <span className="text-right text-[0.7875rem]">
                  {eur(unitPrice)}
                </span>
```

with:

```tsx
                <input
                  type="text"
                  inputMode="decimal"
                  data-testid="offer-price-input"
                  aria-label={`${t("price")} — ${item.name}`}
                  value={
                    editingPrice?.idx === globalIdx
                      ? editingPrice.text
                      : eur(unitPrice)
                  }
                  onFocus={() =>
                    setEditingPrice({
                      idx: globalIdx,
                      text: String(unitPrice),
                    })
                  }
                  onChange={(e) =>
                    setEditingPrice({ idx: globalIdx, text: e.target.value })
                  }
                  onBlur={commitPriceEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                  className="w-full border-none bg-transparent p-0 text-right text-[0.7875rem] outline-none hover:bg-dark-blue/5 focus:bg-dark-blue/5"
                />
```

Notes for the implementer:
- Unfocused, the input's value is the same `eur(...)`-formatted string as before, in the same font classes — the rasterized PDF is unchanged.
- On focus the value swaps to the raw number so the formatter doesn't fight typing; Enter blurs, blur commits.
- Keep the surrounding grid cell structure untouched; the input replaces only the `<span>`.

- [ ] **Step 3: Fix the adjacent image class typo (drive-by, same file)**

Line ~635: change `className="h-44 w-64 object-conver"` to `className="h-44 w-64 object-cover"`.

- [ ] **Step 4: Typecheck + lint**

Run: `cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal && pnpm exec tsc --noEmit && pnpm lint`
Expected: no new errors (compare to baseline if pre-existing ones exist).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[languageCode]/(main)/account/carts/details/[id]/offer/page.tsx"
git commit -m "feat(offer): inline-editable price column in offer overview

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Browser verification

**Files:**
- None modified (verification only).

**Interfaces:**
- Consumes: the running dev server (`pnpm dev`, port 8090) and `data-testid="offer-price-input"` from Task 2.

- [ ] **Step 1: Start the dev server if not running**

Run: `cd /Users/egidijus/Documents/GitHub/furnisystems-workspace/vilmers-b2b-portal && pnpm dev` (background). Portal runs on port 8090.

- [ ] **Step 2: Verify in browser (Playwright or manual)**

Navigate to a cart offer page: `http://localhost:8090/<languageCode>/account/carts/details/<cartId>/offer` (log in as a B2B customer; pick any cart with items). Then verify:

1. The PRICE column looks identical to before when idle (formatted `€x.xx`, right-aligned, no visible input chrome except on hover/focus).
2. Click a price, type `100`, press Enter → that row's SUBTOTAL becomes `€100.00 × quantity`, and the grand SUBTOTAL / VAT / TOTAL update accordingly.
3. Scroll to that item's own detail page (earlier in the preview) → its TOTAL shows the new line total; VAT lines updated when shown.
4. Clear the field and blur → original backend price restored everywhere.
5. Type `abc`, blur → value unchanged (no-op).
6. Click "Save as PDF" → exported PDF shows the edited values, rendered as plain text (no input borders/background).
7. Un-check "show prices" → overview page disappears entirely (pre-existing behavior intact).

- [ ] **Step 3: Report results**

Report each check pass/fail with screenshots where useful. Any failure → fix in `page.tsx`, re-run the failed checks, and amend/commit as a fix commit.
