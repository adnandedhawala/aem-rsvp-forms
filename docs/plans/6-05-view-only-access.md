# 6-05 View-only access

Status: Built · 06/11/2026
Kind: new · Request: `docs/requests/6-05-view-only-access.md` · Depends on: 2-01, 4-01, 4-02, 6-01, 6-02, 6-03, 6-04

## Decide
- Admins add and remove viewers on a new `/admin/viewers` page. Viewers sign in on `/admin/login`, see every RSVP's list, invitees and responses, download Excel, and open households read-only. Every write is hidden in the UI and refused by the API (403 "View-only access").
- **Storage (blocks build):** one `rsvp_entry` row per viewer, `rsvp: "*"`, `kind: "viewer"`, `member_id` = ITS. Same pattern as 6-04's control row. Recommended: yes.
- **Role check:** the token carries `role`. For viewers the API also checks the viewer row on every request, so a removed viewer is locked out straight away. Admin checks stay token-only, as today.
- A user who is both admin and viewer signs in as admin.
- Files: tokens, adminLogin, session, a new `services/viewers.ts`, every admin route (read or write), 2 new routes, AdminShell, list/invitees/responses/household pages, a new viewers page, done-page summary moved into a shared component, docs.

## Builder context
- Request sections 2-4. Dev plan §3 (admin rule changes: "Admin" or an active viewer row; no-store; `withRoute`; `<Link prefetch={false}>`; tests on memory DB).
- Copies: `services/control.ts` (control-row pattern), `RsvpListClient.tsx` (mutation + `modal.confirm`), `DoneClient.tsx` `Summary` (read-only answers).

## Interfaces
- **Consumes:** `requireAdmin`, `verifyAdminToken`, `signAdminToken`, `loginAdmin`, `RsvpEntry`, `User`, `getHousehold`, `listResponses`, `listInvitees`.
- **Produces:**
  - `AdminClaims = { itsId: number; name: string; role: "admin" | "viewer" }`. `verifyAdminToken` reads a missing `role` as `"admin"`.
  - `IRsvpEntry.kind` adds `"viewer"`.
  - `services/viewers.ts`:
    - `listViewers(): Promise<{ its: string; name: string; addedBy: string | null; addedAt: string }[]>`
    - `addViewer(its: string, by: string): Promise<void>` → 404 "No AEM user with this ITS"; re-adding a removed viewer restores it.
    - `removeViewer(its: string): Promise<void>`
    - `isViewer(its: string): Promise<boolean>`
  - `session.ts`: `requireStaff(req): Promise<AdminClaims>` (admin, or a viewer whose row is still active, else 401); `requireAdmin(req)` adds 403 "View-only access" for viewers.
  - `loginAdmin`: `Admin` role → `role "admin"`; else an active viewer → `role "viewer"`; else 403 "Not an admin".
  - Routes: `GET /api/v1/admin/viewers`, `POST /api/v1/admin/viewers` `{ its }`, `DELETE /api/v1/admin/viewers` `{ its }` (all `requireAdmin`).
  - `components/form/AnswerSummary.tsx`: `AnswerSummary({ title, fields, data })` (moved from `DoneClient`).

## Route access
| Route | Method | Who |
|---|---|---|
| `verify` | GET | staff (returns `role`) |
| `rsvp` | GET | staff |
| `rsvp/[slug]/responses` | GET | staff |
| `rsvp/[slug]/invitees` | GET | staff |
| `rsvp/[slug]/invitees` | POST, DELETE | admin |
| `rsvp/[slug]/invitees/validate` | POST | admin |
| `rsvp/[slug]/household/[fileNo]` | GET | staff |
| `rsvp/[slug]/household/[fileNo]` | PUT | admin |
| `rsvp/[slug]/close` | POST | admin |
| `viewers` | GET, POST, DELETE | admin |

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/auth/tokens.ts` | changed | `role` in `AdminClaims` |
| `src/server/auth/adminLogin.ts` | changed | viewer sign-in |
| `src/server/auth/session.ts` | changed | `requireStaff`; `requireAdmin` refuses viewers |
| `src/server/models/rsvpEntry.ts` | changed | `kind` adds `"viewer"` |
| `src/server/services/viewers.ts` (+ test) | new | the functions above |
| `src/app/api/v1/admin/**/route.ts` | changed | per the access table |
| `src/app/api/v1/admin/viewers/route.ts` | new | GET / POST / DELETE |
| `src/components/admin/AdminShell.tsx` | changed | "View only" tag; Viewers link for admins; exposes the role to pages |
| `src/app/admin/RsvpListClient.tsx` | changed | no Close / Reopen for viewers |
| `src/app/admin/r/[slug]/invitees/InviteesClient.tsx` | changed | viewers see the invited list and download only |
| `src/app/admin/r/[slug]/responses/ResponsesClient.tsx` | changed | viewers get "View" instead of "Open form" |
| `src/app/admin/r/[slug]/household/[fileNo]/AdminHouseholdClient.tsx` | changed | viewers get `AnswerSummary` cards, no form |
| `src/app/admin/viewers/page.tsx`, `ViewersClient.tsx` | new | list, add by ITS, remove with confirm |
| `src/components/form/AnswerSummary.tsx`, `DoneClient.tsx` | new / changed | shared read-only answers |
| `tests/helpers/db.ts` | changed | fixture user `30000003` "Viewer One" (role `User`) |
| `USER-GUIDE.md`, `RSVP-DEV-PLAN.md` §3, spec data model | changed | viewers |
| `e2e/admin.spec.ts` | changed | viewer flow |

## Steps
- [ ] 1. Failing tests:
  - `viewers.test.ts`: `addViewer("30000003","30000001")` → `listViewers()` is one row `{ its: "30000003", name: "Viewer One", addedBy: "30000001" }`; `addViewer("99999999", …)` → 404; `removeViewer` → `isViewer` false and the list is empty; re-adding restores it (still one row).
  - Login: `30000003` before being added → 403 "Not an admin"; after → `{ role: "viewer" }`; `30000001` → `{ role: "admin" }`.
  - Session: `requireStaff` passes a viewer token and fails (401) after `removeViewer`; `requireAdmin` with a viewer token → 403 "View-only access"; a token without `role` → treated as admin.
  - Invitee and response counts are unchanged by a viewer row.
- [ ] 2. `npm test -- viewers` → FAIL.
- [ ] 3. Implement as in Interfaces and the access table.
- [ ] 4. `npm test`, `npm run lint`, `npm run build`, `npm run e2e` → PASS. E2E: admin adds the viewer; viewer signs in, sees responses, has no Close button, and a POST to `close` returns 403.
- [ ] 5. Commit: `feat: view-only access for viewers added by admins`.

## Manual test
On `aem-dev`, the request's section 5.

## Open questions
1. **(blocks build)** Store viewers as `kind: "viewer"` rows in `rsvp_entry` (`rsvp: "*"`)? Recommended: yes.
2. Can viewers see mobile numbers in the responses grid and downloads? Recommended: yes, the same as admins (hiding is out of scope).

## Out of scope
Viewers for chosen RSVPs only; hiding columns from viewers; viewer audit history.
