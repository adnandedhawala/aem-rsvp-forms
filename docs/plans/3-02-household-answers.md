# 3-02 Household answers: read and save (household + admin)

Status: Built · 6 Nov 2026
Kind: new · Spec: 5 step 2, 4.4 (admin edit), 6 (two kinds of entry, transaction) · Depends on: 3-01

## Decide
- `getHousehold` returns the file, its **non-removed invited** members (HOF first) and earlier answers.
- `saveHousehold` checks **every** card with `validateAnswers`, then writes everything in **one MongoDB transaction**. Any error means nothing is saved.
- The members in a submission must be **exactly** the file's invited members. A non-invited, removed or other-file ITS is refused.
- Household answers go in one `kind: "household"` entry per file (created on first save).
- Admin routes use the same service with `via: "admin"`, which works after close.
- No blocking questions.

## Builder context
- Spec 5 step 2, 4.4 (admin edit bullets), 6 (`rsvp_entry` shape, transaction bullet).

## Interfaces
- **Consumes:** `signInHousehold`'s file (3-01); `validateAnswers`, `FormDef`, `Answers`, `formStatus`, `getForm` (1-01); `File`, `Member`, `RsvpEntry` (0-03); `requireHousehold`, `requireAdmin`, `AdminClaims` (2-01); `HttpError`, `json`, `withRoute` (0-04).
- **Produces** (added to `src/server/services/households.ts`):
  ```ts
  interface HouseholdMember { its: string; full_name: string; age?: number; gender?: string;
    mobile?: string; hof_fm_type?: string; data: Answers | null; submitted_at: string | null; }
  interface HouseholdView { slug: string; fileId: string; fileNo: number; hofName: string;
    sector: string | null; subsector: string | null;
    household: { data: Answers | null; submitted_at: string | null } | null; // null when the form has no householdFields
    members: HouseholdMember[];   // non-removed invited; HOF first, then file.member_ids order
    lastSavedAt: string | null; } // latest submitted_at across the file's entries
  interface HouseholdPayload { household?: Answers; members: Record<string, Answers>; }
  getHousehold(input: { form: FormDef; fileId: string }): Promise<HouseholdView>;
  getHouseholdByFileNo(input: { form: FormDef; fileNo: number }): Promise<HouseholdView>; // 404 "File not found" / 404 "No one from this file is invited"
  saveHousehold(input: { form: FormDef; fileId: string; payload: HouseholdPayload;
    by: string; via: "household" | "admin"; now?: Date }): Promise<HouseholdView>;
  ```
- **`saveHousehold` rules, in order:**
  1. If `via === "household"` and the form isn't open: `HttpError(403, "This RSVP is closed")`.
  2. Load the non-removed invited ids for the file. An extra id in `payload.members` gives `HttpError(422, "Unknown member in submission", { members: { [id]: { _form: "Not invited" } } })`. A missing id gives 422 `"Answers missing"`, with `_form: "Answers missing"` on that id.
  3. Validate each member against `form.memberFields`, and the household against `form.householdFields` (only when there are any). Any error gives `HttpError(422, "Please fix the highlighted fields", { household?: errors, members: { [its]: errors } })`.
  4. In `session.withTransaction`:
     - `updateOne` each member entry with `$set { data, submitted_by_its: by, submitted_via: via, submitted_at: now }`;
     - when there are `householdFields`, upsert `{ rsvp, kind: "household", file_id, member_id: null }` with the same `$set`, plus `$setOnInsert { tanzeem_file_no, invited_by: null, is_removed: false }`.
  5. Return `getHousehold(...)`.
- **Routes** (body Zod: `{ household: z.record(z.string(), z.unknown()).optional(), members: z.record(z.string(), z.record(z.string(), z.unknown())) }`; an unknown slug gives 404):
  - `GET / PUT /api/v1/rsvp/[slug]/household`: `requireHousehold(req, slug)`, then `fileId` from the claims. PUT uses `by: claims.signedInIts, via: "household"`.
  - `GET / PUT /api/v1/admin/rsvp/[slug]/household/[fileNo]`: `requireAdmin` and `getHouseholdByFileNo`. PUT uses `fileId` from that view, `by: String(admin.itsId), via: "admin"`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/services/households.ts` | changed | add the above |
| `src/app/api/v1/rsvp/[slug]/household/route.ts` | new | GET, PUT |
| `src/app/api/v1/admin/rsvp/[slug]/household/[fileNo]/route.ts` | new | GET, PUT |
| `src/server/services/households.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests. Setup: sample form, `invite("sample-rsvp", ["10000001","10000002","10000003"])`, then mark `10000003` removed; `now = 2027-01-01`.
  - **Read:** `getHousehold` returns 2 members with `10000001` first, `data: null`, `household: { data: null, submitted_at: null }`, `hofName: "Hof A"` and `sector: "Sector One"`.
  - **Valid save:** `members: { "10000001": { attending: "Yes", days: "All" }, "10000002": { attending: "No" } }` with `household: { mehmaan_count: 2 }`.
    - `getHousehold` then shows `10000002.data` deep-equal to `{ attending: "No", needs_wheelchair: false }`;
    - the entry has `submitted_via: "household"`;
    - `RsvpEntry.countDocuments({ kind: "household" }) === 1`.
  - **Removed member:** a payload that includes `"10000003"` gives 422 `"Unknown member in submission"`, and **both** entries for `10000001` and `10000002` still have `data === null`.
  - A payload that includes `"20000001"` gives 422.
  - A payload missing `"10000002"` gives 422 `"Answers missing"`.
  - **Invalid member:** `10000002: { attending: "Yes" }` gives 422 with `details.members["10000002"].days` defined, and `10000001` is **not** saved.
  - A forged key `{ attending: "No", is_admin: true }` stores no `is_admin`.
  - **Closed form** (`now = 2031-01-01`): `via: "household"` gives 403; `via: "admin", by: "30000001"` succeeds, and the entry has `submitted_via: "admin"` and `submitted_by_its: "30000001"`.
  - Saving twice overwrites `data`, keeps one household entry, and updates `lastSavedAt`.
  - `getHouseholdByFileNo({ fileNo: 202 })` (no invitees) gives 404, and `fileNo: 999` gives 404.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: household read and transactional save; admin household edit API`.

## Manual test
1. On `aem-dev`, using the entry from 3-01's manual test: sign in (cookie), then `GET /api/v1/rsvp/sample-rsvp/household` shows the member.
2. `PUT` with valid answers returns 200; `GET` again shows them.
3. As admin (cookie from 2-01), `GET /api/v1/admin/rsvp/sample-rsvp/household/<file no>` shows the same answers.

## Open questions
None.

## Out of scope
Inviting members (4-01). Pages (5-03, 6-03).
