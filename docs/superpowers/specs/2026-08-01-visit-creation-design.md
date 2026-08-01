# Visit Creation Flow Design

**Date:** 2026-08-01
**Status:** Approved for planning
**Scope:** Mobile MVP Task 4 only

## Goal

Let a user select or register a restaurant, rate at least one menu, record the visit experience, optionally attach photos and a note, and persist the complete local document without losing form input when saving fails.

Spring Boot remains outside this task. The mobile MVP continues to use AsyncStorage as its only persistence layer.

## Chosen Approach

Use a pure domain command for validation and immutable data updates, with a thin React context provider for loading and persistence. Screens own temporary form state and call the provider only after the form is complete.

This keeps business rules testable without React Native while avoiding a reducer or form framework that the current MVP does not need.

## Architecture

### Domain command

Add a pure `addVisitToAppData` command under `mobile/src/domain/`. It accepts the current `AppData` and a visit command containing:

- an existing restaurant ID;
- service and atmosphere ratings;
- one or more menu ratings, each referring to an existing menu or carrying a new non-blank menu name;
- optional visit time, daypart, note, and photo URIs;
- generated IDs supplied by the caller.

It validates references, required menu ratings, non-blank new menu names, rating bounds, and ISO dates. On success it returns a new `AppData` document containing any new menus, one visit, and its menu ratings. It never mutates the input document or writes storage.

### App data provider

`AppDataProvider` loads `AppData` once when mounted and exposes:

- `data`, `isLoading`, and `error`;
- `addRestaurant`;
- `addMenu`;
- `addVisit`.

Each command computes the next complete document, calls `saveAppData(nextData)`, and publishes the new in-memory state only after persistence succeeds. A failed write leaves both the prior state and the screen's form values intact and exposes an error for inline display.

ID generation stays in one small utility using the platform UUID API when available, with a timestamp/random fallback suitable for this local-only MVP.

### Routes and components

- `restaurant/search`: case-insensitive local search, recent restaurants first, and navigation to registration when no result fits.
- `restaurant/register`: requires a non-blank name, accepts optional category/address, saves locally, then returns the new restaurant ID to the visit flow.
- `visit/new`: selects existing menus or creates new ones, captures ratings, note, daypart, and optional photos, then saves one complete visit.
- `RatingRow`: accessible 1–5 selection with a visible label and selected state.
- `RestaurantCard`: reusable restaurant result row.

The root Expo Router stack registers these routes, and the home screen exposes the entry action for recording a visit.

## Data Flow

1. The user opens restaurant search from Home.
2. Search filters local restaurants by trimmed, case-insensitive name and sorts by most recent visit, then creation time.
3. The user selects a restaurant or registers one locally.
4. The visit form lists that restaurant's menus and allows non-blank new menu names.
5. The user completes taste/value ratings for at least one menu plus service/atmosphere ratings.
6. Optional image-picker results are stored as local URI strings; cancelling the picker changes nothing.
7. The domain command validates and constructs the next immutable document.
8. The provider persists the full document before updating React state.
9. On success the app navigates back to Home. On failure it stays on the form and displays the error.

## Validation and Error Handling

- Restaurant IDs must refer to an existing restaurant.
- A visit must contain at least one complete menu rating.
- New menu names are trimmed and cannot be blank.
- Every rating is an integer from 1 through 5.
- Menu IDs must belong to the selected restaurant.
- Supplied timestamps must use the existing ISO-date validation.
- Image-picker denial or cancellation is non-fatal and leaves photos empty.
- Storage read errors surface through the provider; invalid stored documents continue to restore empty data according to Task 3.
- Storage write errors reject the operation, preserve the form, and never publish unsaved state.

## Testing

Start with focused domain tests that demonstrate failure before implementation:

- missing or unknown restaurant;
- empty menu-rating list;
- blank new menu name;
- out-of-range ratings;
- menu from another restaurant;
- successful immutable append of a visit, new menu, and menu ratings.

Provider tests cover load-on-mount and the persist-before-publish guarantee, including a rejected write. UI verification uses TypeScript plus an Expo smoke check for navigation, restaurant registration, menu selection, image-picker cancellation, successful save, and persistence after reload.

## Non-Goals

- Spring Boot APIs, login, cloud sync, or community features;
- external restaurant search;
- editing or deleting visits;
- photo upload or image processing;
- a generalized form framework or state machine.
