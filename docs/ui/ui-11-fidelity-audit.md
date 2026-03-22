# MealMetric UI-11 Fidelity Audit

## Scope

This document audits the implemented MealMetric frontend against:

- `docs/ui/ui-0-design-extraction.md`
- the design intent previously extracted from `CCC_(v_Layer_3).pdf`

Audit coverage:

- App Shell
- Client Home
- Client Training
- Client Metrics
- Client Meal Plans
- Client Bookmarks
- PT workspace
- Vendor workspace
- PT/vendor placeholder tabs for consistency only

## Method Note

The local environment did not include working PDF text-extraction tooling for `CCC_(v_Layer_3).pdf` during this phase. This audit is therefore grounded directly in the implemented code plus the already-approved `ui-0-design-extraction.md`, which itself was derived from the PDF source of truth. Where the PDF likely implies more visual specificity than UI-0 captured, that is called out as a probable fidelity gap rather than asserted as a precise missing PDF element.

## Gap Type Legend

- `frontend-fixable now`
- `backend-shape-limited`
- `intentionally placeholder`

## Severity Legend

- `high`
- `medium`
- `low`

## Global Consistency

### What is working well

- The authenticated shell is now coherent across client, PT, and vendor roles.
- Screen composition consistently uses the shared UI-2 stack: `PageHeader`, `SectionBlock`, `Card`, `ListRow`, `ActionRow`, `StatPill`, `EmptyState`.
- Client core surfaces now read as distinct workspaces rather than generic CRUD pages.
- PT and vendor now have real top-level backed workspaces instead of only shell destinations.
- Placeholder routes remain honest and visually integrated rather than pretending to be implemented products.

### Global gaps

| Area | Current state | Gap type | Severity |
| --- | --- | --- | --- |
| Visual specificity vs PDF | The app is coherent, but still uses a generalized shared dark system instead of more screen-distinct visual composition likely implied by the PDFs. | frontend-fixable now | medium |
| Horizontal/rail behavior | UI-0 references rails/carousels for highlights in some surfaces, but implemented screens mostly use stacked vertical lists. | frontend-fixable now | medium |
| Modal/confirmation depth | UI-0 calls out modal-capable confirm flows, but destructive actions mostly remain inline button actions without richer confirmation affordances. | frontend-fixable now | medium |
| Data-shaped storytelling | Several sections use generic payload-derived summaries because backend data is not semantically rich enough for stronger domain framing. | backend-shape-limited | medium |
| Chart/readiness depth | Metrics surfaces are structurally analytic, but not yet visually chart-like or trend-rich. | backend-shape-limited | medium |

## Shell And Navigation Consistency Notes

### What matches well

- 5-slot mobile shell is present for all authenticated roles.
- Top hub, bottom nav, role accenting, page spacing, and state blocks are now consistent.
- Disabled placeholder treatment exists and is visually integrated.
- PT shell behavior correctly routes real workflow depth into `/pt/clients/*`.
- Vendor shell keeps the reserved operations slot visually present but non-operational.

### Notable shell/navigation gaps

| Route/surface | Intended counterpart | What matches well | What differs visually | What differs structurally | Gap type | Severity |
| --- | --- | --- | --- | --- | --- | --- |
| Global shell | UI-0 Global Shell | Sticky top hub, bottom nav, role-aware chrome, safe-area spacing | Still more utilitarian than high-fidelity app-brand shell art direction | App shell does not yet support richer page-specific hub variants or contextual secondary nav | frontend-fixable now | medium |
| PT placeholder tabs | UI-0 PT shell placeholders | Honest placeholders, integrated styling, correct shell parity | Still intentionally sparse | No delegated read-only summary of the real backed PT client routes from placeholder tabs | intentionally placeholder | low |
| Vendor operations placeholder | UI-0 reserved vendor ops slot | Correctly disabled and visually integrated | Minimal content, intentionally | No deeper non-operational explanatory summary of what is blocked vs available | intentionally placeholder | low |

## Component-System Consistency Notes

### Strong alignment

- Shared primitives are reused well across all implemented workspaces.
- `MealPlanCard`, `FolderCard`, `RoutineCard`, `MetricCard`, and `AnalyticsCard` now cover their intended families reasonably well.
- Loading, error, and empty states are consistent.

### Remaining component-level gaps

