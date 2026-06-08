# Mobile UI Route Inventory

## Executive Summary

- UI routes audited: `38`
- API/BFF routes inventoried: `48`
- Mobile UI migrated routes: `21`
- Placeholder-safe routes: `1`
- Follow-up-needed routes: `13`
- Public/basic routes: `3`
- Unknown/manual-review routes: `0`

### Key Risks

- The client-side cutover is incomplete for `client/add-log`, `client/bookmarks`, `client/orders`, `client/pickups`, `client/subscriptions`, `client/notifications`, `client/settings`, `client/training/history`, and `client/add-log/full-log-history`.
- The PT-side cutover is incomplete for `pt/clients/[clientId]/assign`, `pt/clients/[clientId]/log-history`, `pt/notifications`, and `pt/settings`.
- Two of the remaining non-mobile PT and client follow-up pages still contain mutation behavior and should not be moved casually:
  - `pt/clients/[clientId]/assign`
  - `pt/settings`
- `vendor/operations` is now Mobile UI aligned, but it remains intentionally placeholder-safe and must not be treated as a live operations workflow.

## Route Inventory Table

| Route | File | Role | Classification | Mobile UI components used | BFF-only status | Test coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | Public | Public/basic page | No | Yes; session bootstrap only | `tests/auth-pages.test.tsx` | Uses `useSessionBootstrap` for authenticated redirect. Plain public landing copy, not a migration target. |
| `/login` | `app/login/page.tsx` | Public | Public/basic page | No | Yes; `/api/auth/login` plus session bootstrap | `tests/auth-pages.test.tsx` | Uses `useSessionBootstrap` redirect flow and posts only to local auth BFF. |
| `/register` | `app/register/page.tsx` | Public | Public/basic page | No | Yes; `/api/auth/register` only | `tests/auth-pages.test.tsx` | No `useSessionBootstrap` in the page file. Public auth surface remains outside the mobile cutover. |
| `/client` | `app/client/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileRoutineCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/client/home` | `tests/client-home-mobile-page.test.tsx` | Uses `useSessionBootstrap`; route is part of the completed client mobile foundation. |
| `/client/add-log` | `app/client/add-log/page.tsx` | client | Not migrated / needs follow-up | No | Yes; delegated to `AddLogPageClient` using `/api/client/training/workout-logs` | No route-specific page test | Wrapper page uses `Suspense`; auth and BFF work live in `AddLogPageClient`. Sensitive logging flow still uses legacy shell/components. |
| `/client/add-log/full-log-history` | `app/client/add-log/full-log-history/page.tsx` | client | Thin legacy utility page | No | Yes; delegated to `ClientWorkoutHistoryLedger` using `/api/client/training/workout-logs` | Shared constant coverage only: `tests/workout-history-route.test.ts` | No `useSessionBootstrap` in the page file; auth and BFF handling are delegated to the shared history ledger. |
| `/client/bookmarks` | `app/client/bookmarks/page.tsx` | client | Not migrated / needs follow-up | No | Yes; `/api/client/bookmarks` CRUD only | No route-specific page test | Uses `useSessionBootstrap`; full bookmark workspace remains on pre-Mobile UI `PageShell` and legacy cards. |
| `/client/training` | `app/client/training/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileRoutineCard`, `MobileSection` | Yes; `/api/client/training` | `tests/client-training-mobile-page.test.tsx` | Uses `useSessionBootstrap`; completed mobile route with BFF-only data access. |
| `/client/training/[assignmentId]` | `app/client/training/[assignmentId]/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection` | Yes; `/api/client/training/assignments/[assignmentId]`, `/api/client/training/workout-logs` | `tests/client-training-assignment-mobile-page.test.tsx` | Uses `useSessionBootstrap`; mobile detail route preserves workout-log mutation through existing BFF routes only. |
| `/client/training/history` | `app/client/training/history/page.tsx` | client | Thin legacy utility page | No | Yes; delegated to `ClientWorkoutHistoryLedger` using `/api/client/training/workout-logs` | No route-specific page test | No `useSessionBootstrap` in the page file; auth and BFF handling are delegated to the shared history ledger. |
| `/client/metrics` | `app/client/metrics/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/client/metrics/overview`, `/api/client/metrics/history` | `tests/client-metrics-mobile-page.test.tsx` | Uses `useSessionBootstrap`; completed mobile metrics route with view-model coverage. |
| `/client/meal-plans` | `app/client/meal-plans/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/client/meal-plans`, `/api/client/bookmarks` | `tests/client-meal-plans-mobile-page.test.tsx` | Uses `useSessionBootstrap`; mobile marketplace route preserves bookmark BFF behavior. |
| `/client/meal-plans/[mealPlanId]` | `app/client/meal-plans/[mealPlanId]/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/client/meal-plans/[mealPlanId]`, `/api/client/bookmarks`, `/api/client/checkout/session` | `tests/client-meal-plan-detail-mobile-page.test.tsx` | Uses `useSessionBootstrap`; mobile detail route preserves checkout-session and bookmark BFF flows. |
| `/client/meal-plans/bookmark` | `app/client/meal-plans/bookmark/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/client/bookmarks` | `tests/client-meal-plan-bookmarks-mobile-page.test.tsx` | Uses `useSessionBootstrap`; completed bookmark-folder Mobile UI slice. |
| `/client/meal-plans/search` | `app/client/meal-plans/search/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/client/meal-plans` | `tests/client-meal-plan-search-mobile-page.test.tsx` | Uses `useSessionBootstrap`; mobile search route stays on existing meal-plan BFF contract. |
| `/client/meal-plans/schedule` | `app/client/meal-plans/schedule/page.tsx` | client | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection` | Yes; no page-level BFF fetches | `tests/client-meal-plan-schedule-mobile-page.test.tsx` | Uses `useSessionBootstrap`; mobile helper route stays local and does not introduce direct backend behavior. |
| `/client/orders` | `app/client/orders/page.tsx` | client | Thin legacy utility page | No | Yes; `/api/client/orders` | No route-specific page test | Uses `useSessionBootstrap`; generic summary/record shell remains pre-Mobile UI. |
| `/client/pickups` | `app/client/pickups/page.tsx` | client | Thin legacy utility page | No | Yes; `/api/client/pickups` | No route-specific page test | Uses `useSessionBootstrap`; generic pickup summary shell remains pre-Mobile UI. |
| `/client/subscriptions` | `app/client/subscriptions/page.tsx` | client | Thin legacy utility page | No | Yes; `/api/client/subscriptions` | No route-specific page test | Uses `useSessionBootstrap`; generic subscription summary shell remains pre-Mobile UI. |
| `/client/notifications` | `app/client/notifications/page.tsx` | client | Thin legacy utility page | No | Yes; delegated to `NotificationsPage` using `/api/notifications`, `/api/client/invitations`, and invitation response routes | No route-specific page test | Wrapper page does not call `useSessionBootstrap`; auth and BFF behavior are delegated to the shared notifications component. |
| `/client/settings` | `app/client/settings/page.tsx` | client | Thin legacy utility page | No | Yes; session-only, local theme/preferences state | No route-specific page test | Uses `useSessionBootstrap`; settings are still built on pre-Mobile UI shell/components. |
| `/pt` | `app/pt/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/dashboard` | `tests/pt-dashboard-mobile-page.test.tsx` | Uses `useSessionBootstrap`; PT dashboard is on the mobile foundation. |
| `/pt/clients` | `app/pt/clients/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection` | Yes; `/api/pt/clients`, `/api/pt/roster-categories`, `/api/pt/client-invitations`, `/api/pt/clients/[clientId]/roster-category` | `tests/pt-clients-page.test.tsx` | Uses `useSessionBootstrap`; roster management remains BFF-only. |
| `/pt/clients/[clientId]` | `app/pt/clients/[clientId]/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/clients/[clientId]`, `/api/pt/clients/[clientId]/assignments`, `/api/pt/clients/[clientId]/metrics`, `/api/pt/clients/[clientId]/workout-logs`, `/api/pt/workout-logs/[workoutLogId]/pt-notes` | `tests/pt-client-detail-mobile-page.test.tsx` | Uses `useSessionBootstrap`; completed mobile client detail route with preserved PT note mutation. |
| `/pt/clients/[clientId]/assign` | `app/pt/clients/[clientId]/assign/page.tsx` | pt | Not migrated / needs follow-up | No | Yes; `/api/pt/packages`, `/api/pt/clients/[clientId]/assignments`, `/api/pt/clients/[clientId]/assignments/create` | No route-specific page test | Uses `useSessionBootstrap`; assignment creation is live and mutation-heavy, so this legacy route is a high-priority follow-up. |
| `/pt/clients/[clientId]/log-history` | `app/pt/clients/[clientId]/log-history/page.tsx` | pt | Thin legacy utility page | No | Yes; delegated to `ClientWorkoutHistoryLedger` using `/api/pt/clients/[clientId]/workout-logs` | No route-specific page test | Wrapper page delegates auth and data loading to the shared history ledger. |
| `/pt/clients/[clientId]/metrics` | `app/pt/clients/[clientId]/metrics/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/clients/[clientId]`, `/api/pt/clients/[clientId]/metrics` | `tests/pt-client-metrics-mobile-page.test.tsx` | Uses `useSessionBootstrap`; PT client metrics route is on the mobile foundation. |
| `/pt/clients/[clientId]/recommend-meal-plan` | `app/pt/clients/[clientId]/recommend-meal-plan/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/meal-plans/search`, `/api/pt/clients/[clientId]/meal-plan-recommendations`, `/api/pt/clients/[clientId]/meal-plan-recommendations/create` | `tests/pt-meal-plan-recommendation-mobile-page.test.tsx` | Uses `useSessionBootstrap`; sensitive PT recommendation workflow remains BFF-only and tested. |
| `/pt/training` | `app/pt/training/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/folders`, `/api/pt/packages`, `/api/pt/routines` | `tests/pt-training-mobile-page.test.tsx` | Uses `useSessionBootstrap`; PT training workspace is mobile-aligned. |
| `/pt/metrics` | `app/pt/metrics/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/dashboard`, `/api/pt/clients` | `tests/pt-metrics-mobile-page.test.tsx` | Uses `useSessionBootstrap`; PT metrics route is mobile-aligned. |
| `/pt/meal-plans` | `app/pt/meal-plans/page.tsx` | pt | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/pt/meal-plans/search` | `tests/pt-meal-plans-mobile-page.test.tsx` | Uses `useSessionBootstrap`; PT meal-plan search is mobile-aligned. |
| `/pt/notifications` | `app/pt/notifications/page.tsx` | pt | Thin legacy utility page | No | Yes; delegated to `NotificationsPage` using `/api/notifications` | No route-specific page test | Wrapper page delegates auth and data loading to the shared notifications component. |
| `/pt/settings` | `app/pt/settings/page.tsx` | pt | Not migrated / needs follow-up | No | Yes; `/api/me` GET/PATCH | No route-specific page test | Uses `useSessionBootstrap`; legacy settings route still contains live profile mutation behavior. |
| `/vendor` | `app/vendor/page.tsx` | vendor | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/vendor/me`, `/api/vendor/metrics`, `/api/vendor/meal-plans` | `tests/vendor-dashboard-mobile-page.test.tsx` | Uses `useSessionBootstrap`; vendor dashboard is mobile-aligned. |
| `/vendor/meal-plans` | `app/vendor/meal-plans/page.tsx` | vendor | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileMealPlanRow`, `MobileSection`, `MobileStatCard` | Yes; `/api/vendor/meal-plans` | `tests/vendor-meal-plans-mobile-page.test.tsx` | Uses `useSessionBootstrap`; vendor catalog route is mobile-aligned and read-only. |
| `/vendor/metrics` | `app/vendor/metrics/page.tsx` | vendor | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/vendor/metrics` | `tests/vendor-metrics-mobile-page.test.tsx` | Uses `useSessionBootstrap`; vendor metrics route is mobile-aligned and read-only. |
| `/vendor/account` | `app/vendor/account/page.tsx` | vendor | Mobile UI migrated | `MobileAppShell`, `MobileCard`, `MobileSection`, `MobileStatCard` | Yes; `/api/vendor/me` | `tests/vendor-account-mobile-page.test.tsx` | Uses `useSessionBootstrap`; vendor account route is mobile-aligned, read-only, and preserves sign-out. |
| `/vendor/operations` | `app/vendor/operations/page.tsx` | vendor | Placeholder-safe | `MobileAppShell`, `MobileCard`, `MobileSection` | Yes; no page-level BFF calls | `tests/vendor-operations-mobile-page.test.tsx` | Uses `useSessionBootstrap`; mobile shell is in place, but the route remains intentionally placeholder-only with no operations data or mutations. |

## API/BFF Inventory Summary

| Route group | Count | Notes |
| --- | ---: | --- |
| `auth` | 4 | Login, logout, register, and session BFF routes. |
| `client` | 20 | Client home, metrics, meal plans, bookmarks, checkout, orders, pickups, subscriptions, training, and invitation flows. |
| `pt` | 17 | PT dashboard, roster, packages, routines, folder management, recommendation, metrics, assignments, and workout-log routes. |
| `vendor` | 3 | Vendor identity, meal-plan catalog, and metrics routes only. |
| `notifications` | 3 | Shared notifications list, unread count, and mark-read routes. |
| `me` | 1 | Shared authenticated profile route used by PT settings today. |

- Total `app/api` route handlers inventoried: `48`
- Classification: API/BFF-only; not UI migration targets.
- Accidental UI imports of `app/api` modules: none found in `app/client`, `app/pt`, `app/vendor`, `components`, or `lib`.
- Newly added undocumented BFF routes: none stood out from the expected Phase 3 through Phase 9E surface area.

## Follow-up Candidates

### P0 Security/Contract Issue

- None identified in this audit.

### P1 User-Facing Legacy UI

- `app/client/add-log/page.tsx`
  - Legacy workout logging flow with live BFF read/write behavior and no Mobile UI shell.
- `app/client/bookmarks/page.tsx`
  - Full client bookmark workspace remains on legacy UI with live bookmark mutation behavior.
- `app/client/orders/page.tsx`
  - Legacy generic summary/record shell; no route-specific test coverage.
- `app/client/pickups/page.tsx`
  - Legacy generic summary/record shell; no route-specific test coverage.
- `app/client/subscriptions/page.tsx`
  - Legacy generic summary/record shell; no route-specific test coverage.
- `app/client/settings/page.tsx`
  - Legacy settings shell with local theme/preferences controls; not mobile-aligned.
- `app/pt/clients/[clientId]/assign/page.tsx`
  - Live assignment-creation route remains on legacy UI and has no route-specific test coverage.
- `app/pt/settings/page.tsx`
  - Live `/api/me` profile mutation route remains on legacy UI and has no route-specific test coverage.

### P2 Placeholder-Safe / Future Product

- `app/vendor/operations/page.tsx`
  - Mobile shell is complete, but the route is intentionally placeholder-safe and should stay blocked until a real vendor operations contract exists.

### P3 Polish

- `app/client/add-log/full-log-history/page.tsx`
  - Shared workout-history utility route; functional but still on legacy shell/components.
- `app/client/training/history/page.tsx`
  - Shared workout-history utility route; functional but still on legacy shell/components.
- `app/client/notifications/page.tsx`
  - Shared notifications utility route; functional but still on legacy shell/components.
- `app/pt/clients/[clientId]/log-history/page.tsx`
  - Shared PT workout-history utility route; functional but still on legacy shell/components.
- `app/pt/notifications/page.tsx`
  - Shared notifications utility route; functional but still on legacy shell/components.

## Security Scan Summary

### Commands Run

```powershell
Select-String -Path app\client\**\*.tsx,app\pt\**\*.tsx,app\vendor\**\*.tsx,components\mobile\*.tsx,lib\view-models\*.ts `
  -Pattern "BACKEND_BASE_URL","backendFetch","requireSession","http://","https://" `
  -SimpleMatch
