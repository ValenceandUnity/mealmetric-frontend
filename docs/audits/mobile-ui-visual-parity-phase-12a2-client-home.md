# Mobile UI Visual Parity Phase 12A.2 Client Home

## Phase

- Phase: `12A.2`

## Route touched

- `/client`

## Components touched

- `app/client/page.tsx`
- `app/globals.css`
- `components/mobile/MobileBottomNav.tsx`

## Visual parity refinements made

- Tightened the `/client` top area into a denser hero with a stronger grayscale-photo-style CSS treatment, more compact greeting copy, and a more translucent rounded search field.
- Refined the top utility/action cluster toward the PDF direction while keeping links on existing routes only: bookmarks, meal-plan search, and add-log.
- Upgraded the first Daily Activity card into a more prominent purple progress centerpiece while continuing to render only real overview data from the current client home BFF.
- Made Training Routines more image-forward with stronger overlay treatment, clearer routine chips, and a tighter horizontal scanning rhythm.
- Pushed Upcoming Meal Plan rows closer to the target gray row-card treatment without changing any plan or checkout behavior.
- Tightened the bottom navigation spacing and active-state treatment while preserving existing role-aware destinations and safe-area behavior.

## Data / asset limitations

- No suitable local sport/meal/training assets were available under `public`.
- Hero and routine imagery remain CSS-only decorative placeholders.
- No fake metrics, achievements, meal states, or routine completion data were introduced.

## BFF / auth / backend boundaries preserved

- `/client` still loads through the existing `/api/client/home` BFF route.
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
- `rg` was available.
- `rg -n "app/api|../api|../../api" app/client app/pt app/vendor components lib` returned expected existing `/api/*` BFF fetch usage and type-import matches only; no new browser-side route-handler coupling was introduced by this patch.

## Remaining visual parity work

- Phase `12A.3` `/client/training` and assignment detail parity
- Phase `12A.4` PT shell adaptation
- Phase `12A.5` meal-plan surfaces
- Phase `12A.6` regression certification
