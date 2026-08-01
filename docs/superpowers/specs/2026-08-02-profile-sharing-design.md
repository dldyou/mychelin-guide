# Profile Statistics And Restaurant Sharing Design

## Goal

Complete the final feature slice of the local mobile MVP by showing useful record statistics in Profile and letting users preview and share one restaurant summary through the operating system's native share sheet.

## Scope

### Included

- Pure profile-statistics aggregation from `AppData`
- Pure restaurant share-text generation from `RestaurantSummary`
- Profile statistics for visited restaurants, visits, and menu ratings
- A Profile action that opens My Guide so the user can choose a restaurant
- A restaurant-detail action that opens a share preview
- A dynamic `/share/[id]` route with compact preview content and native OS sharing
- Loading, restoration-error, unavailable-restaurant, share-cancel, and share-failure behavior
- Domain tests plus TypeScript, web export, browser smoke, and native manual-QA notes

### Excluded

- Sharing the complete guide or automatically choosing a top restaurant
- Generating or saving share-card images
- Custom share targets, deep links, analytics, or remote URLs
- Editing profile data, avatars, accounts, authentication, or backend synchronization
- New dependencies

## Architecture

### Profile statistics

Create `mobile/src/domain/profileStats.ts` with a pure function:

```ts
type ProfileStats = {
  visitedRestaurantCount: number;
  visitCount: number;
  menuRatingCount: number;
};

getProfileStats(data: AppData): ProfileStats;
```

`visitedRestaurantCount` counts distinct restaurant IDs that have at least one visit and resolve to a registered restaurant. `visitCount` is the number of stored visit records. `menuRatingCount` is the number of stored menu-rating records. The function returns zeroes for empty data and never mutates its input.

### Share content

Create `mobile/src/domain/shareText.ts` with:

```ts
createRestaurantShareText(summary: RestaurantSummary): string;
```

The output is stable plain text containing:

1. `MYCHELIN GUIDE`
2. Restaurant name
3. `개인 점수 N.N` or `평가 전`
4. `방문 N회`
5. `한줄평: <memo>` only when a representative note exists

The representative note is the first non-empty trimmed note found while scanning `summary.visits` in its existing newest-first order. Blank or whitespace-only notes are skipped. Text generation has no dependency on React Native or OS APIs.

### UI boundaries

Screens consume canonical data through `useAppData` and use the pure domain functions. No statistics or share text is stored in provider state or AsyncStorage.

React Native's built-in `Share.share()` is called only by the share-preview screen. This keeps native side effects outside domain logic and avoids adding a package.

## User Flow

### Profile

Replace the current Profile content with:

- visited restaurant count
- total visit count
- total menu-rating count
- `마이 가이드 보기` button

The button switches to `/guide`. Profile follows provider-state precedence: loading, restoration error, then statistics.

### Restaurant detail

Add a `공유 카드 만들기` button after the restaurant headline summary. It navigates with typed route parameters to `/share/[id]`.

### Share preview

Create `mobile/app/share/[id].tsx`. It resolves the restaurant through `getRestaurantSummary` with `DEFAULT_SCORE_POLICY` and shows the same restaurant name, formatted score state, visit count, and optional representative note used by `createRestaurantShareText`.

The preview has a primary `공유하기` button. Pressing it awaits `Share.share({ message })`. The screen remains mounted whether the share sheet succeeds or is dismissed.

## State And Error Handling

- Loading takes precedence over provider errors and content.
- Provider restoration errors render as assertive accessible alerts.
- Missing or array route IDs resolve to an unavailable state with a back action.
- While a share request is pending, the share button is disabled to prevent duplicate native sheets.
- A dismissed share sheet is treated as a normal outcome and shows no error.
- A rejected `Share.share` call keeps the preview intact and displays an assertive Korean error message so the user can retry.
- Unexpected errors are converted to a stable user-facing message without exposing internal details.

## Accessibility

- Statistic values have visible labels and are readable as normal text.
- Profile, detail, back, and share controls expose button roles and at least 44-point targets.
- The share button exposes disabled state while pending.
- Loading and empty copy does not rely on color.
- Share errors use alert/live-region semantics.

## Testing

Use strict RED-GREEN TDD for both domain modules.

`profileStats.test.ts` covers empty data, distinct visited restaurants, repeated visits, registered-but-unvisited restaurants, raw visit/rating totals, broken visit restaurant IDs, and input immutability.

`shareText.test.ts` covers numeric score formatting, `평가 전`, visit count, newest non-empty trimmed note selection, omission when no note exists, and no mutation.

UI-only changes do not add a component-test dependency. Run the complete Jest suite, `npx tsc --noEmit`, Expo web export, and `git diff --check`. Browser smoke covers Profile statistics, Guide navigation, detail-to-preview navigation, preview content, unavailable route, accessible controls, and share-error behavior where the browser supports it.

The real Android or iOS share sheet, successful target delivery, dismissal result, and device accessibility remain explicit native manual-QA checks because web automation cannot prove them.

## Delivery

Work stays on `feature/profile-sharing` in the normal repository using `git switch`. After task reviews, whole-branch review, and fresh verification, push the branch and create a Draft PR against `main` with a Title Case title. Do not merge locally.
