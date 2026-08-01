# Restaurant Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn local visit records into useful Home, My Guide, and restaurant-detail views with consistent personal scores and deterministic ordering.

**Architecture:** A pure `restaurantSummary` domain module joins raw `AppData` and delegates every score formula to the existing scoring functions. Screens read canonical data from `AppDataProvider`, derive summaries during render, and own only formatting, sorting selection, navigation, and user-facing states. No derived data is persisted or cached.

**Tech Stack:** Expo 57, React Native 0.86, Expo Router, TypeScript 6, Jest 29, AsyncStorage-backed `AppDataProvider`

## Global Constraints

- Work on `feature/restaurant-insights` in the normal repository using `git switch`; do not create a Git worktree.
- Follow `mobile/AGENTS.md` and consult the exact Expo 57 documentation at `https://docs.expo.dev/versions/v57.0.0/` before changing Expo Router code.
- Do not add dependencies, caching, backend synchronization, editing, deletion, sharing, profile statistics, charts, filtering, pagination, or score-policy controls.
- Reuse `calculateMenuScore`, `calculateVisitScore`, `calculateRestaurantScore`, and `calculateRecentChange`; never duplicate scoring formulas in screens or the summary module.
- Keep incomplete linked data readable: ignore ratings whose visit or menu cannot be resolved, retain visits with no valid menu rating in history, and exclude those visits from score calculations.
- Do not clamp unexpected invalid rating values; preserve existing scoring validation failures.
- Format calculated scores to one decimal place in UI and use `평가 전` for `null` scores.
- Home shows no more than three restaurants in each insight section.
- Score-order ties and visit-count-order ties resolve by restaurant name ascending, then ID ascending.
- Keep sort controls accessible and restaurant-card labels descriptive without relying on color.
- Use strict RED-GREEN TDD for non-trivial domain logic. UI-only tasks are explicitly exempt from new component unit tests because the project has no component test dependency and this plan forbids adding dependencies; verify them with the existing suite, TypeScript, Expo export, and browser smoke checks instead. Leave the complete test suite green after every task.
- Finish by pushing the feature branch and opening a Draft PR against `main` with a Title Case title; never merge locally.

---

### Task 1: Build the restaurant summary domain module

**Files:**
- Create: `mobile/src/domain/restaurantSummary.ts`
- Create: `mobile/src/domain/__tests__/restaurantSummary.test.ts`
- Reuse: `mobile/src/domain/scoring.ts`
- Reuse: `mobile/src/domain/appData.ts`
- Reuse: `mobile/src/domain/types.ts`

**Interfaces:**
- Consumes: `AppData`, `Restaurant`, `Menu`, `Visit`, `MenuRating`, and `ScorePolicy`
- Produces:

```ts
export type MenuRatingSummary = {
  rating: MenuRating;
  menu: Menu;
  score: number;
};

export type VisitSummary = {
  visit: Visit;
  menuRatings: MenuRatingSummary[];
  score: number | null;
};

export type MenuSummary = {
  menu: Menu;
  ratingCount: number;
  score: number | null;
};

export type RestaurantSummary = {
  restaurant: Restaurant;
  visitCount: number;
  score: number | null;
  recentChange: number | null;
  menus: MenuSummary[];
  visits: VisitSummary[];
};

export type RestaurantSummarySort = 'score' | 'visits';

export function getRestaurantSummary(
  restaurantId: string,
  data: AppData,
  policy: ScorePolicy,
): RestaurantSummary | null;

export function getRestaurantSummaries(
  data: AppData,
  policy: ScorePolicy,
): RestaurantSummary[];

export function sortRestaurantSummaries(
  summaries: RestaurantSummary[],
  sort: RestaurantSummarySort,
): RestaurantSummary[];

export function getRecentRestaurantSummaries(
  summaries: RestaurantSummary[],
  limit?: number,
): RestaurantSummary[];
```

- `getRecentRestaurantSummaries` defaults `limit` to `3`, deduplicates naturally because each input is already one restaurant summary, excludes summaries without visits, and sorts by the newest visit timestamp descending.
- `sortRestaurantSummaries` returns a new array. Score order puts `null` after numeric scores; visit order includes zero-visit restaurants.

