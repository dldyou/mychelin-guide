# Visit Creation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-first restaurant selection, registration, and visit form that validates one or more menu ratings and publishes state only after AsyncStorage succeeds.

**Architecture:** Keep validation and immutable document updates in pure TypeScript commands. Wrap storage with one React context provider, keep temporary form state inside Expo Router screens, and reuse small presentational components for restaurant and rating rows.

**Tech Stack:** Expo 57, Expo Router, React Native, TypeScript, React Context, AsyncStorage, `expo-image-picker`, Jest with `jest-expo`.

## Global Constraints

- Work on `feature/visit-creation` using `git switch`; do not create a worktree and do not merge locally.
- This plan implements mobile MVP Task 4 only; Spring Boot, login, cloud sync, external restaurant APIs, and community features remain out of scope.
- A visit requires an existing restaurant and at least one menu rating.
- New menu names are trimmed and cannot be blank.
- Taste, value, service, and atmosphere are integers from `1` through `5`.
- Existing menus must belong to the visit's restaurant.
- Reuse `parseIsoDate` for timestamps; do not add another date parser.
- Persist the complete `AppData` document before publishing new React state.
- A failed write keeps prior app state and screen form values.
- IDs are generated in one utility; no new UUID dependency.
- Each non-trivial behavior starts with a failing test and receives a reviewer gate before the next task.

---

### Task 1: Add immutable app-data commands

**Files:**
- Create: `mobile/src/domain/appDataCommands.ts`
- Create: `mobile/src/domain/__tests__/appDataCommands.test.ts`

**Interfaces:**
- Consumes: `AppData`, `Restaurant`, `Menu`, `Visit`, and `MenuRating` from `mobile/src/domain/appData.ts`; `parseIsoDate` from `mobile/src/domain/scoring.ts`.
- Produces:

```ts
export type AppendVisitCommand = {
  visit: Visit;
  newMenus: Menu[];
  menuRatings: MenuRating[];
};

export function appendRestaurant(data: AppData, restaurant: Restaurant): AppData;
export function appendMenu(data: AppData, menu: Menu): AppData;
export function appendVisit(data: AppData, command: AppendVisitCommand): AppData;
```

- [ ] **Step 1: Write failing restaurant and menu command tests**

```ts
it('trims and appends a restaurant without mutating the input', () => {
  const data = createEmptyAppData();
  const next = appendRestaurant(data, {
    id: 'restaurant-1', name: '  Noodle House  ', createdAt: '2026-08-01',
  });
  expect(next.restaurants[0].name).toBe('Noodle House');
  expect(data).toEqual(createEmptyAppData());
});

it('rejects a blank restaurant or menu name', () => {
  expect(() => appendRestaurant(createEmptyAppData(), {
    id: 'restaurant-1', name: '  ', createdAt: '2026-08-01',
  })).toThrow('Restaurant name is required.');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
cd mobile
npm test -- --runInBand src/domain/__tests__/appDataCommands.test.ts
```

Expected: FAIL because `appDataCommands` does not exist.

- [ ] **Step 3: Implement the smallest restaurant and menu commands**

Use object/array spreads, trim names, validate IDs and ISO dates, and verify a menu's `restaurantId` exists. Do not add a repository abstraction or class.

```ts
export const appendRestaurant = (data: AppData, restaurant: Restaurant): AppData => {
  const name = restaurant.name.trim();
  if (!name) throw new Error('Restaurant name is required.');
  parseIsoDate(restaurant.createdAt);
  return { ...data, restaurants: [...data.restaurants, { ...restaurant, name }] };
};
```

- [ ] **Step 4: Add failing visit validation tests**

Cover these isolated cases:

```ts
expect(() => appendVisit(data, commandWith({ restaurantId: 'missing' })))
  .toThrow('Restaurant does not exist.');
expect(() => appendVisit(data, commandWith({ menuRatings: [] })))
  .toThrow('At least one menu rating is required.');
expect(() => appendVisit(data, commandWith({ service: 0 })))
  .toThrow('Ratings must be integers from 1 through 5.');
```

