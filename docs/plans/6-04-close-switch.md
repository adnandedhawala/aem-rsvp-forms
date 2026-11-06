# 6-04 Admin close and reopen switch

Status: Built · 06/11/2026
Kind: new · Request: `docs/requests/6-04-close-switch.md` · Depends on: 0-03, 3-01, 3-02, 4-02, 5-03, 6-01

## Decide
- Admins close or reopen any RSVP from `/admin` with one button and a confirm. Closed by admin = closed by date everywhere (sign-in, submit, done page, home redirect).
- **Storage (blocks build):** one `rsvp_entry` row per RSVP, `kind: "control"`, `data: { closed }`. Keeps the "only `rsvp_entry`" rule. Every existing query already filters by `kind`, so the row never shows up as an invitee or answer. Recommended: yes. (Alternative: a new `rsvp_control` collection, which needs a rule change.)
- Reopen only removes the admin close; dates still apply.
- Status moves to the server: new async `rsvpStatus(form, now?)`. The done page reads `status` from `HouseholdView` instead of computing it in the browser.
- Files: `rsvpEntry` model, new `services/control.ts`, `households.ts`, `responses.ts`, two API routes, `/admin` list, done page, home page, user guide.

## Builder context
- Request sections 2-4. Dev plan §3 (no-store, `withRoute`, admin-only, `<Link prefetch={false}>`, tests on memory DB).
- Copies: `src/app/api/v1/admin/rsvp/route.ts` (admin route), `InviteesClient.tsx` (`App.useApp().modal.confirm`), `households.test.ts` (fixtures, `now`).

## Interfaces
- **Consumes:** `formStatus(form, now)`, `FormStatus` (`forms/index.ts`); `RsvpEntry`; `requireAdmin(req): AdminClaims { itsId, name }`; `formOr404(slug)`; `getFormStats(form)`; `HouseholdView`.
- **Produces:**
  - `IRsvpEntry.kind: "member" | "household" | "control"`.
  - `services/control.ts`:
    - `getAdminClose(slug): Promise<{ closed: boolean; by: string | null; at: string | null }>`
    - `setAdminClose(slug, closed: boolean, by: string): Promise<void>` (upsert on `{ rsvp, kind: "control", file_id: "-", member_id: null }`, `tanzeem_file_no: 0`, `invited_by: by`)
    - `rsvpStatus(form, now = new Date()): Promise<FormStatus>`: date status, but `"open"` becomes `"closed"` when admin-closed.
  - `FormStats` gains `adminClosed: { by: string; at: string } | null`.
  - `HouseholdView` gains `status: FormStatus`.
  - `POST /api/v1/admin/rsvp/[slug]/close` body `{ closed: boolean }` → `{ status, adminClosed }`; 400 on a bad body.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/models/rsvpEntry.ts` | changed | `kind` enum adds `"control"` |
| `src/server/services/control.ts` | new | the three functions above |
| `src/server/services/control.test.ts` | new | tests below |
| `src/server/services/households.ts` | changed | sign-in and household save use `rsvpStatus`; `getHousehold` returns `status` |
| `src/server/services/responses.ts` | changed | `getFormStats` uses `rsvpStatus`, adds `adminClosed` |
| `src/app/api/v1/rsvp/[slug]/route.ts` | changed | `status: await rsvpStatus(form)` |
| `src/app/api/v1/admin/rsvp/[slug]/close/route.ts` | new | admin POST |
| `src/app/page.tsx` | changed | home redirect skips admin-closed forms |
| `src/app/admin/RsvpListClient.tsx` | changed | Close / Reopen button with confirm; tooltip "Closed by <its> on <date>" |
| `src/app/r/[slug]/done/DoneClient.tsx` | changed | `v.status === "open"` for **Edit answers** |
| `USER-GUIDE.md`, `README.md` | changed | how admins close and reopen |
| `e2e/admin.spec.ts` | changed | close, check sign-in page says closed, reopen |

## Steps
- [ ] 1. Write the failing tests in `control.test.ts`:
  - `getAdminClose("sample-rsvp")` with no row → `{ closed: false, by: null, at: null }`.
  - after `setAdminClose("sample-rsvp", true, "30000001")` → `closed: true, by: "30000001"`, `at` an ISO string; one row with `kind: "control"`.
  - `rsvpStatus(sample, 2027-01-01)` → `"open"`; after close → `"closed"`; after reopen → `"open"`; closed with `now` 2025-06-01 → `"upcoming"`.
  - `signInHousehold` on an admin-closed form → 403 "This RSVP is closed"; `saveHousehold` via `"household"` → 403; via `"admin"` → saves.
  - `getFormStats` after close → `status "closed"`, `adminClosed.by "30000001"`, `invitedMembers` unchanged (the control row isn't counted).
- [ ] 2. `npm test -- control` → FAIL (module missing).
- [ ] 3. Implement as in Interfaces. Route: `requireAdmin`, `formOr404`, zod `{ closed: z.boolean() }`, `setAdminClose(slug, closed, String(admin.itsId))`.
- [ ] 4. `npm test`, `npm run lint`, `npm run build`, `npm run e2e` → PASS.
- [ ] 5. Commit: `feat: admins can close and reopen an RSVP`.

## Manual test
On `aem-dev`, the request's section 5.

## Open questions
1. **(blocks build)** Store the switch as a `kind: "control"` row in `rsvp_entry`? Recommended: yes.
2. Should closing also sign out households already on the form? Recommended: no. Their Submit is refused with "This RSVP is closed".

## Out of scope
Scheduled closes from the admin pages, opening before `opensAt`, close/reopen history.
