# Mobile UI Legacy Remediation Plan

## 1. Executive Summary

This plan exists to turn the Phase 10A route inventory into an implementation order for the remaining legacy UI routes without inventing product behavior, changing contracts, or weakening the existing BFF boundary.

Relationship to Phase 10A:

- Phase 10A audited the frontend route tree in [mobile-ui-route-inventory.md](./mobile-ui-route-inventory.md).
- It confirmed `13` follow-up-needed legacy routes remain in the live app tree.
- It recommended a remediation patch before the Phase 10B visual consistency audit.

Phase 0 constraints that remain binding for every remediation subphase:

- Browser code calls local Next.js BFF routes only.
- Backend remains the system/admin service.
- Frontend/BFF remains the user interaction layer.
- No direct browser-to-backend calls.
- No auth/session behavior changes without explicit approval.
- No new dependencies under the DAL.
- No invented commerce, pickup, subscription, or admin behavior.

Routes requiring remediation in this plan: `13`

Overall remediation order:

1. `Phase 10A-F2`: `/client/add-log`
2. `Phase 10A-F3`: `/pt/clients/[clientId]/assign`
3. `Phase 10A-F4`: `/client/bookmarks`
4. `Phase 10A-F5`: `/pt/settings`
5. `Phase 10A-F6`: `/pt/clients/[clientId]/log-history`
6. `Phase 10A-F7`: client history utility routes
7. `Phase 10A-F8`: commerce-adjacent placeholder routes
8. `Phase 10A-F9`: notifications and client settings utility routes

Classification summary from current inspection:

- `P0 security/contract risk`: `0`
- `P1 live mutation/workflow routes`: `4`
- `P2 commerce-adjacent or user-history routes`: `6`
- `P3 utility/polish routes`: `3`
- `Placeholder-safe candidates`: `3`

Routes requiring Pro-level preservation prompts:

- `/client/add-log`
- `/pt/clients/[clientId]/assign`
- `/pt/clients/[clientId]/log-history`
- `/client/orders`
- `/client/pickups`
- `/client/subscriptions`

## 2. Prioritized Remediation Table

