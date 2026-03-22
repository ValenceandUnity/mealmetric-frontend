# MealMetric UI-18 Manual Test Plan

## Phase Boundary

UI-18 covers manual frontend QA documentation only.

- No frontend fixes are implemented in this phase.
- No backend contracts are changed in this phase.
- No product workflows are changed in this phase.
- Testing remains inside the existing Next.js App Router plus BFF architecture.
- CCC compliance remains mandatory during testing:
  - test only browser surfaces backed by existing `app/api/*` routes
  - do not treat unsupported backend behavior as a frontend regression unless the UI misrepresents it

## Purpose

Use this document to run structured browser-based QA across the already-implemented MealMetric frontend. The goal is to verify route quality, visible feedback, safe navigation, and obvious accessibility/clarity issues before logging defects.

## Suggested Test Setup

- Use authenticated test accounts for:
  - client
  - PT
  - vendor
- Run each pass at these widths:
  - narrow mobile: `320px`
  - standard mobile: `390px`
  - desktop: `1280px` or wider
- When available, keep browser devtools open for:
  - responsive mode
  - console errors
  - failed network requests

## Test Scope

### Client surfaces

- `/client`
- `/client/training`
- `/client/training/[assignmentId]`
- `/client/metrics`
- `/client/meal-plans`
- `/client/bookmarks`

### PT surfaces

- `/pt`
- `/pt/clients`
- `/pt/clients/[clientId]/assign`
- `/pt/clients/[clientId]/recommend-meal-plan`

### Vendor surfaces

- `/vendor`
- `/vendor/meal-plans`

### Shared shell and nav

- top header title and role context
- role-safe nav links and back links
- bottom-nav presence and active state
- sign-out entry point where available
- deep-route navigation without dead ends

### Shared feedback states

- loading blocks
- empty states
- error blocks
- success banners
- inline busy labels
- destructive confirm behavior where implemented

## Shared Route Heuristics

Apply these checks on every route in scope:

- `Layout/spacing`: content is readable, section rhythm is consistent, and cards do not visually collide.
- `Mobile wrapping`: labels, chips, stat pills, and action rows wrap without clipping or overlap.
- `Action labels`: button and link labels are specific, not misleading, and match the action performed.
- `Empty/loading/error states`: the route shows the correct state block when no data, slow data, or failed data occurs.
- `Feedback/confirmation`: success, warning, error, busy, and confirm states appear when the route supports them.
- `Route-safe navigation`: every visible nav action lands on a valid in-scope route and preserves the correct role shell.
- `Accessibility/clarity`: heading order is understandable, form labels are present, destructive actions are obvious, and interactive elements are reachable and understandable without visual guesswork.

## Route-By-Route Checklist

### `/client`

- [ ] Header reads as client dashboard context and action labels remain clear.
- [ ] Hero chips, stat pills, and action row hold layout at all three viewport sizes.
- [ ] Training highlights render as cards when data exists; otherwise the empty state is understandable.
- [ ] Meal-plan highlights render as cards when data exists; otherwise the empty state is understandable.
- [ ] Error block copy is readable and does not break page layout.
- [ ] Loading state appears before data and does not flash broken content.
- [ ] Links to training, metrics, meal plans, and bookmarks all route safely.
- [ ] Sign-out button is visible and does not crowd nav actions.
- [ ] No obvious text truncation or chip overflow on narrow mobile.

### `/client/training`

- [ ] Hero summary stays readable and action row wraps cleanly on mobile.
- [ ] Focus assignment section clearly distinguishes the current assignment from the full stack.
- [ ] Assignment cards have understandable titles, status, package/window metadata, and labels.
- [ ] Empty state reads honestly when no assignments are returned.
- [ ] Loading and error blocks remain visually stable.
- [ ] Opening an assignment routes safely into `/client/training/[assignmentId]`.
- [ ] Back-to-home path remains obvious.
- [ ] Obvious accessibility check: assignment actions are descriptive and not duplicated ambiguously.

### `/client/metrics`

