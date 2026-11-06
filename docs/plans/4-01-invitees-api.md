# 4-01 Invitees API

Status: Planned · 6 Nov 2026
Kind: new · Spec: 4.3 · Depends on: 3-02

## Decide
- **Check rows:** validates the grid or upload rows (file no + ITS) against `file`/`member`. Each row gets a reason, or the member details.
- **Add:** a **merge**. New members are inserted, removed ones are restored with their answers intact, and existing ones are left alone. Nothing is ever deleted and re-inserted, unlike `distribution`.
- **Remove:** a soft remove (`is_removed: true`); answers are kept but hidden. The reply says how many removed members had answered.
- **List:** the current invited members with names, sector and answered yes/no.
- A batch is at most 5000 rows.
- No blocking questions.

## Builder context
- Spec 4.3. The `zmq` "Add Mumin" row checks, for reference: `/Users/adnan/Documents/GitHub/aem/zmq/zmq-fe/src/pages/event/components/modals/addMuminModal/utils.ts`.

## Interfaces
- **Consumes:** `getForm` (1-01); `File`, `Member`, `RsvpEntry` (0-03); `requireAdmin` (2-01); `HttpError`, `json`, `withRoute` (0-04).
- **Produces** (`src/server/services/invitees.ts`):
  ```ts
  interface InviteeRowInput { fileNo: string; its: string; }
  interface InviteeRowResult extends InviteeRowInput { ok: boolean; error?: string;
    full_name?: string; age?: number; gender?: string; hofName?: string;
    sector?: string; subsector?: string; alreadyInvited?: boolean; }
  validateInviteeRows(slug: string, rows: InviteeRowInput[]): Promise<InviteeRowResult[]>;
  addInvitees(slug: string, rows: InviteeRowInput[], adminIts: string): Promise<{ added: number; restored: number; unchanged: number }>;
  removeInvitees(slug: string, memberIds: string[]): Promise<{ removed: number; hadAnswers: number }>;
  interface InviteeListRow { its: string; fileNo: number; full_name: string; hofName: string;
    sector: string | null; subsector: string | null; answered: boolean; createdAt: string; }
  listInvitees(slug: string): Promise<InviteeListRow[]>;   // non-removed; sorted by fileNo, then HOF first
  ```
- **Row rules**: trim both values first, and drop rows where both are empty. The first rule that fails wins:
  1. `fileNo` isn't all digits → `"File no must be a number"`
  2. `its` isn't exactly 8 digits → `"ITS must be 8 digits"`
  3. no file → `"File not found"`
  4. no member → `"ITS not found"`
  5. ITS not in `file.member_ids` → `"ITS is not in this file"`
  6. the ITS appeared earlier in the batch → `"Duplicate row"`

  `alreadyInvited` (a non-removed entry exists) is informational only; the row stays ok. Look things up in bulk (`$in`), not per row.
- **`addInvitees`** re-runs the checks. Any bad row gives `HttpError(422, "Some rows have errors", results)` and **nothing is written**. Otherwise, per row:
  - no entry yet → insert `{ kind: "member", file_id, tanzeem_file_no, member_id, invited_by: adminIts }` and count `added`;
  - `is_removed: true` → set it to `false` and count `restored` (`data` untouched);
  - otherwise → count `unchanged`.
- **Routes:** all use `requireAdmin`, and an unknown slug gives 404.
  - `POST /api/v1/admin/rsvp/[slug]/invitees/validate`, body `{ rows }`, returns `{ rows: InviteeRowResult[] }`.
  - `POST /api/v1/admin/rsvp/[slug]/invitees`, body `{ rows }`, returns `{ added, restored, unchanged }`.
  - `DELETE /api/v1/admin/rsvp/[slug]/invitees`, body `{ memberIds: string[] }`, returns `{ removed, hadAnswers }`.
  - `GET /api/v1/admin/rsvp/[slug]/invitees` returns `{ rows: InviteeListRow[] }`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/services/invitees.ts` | new | above |
| `src/app/api/v1/admin/rsvp/[slug]/invitees/route.ts` | new | GET, POST, DELETE |
| `src/app/api/v1/admin/rsvp/[slug]/invitees/validate/route.ts` | new | POST |
| `src/server/services/invitees.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests (test DB, `seedBasic`):
  - `validateInviteeRows` on `[{"101","10000002"}, {"101","20000001"}, {"999","10000001"}, {"101","1234"}, {" 101 ","10000002 "}, {"",""}, {"10a","10000001"}]` returns 6 results. Their outcomes in order: ok; `"ITS is not in this file"`; `"File not found"`; `"ITS must be 8 digits"`; `"Duplicate row"`; `"File no must be a number"`. The first includes `full_name`, `hofName: "Hof A"` and `sector: "Sector One"`.
  - `addInvitees` with one bad row gives 422, and `RsvpEntry.countDocuments() === 0`.
  - **Merge keeps answers:**
    1. `addInvitees` for `10000001` and `10000002`;
    2. `saveHousehold` (3-02) answers for both;
    3. `removeInvitees(["10000002"])`;
    4. `addInvitees` for `10000001`, `10000002` and `10000003`.

    This returns `{ added: 1, restored: 1, unchanged: 1 }`, and both earlier `data` values are unchanged.
  - `removeInvitees(["10000001"])` after an answer returns `{ removed: 1, hadAnswers: 1 }`, and `listInvitees` no longer includes it.
  - `validateInviteeRows` after an invite marks that row `alreadyInvited: true`, `ok: true`.
  - `listInvitees` sorts by file no, puts the HOF first, and sets `answered` correctly.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: invitee validation, merge add, soft remove, list`.

## Manual test
1. With an admin cookie on `aem-dev`, `POST .../invitees/validate` with two real rows and one wrong ITS shows two ok rows with names, and one error.
2. `POST .../invitees` with the good rows returns `added: 2`; posting again returns `unchanged: 2`.
3. `GET .../invitees` lists them.

## Open questions
None.

## Out of scope
The grid page and Excel parsing (6-02).
