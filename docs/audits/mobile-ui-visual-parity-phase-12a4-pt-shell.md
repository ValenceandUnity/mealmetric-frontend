## Phase 12A.4 PT shell adaptation audit

Scope completed on branch `phase-12a4-pt-shell-adaptation`.

Routes adapted:
- `/pt`
- `/pt/clients`
- `/pt/clients/[clientId]`
- `/pt/training`
- `/pt/metrics`

Visual changes:
- Shifted PT landing, roster, client detail, training, and metrics routes into the same darker grid-and-card visual system used by the client mobile surfaces.
- Added CSS-only hero treatments, signal cards, filter summaries, and note blocks without introducing asset dependencies.
- Reduced command-dashboard phrasing in favor of profile, roster, portfolio, routine, and reporting language.

Behavior preserved:
- All PT surfaces still fetch only the existing `/api/pt/*` frontend BFF routes.
- No backend, auth/session, dependency, or route-map changes were introduced.
- PT note updates continue to use the existing `/api/pt/workout-logs/[id]/pt-notes` flow.
- Training management remains read-only because no stable editor routes are currently wired.

Asset note:
- No PT or shared image assets were present under `public/` during this phase, so all parity work uses CSS-only decorative treatments.
