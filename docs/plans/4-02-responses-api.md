# 4-02 Responses and RSVP stats API

Status: Built · 6 Nov 2026
Kind: new · Spec: 4.2, 4.4 · Depends on: 4-01

## Decide
- `GET /api/v1/admin/rsvp` returns every form in `forms/` with its status and counts (files and members invited and answered).
- `GET /api/v1/admin/rsvp/[slug]/responses` returns:
  - one row per non-removed invited member: member and file details, status Pending/Answered, and the answers keyed by field `name`;
  - the household answers, repeated on each row of that file;
  - the field list (without `visibleIf`) so the grid can build its columns.
- Joins use one query per collection, not one per row.
- No blocking questions.

## Builder context
- Spec 4.2, 4.4.

## Interfaces
- **Consumes:** `listForms`, `getForm`, `formStatus`, `FormStatus`, `toPublicFields`, `PublicFieldDef`, `Answers` (1-01); `File`, `Member`, `RsvpEntry` (0-03); `requireAdmin` (2-01); `json`, `withRoute` (0-04).
- **Produces** (`src/server/services/responses.ts`):
  ```ts
  interface ResponseRow { fileNo: number; hofName: string; sector: string | null; subsector: string | null;
    its: string; full_name: string; age?: number; gender?: string;
    status: "Pending" | "Answered"; answers: Answers; household: Answers;
    submitted_at: string | null; updated_at: string | null; submitted_by_its: string | null;
    submitted_via: "household" | "admin" | null; }
  listResponses(form: FormDef): Promise<ResponseRow[]>;   // sorted by fileNo, HOF first
  interface FormStats { slug: string; title: string; status: FormStatus; opensAt: string; closesAt: string;
    invitedMembers: number; invitedFiles: number; answeredMembers: number; answeredFiles: number; }
  getFormStats(form: FormDef): Promise<FormStats>;
  ```
  Counts include non-removed entries only. A file counts as answered if any of its member entries has `data`. `updated_at` comes from the entry's `updatedAt`, and only once it has `data`.
- **Routes** (`requireAdmin`):
  - `GET /api/v1/admin/rsvp` returns `{ forms: FormStats[] }`.
  - `GET /api/v1/admin/rsvp/[slug]/responses` returns `{ fields: { household: PublicFieldDef[]; member: PublicFieldDef[] }, rows: ResponseRow[] }`. An unknown slug gives 404.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/services/responses.ts` | new | above |
| `src/app/api/v1/admin/rsvp/route.ts` | new | GET |
| `src/app/api/v1/admin/rsvp/[slug]/responses/route.ts` | new | GET |
| `src/server/services/responses.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests. Setup: `seedBasic`; invite `10000001`, `10000002` and `20000001`; save the file 101 household with `10000001: { attending: "Yes", days: "All" }`, `10000002: { attending: "No" }` and `household: { mehmaan_count: 2 }`.
  - `listResponses` returns 3 rows, with file 101's HOF first.
    - `10000001` has `status: "Answered"`, `answers.days === "All"` and `household.mehmaan_count === 2`;
    - `10000002` also has `household.mehmaan_count === 2`;
    - `20000001` has `status: "Pending"`, `answers: {}` and `household: {}`.
  - After `removeInvitees(["20000001"])`, `listResponses` has 2 rows.
  - `getFormStats` before removal returns `{ invitedMembers: 3, invitedFiles: 2, answeredMembers: 2, answeredFiles: 1, status: "open" }` (with `now` in the window).
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: responses and RSVP stats API`.

## Manual test
1. With an admin cookie on `aem-dev`, `GET /api/v1/admin/rsvp` shows `sample-rsvp` with the counts from 4-01's test rows.
2. `GET .../sample-rsvp/responses` shows those rows, Pending or Answered.

## Open questions
None.

## Out of scope
The responses grid page (6-03).
