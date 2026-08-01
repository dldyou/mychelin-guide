# Profile Statistics And Restaurant Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the local mobile MVP's Profile feature with record statistics and a restaurant-specific preview that invokes the operating system share sheet.

**Architecture:** Two pure domain modules calculate profile statistics and stable share text from canonical local data. Profile, restaurant detail, and the dynamic share route consume provider data and own only rendering, navigation, pending/error state, and the built-in React Native `Share.share` side effect. No derived data is persisted or cached.

**Tech Stack:** Expo 57, React Native 0.86, Expo Router with typed routes, TypeScript 6, Jest 29, built-in React Native `Share`

## Global Constraints

- Work on `feature/profile-sharing` in the normal repository using `git switch`; do not create a Git worktree.
- Follow `mobile/AGENTS.md` and consult the exact Expo 57 documentation at `https://docs.expo.dev/versions/v57.0.0/` before changing Expo Router code.
- Consult the React Native 0.86 `Share` API contract before implementing native sharing; use the built-in API and add no dependency.
- Do not add complete-guide sharing, automatic top-restaurant selection, share images, custom targets, deep links, analytics, remote URLs, profile editing, avatars, accounts, authentication, backend synchronization, or caching.
- Profile's visited-restaurant count includes only distinct visit restaurant IDs that resolve to registered restaurants; total visits and menu ratings use raw stored array lengths.
- Share text is stable plain text in the exact order `MYCHELIN GUIDE`, restaurant name, score state, visit count, optional representative note.
- Use `개인 점수 N.N` for numeric scores, `평가 전` for null, `방문 N회`, and `한줄평: <memo>` for the newest non-empty trimmed note.
- Loading takes precedence over provider errors and content; provider and share errors use accessible assertive alerts.
- Reject array or missing route IDs; unavailable routes provide a back action.
- Disable the share button while `Share.share` is pending; dismissal is not an error, rejection keeps the preview and allows retry.
- Use strict RED-GREEN TDD for the two domain modules. UI-only tasks are explicitly exempt from new component unit tests because the project has no component-test dependency and dependencies are forbidden; verify UI with the existing suite, TypeScript, Expo web export, and browser smoke checks.
- Finish by pushing the feature branch and opening a Draft PR against `main` with a Title Case title; never merge locally.

---

### Task 1: Add pure profile statistics

**Files:**
- Create: `mobile/src/domain/profileStats.ts`
- Create: `mobile/src/domain/__tests__/profileStats.test.ts`
- Reuse: `mobile/src/domain/appData.ts`

**Interfaces:**
- Consumes: `AppData`
- Produces:

```ts
export type ProfileStats = {
  visitedRestaurantCount: number;
  visitCount: number;
  menuRatingCount: number;
};

export function getProfileStats(data: AppData): ProfileStats;
```

- [ ] **Step 1: Write the failing empty-data test**

Create `profileStats.test.ts` and assert the wished-for API:

```ts
expect(getProfileStats(createEmptyAppData())).toEqual({
  visitedRestaurantCount: 0,
  visitCount: 0,
  menuRatingCount: 0,
});
```

