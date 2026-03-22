# MealMetric UI-0 Design Extraction

## Scope

This document defines the UI-0 frontend architecture artifact for MealMetric's visual layer. It is implementation-ready at the shell, page, and reusable-component level only. It does not introduce backend changes, mock contracts, or browser-to-backend calls.

UI-0 source inputs used for this extraction:

- Design/compliance PDFs provided by the user, especially `CCC_(v_Layer_3).pdf`
- Current Next.js App Router plus BFF route structure in `app/api/*`
- Existing frontend route tree in `app/*`
- Existing shell and card primitives in `components/*`

CCC alignment for UI-0:

- Browser components may call only Next.js BFF routes under `app/api/*`
- Role boundaries stay explicit in shell, navigation, and route access
- Unsupported backend areas are labeled as blocked or placeholder, not invented
- Marketplace surfaces remain attached to the product, not the center of the shell

## Global Shell

### Mobile-first app shell

The base shell for UI-0 is a role-aware mobile app shell with:

- `TopHub/HeaderBar` pinned at the top
- scrollable content region in the middle
- 5-slot `BottomNav` pinned at the bottom
- safe-area aware spacing for handset layouts
- optional shell actions for session and context actions

### Shell composition

`AppShell`

- owns viewport framing, bottom-nav spacing, and role theme hooks
- accepts `user`, `role`, `header`, `actions`, and page body content
- wraps all authenticated client, PT, and vendor pages

`TopHub/HeaderBar`

- role label
- current page title
- optional subtitle/context copy
- optional actions such as logout, refresh, or route-local CTAs
- no business data fetches inside the shell itself

`BottomNav`

- exactly 5 visual slots for all authenticated roles
- active-state handling by pathname
- route labels may vary by role
- disabled placeholders are allowed where backend support is incomplete

### Role-aware shell variants

| Role | 5-tab shell | UI-0 note |
| --- | --- | --- |
| Client | Home, Training, Metrics, Meal Plans, Bookmarks | All five tabs map to existing client routes and are safe to design now. |
| PT | Home, Clients, Training, Metrics, Meal Plans | Tabs 3-5 land in the PT client workspace, because current backend is client-centric under `/pt/clients/*`. |
| Vendor | Home, Meal Plans, Metrics, Placeholder, Account/Exit | Only the first three are data-backed today. Slot 4 stays disabled/reserved. Slot 5 can remain local account/session chrome only. |

## Role-Based Navigation

### Client navigation

- `/client`
- `/client/training`
- `/client/metrics`
- `/client/meal-plans`
- `/client/bookmarks`

### PT navigation

- `/pt`
- `/pt/clients`
- `/pt/clients/[clientId]/assign`
- `/pt/clients/[clientId]/metrics`
- `/pt/clients/[clientId]/recommend-meal-plan`

PT navigation rule for UI-0:

- top-level tab chrome is role-based
- workflow depth remains inside the PT client workspace
- no new PT backend routes are introduced just to satisfy tab labels

### Vendor navigation

- `/vendor`
- `/vendor/meal-plans`
- `/vendor/metrics`
- reserved vendor operations slot: disabled in UI-0
- local account or exit shell action: allowed without adding backend scope

## Component List

### Core shell components

| Component | Purpose | UI-0 status | Data source |
| --- | --- | --- | --- |
| `AppShell` | Authenticated mobile shell wrapper | Existing foundation; refine spec only | Session plus page props |
| `TopHub/HeaderBar` | Top role hub, title, actions | Extracted target | Session plus page props |
| `BottomNav` | 5-tab mobile nav | Existing foundation; requires role cleanup | Pathname only |
| `Modal` | Confirm, create-folder, or focused task overlays | Extracted target | Local state plus BFF action handlers |
| `Carousel` | Horizontal card rail for highlights, routines, or plans | Extracted target | BFF-fed page collections |

### Reusable content primitives

| Component | Purpose | UI-0 status | Notes |
| --- | --- | --- | --- |
| `Card` | Base surface wrapper | Extracted target | Common spacing, elevation, and action area |
| `ListItem` | Compact row with title, metadata, chevron/action | Extracted target | Used in folders, metrics rows, client lists |
| `MetricCard` | Headline metric value plus hint | Extracted target | Backed today by `SummaryCard`-style data |
| `AnalyticsCard` | Multi-field metric summary card | Extracted target | Used on Home, Metrics, Vendor summary |
| `RoutineCard` | Training routine or assignment summary | Extracted target | Client training and PT assignment views |
| `MealPlanCard` | Meal-plan catalog/listing card | Existing foundation | Client and vendor catalog surfaces |
| `AssignmentCard` | Training assignment card | Existing foundation | Client training hub |
| `FolderCard` | Bookmark folder surface | Extracted target | Client bookmarks |
| `BudgetMarker` | Budget range chip or meter | Extracted target | Client meal-plan filtering |

