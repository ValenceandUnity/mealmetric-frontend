# Mobile UI Visual Parity Phase 12A

## Phase

- Phase: `12A.1`

## Routes touched

- `/client`

## Components touched

- `components/mobile/MobileAppShell.tsx`
- `components/mobile/MobileTopHub.tsx`
- `app/globals.css`

## Visual parity improvements made

- Reworked the shared protected mobile shell toward a phone-centered dark layout with stronger safe-area-aware bottom spacing.
- Shifted the shared protected mobile top hub toward the target art direction with a rounded grayscale-style hero treatment, denser greeting area, translucent search field, and decorative status strip.
- Restyled the shared bottom navigation into a larger purple pill bar with icon-heavy active states while preserving role-aware navigation behavior.
- Updated `/client` to lean into the PDF direction with:
  - dark grid-backed shell presentation
  - hero/search/greeting top section
  - purple-accent daily activity card treatment
  - featured routine preview plus image-forward horizontal routine cards
  - lighter gray meal-plan rows
  - removal of the prior command-card feel on the protected client home route

## Asset gaps

- No suitable local sport/meal/training assets were found under `public`.
- Hero and routine image treatments use CSS gradient and grayscale placeholder composition instead of local photography.

## BFF/auth/backend boundaries preserved

- `/client` still loads from the existing `/api/client/home` BFF route.
- No direct browser-to-backend calls were introduced.
- No backend repo files were changed.
- No `app/api/*` route handlers were changed.
- No auth/session files were changed.
- No checkout behavior or protected-route role logic was changed.

## Dependency diff result

- `git diff -- package.json package-lock.json pnpm-lock.yaml yarn.lock` returned no output.

## Test result

- `npm test` passed: `62` files, `223` tests.

## Build result

- `npm run build` passed on Next.js `15.2.8`.

## Security/BFF scan result

- Browser-facing backend scan for `BACKEND_BASE_URL`, `backendFetch`, `requireSession`, `http://`, and `https://` returned no matches in the requested scope.
- `rg` was available.
- Import scan showed expected `/api/*` BFF fetch usage and type imports only; no new browser-side `app/api` route-handler coupling was introduced by this patch.

## Remaining visual parity work

- `12A.2` `/client` home refinements if needed
- `12A.3` `/client/training` and assignment detail
- `12A.4` PT shell adaptation
- `12A.5` meal-plan rows/cards
- `12A.6` regression tests/build/security scan