Also test a blank new-menu name, a menu owned by another restaurant, duplicate IDs, and an invalid visit timestamp.

- [ ] **Step 5: Run the tests and confirm the new cases fail for their intended reasons**

Run the focused command from Step 2. Expected: restaurant/menu cases pass and visit cases fail because `appendVisit` is missing or incomplete.

- [ ] **Step 6: Implement `appendVisit` minimally**

Validate the concrete `Visit`, `newMenus`, and `MenuRating` entities before appending them. Accept ratings that reference either an existing menu or one of `newMenus`, but require every referenced menu to belong to the visit restaurant. Return a new document and never mutate `data` or `command`.

```ts
export const appendVisit = (data: AppData, command: AppendVisitCommand): AppData => {
  validateVisitCommand(data, command);
  return {
    ...data,
    menus: [...data.menus, ...command.newMenus],
    visits: [...data.visits, command.visit],
    menuRatings: [...data.menuRatings, ...command.menuRatings],
  };
};
```

- [ ] **Step 7: Add and pass the successful append test**

Assert that one command adds one new menu, one visit, and its ratings; existing arrays remain unchanged; and optional note/photo/daypart fields are preserved.

- [ ] **Step 8: Run domain and complete tests**

```bash
cd mobile
npm test -- --runInBand src/domain/__tests__/appDataCommands.test.ts
npm test -- --runInBand
```

- [ ] **Step 9: Request reviewer gate and commit**

Fix all Critical/Important findings, rerun Step 8, then:

```bash
git add mobile/src/domain/appDataCommands.ts mobile/src/domain/__tests__/appDataCommands.test.ts
git commit -m "feat: add visit data commands"
```

### Task 2: Add the app-data provider and ID utility

**Files:**
- Create: `mobile/src/utils/createId.ts`
- Create: `mobile/src/state/AppDataProvider.tsx`
- Create: `mobile/src/state/__tests__/AppDataProvider.test.tsx`
- Modify: `mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: Task 1 commands and Task 3 `loadAppData`/`saveAppData`.
- Produces:

```ts
export type NewVisitInput = {
  restaurantId: string;
  visitedAt?: string;
  daypart?: Visit['daypart'];
  service: number;
  atmosphere: number;
  note?: string;
  photoUris?: string[];
  menuRatings: Array<{
    menuId?: string;
    menuName?: string;
    taste: number;
    value: number;
  }>;
};

export type AppDataContextValue = {
  data: AppData;
  isLoading: boolean;
  error: Error | null;
  addRestaurant(input: Pick<Restaurant, 'name' | 'category' | 'address'>): Promise<Restaurant>;
  addMenu(input: Pick<Menu, 'restaurantId' | 'name'>): Promise<Menu>;
  addVisit(input: NewVisitInput): Promise<Visit>;
};

export function AppDataProvider({ children }: PropsWithChildren): JSX.Element;
export function useAppData(): AppDataContextValue;
```

- [ ] **Step 1: Write the failing load-on-mount test**

Mock only `appStorage`. In a `@jest-environment jsdom` test, render `AppDataProvider` and a null-rendering consumer with the existing `react-dom/client`, flush the load promise with React's `act`, and assert `isLoading` changes from `true` to `false` with the loaded document. Add no renderer dependency.

- [ ] **Step 2: Run the provider test and confirm RED**

```bash
cd mobile
npm test -- --runInBand src/state/__tests__/AppDataProvider.test.tsx
```

Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement `createId` and provider loading**

`createId(prefix)` returns `${prefix}-${Date.now()}-${random}` using `globalThis.crypto?.randomUUID?.()` when available and a `Math.random()` fallback otherwise. The provider starts with `createEmptyAppData`, calls `loadAppData` once, and stores load failures in `error`.

```ts
export const createId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