- [ ] **Step 1: Write the failing core aggregation tests**

Create fixtures with one restaurant, two menus, and two visits intentionally supplied out of chronological order. Assert exact joins and reuse of the injected score policy:

```ts
const policy = { ...DEFAULT_SCORE_POLICY, sequenceDecay: 0.5 };
const summary = getRestaurantSummary('restaurant-1', data, policy);

expect(summary).not.toBeNull();
expect(summary?.visitCount).toBe(2);
expect(summary?.visits.map(({ visit }) => visit.id)).toEqual(['visit-new', 'visit-old']);
expect(summary?.visits.map(({ score }) => score)).toEqual([5, 2]);
expect(summary?.score).toBe(4);
```

Use ratings whose taste/value and visit service/atmosphere values make the expected visit scores unambiguous. Hand-check every expected score as a literal so the test cannot repeat an implementation error through the scoring helpers.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
cd mobile
npx jest src/domain/__tests__/restaurantSummary.test.ts --runInBand
```

Expected: FAIL because `restaurantSummary` and `getRestaurantSummary` do not exist.

- [ ] **Step 3: Implement the minimal visit and restaurant aggregation**

Implement the join in this order:

```ts
const restaurant = data.restaurants.find(({ id }) => id === restaurantId);
if (!restaurant) return null;

const restaurantMenus = data.menus.filter((menu) => menu.restaurantId === restaurantId);
const menusById = new Map(restaurantMenus.map((menu) => [menu.id, menu]));
const restaurantVisits = data.visits.filter((visit) => visit.restaurantId === restaurantId);
const visitsById = new Map(restaurantVisits.map((visit) => [visit.id, visit]));
```

Filter `data.menuRatings` so both maps resolve. For each rating, call `calculateMenuScore`. For each visit with at least one resolved menu rating, call `calculateVisitScore`. Sort visit summaries by `parseIsoDate(visitedAt)` descending. Feed only numeric visit scores into `calculateRestaurantScore` and `calculateRecentChange`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the focused Jest command from Step 2.

Expected: PASS for the core aggregation cases.

- [ ] **Step 5: Add failing menu, empty, and broken-reference tests**

Add cases asserting:

```ts
expect(summary?.menus).toEqual([
  expect.objectContaining({
    menu: expect.objectContaining({ id: 'menu-1' }),
    ratingCount: 2,
    score: 4.5,
  }),
]);
```

- An existing restaurant with no visits returns `visitCount: 0`, `score: null`, `recentChange: null`, and empty visits.
- A missing restaurant returns `null`.
- A rating pointing to a missing menu is absent from visit and menu summaries.
- A rating pointing to a missing visit is ignored.
- A visit with no valid ratings remains in history with `score: null` and does not affect the overall score.
- Menu summaries sort by numeric score descending, then menu name and ID; unrated menus remain visible after rated menus.
- Four scored visits expose a hand-calculated literal recent-change value.

- [ ] **Step 6: Implement menu summaries and incomplete-link handling**

Group resolved rating summaries by menu ID. Compute each menu score as the arithmetic mean of its `calculateMenuScore` results; return `null` for an unrated menu. Include every restaurant menu, not only rated menus.

Ensure invalid rating values still reach the existing scoring functions and throw. Only unresolved references are skipped.

- [ ] **Step 7: Add failing collection ordering tests**

Cover all public helpers:

```ts
const restaurantIds = (items: RestaurantSummary[]) =>
  items.map(({ restaurant }) => restaurant.id);

expect(restaurantIds(sortRestaurantSummaries(summaries, 'score'))).toEqual([
  'high-score',
  'same-score-a',
  'same-score-b',
  'unscored',
]);

expect(restaurantIds(sortRestaurantSummaries(summaries, 'visits'))).toEqual([
  'frequent',
  'same-count-a',
  'same-count-b',
  'never-visited',
]);