| Priority | Route | File | Role | Current classification | Risk type | Mutation / commerce / sensitive flag | Recommended subphase | Notes |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `/client/add-log` | `app/client/add-log/page.tsx` | client | `P1 live mutation/workflow` | Save-confirmation regression | Mutation + user-owned history | `Phase 10A-F2` | Wrapper route delegates to `AddLogPageClient`; preserve POST payload, success confirmation, and inline history preview. |
| 2 | `/pt/clients/[clientId]/assign` | `app/pt/clients/[clientId]/assign/page.tsx` | pt | `P1 live mutation/workflow` | PT-to-client workflow regression | Mutation + PT-client sensitive | `Phase 10A-F3` | Live assignment creation route with client-scoped param handling and package selection. |
| 3 | `/client/bookmarks` | `app/client/bookmarks/page.tsx` | client | `P1 live mutation/workflow` | Bookmark CRUD drift | Mutation | `Phase 10A-F4` | Full bookmark workspace is still legacy while meal-plan bookmark slices are already mobile. |
| 4 | `/pt/settings` | `app/pt/settings/page.tsx` | pt | `P1 live mutation/workflow` | Profile/account behavior drift | Mutation + account/session-adjacent | `Phase 10A-F5` | Uses `/api/me` GET/PATCH and editable field fallback logic. |
| 5 | `/pt/clients/[clientId]/log-history` | `app/pt/clients/[clientId]/log-history/page.tsx` | pt | `P2 user-history route` | Linked-client visibility drift | PT-client sensitive + user history | `Phase 10A-F6` | Thin route delegates to shared history ledger; must preserve PT-only access and client email title behavior. |
| 6 | `/client/add-log/full-log-history` | `app/client/add-log/full-log-history/page.tsx` | client | `P2 user-history route` | Back-link and filtering drift | User history | `Phase 10A-F7` | Shared history ledger entry point paired directly to add-log. |
| 7 | `/client/training/history` | `app/client/training/history/page.tsx` | client | `P2 user-history route` | Back-link and consistency drift | User history | `Phase 10A-F7` | Same shared history ledger as full-log-history, but different entry context. |
| 8 | `/client/orders` | `app/client/orders/page.tsx` | client | `P2 commerce-adjacent route` | Invented commerce behavior | Commerce + placeholder-safe candidate | `Phase 10A-F8` | Read-only summary shell; should not grow checkout or order mutation behavior. |
| 9 | `/client/pickups` | `app/client/pickups/page.tsx` | client | `P2 commerce-adjacent route` | Invented pickup behavior | Commerce + placeholder-safe candidate | `Phase 10A-F8` | Read-only pickup summary shell; should not invent scheduling or fulfillment actions. |
| 10 | `/client/subscriptions` | `app/client/subscriptions/page.tsx` | client | `P2 commerce-adjacent route` | Invented subscription behavior | Commerce + placeholder-safe candidate | `Phase 10A-F8` | Read-only subscription summary shell; should not invent billing or management actions. |
| 11 | `/client/notifications` | `app/client/notifications/page.tsx` | client | `P3 utility/polish route` | Utility workflow drift | Utility + mutations for invitation response/read-state | `Phase 10A-F9` | Shared notifications page still contains real mark-read and invitation-response actions. |
| 12 | `/client/settings` | `app/client/settings/page.tsx` | client | `P3 utility/polish route` | Session/context drift | Utility + local-only state | `Phase 10A-F9` | Current behavior is session-driven plus local theme and notification-preview toggles only. |
| 13 | `/pt/notifications` | `app/pt/notifications/page.tsx` | pt | `P3 utility/polish route` | Utility workflow drift | Utility + mark-read mutation | `Phase 10A-F9` | Shared notifications page with PT role gating and mark-read behavior. |

## 3. Per-Route Preservation Notes

### `/client/add-log`

- Current purpose:
  - Primary client workout logging surface.
  - Supports new entry creation plus inline preview of recent history.
  - Accepts query-param context such as `routineName`, `routineId`, `assignmentId`, and `routineLabel`.
- Role and session:
  - Effective role is `client`.
  - `useSessionBootstrap`: yes, inside `AddLogPageClient`.
- Current BFF routes:
  - `POST /api/client/training/workout-logs`
  - `GET /api/client/training/workout-logs?limit=5&offset=0[...]`
- Current mutation behavior:
  - Creates a workout log.
  - Confirms success by refetching recent history and checking that the saved log appears.
- Current UI state:
  - Route fallback: `Loading log workout`.
  - Session loading/redirecting states.
  - Submit success and error banners.
  - History loading, error, and `No logged workouts yet.` states.
- Current tests:
  - No route-specific page test.
  - Indirect link coverage from client home, metrics, and training tests.
  - Shared route constant test in `tests/workout-history-route.test.ts`.
- Risks if migrated incorrectly:
  - Payload shape drift on workout-log creation.
  - Broken assignment or routine context anchoring.
  - False-positive save success if history confirmation is removed.
  - Loss of access to the full-history route.
- Required preservation checks:
  - Preserve exact POST target and `CreateWorkoutLogInput` shape.
  - Preserve success confirmation via refreshed history.
  - Preserve inline history preview and `FULL_LOG_HISTORY_ROUTE`.
  - Preserve session gating and no direct backend usage.