| Component/system area | Current state | Gap type | Severity |
| --- | --- | --- | --- |
| `MealPlanCard` | Works for client/vendor/bookmark contexts | Could still use cleaner support for vendor-specific read-only state vs client interactive state without footer duplication | frontend-fixable now | low |
| `SectionBlock` rhythm | Shared and consistent | Some pages still rely on many vertically stacked blocks where PDF likely expects more varied composition density | frontend-fixable now | low |
| Placeholder primitives | Improved in UI-10 | Still structurally generic rather than role-specific placeholder cards | intentionally placeholder | low |
| Metrics adapter-driven UI | Generic and resilient | Visual language is driven by payload shape more than domain semantics | backend-shape-limited | medium |

## Screen Audit

### App Shell

| Field | Audit |
| --- | --- |
| Implemented route | Shared shell across authenticated routes |
| Intended PDF/design counterpart | UI-0 Global Shell, TopHub/HeaderBar, BottomNav |
| What matches well | Sticky header, 5-tab nav, role labels, active-state navigation, safe-area spacing, unified card rhythm |
| What differs visually | More system-like than bespoke; less varied page hero treatment than a polished PDF-driven shell likely implies |
| What differs structurally | No secondary shell pattern for deep workspace context or route breadcrumbs |
| Gap type | frontend-fixable now |
| Severity | medium |

### Client Home

| Field | Audit |
| --- | --- |
| Implemented route | `/client` |
| Intended PDF/design counterpart | UI-0 Client Home |
| What matches well | KPI summary, training preview, meal-plan preview, shortcut actions, shell consistency |
| What differs visually | Highlights are stacked cards rather than more editorial rails or stronger visual grouping |
| What differs structurally | Home aggregates only what the backend returns now; no broader cross-surface orchestration or richer “today” state |
| Gap type | frontend-fixable now |
| Severity | medium |

### Client Training

| Field | Audit |
| --- | --- |
| Implemented route | `/client/training` |
| Intended PDF/design counterpart | UI-0 Training |
| What matches well | Focus assignment, assignment stack, structured summary, clear route-safe actions |
| What differs visually | Reads as a good dashboard, but less like a deeply coached routine workspace with checklist/progression emphasis |
| What differs structurally | Workout progression and modal-capable success/error behavior are not surfaced strongly at the hub level |
| Gap type | frontend-fixable now |
| Severity | medium |

### Client Metrics

| Field | Audit |
| --- | --- |
| Implemented route | `/client/metrics` |
| Intended PDF/design counterpart | UI-0 Metrics |
| What matches well | Overview/history switch, metric cards, grouped sections, analytics framing, structured fallbacks |
| What differs visually | No charts, no graph-ready visual treatment, no stronger weekly-trend visual hierarchy |
| What differs structurally | “Weekly vs history” is represented as overview vs history because the backend does not expose a true weekly slice |
| Gap type | backend-shape-limited |
| Severity | high |

### Client Meal Plans

| Field | Audit |
| --- | --- |
| Implemented route | `/client/meal-plans` |
| Intended PDF/design counterpart | UI-0 Meal Plans |
| What matches well | Discovery framing, ZIP/budget controls, summary, featured plan, bookmark-aware catalog |
| What differs visually | No budget visualization/budget marker treatment; controls remain functional form fields rather than a richer discovery bar |
| What differs structurally | Search/filter scope is limited to current ZIP and budget params; no richer browse model or recommendation logic |
| Gap type | frontend-fixable now |
| Severity | medium |

### Client Bookmarks

| Field | Audit |
| --- | --- |
| Implemented route | `/client/bookmarks` |
| Intended PDF/design counterpart | UI-0 Bookmarks |
| What matches well | Folder grouping, saved-item summary, create-folder flow, folder-contained saved meal-plan cards |
| What differs visually | Folder workspace is solid but still somewhat list-centric; less visual distinction between folder management and item browsing |
| What differs structurally | No modal confirmation or move-between-folder workflow; no richer organization controls |
| Gap type | backend-shape-limited |
| Severity | medium |

### PT Workspace

| Field | Audit |
| --- | --- |
| Implemented route | `/pt` |
| Intended PDF/design counterpart | UI-0 PT dashboard/workspace |
| What matches well | PT summary, client-management framing, package visibility, route-safe actions into client-specific workflows |
| What differs visually | Still compact and system-driven; not yet a more operations-heavy coaching command center with stronger hierarchy |
| What differs structurally | Top-level PT dashboard does not aggregate assignments or recommendations directly; package visibility is standing in as a proxy |
| Gap type | backend-shape-limited |
| Severity | high |

### Vendor Workspace