expect(restaurantIds(getRecentRestaurantSummaries(summaries))).toEqual([
  'newest',
  'middle',
  'oldest',
]);
```

Also assert input arrays are not mutated, the recent helper excludes never-visited restaurants, returns only three by default, honors an explicit limit, and compares ISO instants rather than date strings.

- [ ] **Step 8: Implement deterministic collection helpers**

Use copied arrays and small comparators. Reuse `parseIsoDate` for recent ordering. Use `localeCompare` for names and IDs; do not rely on source-array order as a tie-breaker.

- [ ] **Step 9: Run focused and complete domain verification**

Run:

```bash
cd mobile
npx jest src/domain/__tests__/restaurantSummary.test.ts --runInBand
npm test -- --runInBand
npx tsc --noEmit
```

Expected: all tests pass and TypeScript exits `0`.

- [ ] **Step 10: Request a reviewer gate and commit**

Review for score-formula duplication, mutation, invalid-date behavior, missing-reference handling, and type/interface accuracy. Then commit:

```bash
git add mobile/src/domain/restaurantSummary.ts mobile/src/domain/__tests__/restaurantSummary.test.ts
git commit -m "feat: add restaurant insight summaries"
```

---

### Task 2: Extend restaurant cards for summary views

**Files:**
- Modify: `mobile/src/components/RestaurantCard.tsx`
- Verify: `mobile/app/restaurant/search.tsx`

**Interfaces:**
- Consumes: existing `RestaurantCardProps.restaurant` and `onPress`
- Produces optional summary props without breaking search:

```ts
export type RestaurantCardProps = {
  restaurant: Restaurant;
  score?: number | null;
  visitCount?: number;
  onPress(): void;
};
```

- [ ] **Step 1: Add optional score and visit-count rendering**

When `visitCount` is defined, render a summary row containing:

```tsx
<Text>{score === null ? '평가 전' : `개인 점수 ${score.toFixed(1)}`}</Text>
<Text>{`방문 ${visitCount}회`}</Text>
```

When both new props are omitted, retain the existing search-card appearance and behavior.

- [ ] **Step 2: Add a descriptive accessibility label**

Build the label from rendered information:

```ts
const accessibilityLabel = visitCount === undefined
  ? restaurant.name
  : `${restaurant.name}, ${score === null ? '평가 전' : `개인 점수 ${score.toFixed(1)}`}, 방문 ${visitCount}회`;
```

Pass it to the existing button-like `Pressable`. Preserve focus and pressed styles and the 44-point minimum target.

- [ ] **Step 3: Verify search compatibility and TypeScript**

Run:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
```

Expected: the search screen still compiles without passing summary props and all tests pass.

- [ ] **Step 4: Request a reviewer gate and commit**

Review accessibility wording, optional-prop behavior, and visual reuse. Then commit:

```bash
git add mobile/src/components/RestaurantCard.tsx
git commit -m "feat: show restaurant insights on cards"
```

---

### Task 3: Add Home insight sections

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useAppData`, `DEFAULT_SCORE_POLICY`, `getRestaurantSummaries`, `getRecentRestaurantSummaries`, `sortRestaurantSummaries`, and the extended `RestaurantCard`
- Produces: three Home sections capped at three cards each and navigation to `/restaurant/[id]`

- [ ] **Step 1: Derive the three Home collections**

Read `data`, `isLoading`, and `error` from the provider. Build summaries once per render, then derive:

```ts
const summaries = getRestaurantSummaries(data, DEFAULT_SCORE_POLICY);
const recent = getRecentRestaurantSummaries(summaries, 3);
const frequent = sortRestaurantSummaries(summaries, 'visits')
  .filter(({ visitCount }) => visitCount > 0)
  .slice(0, 3);
const highScore = sortRestaurantSummaries(summaries, 'score')
  .filter(({ score }) => score !== null)
  .slice(0, 3);