- Required tests:
  - Route renders under client session.
  - Submit uses `/api/client/training/workout-logs` only.
  - Existing payload shape is preserved.
  - Success/error/history loading states are preserved.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F2`
- Recommended acceptance criteria:
  - Mobile UI update preserves the existing mutation contract and all current save-confirmation behavior.

### `/pt/clients/[clientId]/assign`

- Current purpose:
  - PT workflow for assigning a training package to a linked client.
- Role and session:
  - Role is `pt`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - `GET /api/pt/packages`
  - `GET /api/pt/clients/[clientId]/assignments`
  - `POST /api/pt/clients/[clientId]/assignments/create`
- Current mutation behavior:
  - Creates assignments with `training_package_id`, `start_date`, and `end_date`.
  - Blank dates are normalized to `null`.
  - Refreshes assignments after successful creation.
- Current UI state:
  - Session loading/redirecting states.
  - Assignment-data loading and load-error states.
  - Submit success and error banners.
  - Empty states for missing packages or missing assignments.
- Current tests:
  - No route-specific page test.
  - Indirect link coverage from PT client detail, PT client metrics, and PT client view-model tests.
- Risks if migrated incorrectly:
  - PT-to-client scope regression.
  - Payload shape drift on assignment creation.
  - Broken package defaulting or assignment refresh.
  - Lost client navigation context.
- Required preservation checks:
  - Preserve dynamic `clientId` routing.
  - Preserve all three existing BFF routes and current payload keys.
  - Preserve success/error states and current empty-state semantics.
  - Preserve PT-only access.
- Required tests:
  - Page renders with PT session and client param.
  - Existing GET/POST targets are unchanged.
  - Assignment payload shape is preserved.
  - Success refreshes assignments.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F3`
- Recommended acceptance criteria:
  - Mobile UI update preserves linked-client workflow behavior exactly, including payloads and post-save refresh.

### `/client/bookmarks`

- Current purpose:
  - Full bookmark folder workspace for the client.
  - Supports folder creation, folder deletion, saved-plan deletion, and links back to meal-plan detail.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - `GET /api/client/bookmarks`
  - `POST /api/client/bookmarks`
  - `DELETE /api/client/bookmarks/[folderId]`
  - `DELETE /api/client/bookmarks/[folderId]/items/[itemId]`
- Current mutation behavior:
  - Create folder.
  - Delete folder.
  - Remove saved item from folder.
  - Silent reload after successful mutations.
- Current UI state:
  - Session loading/redirecting states.
  - Loading bookmarks and load-error states.
  - Action feedback banners for info, success, warning, and error.
  - Empty states for no folders, empty folder, and no featured saved plan.
- Current tests:
  - No route-specific page test.
  - Indirect navigation coverage from client home.
  - Shared bookmark BFF contract is exercised by meal-plan list/detail bookmark tests.
- Risks if migrated incorrectly:
  - Divergence from already-mobile meal-plan bookmark flows.
  - Folder grouping drift or missing silent reload behavior.
  - Incorrect delete targeting by folder or item.
- Required preservation checks:
  - Preserve folder grouping as the primary UI model.
  - Preserve current BFF routes and delete paths.
  - Preserve link-outs to `/client/meal-plans` and `/client/meal-plans/[mealPlanId]`.
  - Avoid inventing new folder/item mutation behavior.
- Required tests:
  - Loads folders from `/api/client/bookmarks`.
  - Create folder preserves POST payload.
  - Delete folder and delete item preserve DELETE targets.
  - Empty-state and feedback behavior remain intact.
- Recommended remediation phase:
  - `Phase 10A-F4`
- Recommended acceptance criteria:
  - Mobile UI update matches existing bookmark CRUD behavior and remains consistent with the already-migrated meal-plan bookmark surfaces.

### `/pt/settings`

- Current purpose:
  - PT profile settings route with editable display/name field and logout action.
- Role and session:
  - Role is `pt`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - `GET /api/me`
  - `PATCH /api/me`
- Current mutation behavior:
  - Updates whichever editable field exists first: `name`, `full_name`, or `display_name`.
- Current UI state:
  - Session loading/redirecting states.
  - Profile loading and error states.
  - Save message on success.
  - Debug preview fallback if the profile exists but display text is absent.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - Name-field key mismatch against existing payloads.
  - Session/account regression.
  - Loss of logout affordance.
- Required preservation checks:
  - Preserve GET/PATCH target and dynamic editable-field selection logic.
  - Preserve logout button.
  - Preserve no-change disable behavior on save.
  - Preserve PT-only access.