### Domain-level specializations

| Component | Purpose | UI-0 status | Primary screens |
| --- | --- | --- | --- |
| `AnalyticsCard` | KPI block with short narrative | Extracted target | Client Home, PT, Vendor |
| `RoutineCard` | Assignment or package preview | Extracted target | Client Training, PT |
| `MealPlanCard` | Catalog or recommendation card | Existing foundation | Client Meal Plans, Vendor, PT recommend |
| `MetricCard` | Current metric snapshot | Extracted target | Client Metrics, PT client metrics, Vendor metrics |
| `FolderCard` | Named bookmark collection | Extracted target | Bookmarks |
| `AssignmentCard` | Training assignment summary | Existing foundation | Client Home, Client Training |

## Page Layout Hierarchy

### Global hierarchy

`RootLayout`

- unauthenticated routes
- authenticated shell boundary

`Authenticated role page`

- `AppShell`
- `TopHub/HeaderBar`
- page-specific section stack
- `BottomNav`

### Client Home

`AppShell`

- `TopHub/HeaderBar`
- `AnalyticsCard` row for high-level metrics
- training preview rail or stack using `AssignmentCard` and `RoutineCard`
- meal-plan preview rail using `MealPlanCard`
- compact shortcuts row
- `BottomNav`

### Training

`AppShell`

- `TopHub/HeaderBar`
- active assignment summary
- assignment list using `AssignmentCard`
- assignment detail view using `RoutineCard`, checklist, and workout-log form
- modal-capable workout-log success and error states
- `BottomNav`

### Metrics

`AppShell`

- `TopHub/HeaderBar`
- segmented control or tabs for overview and history
- `MetricCard` snapshot row
- `AnalyticsCard` or chart-ready list region for metric details
- optional `Carousel` for recent checkpoints if design calls for horizontal scanning
- `BottomNav`

### Meal Plans

`AppShell`

- `TopHub/HeaderBar`
- filter bar with ZIP and budget controls
- budget visualization via `BudgetMarker`
- plan count and bookmark count summary
- meal-plan list via `MealPlanCard`
- detail page with summary, included meals, and checkout CTA
- `BottomNav`

### Bookmarks

`AppShell`

- `TopHub/HeaderBar`
- create-folder action
- folder list via `FolderCard`
- folder contents as `ListItem` or compact plan cards
- destructive actions behind `Modal` confirmation
- `BottomNav`

### PT

`AppShell`

- `TopHub/HeaderBar`
- PT dashboard summary via `AnalyticsCard`
- client roster list via `ListItem` or card stack
- client detail snapshot
- assignment workspace using `AssignmentCard`, `RoutineCard`, and form surfaces
- meal-plan recommendation workspace using `MealPlanCard` and recommendation form
- client metrics page using `MetricCard` and analytics sections
- `BottomNav`

### Vendor

`AppShell`

- `TopHub/HeaderBar`
- vendor summary via `AnalyticsCard`
- meal-plan inventory via `MealPlanCard`
- operational metrics via `MetricCard`
- reserved operations slot remains visually present but disabled until backend support exists
- `BottomNav`

## Screen Composition Map

| Screen | Primary sections | Required reusable components | Readiness |
| --- | --- | --- | --- |
| Client Home | KPI summary, training preview, meal-plan preview, shortcuts | `AppShell`, `TopHub/HeaderBar`, `BottomNav`, `AnalyticsCard`, `AssignmentCard`, `MealPlanCard` | Frontend wiring only |
| Training | assignment list, assignment detail, workout logging | `AppShell`, `RoutineCard`, `AssignmentCard`, `Card`, `Modal`, `ListItem` | Frontend wiring only |
| Metrics | overview/history switch, KPI row, metric detail blocks | `AppShell`, `MetricCard`, `AnalyticsCard`, `Carousel`, `Card` | Frontend wiring only |
| Meal Plans | filters, budget summary, catalog list, detail, checkout CTA | `AppShell`, `MealPlanCard`, `BudgetMarker`, `Card`, `Modal` | Frontend wiring only |
| Bookmarks | folder creation, folder list, saved plans | `AppShell`, `FolderCard`, `ListItem`, `Modal`, `MealPlanCard` | Frontend wiring only |
| PT | dashboard, client roster, client snapshot, assign, recommend, metrics | `AppShell`, `AnalyticsCard`, `ListItem`, `AssignmentCard`, `RoutineCard`, `MealPlanCard`, `MetricCard` | Frontend wiring only |
| Vendor | dashboard, meal-plan inventory, metrics | `AppShell`, `AnalyticsCard`, `MealPlanCard`, `MetricCard`, `Card` | Frontend wiring only for backed areas; blocked for future operations area |