```

Do not store these arrays in provider state.

- [ ] **Step 2: Render loading, restoration error, and empty states**

Keep the current intro and `방문 기록하기` action. Below it, render:

- `최근 방문`
- `자주 찾는 식당`
- `높은 개인 점수`

While loading, show `기록을 불러오는 중이에요.` instead of section contents. When `error` exists, render its message with `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`. Each empty collection displays a short Korean prompt to add a visit.

- [ ] **Step 3: Render summary cards and detail navigation**

For every collection, pass `restaurant`, `score`, and `visitCount` to `RestaurantCard`. Navigate with:

```ts
router.push({
  pathname: '/restaurant/[id]',
  params: { id: summary.restaurant.id },
});
```

- [ ] **Step 4: Verify Home compilation and regressions**

Run:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
```

Expected: TypeScript and all Jest suites pass.

- [ ] **Step 5: Request a reviewer gate and commit**

Review the three-item caps, loading/error precedence, empty copy, duplicated calculations, and route typing. Then commit:

```bash
git add "mobile/app/(tabs)/index.tsx"
git commit -m "feat: add home restaurant insights"
```

---

### Task 4: Build the sortable My Guide screen

**Files:**
- Modify: `mobile/app/(tabs)/guide.tsx`

**Interfaces:**
- Consumes: `RestaurantSummarySort`, `getRestaurantSummaries`, `sortRestaurantSummaries`, `DEFAULT_SCORE_POLICY`, `useAppData`, and `RestaurantCard`
- Produces: a complete restaurant list sorted by score or visits

- [ ] **Step 1: Add local sort state and accessible controls**

Default to score order:

```ts
const [sort, setSort] = useState<RestaurantSummarySort>('score');
```

Render `점수순` and `방문 횟수순` as a radiogroup. Each `Pressable` uses `accessibilityRole="radio"` and `accessibilityState={{ checked: sort === option }}`. Preserve at least a 44-point target and visible selected, focused, and pressed states.

- [ ] **Step 2: Derive and render the sorted list**

Call `sortRestaurantSummaries(getRestaurantSummaries(data, DEFAULT_SCORE_POLICY), sort)`. Show all restaurants, including zero-visit restaurants as `평가 전`, and navigate cards to `/restaurant/[id]`.

- [ ] **Step 3: Add loading, restoration error, and empty states**

Use the same precedence as Home:

1. loading copy
2. provider error alert
3. `아직 등록된 식당이 없어요.`
4. sorted cards

- [ ] **Step 4: Verify both sort paths compile and tests remain green**

Run:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
```

Expected: TypeScript and all Jest suites pass.

- [ ] **Step 5: Request a reviewer gate and commit**

Review accessibility state, deterministic ordering, inclusion of unscored restaurants, and navigation parameters. Then commit:

```bash
git add "mobile/app/(tabs)/guide.tsx"
git commit -m "feat: add sortable personal guide"
```

---

### Task 5: Build the restaurant detail route

**Files:**
- Create: `mobile/app/restaurant/[id].tsx`
- Modify: `mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams<{ id?: string | string[] }>()`, `useRouter`, `useAppData`, `DEFAULT_SCORE_POLICY`, and `getRestaurantSummary`
- Produces: `/restaurant/[id]` detail view and a stack title of `식당 상세`

- [ ] **Step 1: Resolve route state and unavailable behavior**

Normalize the parameter without accepting ambiguous arrays:

```ts
const params = useLocalSearchParams<{ id?: string | string[] }>();
const restaurantId = typeof params.id === 'string' ? params.id : undefined;
const summary = restaurantId
  ? getRestaurantSummary(restaurantId, data, DEFAULT_SCORE_POLICY)
  : null;