- Required tests:
  - GET/PATCH target stays `/api/me`.
  - PATCH payload preserves current field-key fallback behavior.
  - Success/error states render correctly.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F5`
- Recommended acceptance criteria:
  - Mobile UI update keeps account/profile behavior unchanged while adopting the mobile shell.

### `/pt/clients/[clientId]/log-history`

- Current purpose:
  - PT read-only workout log history for a linked client.
- Role and session:
  - Role is `pt`.
  - `useSessionBootstrap`: yes, inside `ClientWorkoutHistoryLedger`.
- Current BFF routes:
  - `GET /api/pt/clients/[clientId]/workout-logs?limit=30&offset=[...]`
- Current mutation behavior:
  - No route-level domain mutation.
  - Search and filter are URL/query-driven reads only.
- Current UI state:
  - Session loading/redirecting states.
  - History loading and error states.
  - Empty note `No logged workouts yet.`
  - Filter chips, search field, and pagination action.
- Current tests:
  - No route-specific page test.
  - Indirect link coverage from PT client detail and PT client metrics tests.
- Risks if migrated incorrectly:
  - Broken linked-client access path.
  - Lost PT-specific title context from `clientEmail`.
  - Filter or pagination regression.
- Required preservation checks:
  - Preserve `viewerRole="pt"` and PT-only BFF path.
  - Preserve `clientEmail` title behavior from search params.
  - Preserve filter, search, and pagination semantics.
- Required tests:
  - Uses `/api/pt/clients/[clientId]/workout-logs` only.
  - Preserves PT-only session gating.
  - Preserves `clientEmail` title behavior.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F6`
- Recommended acceptance criteria:
  - Mobile UI update keeps the PT-linked history route read-only, PT-scoped, and filter-complete.

### `/client/add-log/full-log-history`

- Current purpose:
  - Client history route paired directly to the add-log workflow.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes, inside `ClientWorkoutHistoryLedger`.
- Current BFF routes:
  - `GET /api/client/training/workout-logs?limit=30&offset=[...]`
- Current mutation behavior:
  - None.
- Current UI state:
  - Shared history ledger states: loading, error, filter/search, empty note, pagination.
  - Back link points to `/client/add-log`.
- Current tests:
  - No route-specific page test.
  - Route constant coverage in `tests/workout-history-route.test.ts`.
- Risks if migrated incorrectly:
  - Broken back-link context for the add-log workflow.
  - Filter or pagination drift.
- Required preservation checks:
  - Preserve shared history behavior and back-link destination.
  - Preserve client-only BFF path.
- Required tests:
  - Shared history route uses existing BFF path.
  - Back-link remains `/client/add-log`.
- Recommended remediation phase:
  - `Phase 10A-F7`
- Recommended acceptance criteria:
  - Mobile UI update remains a thin entry point over the existing client history ledger behavior.

### `/client/training/history`

- Current purpose:
  - Client training history route paired to the training workspace.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes, inside `ClientWorkoutHistoryLedger`.
- Current BFF routes:
  - `GET /api/client/training/workout-logs?limit=30&offset=[...]`
- Current mutation behavior:
  - None.
- Current UI state:
  - Shared history ledger states: loading, error, filter/search, empty note, pagination.
  - Back link points to `/client/training`.
- Current tests:
  - No route-specific page test.
  - Indirect route-link coverage from client training page tests.
- Risks if migrated incorrectly:
  - Broken back-link context to training workspace.
  - Divergence from the add-log history route despite shared behavior.
- Required preservation checks:
  - Preserve shared ledger behavior.
  - Preserve back-link to `/client/training`.
  - Keep behavior aligned with `/client/add-log/full-log-history`.
- Required tests:
  - Shared history route uses existing BFF path.
  - Back-link remains `/client/training`.
- Recommended remediation phase:
  - `Phase 10A-F7`
- Recommended acceptance criteria:
  - Mobile UI update keeps both client history entry points behaviorally identical except for their route context.

