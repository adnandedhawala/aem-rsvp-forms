# 3-01 Household sign-in

Status: Planned · 6 Nov 2026
Kind: new · Spec: 5 step 1, 3 (`signIn`) · Depends on: 1-01, 2-01

## Decide
- Adds `signInHousehold` plus two public routes:
  - `GET /api/v1/rsvp/[slug]` returns the form's public info;
  - `POST /api/v1/rsvp/[slug]/sign-in` checks file no + ITS and sets the 30-minute household cookie.
- Which ITS is accepted comes from the form's `signIn` block (`hof` / `member` / `either`, plus `mustBeInvited`).
- **Every failure gives the same message**, "File number and ITS don't match", so file numbers can't be probed.
- Limited to 10 tries per IP + file no per 15 minutes (in memory per server, spec 10).
- No blocking questions.

## Builder context
- Spec 5 step 1. Spec 3: `signIn` bullet. `File._id` is the HOF's ITS.

## Interfaces
- **Consumes:** `getForm`, `formStatus`, `FormDef` (1-01); `File`, `RsvpEntry` (0-03); `HouseholdClaims`, `signHouseholdToken`, `HOUSEHOLD_COOKIE`, `cookieOptions`, `createRateLimiter` (2-01); `HttpError`, `json`, `withRoute` (0-04).
- **Produces** (`src/server/services/households.ts`, first function):
  - `signInHousehold(input: { form: FormDef; fileNo: number; its: string; now?: Date }): Promise<HouseholdClaims>`.
  - Checks, in order:
    1. `formStatus(form, now) !== "open"` → `HttpError(403, "This RSVP is not open")`.
    2. `File.findOne({ tanzeem_file_no: fileNo })`.
    3. At least one `RsvpEntry` with `{ rsvp: form.slug, kind: "member", file_id: file._id, is_removed: false }`.
    4. The ITS rule: `hof` → `its === file._id`; `member` → `file.member_ids.includes(its)`; `either` → either one.
    5. If `mustBeInvited`, a non-removed member entry with `member_id === its`.

    **Any failure in steps 2–5** throws `HttpError(401, "File number and ITS don't match")`.
  - Returns `{ slug, fileId: file._id, fileNo, signedInIts: its }`.
- **Routes:**
  - `GET /api/v1/rsvp/[slug]` returns `{ slug, title, description, opensAt, closesAt, status, signInIts }`. An unknown slug gives 404 `{ error: "RSVP not found" }`.
  - `POST /api/v1/rsvp/[slug]/sign-in`:
    - body `{ fileNo: number | string, its: string }`, with Zod coercing `fileNo` to an int and trimming `its`;
    - a module-level `createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })`, keyed `${ip}:${fileNo}`, with `ip` = the first `x-forwarded-for` value or `"unknown"`. Over the limit it returns 429 `{ error: "Too many attempts, please wait 15 minutes" }`;
    - on success it sets `rsvp_household` (30 min) and returns `{ ok: true }`.
  - `params` is `Promise<{ slug: string }>`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/services/households.ts` | new | `signInHousehold` |
| `src/app/api/v1/rsvp/[slug]/route.ts` | new | GET |
| `src/app/api/v1/rsvp/[slug]/sign-in/route.ts` | new | POST |
| `src/server/services/signIn.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests. Setup: test DB, `seedBasic`, and `invite("sample-rsvp", ["10000001","10000002"])`. Build forms in the test with `defineForm({ ...sampleInput, signIn: <variant> })` and use `now = new Date("2027-01-01")`.
  - `either`: file 101 with `10000003` (in the file, not invited) returns `{ fileId: "10000001", fileNo: 101, signedInIts: "10000003" }`.
  - `hof`: `10000002` gives 401 and `10000001` succeeds.
  - `member` + `mustBeInvited: true`: `10000003` gives 401 and `10000002` succeeds.
  - File 101 with ITS `20000001` (from file 202) gives 401 with message `"File number and ITS don't match"`.
  - File 202 (no invitees) with `20000001` gives 401; file 999 gives 401.
  - `now = new Date("2031-01-01")` gives 403 `"This RSVP is not open"`.
  - Mark both invitees `is_removed: true`: file 101 with `10000001` gives 401.
- [ ] 2. Run `npx vitest run src/server/services/signIn.test.ts`. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run the tests (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: household sign-in`.

## Manual test
1. On `aem-dev`, insert one member entry by hand for a real file (mongosh: `db.rsvp_entry.insertOne({ rsvp: "sample-rsvp", kind: "member", file_id: "<HOF ITS>", tanzeem_file_no: <file no>, member_id: "<a member ITS>", invited_by: null, is_removed: false, data: null, submitted_by_its: null, submitted_via: null, submitted_at: null, createdAt: new Date(), updatedAt: new Date() })`).
2. `POST /api/v1/rsvp/sample-rsvp/sign-in` with that file no + HOF ITS returns 200 and sets the cookie. With a wrong ITS it returns 401.
3. Delete the test entry afterwards (or keep it for 3-02).

## Open questions
None.

## Out of scope
Reading or saving answers (3-02). The sign-in page (5-03).