| Field | Audit |
| --- | --- |
| Implemented route | `/vendor` |
| Intended PDF/design counterpart | UI-0 Vendor dashboard |
| What matches well | Operational overview, vendor identity, metric visibility, meal-plan inventory preview, honest operations-slot treatment |
| What differs visually | More compact and utilitarian than a true operations portal; limited performance storytelling |
| What differs structurally | Vendor workspace still lacks dedicated operations/order-management/pickup-management surfaces beyond exposed metrics |
| Gap type | backend-shape-limited |
| Severity | high |

### PT Placeholder Tabs

| Field | Audit |
| --- | --- |
| Implemented route | `/pt/training`, `/pt/metrics`, `/pt/meal-plans` |
| Intended PDF/design counterpart | UI-0 PT top-level shell consistency |
| What matches well | Honest placeholder handling, shell parity, linked routes into real backed PT workspace |
| What differs visually | Minimal by design |
| What differs structurally | No additional read-only summaries in those tabs |
| Gap type | intentionally placeholder |
| Severity | low |

### Vendor Placeholder Tab

| Field | Audit |
| --- | --- |
| Implemented route | `/vendor/operations` |
| Intended PDF/design counterpart | UI-0 reserved vendor operations slot |
| What matches well | Disabled/reserved behavior, shell parity, honest copy |
| What differs visually | Minimal by design |
| What differs structurally | No operational tooling because backend support is absent |
| Gap type | intentionally placeholder |
| Severity | low |

## Highest-Priority Refinement Opportunities

### High severity

1. Client Metrics: strengthen the metrics visual model once backend exposes a clearer weekly/trend shape.
2. PT Workspace: add richer top-level coaching visibility only if the dashboard payload can expose assignment/recommendation summaries.
3. Vendor Workspace: expand beyond summary framing only when vendor operations data exists beyond meal plans and aggregate metrics.

### Medium severity, frontend-fixable now

1. Add more PDF-like horizontal/spotlight composition patterns where UI-0 implies rails or stronger editorial scanning.
2. Improve Client Meal Plans control bar and budget framing with a more visual filter presentation without changing functionality.
3. Refine Client Home and Client Training hierarchy so featured/focus content stands apart more clearly from secondary stacks.
4. Introduce modal confirmation polish for destructive bookmark actions if the team wants UI-0’s modal direction implemented.

## Backend-Limited Gaps

1. Client Metrics cannot honestly become a true weekly-vs-history analytic surface without more explicit backend time-slice semantics.
2. PT home cannot become a full command center without backend-backed rollups for assignments, recommendations, or client performance at the dashboard level.
3. Vendor home cannot become a true operations console until there are backed operations workflows beyond meal plans and aggregate metrics.
4. Bookmarks cannot support richer organization behaviors like move, pin, sort, or bulk action without backend support.

## Frontend-Fixable Opportunities

1. Add stronger visual distinction between primary hero sections and secondary analytic/context blocks across client, PT, and vendor surfaces.
2. Replace some long vertical stacks with rails or denser grouped layouts where backend data volume already supports it.
3. Tighten page-specific heading language and eyebrow vocabulary so the screens feel less system-generated and more domain-authored.
4. Add richer confirmation/feedback states for destructive and save actions using the existing shared component system.
5. Improve placeholder tabs with role-specific “what to do instead” cards while keeping them non-operational.

## Recommended Next Codex Tasks

1. UI-12: Client metrics fidelity pass focused on visual analytic hierarchy only, contingent on clarifying what current payload slices can honestly represent.
2. UI-13: Client meal-plan discovery polish pass focused on budget/filter presentation and stronger browse composition without changing query behavior.
3. UI-14: PT client roster/workspace upgrade on `/pt/clients`, since it is the next most operational PT surface after `/pt`.
4. UI-15: Vendor catalog upgrade on `/vendor/meal-plans`, since it is the next strongest backed vendor route after `/vendor`.
5. UI-16: Interaction polish pass for confirmation, transient feedback, and empty-state refinement across destructive/save actions.

## Summary

The implemented app now aligns well with the UI-0 architecture: the shell is coherent, each core client surface is real, PT and vendor have true backed workspaces, and unsupported routes remain honest. The main remaining gaps are no longer structural scaffolding problems. They are primarily:

- fidelity polish opportunities in composition and visual specificity
- backend-shape limitations in metrics, PT aggregation, and vendor operations
- a small number of shared interaction refinements that would bring the app closer to the PDF-driven product feel without inventing scope