useEffect(() => {
  loadAppData().then(setData).catch(setError).finally(() => setIsLoading(false));
}, []);
```

- [ ] **Step 4: Add the failing persist-before-publish test**

Use a manually controlled `saveAppData` promise. Invoke `addRestaurant`, verify context data is unchanged while the promise is pending, resolve it, then verify the restaurant appears. Add a rejected-save case that verifies state stays unchanged and `error` is set.

- [ ] **Step 5: Implement provider mutations**

Generate IDs and a single ISO timestamp per operation, use Task 1 commands to compute `nextData`, await `saveAppData(nextData)`, and only then call `setData(nextData)`. Convert `menuName` inputs into concrete new `Menu` entities before calling `appendVisit`.

```ts
const persist = async (nextData: AppData) => {
  try {
    await saveAppData(nextData);
    setData(nextData);
    setError(null);
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error('Failed to save app data.');
    setError(error);
    throw error;
  }
};
```

- [ ] **Step 6: Register the provider at the root**

Wrap `RootLayoutNav`'s `ThemeProvider`/`Stack` with `AppDataProvider` so tabs and stack routes share one loaded document. Keep font and splash behavior unchanged.

```tsx
<AppDataProvider>
  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <Stack>{/* existing and Task 4 routes */}</Stack>
  </ThemeProvider>
</AppDataProvider>
```

- [ ] **Step 7: Run focused and complete verification**

```bash
cd mobile
npm test -- --runInBand src/state/__tests__/AppDataProvider.test.tsx
npm test -- --runInBand
npx tsc --noEmit
```

- [ ] **Step 8: Request reviewer gate and commit**

```bash
git add mobile/src/utils/createId.ts mobile/src/state mobile/app/_layout.tsx
git commit -m "feat: add local app data provider"
```

### Task 3: Add search helpers and reusable rows

**Files:**
- Create: `mobile/src/domain/restaurantSearch.ts`
- Create: `mobile/src/domain/__tests__/restaurantSearch.test.ts`
- Create: `mobile/src/components/RatingRow.tsx`
- Create: `mobile/src/components/RestaurantCard.tsx`

**Interfaces:**
- Produces:

```ts
export function searchRestaurants(data: AppData, query: string): Restaurant[];

export type RatingRowProps = {
  label: string;
  value: number | null;
  onChange(value: number): void;
};

export type RestaurantCardProps = {
  restaurant: Restaurant;
  onPress(): void;
};
```

- [ ] **Step 1: Write failing search tests**

Assert trimmed case-insensitive matching, an empty query returning all restaurants, and ordering by newest visit before restaurant creation time.

- [ ] **Step 2: Run focused search tests and confirm RED**

```bash
cd mobile
npm test -- --runInBand src/domain/__tests__/restaurantSearch.test.ts
```

- [ ] **Step 3: Implement `searchRestaurants`**

Build one map of the newest `visitedAt` value per restaurant, filter by `name.toLocaleLowerCase()`, and return a copied sorted array. Reuse `parseIsoDate` for ordering.

```ts
const needle = query.trim().toLocaleLowerCase();
return [...data.restaurants]
  .filter(({ name }) => name.toLocaleLowerCase().includes(needle))
  .sort((left, right) => newestVisit(right.id) - newestVisit(left.id)
    || parseIsoDate(right.createdAt) - parseIsoDate(left.createdAt));