```

Loading and provider error states take precedence. When hydration succeeds but `summary` is `null`, show `식당 정보를 찾을 수 없어요.` and a button calling `router.back()`.

- [ ] **Step 2: Render restaurant identity and headline metrics**

Display restaurant name, optional category/address, visit count, and:

```ts
const formattedScore = summary.score === null ? '평가 전' : summary.score.toFixed(1);
```

Render recent change only when non-null. Prefix positive values with `+`, retain the minus sign for negative values, and format to one decimal place.

- [ ] **Step 3: Render menu summaries**

For every `summary.menus` entry, show menu name, rating count, and `평가 전` or one-decimal score. If there are no menus, show `등록된 메뉴가 없어요.`.

- [ ] **Step 4: Render newest-first visit history**

For every visit summary, show:

- `visitedAt` date text without silently changing its recorded timezone
- Korean daypart label when present
- `서비스 N점 · 분위기 N점`
- visit score or `평가 전`
- note only when non-empty

Do not duplicate menu rating details in the first MVP detail view. If history is empty, show `아직 방문 기록이 없어요.`.

- [ ] **Step 5: Register the route header**

Add this stack entry in `mobile/app/_layout.tsx`:

```tsx
<Stack.Screen name="restaurant/[id]" options={{ title: '식당 상세' }} />
```

- [ ] **Step 6: Run route, type, test, and export verification**

Run:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
npx expo export --platform web
```

Expected: TypeScript passes, all Jest suites pass, and the export lists `/restaurant/[id]` without route errors.

- [ ] **Step 7: Request a reviewer gate and commit**

Review route-parameter handling, provider-state precedence, date/daypart display, score formatting, empty states, and route registration. Then commit:

```bash
git add "mobile/app/restaurant/[id].tsx" mobile/app/_layout.tsx
git commit -m "feat: add restaurant detail insights"
```

---

### Task 6: Verify and publish the complete read flow

**Files:**
- Modify only if verification exposes an in-scope defect in files from Tasks 1-5
- Verify: `mobile/app/(tabs)/index.tsx`
- Verify: `mobile/app/(tabs)/guide.tsx`
- Verify: `mobile/app/restaurant/[id].tsx`
- Verify: `mobile/src/domain/restaurantSummary.ts`

**Interfaces:**
- Consumes: the complete visit-creation flow already on `main`
- Produces: a reviewed, green `feature/restaurant-insights` branch and a Draft PR; no local merge

- [ ] **Step 1: Run fresh automated verification**

Run from `mobile/`:

```bash
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform web
```

Then run from the repository root:

```bash
git diff --check main...HEAD
git status --short --branch
```

Expected: all tests pass, TypeScript and export exit `0`, diff check is clean, and only intentional branch changes exist.

- [ ] **Step 2: Perform the browser acceptance flow**

Start Expo web using an available local port and verify through visible UI:

1. Create a restaurant and save a low-scored visit.
2. Save a newer high-scored visit for the same restaurant.
3. Confirm Home shows the restaurant in recent, frequent, and high-score sections without duplicates.
4. Open My Guide and confirm `점수순` and `방문 횟수순` both change selection state and preserve all restaurants.
5. Open the restaurant card and confirm overall score, two visits in newest-first order, menu summary, and visit count.
6. Confirm a nonexistent `/restaurant/<id>` route shows the unavailable state and back action.
7. Confirm keyboard navigation and accessibility roles for cards and sort controls where the browser exposes them.

Do not inspect browser storage directly; verify persistence through user-visible state. If the environment prevents a server restart or native behavior, report the exact unverified item instead of claiming it passed.

- [ ] **Step 3: Request final whole-branch review**

Review `main...HEAD` for:

- adherence to the approved design
- score-formula duplication or inconsistent score inclusion
- mutation and unstable ordering
- loading/error/empty-state precedence
- inaccessible controls or labels
- stale navigation paths
- unnecessary abstractions or dependencies

Fix only concrete in-scope findings, add a focused regression test for non-trivial domain fixes, and rerun Step 1 after any change.

- [ ] **Step 4: Commit any verification fixes**

If files changed during verification:

```bash
git add mobile
git commit -m "fix: harden restaurant insight views"
```

If no files changed, do not create an empty commit.

- [ ] **Step 5: Push and create the Draft PR**

Push without force:

```bash
git push -u origin feature/restaurant-insights
```

Create a Draft PR targeting `main` with the Title Case title:

```text
Restaurant Insights And Personal Guide
```

The PR body must summarize the pure aggregation module, Home insights, sortable guide, restaurant detail, accessibility/error states, automated verification, browser smoke results, and any explicitly unverified behavior. Do not merge locally.
