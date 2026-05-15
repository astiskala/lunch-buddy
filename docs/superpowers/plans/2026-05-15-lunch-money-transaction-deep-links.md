# Lunch Money Transaction Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-row "open in Lunch Money" icon link to real-transaction entries in the dashboard's expanded category card.

**Architecture:** A new pure helper (`buildTransactionDeepLink`) computes the deep-link URL from a transaction's date + category. `category-card.component.ts` calls it when constructing transaction-kind `ActivityEntry` objects, attaching the URL. The template renders an `<a>` icon for entries that have a URL; clicking it stops propagation so the outer card doesn't toggle. Universal/App Links handle native-app routing on mobile; web URL is the graceful fallback.

**Tech Stack:** Angular 21 (standalone components, signals), TypeScript, Vitest, Angular Material icons.

---

## File Structure

- `src/app/shared/utils/lunchmoney-link.util.ts` (NEW) — `buildTransactionDeepLink` pure function. No Angular deps. Imports `parseDateString` from existing `date.util.ts`.
- `src/app/shared/utils/lunchmoney-link.util.spec.ts` (NEW) — Vitest unit tests for the helper.
- `src/app/features/dashboard/category-card.component.ts` (MODIFY) — extend `ActivityEntry` with optional `transactionId` and `deepLink` fields; populate them in `convertTransactionsToEntries` and `buildFoundTransactionEntries`.
- `src/app/features/dashboard/category-card.component.html` (MODIFY) — render an `<a class="open-in-lunchmoney">` with `mat-icon` inside each `.activity-item` when `entry.deepLink` is set.
- `src/app/features/dashboard/category-card.component.scss` (MODIFY) — style the new icon affordance.
- `src/app/features/dashboard/category-card.component.spec.ts` (MODIFY) — four new test cases covering the link rendering and propagation behaviour.

---

## Task 1: Deep-link helper utility

**Files:**

- Create: `src/app/shared/utils/lunchmoney-link.util.ts`
- Test: `src/app/shared/utils/lunchmoney-link.util.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/shared/utils/lunchmoney-link.util.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildTransactionDeepLink } from './lunchmoney-link.util';

describe('buildTransactionDeepLink', () => {
  it('builds the canonical URL for a transaction with its own category', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-05-15',
      transactionCategoryId: 1766103,
      cardCategoryId: 99,
    });
    expect(url).toBe(
      'https://my.lunchmoney.app/transactions/2026/05' +
        '?category=1766103' +
        '&start_date=2026-05-15' +
        '&end_date=2026-05-15' +
        '&match=all' +
        '&time=custom'
    );
  });

  it('zero-pads single-digit months', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-03-04',
      transactionCategoryId: 7,
      cardCategoryId: null,
    });
    expect(url).toContain('/transactions/2026/03');
    expect(url).toContain('start_date=2026-03-04');
    expect(url).toContain('end_date=2026-03-04');
  });

  it('falls back to the card categoryId when transaction.category_id is null', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-05-15',
      transactionCategoryId: null,
      cardCategoryId: 4242,
    });
    expect(url).toContain('category=4242');
  });

  it('omits the category param when neither id is present', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-05-15',
      transactionCategoryId: null,
      cardCategoryId: null,
    });
    expect(url).not.toContain('category=');
    expect(url).toContain('start_date=2026-05-15');
  });

  it('returns null when the date cannot be parsed', () => {
    expect(
      buildTransactionDeepLink({
        transactionDate: 'not-a-date',
        transactionCategoryId: 1,
        cardCategoryId: null,
      })
    ).toBeNull();
  });

  it('returns null when the date is missing', () => {
    expect(
      buildTransactionDeepLink({
        transactionDate: null,
        transactionCategoryId: 1,
        cardCategoryId: null,
      })
    ).toBeNull();
    expect(
      buildTransactionDeepLink({
        transactionDate: undefined,
        transactionCategoryId: 1,
        cardCategoryId: null,
      })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/shared/utils/lunchmoney-link.util.spec.ts`
