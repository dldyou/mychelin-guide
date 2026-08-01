# Restaurant Insights Design

## Goal

Turn the locally stored restaurant, menu, visit, and menu-rating records into useful read views for the Home, My Guide, and restaurant detail screens. The feature remains local-first and reuses the existing scoring policy and persistence provider.

## Scope

### Included

- A pure restaurant-summary domain module
- Home sections for recent visits, frequent restaurants, and high-score restaurants
- A My Guide list sortable by personal score or visit count
- A restaurant detail route with overall score, menu summaries, recent score change, and visit history
- Navigation from restaurant cards to the restaurant detail route
- Loading, empty, unavailable-restaurant, and restored-storage error states
- Unit tests for aggregation and deterministic ordering
- A browser smoke check covering record creation through the read views

### Excluded

- Editing or deleting restaurants, menus, or visits
- Search, filtering, pagination, charts, or score-policy controls
- Backend synchronization or Spring Boot APIs
- Sharing and profile statistics, which remain Task 6
- New caching or state-management dependencies

## Architecture

### Pure aggregation module

Create `mobile/src/domain/restaurantSummary.ts`. It accepts raw `AppData` plus an injected `ScorePolicy` and returns display-neutral summaries. It must call the existing functions in `scoring.ts`; score formulas must not be copied into components.

The main function is:

```ts
getRestaurantSummary(
  restaurantId: string,
  data: AppData,
  policy: ScorePolicy,
): RestaurantSummary | null
```

It returns `null` when the restaurant does not exist. Otherwise it returns:

- the restaurant record
- visit count
- overall restaurant score, or `null` before any scored visit
- recent score change, or `null` when no prior comparison group exists
- menu summaries containing the menu record, rating count, and cumulative menu score
- visits in newest-first order, each paired with its menu ratings and calculated visit score

Ratings that reference a missing menu or visit are ignored rather than causing the whole read view to fail. A visit without any valid menu rating remains in visit history but has a `null` visit score and does not contribute to the restaurant score.

### Collection helpers

Keep collection-level operations in the same module because they are thin projections over `getRestaurantSummary`:

- build summaries for every restaurant
- select recent restaurants from newest visits
- order summaries by visit count
- order scored summaries by personal score

Ordering is deterministic. Primary ties use restaurant name ascending, then restaurant ID ascending. Unscored restaurants remain visible and sort after scored restaurants in score order.

No memoization or cache is introduced. The current local dataset is small, and calculating from raw data during render avoids duplicated derived state and invalidation logic.

## Screens

### Home

The existing primary `방문 기록하기` action remains prominent. Below it, Home renders three compact sections:

1. Recent visits, deduplicated by restaurant using each restaurant's newest visit
2. Frequent restaurants, ordered by visit count
3. High-score restaurants, ordered by personal score

Each section shows at most three restaurants so Home does not become an exhaustive list. Empty sections explain that a visit record is needed. Selecting a restaurant card opens `/restaurant/[id]`.

### My Guide

My Guide shows all registered restaurants and exposes two sort controls:

- `점수순`, the default
- `방문 횟수순`

Restaurant cards show the name, optional category/address, formatted score, and visit count. Restaurants without visits remain visible as `평가 전`.

### Restaurant detail

Create `mobile/app/restaurant/[id].tsx`. The screen displays:

- restaurant identity and optional metadata
- overall score and visit count
- recent score change only when at least four scored visits provide both a recent group and a prior comparison group
- menu summaries
- newest-first visit history with date, daypart, service, atmosphere, optional note, and visit score

The screen formats calculated scores to one decimal place. If the route ID does not resolve to a restaurant, it displays an unavailable message and a back action.

## Data Flow

1. `AppDataProvider` restores or mutates the canonical local document.
2. Each read screen consumes `data`, `isLoading`, and `error` through `useAppData`.
3. The screen passes `data` and `DEFAULT_SCORE_POLICY` to the pure aggregation module.
4. The module joins records, delegates calculations to `scoring.ts`, and returns summaries.
5. Screens perform only view selection, formatting, and navigation.

No derived summary is persisted. A newly saved visit therefore appears in Home, My Guide, and restaurant detail as soon as the provider publishes the successfully persisted data.

## Error and Empty States

- While storage hydration is pending, read screens show a loading state instead of misleading empty sections.
- A provider restoration error is shown as an error message; screens do not reinterpret empty in-memory data as successful hydration.
- Missing route restaurants show a dedicated unavailable state.
- Missing linked ratings are skipped at the aggregation boundary.
- Empty restaurants, sections, menus, and visit histories have explicit Korean empty-state copy.
- Unexpected invalid rating values continue to use the existing scoring validation rather than being silently clamped.

## Accessibility

- Sort controls expose button or radio semantics and selected state.
- Restaurant cards expose a concise accessibility label containing the restaurant name, score state, and visit count.
- Empty, loading, and error messages are readable as normal text without relying on color alone.
- Press targets preserve the existing minimum target sizing and pressed feedback.

## Testing

Create `mobile/src/domain/__tests__/restaurantSummary.test.ts` first. Tests cover:

- joining menu ratings into visit scores
- applying the injected sequence-decay policy to overall restaurant score
- visit count and newest-first history
- menu cumulative scores and rating counts
- `null` score before a valid scored visit
- recent change availability and value
- missing restaurant and broken references
- deterministic score, visit-count, and recent ordering
- multiple visits to the same restaurant appearing once in the recent list

After implementation, run the complete Jest suite, TypeScript checking, Expo web export, and `git diff --check`. The browser smoke flow creates two visits with different ratings, confirms Home updates, verifies both My Guide sort modes, and opens restaurant detail to confirm the newer visit has the expected greater influence.

## Delivery

Work stays on `feature/restaurant-insights`. After review and verification, push the branch and open a Draft PR against `main` with a Title Case PR title. Do not merge locally.