```

- [ ] **Step 4: Implement `RatingRow` and `RestaurantCard`**

Use `Pressable` controls with `accessibilityRole="radio"`, `accessibilityState={{ checked }}`, visible focus/selected styling, and minimum 44-point touch targets. `RestaurantCard` renders name plus optional category/address and exposes one press action.

```tsx
{[1, 2, 3, 4, 5].map((rating) => (
  <Pressable
    key={rating}
    accessibilityRole="radio"
    accessibilityState={{ checked: value === rating }}
    onPress={() => onChange(rating)}
  >
    <Text>{rating}</Text>
  </Pressable>
))}
```

- [ ] **Step 5: Run tests and TypeScript**

```bash
cd mobile
npm test -- --runInBand src/domain/__tests__/restaurantSearch.test.ts
npm test -- --runInBand
npx tsc --noEmit
```

- [ ] **Step 6: Request reviewer gate and commit**

```bash
git add mobile/src/domain/restaurantSearch.ts mobile/src/domain/__tests__/restaurantSearch.test.ts mobile/src/components/RatingRow.tsx mobile/src/components/RestaurantCard.tsx
git commit -m "feat: add restaurant search and rating controls"
```

### Task 4: Build restaurant search and registration routes

**Files:**
- Create: `mobile/app/restaurant/search.tsx`
- Create: `mobile/app/restaurant/register.tsx`
- Modify: `mobile/app/_layout.tsx`

**Interfaces:**
- Search navigates to `{ pathname: '/visit/new', params: { restaurantId } }`.
- Registration calls `addRestaurant`, then replaces the route with `/visit/new?restaurantId=<id>`.

- [ ] **Step 1: Implement the search route**

Use `useAppData`, controlled `TextInput`, `searchRestaurants`, and `RestaurantCard`. Show loading/error/empty states, a registration button, and recent results for an empty query.

```tsx
const [query, setQuery] = useState('');
const { data, isLoading, error } = useAppData();
const restaurants = searchRestaurants(data, query);

return <Screen>
  <TextInput value={query} onChangeText={setQuery} placeholder="식당 이름 검색" />
  {restaurants.map((restaurant) => (
    <RestaurantCard key={restaurant.id} restaurant={restaurant}
      onPress={() => router.push({ pathname: '/visit/new', params: { restaurantId: restaurant.id } })} />
  ))}
</Screen>;
```

- [ ] **Step 2: Implement the registration route**

Use controlled name/category/address inputs. Trim values, disable submit when name is blank or saving, show save errors inline, and preserve inputs on failure.

```ts
const submit = async () => {
  setIsSaving(true);
  try {
    const restaurant = await addRestaurant({ name, category, address });
    router.replace({ pathname: '/visit/new', params: { restaurantId: restaurant.id } });
  } catch (cause) {
    setFormError(cause instanceof Error ? cause.message : '식당을 저장하지 못했습니다.');
  } finally {
    setIsSaving(false);
  }
};
```

- [ ] **Step 3: Register route headers**

Add stack screens for `restaurant/search`, `restaurant/register`, and `visit/new` with Korean titles. Do not change tab routing.

```tsx
<Stack.Screen name="restaurant/search" options={{ title: '식당 찾기' }} />
<Stack.Screen name="restaurant/register" options={{ title: '식당 등록' }} />
<Stack.Screen name="visit/new" options={{ title: '방문 기록' }} />
```

- [ ] **Step 4: Run TypeScript and Expo route smoke check**

```bash
cd mobile
npx tsc --noEmit
npx expo export --platform web
```

Expected: both commands exit `0`; all three stack routes are bundled.

- [ ] **Step 5: Request reviewer gate and commit**

```bash
git add mobile/app/_layout.tsx mobile/app/restaurant/search.tsx mobile/app/restaurant/register.tsx
git commit -m "feat: add restaurant selection flow"
```

### Task 5: Build the visit form with optional photos

**Files:**
- Create: `mobile/app/visit/new.tsx`
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`

**Interfaces:**
- Consumes: `restaurantId` route param, `useAppData`, `RatingRow`, and `NewVisitInput`.
- Produces: one persisted visit with one or more complete menu ratings.

- [ ] **Step 1: Install the Expo-compatible image picker**

```bash
cd mobile
npx expo install expo-image-picker
```

Commit the resolved Expo-compatible version in both package files; add no other media dependency.

- [ ] **Step 2: Implement restaurant/menu setup**

Read the scalar `restaurantId` param, resolve the restaurant from provider data, and list only menus whose `restaurantId` matches. If the restaurant is missing, render an error with a button back to search.