- [ ] Overview/history tab switch is clear and shows which window is active.
- [ ] Refresh button label matches the active window and shows a busy label while refreshing.
- [ ] Snapshot cards, highlights, and grouped sections stack cleanly on mobile.
- [ ] Empty states for missing snapshot/highlight/group data are understandable and not misleading.
- [ ] Error and loading states do not leave stale metric data in a confusing state.
- [ ] The page does not imply unsupported weekly analytics beyond overview/history.
- [ ] Training and meal-plan links route safely.
- [ ] Obvious accessibility check: tab switch, refresh button, and section titles make the active view easy to identify.

### `/client/meal-plans`

- [ ] ZIP and budget controls stay usable at narrow mobile width without clipped labels or buttons.
- [ ] Apply and Clear actions behave predictably and do not create visual confusion.
- [ ] Active filter chips accurately reflect the applied filter state.
- [ ] Featured plan section is readable and does not imply hidden recommendation logic.
- [ ] Catalog cards remain scannable on mobile and desktop.
- [ ] Bookmark button label changes appropriately between save/remove states.
- [ ] Success, info, and error feedback banners appear after bookmark mutations.
- [ ] Empty state is clear when filters narrow the catalog to zero results.
- [ ] Links to bookmarks, metrics, and plan detail routes are safe.
- [ ] Obvious accessibility check: form labels are visible and bookmark actions are understandable.

### `/client/bookmarks`

- [ ] Folder creation form remains usable at all viewports.
- [ ] Create-folder button disables or blocks empty-name submission appropriately.
- [ ] Summary, latest saved item, and folder stack remain readable on mobile.
- [ ] Folder delete uses explicit two-step confirmation behavior.
- [ ] Saved-item removal uses explicit two-step confirmation behavior.
- [ ] Busy labels (`Creating folder...`, `Deleting...`, `Removing...`) appear during mutation.
- [ ] Success and error banners are visible after create/delete/remove actions.
- [ ] Empty states are clear for no folders and for empty folders.
- [ ] Links back to meal plans and plan detail routes are safe.
- [ ] Obvious accessibility check: destructive actions are clearly marked and not easy to trigger accidentally.

### `/client/training/[assignmentId]`

- [ ] Assignment summary metadata is readable and not collapsed awkwardly on narrow mobile.
- [ ] Checklist items align cleanly and do not wrap into unreadable rows.
- [ ] Workout log form fields have visible labels and sensible defaults.
- [ ] Submit button shows busy state during submission.
- [ ] Success banner appears after a successful workout log submission.
- [ ] Error banner appears after a failed workout log submission.
- [ ] After success, routine ID and notes reset as expected without clearing the assignment context.
- [ ] Back-to-training navigation is safe.
- [ ] Empty checklist state is understandable if checklist data is absent.
- [ ] Obvious accessibility check: date/time, numeric, select, and notes inputs are easy to distinguish and operate.

### `/pt`

- [ ] PT dashboard header, stats, and quick actions remain readable on all viewports.
- [ ] Client management cards surface clear labels for overview, metrics, training, and meal plans.
- [ ] Package visibility cards do not imply unsupported PT-wide assignment management.
- [ ] Empty states are honest when no clients or packages are returned.
- [ ] Loading and error states render without breaking shell structure.
- [ ] Links to `/pt/clients`, `/pt/settings`, and PT placeholder tabs route safely.
- [ ] Sign-out button is visible and not visually buried.
- [ ] Obvious accessibility check: PT client-first workflow is understandable from headings and action labels.

### `/pt/clients`

- [ ] Hero spotlight and roster summary stack cleanly on mobile.
- [ ] Each client card exposes clear overview, metrics, training, and meal-plan actions.
- [ ] Empty roster state is understandable and does not suggest unsupported PT-wide actions.
- [ ] Loading and error blocks remain stable.
- [ ] Links into per-client routes are safe and preserve PT shell context.
- [ ] Placeholder-tab links remain clearly secondary to the real client workspace.
- [ ] Obvious accessibility check: client actions are specific enough to avoid misclick ambiguity on touch screens.

### `/pt/clients/[clientId]/assign`

- [ ] Assignment workspace summary cards remain readable on narrow mobile.
- [ ] Training package field uses the correct control type for available package data.
- [ ] Required-field handling is clear when no training package is selected.
- [ ] Start and end date fields remain usable and aligned at mobile widths.
- [ ] Submit button shows `Creating assignment...` while busy.
- [ ] Success banner appears after assignment creation.
- [ ] Error banner appears after failed creation.
- [ ] Existing assignments refresh after successful creation.
- [ ] Empty states are clear when no packages or assignments are returned.
- [ ] Navigation back to client overview and roster is safe.
- [ ] Obvious accessibility check: field labels, submit action, and existing assignment history are easy to distinguish.