Expected: FAIL — `Cannot find module './lunchmoney-link.util'`.

- [ ] **Step 3: Implement the helper**

Create `src/app/shared/utils/lunchmoney-link.util.ts`:

```ts
import { parseDateString } from './date.util';

const LUNCH_MONEY_HOST = 'https://my.lunchmoney.app';

export interface BuildTransactionDeepLinkInput {
  transactionDate: string | null | undefined;
  transactionCategoryId: number | null | undefined;
  cardCategoryId: number | null | undefined;
}

/**
 * Builds a Lunch Money web URL that opens the transactions list filtered to
 * the given category and a single-day window. On mobile devices with the
 * Lunch Money app installed, the OS routes this URL into the native app via
 * Universal/App Links.
 */
export const buildTransactionDeepLink = (
  input: BuildTransactionDeepLinkInput
): string | null => {
  const parsed = parseDateString(input.transactionDate ?? null);
  if (!parsed) {
    return null;
  }

  const year = parsed.getFullYear().toString();
  const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
  const day = parsed.getDate().toString().padStart(2, '0');
  const isoDay = `${year}-${month}-${day}`;

  const categoryId =
    input.transactionCategoryId ?? input.cardCategoryId ?? null;

  const params = new URLSearchParams();
  if (categoryId !== null && Number.isFinite(categoryId)) {
    params.set('category', categoryId.toString());
  }
  params.set('start_date', isoDay);
  params.set('end_date', isoDay);
  params.set('match', 'all');
  params.set('time', 'custom');

  return `${LUNCH_MONEY_HOST}/transactions/${year}/${month}?${params.toString()}`;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/shared/utils/lunchmoney-link.util.spec.ts`