### `/client/orders`

- Current purpose:
  - Read-only client order summary and record shell using the current BFF payload and adapter fallback.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - `GET /api/client/orders`
- Current mutation behavior:
  - None.
- Current UI state:
  - Session loading/redirecting states.
  - Loading and error states.
  - Empty state `No orders returned`.
  - `DebugPreview` fallback when the route lacks structured records.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - Invented order actions or checkout behavior.
  - Suppression of raw/opaque payload fallback when data is incomplete.
- Required preservation checks:
  - Preserve read-only status.
  - Preserve adapter-backed summary + record rendering.
  - Preserve empty state and debug fallback.
- Required tests:
  - Uses `/api/client/orders` only.
  - Maintains read-only rendering and empty/debug behavior.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F8`
- Recommended acceptance criteria:
  - Mobile UI update remains placeholder-safe unless backend order data evolves.

### `/client/pickups`

- Current purpose:
  - Read-only client pickup summary and record shell using the current BFF payload and adapter fallback.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - `GET /api/client/pickups`
- Current mutation behavior:
  - None.
- Current UI state:
  - Session loading/redirecting states.
  - Loading and error states.
  - Empty state `No pickups returned`.
  - `DebugPreview` fallback for opaque payloads.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - Invented scheduling, fulfillment, or pickup actions.
  - Loss of payload fallback visibility.
- Required preservation checks:
  - Preserve read-only status.
  - Preserve summary + record adapter behavior.
  - Preserve empty and debug fallback states.
- Required tests:
  - Uses `/api/client/pickups` only.
  - Maintains read-only rendering and empty/debug behavior.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F8`
- Recommended acceptance criteria:
  - Mobile UI update stays placeholder-safe and does not invent pickup scheduling or mutation.

### `/client/subscriptions`

- Current purpose:
  - Read-only client subscription summary and record shell using the current BFF payload and adapter fallback.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - `GET /api/client/subscriptions`
- Current mutation behavior:
  - None.
- Current UI state:
  - Session loading/redirecting states.
  - Loading and error states.
  - Empty state `No subscriptions returned`.
  - `DebugPreview` fallback for opaque payloads.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - Invented billing, cancellation, or subscription-edit actions.
  - Loss of payload fallback visibility.
- Required preservation checks:
  - Preserve read-only status.
  - Preserve summary + record adapter behavior.
  - Preserve empty and debug fallback states.
- Required tests:
  - Uses `/api/client/subscriptions` only.
  - Maintains read-only rendering and empty/debug behavior.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F8`
- Recommended acceptance criteria:
  - Mobile UI update stays placeholder-safe and does not invent subscription management behavior.

### `/client/notifications`

- Current purpose:
  - Client notifications workspace with invitation-response handling.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes, inside `NotificationsPage`.
- Current BFF routes:
  - `GET /api/notifications`
  - `PATCH /api/notifications/[notificationId]/read`
  - `GET /api/client/invitations`
  - `POST /api/client/invitations/[invitationId]/accept`
  - `POST /api/client/invitations/[invitationId]/decline`
- Current mutation behavior:
  - Marks notifications as read.
  - Accepts or declines PT client invitations.
- Current UI state:
  - Session loading/redirecting states.
  - Notifications loading and error states.
  - Empty state `No notifications`.
  - Separate pending invitation cards and general notification cards.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - Invitation-response contract drift.
  - Incorrect read/unread reconciliation.
  - Lost client-role invitation visibility.
- Required preservation checks:
  - Preserve client-only invitation fetch and accept/decline actions.
  - Preserve notification read behavior.
  - Preserve empty state and invitation filtering logic.
- Required tests:
  - Uses only existing notifications and invitations BFF routes.
  - Preserves accept/decline and mark-read actions.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F9`
- Recommended acceptance criteria:
  - Mobile UI update preserves current invitation and notification workflows exactly.

### `/client/settings`

- Current purpose:
  - Lightweight client account and local app preferences route.