### `/pt/clients/[clientId]/recommend-meal-plan`

- [ ] Recommendation summary cards remain readable on mobile.
- [ ] Meal plan selector/input is clear and defaults correctly when options exist.
- [ ] Rationale, recommended-at, and expires-at fields remain usable at all viewports.
- [ ] Submit button shows `Creating recommendation...` while busy.
- [ ] Success banner appears after recommendation creation.
- [ ] Error banner appears after failed creation.
- [ ] Recommendation history refreshes after a successful create.
- [ ] Empty states are clear when no recommendable plans or recommendations exist.
- [ ] Navigation back to client overview and roster is safe.
- [ ] Obvious accessibility check: datetime fields and rationale textarea are clearly labeled and easy to scan.

### `/vendor`

- [ ] Vendor dashboard hero, stats, and action row remain readable on mobile and desktop.
- [ ] Operational overview does not imply unsupported vendor operations workflows.
- [ ] Metrics section and catalog preview remain readable and well spaced.
- [ ] Empty states are honest when no catalog data exists.
- [ ] Loading and error states do not break layout.
- [ ] Links to meal plans and metrics route safely.
- [ ] Obvious accessibility check: vendor identity, catalog, and performance sections are clearly distinguished.

### `/vendor/meal-plans`

- [ ] Hero layout, spotlight panel, and catalog list stack cleanly at mobile widths.
- [ ] Published/draft counts are readable and consistent with visible statuses.
- [ ] Highlight and inventory sections do not imply unsupported editing or operations actions.
- [ ] Empty state is clear when no meal plans are returned.
- [ ] Loading and error states remain readable.
- [ ] Links back to dashboard and metrics are safe.
- [ ] Status badges remain readable and do not overflow card footers.
- [ ] Obvious accessibility check: read-only catalog intent is clear from labels and surrounding copy.

## Mutation-Flow Checklist

Run these as focused action tests after the route pass.

### Bookmark add/remove

- [ ] Add a bookmark from `/client/meal-plans`.
- [ ] Verify an info banner appears during action initiation.
- [ ] Verify success banner appears after completion.
- [ ] Verify button label changes from `Bookmark` to `Remove bookmark` or equivalent.
- [ ] Verify bookmarked item appears in `/client/bookmarks`.
- [ ] Remove the same bookmark from `/client/meal-plans`.
- [ ] Verify success/error handling is visible and clear.

### Bookmark folder create/delete

- [ ] Create a folder from `/client/bookmarks`.
- [ ] Verify empty-name submission is blocked or warned clearly.
- [ ] Verify busy label appears during creation.
- [ ] Verify success banner appears and the folder enters the list.
- [ ] Delete a folder using the confirm button flow.
- [ ] Verify first click arms confirmation and second click performs deletion.
- [ ] Verify confirm state times out safely if no second click occurs.
- [ ] Verify success/error feedback is visible after deletion.

### Saved-item removal

- [ ] Remove a saved meal plan from the highlighted saved item area.
- [ ] Remove a saved meal plan from inside a folder card.
- [ ] Verify two-step confirmation is required in both locations.
- [ ] Verify busy label appears while removing.
- [ ] Verify the removed item disappears from the folder list after success.

### Workout-log submission

- [ ] Open a real assignment detail route under `/client/training/[assignmentId]`.
- [ ] Submit a valid workout log.
- [ ] Verify success banner appears.
- [ ] Verify submit button shows busy state during request.
- [ ] Verify routine ID and notes clear after success while assignment context remains visible.
- [ ] Submit an invalid or intentionally incomplete payload if the UI allows it.
- [ ] Verify failure messaging is visible and understandable.

### PT assignment creation

- [ ] Open `/pt/clients/[clientId]/assign`.
- [ ] Create an assignment with a valid package selection.
- [ ] Verify success banner appears.
- [ ] Verify assignment history refreshes.
- [ ] Trigger a validation or backend failure case if possible.
- [ ] Verify failure messaging is visible and does not clear the page context.