Expected: PASS — all 6 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils/lunchmoney-link.util.ts src/app/shared/utils/lunchmoney-link.util.spec.ts
git commit -m "feat(shared): add buildTransactionDeepLink helper"
```

---

## Task 2: Wire helper into category card data flow

**Files:**

- Modify: `src/app/features/dashboard/category-card.component.ts`

This task does not add tests on its own — Task 3 covers the rendering, and Task 4 covers the interaction. The data-flow change is observable through Task 3's `href` assertion.

- [ ] **Step 1: Import the helper**

In `src/app/features/dashboard/category-card.component.ts`, after the existing `decodeHtmlEntities` import, add:

```ts
import { buildTransactionDeepLink } from '../../shared/utils/lunchmoney-link.util';
```

- [ ] **Step 2: Extend the `ActivityEntry` interface**

Replace the existing `ActivityEntry` interface (currently near the top of the file) with:

```ts
interface ActivityEntry {
  id: string;
  kind: 'transaction' | 'upcoming';
  date: Date | null;
  label: string;
  notes: string | null;
  amount: number;
  currency: string | null;
  originalCurrency?: string | null;
  originalAmount?: number | null;
  transactionId?: number | null;
  deepLink?: string | null;
}
```

- [ ] **Step 3: Populate the new fields in `convertTransactionsToEntries`**

Locate `convertTransactionsToEntries(...)`. Inside the `transactions.map(transaction => { ... })` callback, before the `return {` statement, add:

```ts
const deepLink = buildTransactionDeepLink({
  transactionDate: transaction.date,
  transactionCategoryId: transaction.category_id,
  cardCategoryId: this.safeItem()?.categoryId ?? null,
});
```

Then add `transactionId: transaction.id` and `deepLink` to the returned object literal. The full returned object should now read:

```ts
return {
  id: `txn-${transaction.id.toString()}`,
  kind: 'transaction',
  date,
  label,
  notes,
  amount,
  currency: displayCurrency,
  originalCurrency: transaction.currency,
  originalAmount,
  transactionId: transaction.id,
  deepLink,
};
```

- [ ] **Step 4: Populate the new fields in `buildFoundTransactionEntries`**

Locate `buildFoundTransactionEntries(...)`. Inside the `for (const entry of found)` loop, after the existing `if (this.isDuplicateTransaction(...))` skip check, replace the `entries.push({...})` block with:

```ts
const deepLink = buildTransactionDeepLink({
  transactionDate: entry.date,
  transactionCategoryId: instance.expense.category_id ?? null,
  cardCategoryId: this.safeItem()?.categoryId ?? null,
});
entries.push({
  id: `found-${instance.expense.id.toString()}-${entry.transaction_id.toString()}`,
  kind: 'transaction',
  date: entryDate,
  ...base,
  transactionId: entry.transaction_id,
  deepLink,
});
```

- [ ] **Step 5: Run the existing test suite to ensure nothing regressed**

Run: `npx vitest run src/app/features/dashboard/category-card.component.spec.ts`
Expected: PASS — all existing cases still green (the new fields are optional and unused so far).

- [ ] **Step 6: Run the type checker**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/dashboard/category-card.component.ts
git commit -m "feat(dashboard): attach deep-link URL to transaction activity entries"
```

---

## Task 3: Render the icon link in the template

**Files:**

- Modify: `src/app/features/dashboard/category-card.component.html`
- Modify: `src/app/features/dashboard/category-card.component.scss`
- Modify: `src/app/features/dashboard/category-card.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

At the bottom of the existing `describe('CategoryCardComponent', () => { ... })` block in `src/app/features/dashboard/category-card.component.spec.ts` (after the final existing test and before the closing `})`), insert:

```ts
describe('transaction deep link', () => {
  const transactionFixture = (): Transaction =>
    buildTransaction({
      id: 9001,
      date: '2026-05-15',
      amount: '-12.34',
      currency: 'usd',
      to_base: -12.34,
      payee: 'Coffee',
      category_id: 4242,
    });

  it('renders an open-in-lunchmoney link on real transaction rows', () => {
    const item: BudgetProgress = {
      ...mockItem,
      categoryId: 4242,
      transactionList: [transactionFixture()],
    };
    setupComponent(fixture, {
      item,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      referenceDate: new Date('2026-05-20T00:00:00.000Z'),
    });
    const host = expandCard();
    const anchor = host.querySelector<HTMLAnchorElement>(
      '.activity-item a.open-in-lunchmoney'
    );
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute('href')).toBe(
      'https://my.lunchmoney.app/transactions/2026/05' +
        '?category=4242' +
        '&start_date=2026-05-15' +
        '&end_date=2026-05-15' +
        '&match=all' +
        '&time=custom'
    );
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.getAttribute('aria-label')).toBe(
      'Open transaction in Lunch Money'
    );
  });

  it('does not render the link on upcoming recurring rows', () => {
    const recurring = buildRecurringInstance(
      { id: 555, payee: 'Netflix', amount: '15.00', to_base: 15 },
      new Date('2026-05-20T00:00:00.000Z')
    );
    const item: BudgetProgress = {
      ...mockItem,
      categoryId: 4242,
      transactionList: [],
    };
    setupComponent(fixture, {
      item,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      referenceDate: new Date('2026-05-10T00:00:00.000Z'),
      recurringExpenses: [recurring],
    });
    const host = expandCard();
    const upcomingItem = Array.from(
      host.querySelectorAll<HTMLElement>('.activity-item')
    ).find(el => el.querySelector('.badge.upcoming'));
    expect(upcomingItem).toBeDefined();
    expect(upcomingItem?.querySelector('a.open-in-lunchmoney')).toBeNull();
  });

  it('clicking the link does not toggle the card details', () => {
    const item: BudgetProgress = {
      ...mockItem,
      categoryId: 4242,
      transactionList: [transactionFixture()],
    };
    setupComponent(fixture, {
      item,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      referenceDate: new Date('2026-05-20T00:00:00.000Z'),
    });
    const host = expandCard();
    expect(component.showDetails()).toBe(true);
    const anchor = host.querySelector<HTMLAnchorElement>(
      '.activity-item a.open-in-lunchmoney'
    );
    expect(anchor).not.toBeNull();
    anchor?.addEventListener('click', e => e.preventDefault());
    anchor?.click();
    fixture.detectChanges();
    expect(component.showDetails()).toBe(true);
  });
});
```

Note the local listener that calls `preventDefault()` — without it, JSDOM follows the `href` during the test and throws a navigation error.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/features/dashboard/category-card.component.spec.ts -t "transaction deep link"`
Expected: FAIL — `anchor` is `null` because the template doesn't render it yet.