```ts
const params = useLocalSearchParams<{ restaurantId?: string | string[] }>();
const restaurantId = Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId;
const restaurant = data.restaurants.find(({ id }) => id === restaurantId);
const menus = data.menus.filter((menu) => menu.restaurantId === restaurantId);
```

- [ ] **Step 3: Implement menu-rating form state**

Each selected existing menu or new menu draft owns `taste` and `value` values. Prevent duplicate existing-menu selection, trim new names, and disable save until at least one row has both ratings plus service and atmosphere.

```ts
type MenuRatingDraft = { key: string; menuId?: string; menuName?: string; taste: number | null; value: number | null };
const canSave = service !== null && atmosphere !== null
  && drafts.length > 0
  && drafts.every(({ menuId, menuName, taste, value }) =>
    Boolean(menuId || menuName?.trim()) && taste !== null && value !== null);
```

- [ ] **Step 4: Implement visit fields and photo selection**

Add daypart selection, service/atmosphere `RatingRow`s, optional multiline note, and an “사진 추가” action. Request media-library permission only when pressed; use `allowsMultipleSelection: true`; append unique asset URIs; cancellation changes nothing; denial displays an inline message.

```ts
const pickPhotos = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return setFormError('사진 접근 권한이 필요합니다.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true });
  if (!result.canceled) setPhotoUris((current) => [...new Set([...current, ...result.assets.map(({ uri }) => uri)])]);
};
```

- [ ] **Step 5: Implement save behavior**

Build `NewVisitInput` with the current ISO timestamp, await `addVisit`, and navigate to `/(tabs)` only after success. Catch errors into local form error state without clearing any field.

```ts
await addVisit({
  restaurantId,
  visitedAt: new Date().toISOString(),
  service: service!,
  atmosphere: atmosphere!,
  note: note.trim() || undefined,
  photoUris,
  menuRatings: drafts.map(({ menuId, menuName, taste, value }) => ({
    menuId, menuName, taste: taste!, value: value!,
  })),
});
router.replace('/(tabs)');
```

- [ ] **Step 6: Run TypeScript, all tests, and export**

```bash
cd mobile
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform web
```

- [ ] **Step 7: Request reviewer gate and commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/app/visit/new.tsx
git commit -m "feat: add visit entry form"
```

### Task 6: Connect Home and verify the complete flow

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Home navigates to `/restaurant/search` through a visible primary “방문 기록하기” action.

- [ ] **Step 1: Add the Home entry action**

Preserve the existing introduction and theme. Add one accessible `Pressable` that calls `router.push('/restaurant/search')`; do not implement Task 5 summaries or cards here.

```tsx
<Pressable accessibilityRole="button" onPress={() => router.push('/restaurant/search')}>
  <Text>방문 기록하기</Text>
</Pressable>
```

- [ ] **Step 2: Run fresh automated verification**

```bash
cd mobile
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform web
```

Expected: all tests pass, TypeScript exits `0`, and Expo produces a web bundle without route/import errors.

- [ ] **Step 3: Perform the mobile acceptance smoke check**

```bash
cd mobile
npx expo start
```

Verify in order:

1. Home opens restaurant search.
2. A restaurant can be registered and immediately selected.
3. A new menu with taste/value plus service/atmosphere can be entered.
4. Cancelling photo selection leaves the form usable.
5. Saving navigates home only after persistence succeeds.
6. Reloading the app restores the restaurant, menu, visit, and ratings.

- [ ] **Step 4: Request final reviewer gate**

Review the complete diff from `origin/main` through `HEAD`. Fix all Critical/Important findings and rerun Step 2.

- [ ] **Step 5: Commit the Home integration**

```bash
git add 'mobile/app/(tabs)/index.tsx'
git commit -m "feat: connect visit creation from home"
```

- [ ] **Step 6: Publish without local merge**

Push `feature/visit-creation` and open a Draft PR against `main` titled **“Restaurant Visit Creation Flow”**. Include test, TypeScript, Expo export, and manual smoke evidence in the PR body. Stop after PR creation and wait for GitHub review/merge.
