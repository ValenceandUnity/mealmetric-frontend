# Mobile UI Visual Parity Phase 12A.3 Training

## Phase

- Phase: `12A.3`

## Routes touched

- `/client/training`
- `/client/training/[assignmentId]`
- `/client/add-log`

## Components touched

- `app/client/training/page.tsx`
- `app/client/training/[assignmentId]/page.tsx`
- `app/client/add-log/page.tsx`
- `app/globals.css`
- `tests/client-training-assignment-mobile-page.test.tsx`
- `tests/client-add-log-mobile-page.test.tsx`

## Visual parity refinements made

- Refined `/client/training` toward a stronger Workout Journal presentation with a featured routine strip, more image-forward assignment cards, and a clearer “Workout Checklist For the Week” section.
- Refined `/client/training/[assignmentId]` toward the PDF routine-detail flow with a stronger hero card, compact checklist presentation, more deliberate routine-detail treatment, and clearer “Log Your Reps” entry framing tied to the existing add-log behavior.
- Refined `/client/add-log` toward the PDF rep-entry flow with a more prominent “Log Your Reps” hero, stronger routine/exercise context treatment, more deliberate rep-row styling, and a clearer `Save Log Entry` action while preserving the same workout-log payload semantics.
- Extended route-specific training styling in the shared CSS system without introducing new backend contracts or fake training state.

## Data / asset limitations

- No suitable local workout/training assets were available under `public`.
- Training hero and routine visuals continue to use CSS-only decorative placeholders.
- Last weight / last timing remain explicitly unavailable unless present in the current assignment payload.
- No fake workout completion, fake saved logs, fake exercise history, or fake PT note behavior was introduced.

## BFF / auth / backend boundaries preserved

- `/client/training` still uses the existing `/api/client/training` BFF route.
- `/client/training/[assignmentId]` still uses the existing `/api/client/training/assignments/[assignmentId]` BFF route.
- `/client/add-log` still submits through the existing `/api/client/training/workout-logs` BFF route and preserves the current payload shape.
- No backend repo files were changed.
- No `app/api/*` route handlers were changed.
- No auth/session files were changed.
- No browser-to-backend direct calls were introduced.

## Dependency diff result

- `git diff -- package.json package-lock.json pnpm-lock.yaml yarn.lock` returned no output.

## Test result

- `npm test` passed: `62` files / `223` tests.

## Build result

- `npm run build` passed on Next.js `15.2.8`.

## Browser-facing backend scan result

- `Select-String` scan for `BACKEND_BASE_URL`, `backendFetch`, `requireSession`, `http://`, and `https://` returned no matches in the requested browser-facing scope.

## rg scan result

- `rg` was available.
- `rg -n "app/api|../api|../../api" app/client app/pt app/vendor components lib` returned expected existing `/api/*` BFF fetch usage and type-import matches only; no new browser-side route-handler coupling was introduced by this patch.

## Remaining visual parity work

- Phase `12A.4` PT shell adaptation
- Phase `12A.5` meal-plan surfaces
- Phase `12A.6` regression certification
