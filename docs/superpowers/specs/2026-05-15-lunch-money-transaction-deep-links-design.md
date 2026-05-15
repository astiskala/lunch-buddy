# Lunch Money Transaction Deep Links — Design

Add a per-row deep link from a transaction in the dashboard's expanded category card
to the same transaction inside the Lunch Money web app (or native app on mobile, when
installed).

## Goal

When a user is inspecting the activity list inside a `category-card`, give them a
one-tap path to "see this transaction in Lunch Money" — i.e. open the Lunch Money UI
filtered tightly enough that the row is obviously visible. On mobile, the OS opens
the native Lunch Money app via Universal Links / App Links when installed; on desktop
or when the app isn't installed, the same URL opens in the browser.

## Non-Goals

- Per-transaction permalinks. Lunch Money does not currently expose `/transactions/{id}`
  style URLs; we use a tight category + date-window filter instead.
- A deep link on upcoming/recurring placeholder rows that don't yet have a
  `transaction_id`.
- A user-configurable host (e.g. `beta.lunchmoney.app`). Host is hard-coded to
  `my.lunchmoney.app`.
- Telemetry / analytics on link clicks.
- Any change to PWA caching or the service worker. The URL is external; the SW lets
  the navigation pass through to the OS.

## URL Template

```
https://my.lunchmoney.app/transactions/{YYYY}/{MM}?category={categoryId}&start_date={date}&end_date={date}&match=all&time=custom
```

| Param         | Source                                                                        |
| ------------- | ----------------------------------------------------------------------------- |
| `{YYYY}/{MM}` | Year and zero-padded month of `transaction.date`                              |
| `category`    | `transaction.category_id` if non-null, otherwise the card's `item.categoryId` |
| `start_date`  | `transaction.date` (ISO `YYYY-MM-DD`), single-day window                      |
| `end_date`    | Same as `start_date`                                                          |
| `match`       | Literal `all`                                                                 |
| `time`        | Literal `custom`                                                              |

If neither `transaction.category_id` nor the card's `item.categoryId` is set, the
`category` param is omitted. The date-window filter still narrows the list.

## Helper

New pure utility:

```
src/app/shared/utils/lunchmoney-link.util.ts
```

```ts
export function buildTransactionDeepLink(input: {
  transactionDate: string | null | undefined;
  transactionCategoryId: number | null | undefined;
  cardCategoryId: number | null | undefined;
}): string | null;
```

- Returns `null` when the date cannot be parsed.
- Returns the full URL otherwise, with all query parameters URL-encoded.
- Has zero Angular / DOM dependencies; only the existing date utils.

A matching `lunchmoney-link.util.spec.ts` colocated with the implementation covers:

- Standard ISO date → expected `YYYY/MM` path and `start_date` / `end_date` params.
- `transaction.category_id` null → falls back to `cardCategoryId`.
- Both nulls → URL has no `category` param.
- Invalid date string → returns `null`.
- Query string is correctly URL-encoded (catches accidental double-encoding).

## UI Affordance

Inside `category-card.component.html`, each `activity-item` row that represents a
real transaction (i.e. `entry.kind === 'transaction'` AND helper returned a non-null
URL) renders a small `open_in_new` icon button on the far right of the row:

```html
<a
  class="open-in-lunchmoney"
  [href]="entry.deepLink"
  target="_blank"
  rel="noopener noreferrer"
  (click)="$event.stopPropagation()"
  aria-label="Open transaction in Lunch Money">
  <mat-icon>open_in_new</mat-icon>
</a>
```

Notes:

- Anchor, not a button-with-`window.open`. Native browser navigation is the strongest
  signal for OS Universal Link / App Link resolution and gives screen readers the
  correct "link" semantic.
- `(click)="$event.stopPropagation()"` is required because the outer
  `.category-card` is a `<button>` with a `(click)` handler that toggles details;
  without it, opening the link would also collapse the card.
- The anchor is rendered conditionally — when the helper returns `null` (e.g. a row
  with an unparseable date) the element is omitted, not disabled, so there is no
  empty/inert link target.
- Nesting an `<a>` inside the outer `<button class="category-card">` mirrors the
  existing pattern in this template (which already nests a retry `<button>` and an
  expand `<button>`). The "nested interactive content" caveat is pre-existing.

The exact placement / spacing is a `.scss` decision; the markup contract above is
the binding part of the design.

## Data Flow

```
Transaction (from LunchMoneyService.getCategoryTransactions)
  → convertTransactionsToEntries / buildFoundTransactionEntries
    → ActivityEntry { ..., transactionId, deepLink }
      → template renders icon when entry.kind === 'transaction' && entry.deepLink
```

`ActivityEntry` gains two optional fields, both populated only for transaction-kind
entries:

```ts
interface ActivityEntry {
  // ...existing fields...
  transactionId?: number | null;
  deepLink?: string | null;
}
```

Both `convertTransactionsToEntries` and `buildFoundTransactionEntries` call
`buildTransactionDeepLink(...)` with the transaction's `date`, its `category_id`,
and the card's `item.categoryId`.

## Error Handling

- The helper has no side effects and cannot throw; the only "failure" is returning
  `null`, which the template handles by simply omitting the icon.
- No network calls are involved.
- If the Lunch Money web app responds with a 404 for the constructed URL (e.g. user
  not logged in, or category was deleted), that's surfaced by Lunch Money itself —
  outside this app's responsibility.

## Testing

Beyond the helper's spec file:

`category-card.component.spec.ts` additions:

1. Renders the `open_in_new` icon on a `txn-…` row, with `href` equal to the
   helper's output.
2. Renders the icon on a `found-…` row (recurring match) with the same href shape.
3. Does **not** render the icon on an `upcoming` row.
4. Clicking the icon does not toggle `showDetails` (verifies `stopPropagation` via
   a spy on `toggleDetails` or by asserting state after the click).

No e2e changes — the link target is an external host and would be brittle to drive
under Playwright.

## Files Touched

| File                                                         | Change                                           |
| ------------------------------------------------------------ | ------------------------------------------------ |
| `src/app/shared/utils/lunchmoney-link.util.ts`               | NEW — `buildTransactionDeepLink` helper          |
| `src/app/shared/utils/lunchmoney-link.util.spec.ts`          | NEW — helper unit tests                          |
| `src/app/features/dashboard/category-card.component.ts`      | Populate `transactionId` + `deepLink` on entries |
| `src/app/features/dashboard/category-card.component.html`    | Render the anchor inside each transaction row    |
| `src/app/features/dashboard/category-card.component.scss`    | Style the new icon button                        |
| `src/app/features/dashboard/category-card.component.spec.ts` | Cover the four template cases above              |

## Accessibility

- `aria-label="Open transaction in Lunch Money"` so screen readers announce intent.
- Anchor element preserves "link" role and keyboard activation semantics.
- `target="_blank"` paired with `rel="noopener noreferrer"` for the standard
  cross-origin tab safety pattern.

## Open Questions

None at design time. Two assumptions worth flagging for early QA:

1. The `match=all&time=custom` query-string combination is what `beta.lunchmoney.app`
   uses in the user's sample. We assume `my.lunchmoney.app` accepts the same syntax.
   If `my.lunchmoney.app` ignores or rejects the filter, the link still lands on
   the transactions list page for the right month — a graceful degradation.
2. Universal Links / App Links registration for `my.lunchmoney.app` is controlled by
   Lunch Money's iOS/Android apps, not by us. We rely on whatever they ship today.
   If they don't claim the host, the link opens in the browser — also graceful.
