# Release Readiness Plan

## Goal

Make the completed local mobile MVP reproducibly runnable and record the remaining physical-device checks.

## Scope

1. Correct the mobile and Spring Boot commands in `README.md`.
2. Run the mobile tests, TypeScript check, and web export.
3. Run the backend test, start it, verify `/actuator/health`, and stop it.
4. Leave native share, photo, persistence, and screen-reader checks as an explicit physical-device checklist.

## Non-goals

- Backend domain APIs, PostgreSQL, authentication, image upload, or mobile synchronization.
- Editing, deletion, restaurant-provider APIs, community, or recommendations.

Those features start only after a multi-device or shared-account requirement exists. The current AsyncStorage MVP does not need them.

## Acceptance

- A new contributor can start both projects from the repository root by following `README.md`.
- Mobile automated checks pass.
- Backend tests pass and Actuator reports `UP`.
- No verification server remains running.