### PT meal recommendation creation

- [ ] Open `/pt/clients/[clientId]/recommend-meal-plan`.
- [ ] Create a recommendation with a valid meal plan selection.
- [ ] Verify success banner appears.
- [ ] Verify recommendation history refreshes.
- [ ] Trigger a validation or backend failure case if possible.
- [ ] Verify failure messaging is visible and understandable.

### Logout feedback behavior

- [ ] Trigger sign out from a route that exposes the logout button, such as `/client` or `/pt`.
- [ ] Verify the button changes to `Signing out...` while busy.
- [ ] Verify successful logout redirects to `/login`.
- [ ] If logout fails, verify `Sign out failed` feedback appears and the user remains in context.
- [ ] Verify repeated rapid clicks are prevented while busy.

## Viewport Checklist

Run this pass across the main client, PT, and vendor routes.

### Narrow mobile width (`320px`)

- [ ] Header actions wrap without overlap.
- [ ] Stat pills and chips wrap rather than overflow horizontally.
- [ ] Form controls remain fully visible.
- [ ] Button labels remain readable.
- [ ] No horizontal scrolling appears from cards, tables, chips, or action rows.

### Standard mobile width (`390px`)

- [ ] Main layout feels intentional and readable without cramped spacing.
- [ ] Bottom-nav and page-level actions remain easy to tap.
- [ ] Multi-card sections preserve a clear reading order.
- [ ] Feedback banners and empty states remain visually distinct.

### Desktop width (`1280px+`)

- [ ] Multi-column layouts use space intentionally and do not look sparse or broken.
- [ ] Hero and focus panels align correctly.
- [ ] Section spacing remains consistent across long pages.
- [ ] No mobile-only layout artifacts remain, such as awkward stacking or oversized gaps.

## Defect Register Template

Copy this template for each issue.

| Field | Entry |
| --- | --- |
| Route | |
| Issue title | |
| Severity | `high` / `medium` / `low` |
| Reproducibility | `always` / `intermittent` / `unable to reproduce twice` |
| Viewport | `320px` / `390px` / `1280px+` / `all` |
| Role | `client` / `pt` / `vendor` |
| Screenshot needed | `yes` / `no` |
| Likely category | `frontend-only` / `backend-shape-limited` / `placeholder/intended` |
| Preconditions | |
| Steps to reproduce | |
| Actual result | |
| Expected result | |
| Notes | |
| Recommended next action | |

### Category guidance

- `frontend-only`: layout, spacing, wrapping, label clarity, incorrect feedback state, broken navigation, obvious accessibility issue, or UI behavior that can be corrected without backend change.
- `backend-shape-limited`: the UI is constrained by current payload shape or missing backend-supported workflow depth.
- `placeholder/intended`: intentional placeholder or reserved route behavior that matches the known product boundary.

## Known Limitations

Do not log the following as unexpected defects unless the UI mislabels or misrepresents them.

- Client metrics intentionally supports `overview` and `history` windows, not a true weekly-trend analytics model.
- PT top-level `training`, `metrics`, and `meal plans` tabs are intentional placeholders; real PT work lives under `/pt/clients/*`.
- Vendor operations beyond dashboard, meal plans, and metrics are intentionally unsupported in the current backend and shell.
- Vendor meal-plan surfaces are read-only inventory views; editing, fulfillment, pickup-management, and order-management flows are not in scope.
- PT dashboard is not a full aggregate command center for assignments and recommendations; it remains a summary and routing surface.
- Bookmark organization is limited to current folder and saved-item behavior; move, pin, sort, bulk actions, and richer organization controls are not supported.
- Some metrics, PT summary, and vendor summary framing are shaped by available payload structure rather than richer product semantics.
- Placeholder or empty-state routes are allowed when the backend does not expose deeper data for the current user/session.

## Suggested Execution Order

1. Client route pass
2. Client mutation pass
3. PT route pass
4. PT mutation pass
5. Vendor route pass
6. Full viewport pass
7. Defect triage using the category guidance above

## Completion Criteria

UI-18 manual QA documentation is complete when:

- every in-scope route has been checked at the required viewport sizes
- every listed mutation flow has been executed at least once
- every logged issue has a category and next action
- known backend-limited and placeholder behaviors are not misfiled as unexpected defects
