# Mobile UI Manual Device / Browser QA

## 1. Executive summary

- Phase: 11B - Manual Device / Browser QA
- Scope: post-cutover manual QA
- Certification baseline: `1719c5c docs: certify mobile UI cutover`
- Release smoke baseline: `5acf64f docs: add mobile UI release QA smoke`
- Result: blockers found
- Blocking issue: protected Mobile UI routes are functional, but observed UI does not meet Mobile UI PDF visual parity expectations.
- Recommendation: do not proceed to Phase 11C; open Phase 12A visual parity remediation.

## 2. Environment and accounts

- Frontend commit: `5acf64f docs: add mobile UI release QA smoke`
- Frontend URL: `localhost:3000`
- Backend URL: `http://127.0.0.1:8000`
- Backend bootstrap diagnosis summary: initial registration failed because backend was not running from a compatible entrypoint; plain `python` resolved to `Python 3.14.0`, while the existing backend `.venv` used `Python 3.12.10` and started successfully with healthy `/livez` and `/readyz` responses.
- PT login was established after backend was started correctly.
- Vendor route QA was not completed because approved vendor QA account availability was not established in this pass.
- No passwords, tokens, cookies, JWTs, or secrets are included in this report.

## 3. Commands run and results

| Command | Purpose | Result | Notes |
| --- | --- | --- | --- |
| `git status --short` | Confirm repo state before report creation | Pass | Clean output before writing the Phase 11B doc. |
| `git log -1 --oneline` | Confirm current frontend baseline commit | Pass | `5acf64f docs: add mobile UI release QA smoke` |
| `git pull --ff-only` | Confirm local branch is current with `origin/main` | Pass | `Already up to date.` |
| `npm test` | Confirm regression suite still passes during manual QA phase | Pass | `62` files, `223` tests passed. |
| `npm run build` | Confirm production build still passes during manual QA phase | Pass | Next.js `15.2.8`; compile, type-check, and static generation passed for `65` app routes. |
| `git diff -- package.json package-lock.json pnpm-lock.yaml yarn.lock` | Confirm dependency hygiene | Pass | No diff output. |
| `git status --short` | Confirm final changed-file state after report creation | Pass | One new docs file only. |
| `git diff --name-only` | Confirm exact tracked changed files after report creation | Pass with note | No tracked diff output because the new report file is untracked; final `git status --short` identifies the added doc. |

## 4. Manual QA criteria

- Route loads without crash
- Correct role shell/top hub/bottom nav
- No horizontal overflow
- Mobile spacing/readability acceptable
- Primary actions visible and tappable
- No raw JSON/debug preview
- No fake success state
- No direct browser-to-backend calls observed
- No blocking console errors
- Visual parity against Mobile UI PDF

## 5. Manual observations

- Public root route loaded and preserved BFF boundary messaging.
- `/register` initially returned `502 backend_unreachable`.
- Backend bootstrap issue was diagnosed as wrong Python entrypoint/plain Python `3.14`, resolved by using backend `.venv` Python `3.12.10`.
- PT login succeeded after backend started through the correct `.venv`.
- `/pt` loaded and rendered protected PT dashboard content.
- `/pt` does not match the target Mobile UI PDF visual language.

## 6. Visual parity blocker

- ID: `11B-VIS-001`
- Route: `/pt`
- Role: `pt`
- Severity: Blocker
- Description:
  The current protected Mobile UI shell is functional and role-aware, but it does not match the Mobile UI PDF art direction. The observed PT dashboard uses a dark command-card layout, while the target PDF uses a black grid background, grayscale sports hero, translucent search, image-forward routine cards, purple progress/activity cards, gray meal rows, and large icon-heavy bottom navigation.
- Evidence:
  Operator-provided screenshots from `localhost:3000` show the mismatch.
- Impact:
  If PDF visual parity is release criteria, the certified Mobile UI cutover is not release-ready visually.
- Recommended next phase:
  `Phase 12A - Mobile UI Visual Parity Remediation.`

## 7. Route coverage status

- `/pt` was manually observed.
- Protected-route full sweep is paused because visual parity blocker makes clean certification inappropriate.
- Client and vendor route sweeps should resume after Phase 12A visual remediation starts or completes, depending on release strategy.
- Vendor account availability remains a QA-data dependency if no approved vendor account exists.

## 8. Security/BFF notes

- The observed registration request stayed on same-origin `/api/auth/register`.
- `backend_unreachable` was a server-side BFF-to-backend availability error, not a browser-to-backend direct call.
- No BFF handler changes were made.
- No auth/session changes were made.
- No backend code changes were made.

## 9. Dependency/DAL confirmation

- No `package.json` diff
- No lockfile diff
- No dependency added
- No dependency removed
- No dependency upgraded

## 10. Build/test summary

- `npm test` result: passed with `62` files and `223` tests.
- `npm run build` result: passed.
- Next.js version: `15.2.8`
- Tests/build continue to prove architecture stability despite the visual blocker.

## 11. Release risks

| Risk | Severity | Current status / next phase |
| --- | --- | --- |
| Visual parity blocker | Blocker | Phase 12A |
| Accessibility audit not yet complete | Medium | Phase 11C after blocker remediation |
| Performance/Lighthouse/bundle review not yet complete | Medium | Phase 11D after blocker remediation |
| Production readiness checklist not yet complete | Medium | Phase 11E after blocker remediation |
| Post-cutover risk register update not yet complete | Medium | Phase 11F after blocker remediation |
| Vendor manual QA account may be unavailable | Medium | Coverage gap |

## 12. Recommendation

"Phase 11B found a visual parity blocker. Do not proceed to Phase 11C until the blocker is triaged and remediated in Phase 12A Mobile UI Visual Parity Remediation. No backend, BFF, auth/session, dependency, or direct browser-to-backend regression was identified by this Phase 11B finding."
