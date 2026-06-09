## Phase 12A.5 meal-plan surfaces visual parity audit

Phase: `12A.5`

Routes touched:
- `/client/meal-plans`
- `/client/meal-plans/[mealPlanId]`
- `/client/meal-plans/bookmark`
- `/client/meal-plans/search`
- `/client/meal-plans/schedule`
- `/pt/meal-plans`
- `/pt/clients/[clientId]/recommend-meal-plan`

Components touched:
- `components/mobile/MobileMealPlanRow.tsx`

Visual parity refinements made:
- Shifted shared meal-plan rows toward a denser gray-card, image-placeholder, high-contrast title treatment.
- Added protected-surface hero cards and compact signal cards across client and PT meal-plan routes.
- Tightened bookmark, search, PT browse, and recommendation surfaces into the same dark-grid meal-card language.
- Added a truthful CSS-only placeholder treatment for schedule and detail hero states when image-backed media is unavailable.

Data and asset limitations:
- No suitable local meal-plan/vendor image assets were found in `public/`, so CSS-only decorative placeholders remain in use.
- Schedule remains placeholder-safe because the current client workspace does not expose dedicated schedule, delivery, pickup, or subscription payloads for this route.
- No fake catalog, checkout, recommendation, vendor, or fulfillment state was introduced.

Checkout behavior preserved:
- `/client/meal-plans/[mealPlanId]` still starts checkout only through `/api/client/checkout/session`.
- Checkout request payload shape, success flow, and redirect messaging were not changed.

PT recommendation behavior preserved:
- PT meal-plan discovery still loads from `/api/pt/meal-plans/search`.
- Recommendation creation still posts only to `/api/pt/clients/[clientId]/meal-plan-recommendations/create`.
- Selection behavior, create payload shape, and success/error feedback were preserved.

BFF, auth, and backend boundaries preserved:
- No backend repo changes.
- No `app/api/*` changes.
- No auth/session changes.
- No `lib/backend/*` changes.
- No direct browser-to-backend calls introduced.

Dependency diff result:
- Empty

Test result:
- `npm test` passed

Build result:
- `npm run build` passed on Next.js `15.2.8`

Browser-facing backend scan result:
- No `BACKEND_BASE_URL`, `backendFetch`, `requireSession`, or direct `http://` / `https://` browser calls found in the required scan set.

`rg` scan result:
- `rg` available
- Route scan continues to show only expected protected frontend route usage

Remaining visual parity work:
- Phase `12A.6` regression certification