- Role and session:
  - Role is `client`.
  - `useSessionBootstrap`: yes.
- Current BFF routes:
  - No route-specific data route beyond session bootstrap.
- Current mutation behavior:
  - Local-only theme change through `ThemeProvider`.
  - Local-only notification-preview toggle.
  - No backend mutation.
- Current UI state:
  - Session loading/redirecting states only.
  - No dedicated error or empty state.
  - Current account section is session-derived.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - Session context drift.
  - Accidental invention of backend settings persistence.
  - Loss of local theme behavior.
- Required preservation checks:
  - Preserve local-only settings semantics.
  - Preserve account section sourced from the current session.
  - Do not invent new BFF or backend settings routes.
- Required tests:
  - Route renders from session only.
  - Theme and local toggle behavior remain local-only.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F9`
- Recommended acceptance criteria:
  - Mobile UI update remains a session-driven utility surface with no new server contract.

### `/pt/notifications`

- Current purpose:
  - PT notifications workspace for in-app activity and read-state management.
- Role and session:
  - Role is `pt`.
  - `useSessionBootstrap`: yes, inside `NotificationsPage`.
- Current BFF routes:
  - `GET /api/notifications`
  - `PATCH /api/notifications/[notificationId]/read`
- Current mutation behavior:
  - Marks notifications as read.
- Current UI state:
  - Session loading/redirecting states.
  - Notifications loading and error states.
  - Empty state `No notifications`.
- Current tests:
  - No route-specific page test.
- Risks if migrated incorrectly:
  - PT-role gating drift.
  - Read-state mutation regression.
- Required preservation checks:
  - Preserve PT-only session gating in the shared notifications component.
  - Preserve read-only notification rendering plus mark-read mutation.
- Required tests:
  - Uses `/api/notifications` and `/api/notifications/[notificationId]/read` only.
  - Preserves PT role gating.
  - No direct backend URL usage.
- Recommended remediation phase:
  - `Phase 10A-F9`
- Recommended acceptance criteria:
  - Mobile UI update keeps PT notifications utility behavior intact without inventing new workflow.

## 4. Proposed Remediation Subphases

### Phase 10A-F2: Client Add Log Mobile UI

- Scope:
  - `/client/add-log`
- Risk level:
  - High
- Existing behavior to preserve:
  - Query-param context, workout-log POST payload, success confirmation via refetch, inline history preview, and full-history link.
- Allowed files:
  - `app/client/add-log/page.tsx`
  - `app/client/add-log/AddLogPageClient.tsx`
  - directly related route tests
  - pure display adapters only if needed for mobile presentation
- Forbidden files:
  - `app/api/*`
  - auth/session files
  - backend repo
  - lockfiles and `package.json`
- Tests:
  - dedicated add-log page test
  - mutation payload preservation test
  - history refresh confirmation test
- Security scans:
  - direct backend and server-only import scan on the route/client component
- Acceptance criteria:
  - no direct backend calls
  - POST target and payload preserved
  - loading/error/success/history states preserved
  - build/test pass

### Phase 10A-F3: PT Client Assignment Mobile UI

- Scope:
  - `/pt/clients/[clientId]/assign`
- Risk level:
  - High
- Existing behavior to preserve:
  - package load, assignment load, exact create payload, refresh after create, PT-only client context.
- Allowed files:
  - `app/pt/clients/[clientId]/assign/page.tsx`
  - directly related tests
  - pure display adapters only if needed
- Forbidden files:
  - `app/api/*`
  - auth/session files
  - backend repo
  - package and lockfiles
- Tests:
  - route-specific PT assignment page test
  - payload preservation test
  - load/save/empty/error coverage
- Security scans:
  - direct backend and server-only import scan on the route file
- Acceptance criteria:
  - PT-to-client scope preserved
  - POST path and payload unchanged
  - build/test pass

### Phase 10A-F4: Client Bookmarks Mobile UI

- Scope:
  - `/client/bookmarks`
- Risk level:
  - High
- Existing behavior to preserve:
  - folder creation, folder deletion, item removal, action feedback banners, summary counts, featured item, and links to meal-plan detail/catalog.
- Allowed files:
  - `app/client/bookmarks/page.tsx`
  - directly related tests
  - pure bookmark display helpers if needed
- Forbidden files:
  - BFF handlers under `app/api/client/bookmarks*`
  - backend repo
  - auth/session files
  - package and lockfiles
- Tests:
  - load/create/delete folder tests
  - delete item test
  - empty-state and feedback tests
- Security scans:
  - direct backend and server-only import scan on the route file
- Acceptance criteria:
  - bookmark CRUD behavior remains identical
  - no duplicate logic drift versus meal-plan bookmark surfaces
  - build/test pass

### Phase 10A-F5: PT Settings Mobile UI

- Scope:
  - `/pt/settings`
- Risk level:
  - High
- Existing behavior to preserve:
  - `/api/me` GET/PATCH contract, editable-field key fallback, no-change save disable, and logout action.
- Allowed files:
  - `app/pt/settings/page.tsx`
  - directly related tests
- Forbidden files:
  - `app/api/me`
  - auth/session files
  - backend repo
  - package and lockfiles
- Tests:
  - GET/PATCH preservation test
  - field-key fallback test
  - success/error state test
- Security scans:
  - direct backend and server-only import scan on the route file
- Acceptance criteria:
  - no auth/session behavior drift
  - no contract drift on `/api/me`
  - build/test pass

### Phase 10A-F6: PT Client Log History Mobile UI

- Scope:
  - `/pt/clients/[clientId]/log-history`
- Risk level:
  - High
- Existing behavior to preserve:
  - PT-only viewer role, dynamic history path, `clientEmail` title, search/filter/pagination, read-only ledger behavior.
- Allowed files:
  - `app/pt/clients/[clientId]/log-history/page.tsx`
  - `components/client/ClientWorkoutHistoryLedger.tsx`
  - directly related tests
- Forbidden files:
  - PT workout-log BFF handlers
  - backend repo
  - auth/session files
  - package and lockfiles
- Tests:
  - PT history page test
  - `clientEmail` title test
  - BFF-path preservation test
- Security scans:
  - direct backend and server-only import scan on the route and shared ledger
- Acceptance criteria:
  - PT-linked history access preserved
  - shared ledger remains BFF-only
  - build/test pass

### Phase 10A-F7: Client History Routes Mobile UI

- Scope:
  - `/client/add-log/full-log-history`
  - `/client/training/history`
- Risk level:
  - Medium
- Existing behavior to preserve:
  - shared client history ledger behavior, distinct back-links, search/filter/pagination, empty/error handling.
- Allowed files:
  - `app/client/add-log/full-log-history/page.tsx`
  - `app/client/training/history/page.tsx`
  - `components/client/ClientWorkoutHistoryLedger.tsx`
  - directly related tests
- Forbidden files:
  - workout-log BFF handlers
  - backend repo
  - auth/session files
  - package and lockfiles
- Tests:
  - both route entry points
  - back-link coverage for each
  - shared ledger BFF-path preservation
- Security scans:
  - direct backend and server-only import scan on the route files and ledger
- Acceptance criteria:
  - both routes stay thin wrappers over the same history logic
  - no contract drift
  - build/test pass

### Phase 10A-F8: Commerce-Adjacent Placeholder Routes

- Scope:
  - `/client/orders`
  - `/client/pickups`
  - `/client/subscriptions`
- Risk level:
  - Medium to high
- Existing behavior to preserve:
  - read-only summary shells, adapter-backed record rendering, empty states, debug payload fallback, and no invented commerce mutations.
- Allowed files:
  - `app/client/orders/page.tsx`
  - `app/client/pickups/page.tsx`
  - `app/client/subscriptions/page.tsx`
  - `lib/adapters/client-records.ts` only if display-only normalization needs cleanup
  - directly related tests
- Forbidden files:
  - checkout and payment routes
  - order/pickup/subscription BFF handlers
  - backend repo
  - auth/session files
  - package and lockfiles
- Tests:
  - route render tests for all three pages
  - empty/debug fallback coverage
  - BFF-route-only fetch coverage
- Security scans:
  - direct backend and server-only import scan on the three route files and any touched adapter
- Acceptance criteria:
  - no invented order, pickup, or subscription actions
  - routes remain placeholder-safe unless backend contracts expand
  - build/test pass

### Phase 10A-F9: Notifications and Utility Settings Mobile UI

- Scope:
  - `/client/notifications`
  - `/client/settings`
  - `/pt/notifications`
- Risk level:
  - Medium
- Existing behavior to preserve:
  - client invitation accept/decline, read-state mutation, PT notification read-state, client local-only settings behavior, and session-derived account context.
- Allowed files:
  - `app/client/notifications/page.tsx`
  - `app/client/settings/page.tsx`
  - `app/pt/notifications/page.tsx`
  - `components/notifications/NotificationsPage.tsx`
  - directly related tests
- Forbidden files:
  - notifications BFF handlers
  - invitation BFF handlers
  - auth/session files
  - backend repo
  - package and lockfiles
- Tests:
  - client notifications flow tests
  - PT notifications read-state tests
  - client settings local-only behavior tests
- Security scans:
  - direct backend and server-only import scan on route files and shared notifications component
- Acceptance criteria:
  - route behavior remains BFF-only
  - no invented settings persistence or notification actions
  - build/test pass

## 5. Placeholder-Safe Candidates

The following routes should remain placeholder-safe unless the backend adds clearer structured support or existing BFF payloads mature enough to justify richer UI:

- `/client/orders`
  - Current route is read-only and adapter-driven.
  - Empty-state copy and `DebugPreview` confirm that opaque payload fallback is part of the current behavior.
  - Do not invent reorder, cancel, refund, or payment actions.
- `/client/pickups`
  - Current route is read-only and adapter-driven.
  - Do not invent pickup scheduling, confirmation, reschedule, or fulfillment actions.
- `/client/subscriptions`
  - Current route is read-only and adapter-driven.
  - Do not invent pause, cancel, billing-edit, or plan-management actions.

Interpretation:

- These are still real routes backed by real BFF reads.
- Placeholder-safe in this plan means the Mobile UI work should modernize presentation without manufacturing unsupported product capabilities.

## 6. Security/BFF Scan Summary

Command run:

```powershell
$paths = @(
  'app\client\add-log\page.tsx',
  'app\client\add-log\full-log-history\page.tsx',
  'app\client\bookmarks\page.tsx',
  'app\client\orders\page.tsx',
  'app\client\pickups\page.tsx',
  'app\client\subscriptions\page.tsx',
  'app\client\notifications\page.tsx',
  'app\client\settings\page.tsx',
  'app\client\training\history\page.tsx',
  'app\pt\clients\[clientId]\assign\page.tsx',
  'app\pt\clients\[clientId]\log-history\page.tsx',
  'app\pt\notifications\page.tsx',
  'app\pt\settings\page.tsx'
)

Select-String -LiteralPath $paths `
  -Pattern 'BACKEND_BASE_URL','backendFetch','requireSession','http://','https://' `
  -SimpleMatch
```

Matches found:

- No matches.

Interpretation:

- None of the inspected legacy route files directly referenced `BACKEND_BASE_URL`.
- None imported or referenced `backendFetch` or `requireSession`.
- No direct `http://` or `https://` backend usage appeared in the route files.
- Current remediation risk is about UI/workflow preservation, not an observed browser-to-backend bypass in these files.

Follow-up required:

- Keep the same scan in every implementation subphase.
- Extend the scan to any shared component or adapter touched during the actual rebuild work.

## 7. Recommended Next Action

`begin Phase 10A-F2 /client/add-log`

Reason:

- It is the highest-risk remaining client route.
- It owns real client mutation behavior and user-owned workout history.
- It also establishes the preservation pattern for the later history subphases.