## Interactions

### Shell interactions

- active tab state derives from pathname only
- shell never fetches backend data directly
- role switch changes nav labels, destination mapping, and hub copy
- placeholder tabs render disabled, not fake destinations

### Client interactions

- training assignment open uses `/api/client/training` and `/api/client/training/assignments/[assignmentId]`
- workout log submit uses `/api/client/training/workout-logs`
- metrics tab refresh uses `/api/client/metrics`, `/api/client/metrics/overview`, and `/api/client/metrics/history`
- meal-plan filtering uses `/api/client/meal-plans`
- bookmark add/remove uses `/api/client/bookmarks/*`
- checkout starts only through `/api/client/checkout/session`

### PT interactions

- PT dashboard uses `/api/pt/dashboard`
- client roster uses `/api/pt/clients`
- client metrics uses `/api/pt/clients/[clientId]/metrics`
- assignment create uses `/api/pt/clients/[clientId]/assignments/create`
- meal recommendation create uses `/api/pt/clients/[clientId]/meal-plan-recommendations/create`

### Vendor interactions

- vendor home uses `/api/vendor/me`, `/api/vendor/metrics`, and `/api/vendor/meal-plans`
- vendor metrics uses `/api/vendor/metrics`
- vendor catalog uses `/api/vendor/meal-plans`
- no vendor browser surface may call backend services outside these BFF routes

## Implementation Order

1. Normalize the authenticated shell contract around `AppShell`, `TopHub/HeaderBar`, and a corrected 5-slot `BottomNav`.
2. Build shared surface primitives: `Card`, `ListItem`, `MetricCard`, `AnalyticsCard`, `Modal`, and `Carousel`.
3. Build client core surfaces first: Home, Training, Metrics, Meal Plans, Bookmarks.
4. Build PT workspace surfaces second: dashboard, roster, client snapshot, assign, recommend, client metrics.
5. Build vendor backed surfaces third: dashboard, meal-plan inventory, metrics.
6. Leave blocked placeholders visibly reserved where shell parity requires a fifth slot but backend capability does not yet exist.

Implementation priority rationale:

- client, PT, and metrics are core product surfaces
- meal-plan marketplace remains attached, not the center of the shell
- vendor surfaces are narrower and should not drive the base app-shell design

## Blocked vs Unblocked Features

### Safe to build now

- authenticated mobile shell
- top hub/header
- corrected 5-slot bottom nav
- client navigation structure
- PT navigation structure mapped to existing workspace routes
- reusable card/list primitives
- static page composition for all named screens
- loading, error, empty, and success states
- disabled placeholder treatment for unsupported tabs

### Frontend wiring only

These have sufficient BFF support and should be built against existing route handlers only:

- client home via `/api/client/home`
- client training hub and assignment detail
- client metrics overview/history
- client meal-plan catalog and detail
- client bookmark folders and item removal
- client checkout start flow
- PT dashboard
- PT client roster
- PT client metrics
- PT assignment creation workspace
- PT meal-plan recommendation workspace
- vendor dashboard summary
- vendor meal-plan inventory
- vendor metrics summary

### Backend blocked

These should not be invented in UI-0:

- any vendor operations area beyond dashboard, meal plans, and metrics
- any dedicated vendor order-management or pickup-management screen not backed by an existing BFF route
- any PT direct client-detail endpoint assumption; current PT detail is assembled from the client collection
- any bookmarking beyond current client bookmark folder and meal-plan item model
- any browser-direct backend integration
- any new marketplace contract, analytics contract, or mock API surface created only for UI convenience

## UI-0 Output

UI-0 stops at the architecture/spec layer. The next implementation step after approval is to translate this document into shell primitives and screen scaffolds without entering UI-1 visual polish or changing backend contracts.