```

```powershell
rg -n --fixed-strings "@/app/api" app\client app\pt app\vendor components lib
rg -n --fixed-strings "app/api" app\client app\pt app\vendor components lib
```

```powershell
$routes = rg --files app\api | Where-Object { $_ -like '*route.ts' }
```

### Matches Found

- Required `Select-String` scan: no matches.
- `app/api` import scan in browser-facing source: no matches.

### Interpretation

- No client, PT, or vendor page file matched `BACKEND_BASE_URL`, `backendFetch`, `requireSession`, `http://`, or `https://` in the required browser-facing scan.
- No accidental imports of `app/api` modules were found in `app/client`, `app/pt`, `app/vendor`, `components`, or `lib`.
- Literal page-level `/api/*` usage stayed within local Next.js BFF routes.
- Shared legacy utility components (`NotificationsPage`, `ClientWorkoutHistoryLedger`, `AddLogPageClient`) also stayed on local `/api/*` routes only.

### Follow-Up Required

- No P0 browser-to-backend bypass issue was found.
- Remaining follow-up work is about legacy UI cutover completeness, not contract or transport breakage.

## Test/Build Summary

### Commands Run

- `npm test`
- `npm run build`

### Result

- Test suite: pass
- Production build: pass

## Recommendation

- `patch required before Phase 10B`
- Reason:
  - The migrated route set is strong for the major client, PT, and vendor surfaces.
  - The overall frontend route inventory still contains `13` non-mobile follow-up routes, including mutation-capable legacy pages.
  - A visual consistency audit would be incomplete while these remaining legacy routes are still part of the live app tree.