The production change this catches is returning missing, undefined, or nonzero defaults for an empty profile.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
cd mobile
npx jest src/domain/__tests__/profileStats.test.ts --runInBand
```

Expected: FAIL because `profileStats` and `getProfileStats` do not exist.

- [ ] **Step 3: Implement the minimal empty-data behavior**

Create `profileStats.ts` with the exported type and function. Derive counts from the input; do not create state or mutate arrays.

Start with only the behavior proven by the first test:

```ts
export function getProfileStats(_data: AppData): ProfileStats {
  return {
    visitedRestaurantCount: 0,
    visitCount: 0,
    menuRatingCount: 0,
  };
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the focused Jest command from Step 2.

Expected: the empty-data test passes.

- [ ] **Step 5: Add failing distinct-restaurant and raw-total tests**

Use a hand-built `AppData` fixture containing:

- registered restaurants `restaurant-a`, `restaurant-b`, and unvisited `restaurant-c`
- two visits for `restaurant-a`
- one visit for `restaurant-b`
- one broken visit for `missing-restaurant`
- four menu-rating records

Assert literal results:

```ts
expect(getProfileStats(data)).toEqual({
  visitedRestaurantCount: 2,
  visitCount: 4,
  menuRatingCount: 4,
});
```

Also snapshot the four input arrays before the call and assert they remain equal afterward. This catches double-counting repeat visits, counting unresolved restaurants as visited, excluding raw stored totals, or mutating canonical data.

- [ ] **Step 6: Implement distinct resolved restaurant counting**

Build a `Set` of registered restaurant IDs, then a `Set` of visit restaurant IDs filtered through it. Return the two raw array lengths for the other totals.

```ts
const restaurantIds = new Set(data.restaurants.map(({ id }) => id));
const visitedRestaurantIds = new Set(
  data.visits
    .map(({ restaurantId }) => restaurantId)
    .filter((restaurantId) => restaurantIds.has(restaurantId)),
);

return {
  visitedRestaurantCount: visitedRestaurantIds.size,
  visitCount: data.visits.length,
  menuRatingCount: data.menuRatings.length,
};
```

- [ ] **Step 7: Run focused and complete verification**

Run:

```bash
cd mobile
npx jest src/domain/__tests__/profileStats.test.ts --runInBand
npm test -- --runInBand
npx tsc --noEmit
```

Expected: focused and complete tests pass; TypeScript exits `0`.

- [ ] **Step 8: Request a reviewer gate and commit**

Review count definitions, broken-reference behavior, mutation, unused abstractions, and test independence. Then commit:

```bash
git add mobile/src/domain/profileStats.ts mobile/src/domain/__tests__/profileStats.test.ts
git commit -m "feat: add profile statistics"
```

---

### Task 2: Add stable restaurant share text

**Files:**
- Create: `mobile/src/domain/shareText.ts`
- Create: `mobile/src/domain/__tests__/shareText.test.ts`
- Reuse: `mobile/src/domain/restaurantSummary.ts`

**Interfaces:**
- Consumes: `RestaurantSummary`
- Produces:

```ts
export function createRestaurantShareText(summary: RestaurantSummary): string;
```

- [ ] **Step 1: Write the failing scored-summary test**

Create a complete literal `RestaurantSummary` fixture with score `4.25`, visit count `2`, and newest-first visits where the newest note is whitespace and the older note is `  다시 먹고 싶은 비빔밥  `.

Assert the hand-authored result:

```ts
expect(createRestaurantShareText(summary)).toBe([
  'MYCHELIN GUIDE',
  '테스트 식당',
  '개인 점수 4.3',
  '방문 2회',
  '한줄평: 다시 먹고 싶은 비빔밥',
].join('\n'));
```

This catches incorrect line order, numeric formatting, failure to scan newest-first notes, and missing trimming.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
cd mobile
npx jest src/domain/__tests__/shareText.test.ts --runInBand
```

Expected: FAIL because `shareText` and `createRestaurantShareText` do not exist.

- [ ] **Step 3: Implement minimal share-text generation**

Build only the scored, representative-note path required by the first test. Do not yet add null-score or missing-note branches:

```ts
const representativeNote = summary.visits
  .map(({ visit }) => visit.note?.trim())
  .find((note): note is string => Boolean(note));

return [
  'MYCHELIN GUIDE',
  summary.restaurant.name,
  `개인 점수 ${summary.score!.toFixed(1)}`,
  `방문 ${summary.visitCount}회`,
  `한줄평: ${representativeNote}`,
].join('\n');
```

Do not parse the generated text elsewhere or mutate the summary.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the focused Jest command from Step 2.

Expected: the scored-summary test passes.

- [ ] **Step 5: Add failing unscored and no-note tests**

Set `score: null`, `visitCount: 0`, and no visits. Assert exactly:

```ts
expect(createRestaurantShareText(unscored)).toBe([
  'MYCHELIN GUIDE',
  '평가 전 식당',
  '평가 전',
  '방문 0회',
].join('\n'));
```

Add a scored summary whose notes are missing or whitespace-only and assert no `한줄평:` line. Assert the input object and nested visits remain unchanged.

- [ ] **Step 6: Complete the implementation and verify**

Implement the null-score and optional-note branches, then run:

```ts
const lines = [
  'MYCHELIN GUIDE',
  summary.restaurant.name,
  summary.score === null ? '평가 전' : `개인 점수 ${summary.score.toFixed(1)}`,
  `방문 ${summary.visitCount}회`,
];
if (representativeNote) lines.push(`한줄평: ${representativeNote}`);
return lines.join('\n');
```

```bash
cd mobile
npx jest src/domain/__tests__/shareText.test.ts --runInBand
npm test -- --runInBand
npx tsc --noEmit
```

Expected: focused and complete tests pass; TypeScript exits `0`.

- [ ] **Step 7: Request a reviewer gate and commit**

Review exact text order, hand-derived expectations, newest-first selection, trimming, immutability, and independence from React Native. Then commit:

```bash
git add mobile/src/domain/shareText.ts mobile/src/domain/__tests__/shareText.test.ts
git commit -m "feat: add restaurant share text"
```

---

### Task 3: Build the Profile statistics screen

**Files:**
- Modify: `mobile/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `useAppData`, `getProfileStats`, `useRouter`
- Produces: labelled Profile statistics and navigation to `/guide`

- [ ] **Step 1: Consult Expo 57 Router documentation**

Read the exact versioned Router API and navigation examples:

- `https://docs.expo.dev/versions/v57.0.0/sdk/router/`
- `https://docs.expo.dev/versions/v57.0.0/sdk/router/link/`

Confirm `useRouter` and typed `router.push('/guide')` usage before editing.

- [ ] **Step 2: Derive provider state and statistics**

Read `data`, `isLoading`, and `error` from `useAppData`. Call `getProfileStats(data)` once per render. Do not store the result in provider or component state.

```ts
const router = useRouter();
const { data, isLoading, error } = useAppData();
const stats = getProfileStats(data);
```

- [ ] **Step 3: Render exclusive loading, error, and content branches**

Keep the Profile title and replace the current explanatory copy. Use one exclusive chain:

1. `기록을 불러오는 중이에요.` while loading
2. provider error text with `accessibilityRole="alert"` and `accessibilityLiveRegion="assertive"`
3. three labelled statistic cards and the action

Use visible Korean labels `방문한 식당`, `방문 기록`, and `메뉴 평가`; show their numeric values without abbreviating them.

```tsx
{isLoading ? (
  <Text style={styles.message}>기록을 불러오는 중이에요.</Text>
) : error ? (
  <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
    {error.message}
  </Text>
) : (
  <View style={styles.stats}>
    <Text>{`방문한 식당 ${stats.visitedRestaurantCount}`}</Text>
    <Text>{`방문 기록 ${stats.visitCount}`}</Text>
    <Text>{`메뉴 평가 ${stats.menuRatingCount}`}</Text>
  </View>
)}
```

- [ ] **Step 4: Add the Guide action**

Add a button labelled `마이 가이드 보기` with at least a 44-point target, button role, pressed/focus feedback, and:

```ts
router.push('/guide');
```

- [ ] **Step 5: Verify Profile integration**

Run:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
```

Expected: TypeScript and all Jest suites pass.

- [ ] **Step 6: Request a reviewer gate and commit**

Review exact count labels, provider-state precedence, lack of derived state, route typing, accessibility, and minimal styles. Then commit:

```bash
git add "mobile/app/(tabs)/profile.tsx"
git commit -m "feat: add profile record statistics"
```

---

### Task 4: Add the share preview route and detail entry action

**Files:**
- Create: `mobile/app/share/[id].tsx`
- Modify: `mobile/app/restaurant/[id].tsx`
- Modify: `mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams<{ id?: string | string[] }>()`, `useRouter`, `useAppData`, `getRestaurantSummary`, `DEFAULT_SCORE_POLICY`, `createRestaurantShareText`, and React Native `Share`
- Produces: typed `/share/[id]` navigation, preview, and `Share.share({ message })`

- [ ] **Step 1: Consult exact Router and Share contracts**

Before code changes, read:

- Expo Router 57 API: `https://docs.expo.dev/versions/v57.0.0/sdk/router/`
- Expo Router Link 57 dynamic-route examples: `https://docs.expo.dev/versions/v57.0.0/sdk/router/link/`
- React Native 0.86 Share documentation or the installed `react-native/Libraries/Share/Share.d.ts`

Confirm that iOS dismissal resolves with `dismissedAction`, Android resolves with `sharedAction`, and rejected promises represent actual failures.

- [ ] **Step 2: Build route resolution and provider-state precedence**

Create `mobile/app/share/[id].tsx`. Normalize the route parameter exactly:

```ts
const params = useLocalSearchParams<{ id?: string | string[] }>();
const restaurantId = typeof params.id === 'string' ? params.id : undefined;
const summary = restaurantId
  ? getRestaurantSummary(restaurantId, data, DEFAULT_SCORE_POLICY)
  : null;
```

Render loading first, then provider error alert, then unavailable restaurant alert with `router.back()`, then content.

- [ ] **Step 3: Render one source-of-truth preview**

For a valid summary, calculate once:

```ts
const message = createRestaurantShareText(summary);
```

Render `message` unchanged inside a bordered compact preview card. Do not independently recalculate or parse score, visit count, or representative note in the screen.

- [ ] **Step 4: Implement guarded native sharing**

Use local `isSharing` and `shareError` state plus a ref that closes the same-render duplicate-press gap. The action must follow this shape:

```ts
if (sharingRef.current) return;
sharingRef.current = true;
setIsSharing(true);
setShareError(null);
try {
  await Share.share({ message });
} catch {
  setShareError('공유를 시작하지 못했어요. 다시 시도해 주세요.');
} finally {
  sharingRef.current = false;
  setIsSharing(false);
}
```

Disable the button and expose disabled accessibility state while pending. Keep the preview mounted after resolution, dismissal, or rejection. Render `shareError` as an assertive alert.

- [ ] **Step 5: Register the route and connect restaurant detail**

Add:

```tsx
<Stack.Screen name="share/[id]" options={{ title: '공유 미리보기' }} />
```

Add a `공유 카드 만들기` button after the restaurant headline metrics. Navigate with:

```ts
router.push({
  pathname: '/share/[id]',
  params: { id: summary.restaurant.id },
});
```

Preserve existing detail states and content.

- [ ] **Step 6: Verify route, native import, and export**

Run:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
npx expo export --platform web
```

Expected: TypeScript passes, all Jest suites pass, and export lists `/share/[id]` without route or import errors.

- [ ] **Step 7: Request a reviewer gate and commit**

Review parameter rejection, provider-state precedence, one-source preview, pending guard, dismissal/rejection semantics, retry behavior, route typing, accessibility, and minimal scope. Then commit:

```bash
git add "mobile/app/share/[id].tsx" "mobile/app/restaurant/[id].tsx" mobile/app/_layout.tsx
git commit -m "feat: add restaurant sharing flow"
```

---

### Task 5: Verify and publish Profile sharing

**Files:**
- Modify only if verification exposes an in-scope defect in Tasks 1-4
- Verify: `mobile/app/(tabs)/profile.tsx`
- Verify: `mobile/app/restaurant/[id].tsx`
- Verify: `mobile/app/share/[id].tsx`
- Verify: `mobile/src/domain/profileStats.ts`
- Verify: `mobile/src/domain/shareText.ts`

**Interfaces:**
- Consumes: the complete local record, Guide, and restaurant-detail flows on `main`
- Produces: a reviewed, green `feature/profile-sharing` branch and a Draft PR; no local merge

- [ ] **Step 1: Run fresh automated verification**

From `mobile/` run:

```bash
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform web
```

From the repository root run:

```bash
git diff --check main...HEAD
git status --short --branch
```

Expected: all tests pass, TypeScript and export exit `0`, export includes `/share/[id]`, diff check is clean, and only intentional branch changes exist.

- [ ] **Step 2: Perform the browser acceptance flow**

Start Expo web on an available local port and use visible UI only:

1. Create one restaurant and one visit with a non-empty note if the browser profile has no suitable data.
2. Open Profile and confirm visited restaurant, visit, and menu-rating counts match visible created data.
3. Press `마이 가이드 보기`, select the restaurant, and press `공유 카드 만들기`.
4. Confirm preview text exactly matches the expected header, restaurant, score state, visit count, and newest non-empty note.
5. Navigate to `/share/nonexistent-verification-id`, confirm unavailable alert and back action.
6. Confirm button roles, labels, disabled semantics where observable, and 44-point controls.
7. Press `공유하기` only if the web environment safely supports it. If it rejects, verify the retryable Korean alert; if it invokes an external native UI, do not interact beyond the app and record the boundary.

Do not inspect cookies, browser storage, or private state. Finalize the test tab and stop the local server. Record any environment-limited behavior exactly instead of claiming it passed.

- [ ] **Step 3: Perform final whole-branch review**

Review `main...HEAD` for:

- exact profile count definitions and broken references
- stable share-text order, formatting, trimming, and immutability
- duplicate share-content calculations
- provider/route state precedence
- duplicate native share requests and retry behavior
- accessibility and typed navigation
- unnecessary dependencies, state, or abstractions

Fix concrete in-scope findings in one final fix wave, add focused domain regression tests for non-trivial logic fixes, and rerun Step 1 after any code change.

- [ ] **Step 4: Commit verification fixes only when needed**

If verification changed product files:

```bash
git add mobile
git commit -m "fix: harden profile sharing flow"
```

Do not create an empty commit.

- [ ] **Step 5: Push and create the Draft PR**

Push without force:

```bash
git push -u origin feature/profile-sharing
```

Create a Draft PR targeting `main` with the Title Case title:

```text
Profile Statistics And Restaurant Sharing
```

The PR body must summarize statistics, pure share text, Profile navigation, share preview, native share handling, accessibility/error states, automated verification, browser results, and native-device manual-QA limitations. Do not merge locally.