- [ ] **Step 3: Update the template**

In `src/app/features/dashboard/category-card.component.html`, locate the `<div class="activity-item">` block (around line 102–128). Replace the entire block — from the opening `<div class="activity-item">` to its matching `</div>` — with:

```html
<div class="activity-item">
  <div class="activity-info">
    <div class="activity-header">
      <span class="activity-label">{{ entry.label }}</span>
      @if (shouldShowUpcomingBadge(entry)) {
      <span class="badge upcoming">{{ getUpcomingLabel(entry) }}</span>
      }
    </div>
    @if (entry.notes) {
    <div class="activity-meta">
      <span class="notes">{{ entry.notes }}</span>
    </div>
    }
  </div>
  <div class="activity-amount" [attr.data-color]="getAmountColor(entry)">
    <div class="amount-primary">{{ formatAmount(entry) }}</div>
    @if (shouldShowOriginalAmount(entry)) {
    <div class="amount-secondary">{{ formatOriginalAmount(entry) }}</div>
    }
  </div>
  @if (entry.deepLink) {
  <a
    class="open-in-lunchmoney"
    [href]="entry.deepLink"
    target="_blank"
    rel="noopener noreferrer"
    (click)="$event.stopPropagation()"
    aria-label="Open transaction in Lunch Money">
    <mat-icon>open_in_new</mat-icon>
  </a>
  }
</div>
```

- [ ] **Step 4: Add the styles**

In `src/app/features/dashboard/category-card.component.scss`, inside the existing `.details .activity-item { ... }` block (i.e. as a sibling rule next to `.activity-amount`), append:

```scss
.open-in-lunchmoney {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  color: var(--color-text-tertiary);
  border-radius: 4px;
  text-decoration: none;
  transition:
    color 0.2s ease,
    background 0.2s ease;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    line-height: 18px;
  }

  &:hover,
  &:focus-visible {
    color: var(--color-primary);
    background: rgb(var(--color-primary-rgb) / 8%);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/app/features/dashboard/category-card.component.spec.ts -t "transaction deep link"`
Expected: PASS — all three new cases green.

- [ ] **Step 6: Run the full test suite and type checker**

Run: `npm test` then `npm run typecheck`
Expected: all green; coverage thresholds unaffected.

- [ ] **Step 7: Lint check**

Run: `npm run lint`
Expected: no new violations.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/dashboard/category-card.component.html src/app/features/dashboard/category-card.component.scss src/app/features/dashboard/category-card.component.spec.ts
git commit -m "feat(dashboard): add open-in-Lunch-Money link on transaction rows"
```

---

## Self-Review Notes

**Spec coverage:**

- Helper API + edge cases → Task 1 (6 unit tests)
- Data-flow attaching `transactionId` + `deepLink` to entries → Task 2
- Anchor rendered only for transaction rows → Task 3, test 1 + test 2
- `stopPropagation` → Task 3, test 3
- SCSS styling contract → Task 3, step 4 (intentionally permissive)
- Accessibility attributes (`aria-label`, `target`, `rel`) → Task 3, test 1
- Out-of-scope items (telemetry, host toggle, e2e) → correctly excluded

**Type consistency:** `buildTransactionDeepLink` signature matches every call site (Task 1 declares, Tasks 2 calls match exactly). `ActivityEntry.transactionId` / `deepLink` field names are stable across template and tests.

**Placeholder scan:** No "TBD" / "TODO" / "similar to" content. Every step shows the exact code or command.
