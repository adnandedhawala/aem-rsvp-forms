# 6-03 Responses page and admin household edit

Status: Built · 6 Nov 2026
Kind: new · Spec: 4.4 · Depends on: 3-02, 4-02, 5-02, 6-01

## Decide
- The **Responses** grid has one row per invited member:
  - fixed member and file columns, then one column per form field (header = label), then the household fields, then submitted at / by / via;
  - filters for status, sector, sub-sector and any column;
  - a "Per file" toggle that groups rows by file;
  - **Download Excel** of the current filtered view.
- **Summary** at the top: for each radio or select member field, counts per option, split by gender. They're worked out in the browser from the rows (no extra API).
- Each row has **"Open form"**, which goes to the admin household edit page. That page is the same form as the family's, in admin mode, and saving works even after close.
- No blocking questions.

## Builder context
- Spec 4.4.

## Interfaces
- **Consumes:**
  - `AdminShell`, `DataGrid` (6-01) and `api`, `ApiError` (5-01);
  - `HouseholdForm` (5-02);
  - `GET /api/v1/admin/rsvp/[slug]/responses` returning `{ fields: { household: PublicFieldDef[]; member: PublicFieldDef[] }, rows: ResponseRow[] }` (4-02);
  - `GET / PUT /api/v1/admin/rsvp/[slug]/household/[fileNo]` (3-02);
  - the types `ResponseRow`, `HouseholdView`, `HouseholdPayload`, imported type-only.
- **Produces:** `src/lib/summary.ts`, `summarise(rows: ResponseRow[], fields: PublicFieldDef[]): { field: string; label: string; options: { option: string; Male: number; Female: number; Total: number }[] }[]`. Only `radio`/`select` fields are summarised, and only rows with status `Answered` are counted. A missing gender counts in `Total` only.

## Files
| File | New / changed | What |
|---|---|---|
| `src/lib/summary.ts`, `src/lib/summary.test.ts` | new | above + tests |
| `src/app/admin/r/[slug]/responses/page.tsx` + `ResponsesClient.tsx` | new | details below |
| `src/app/admin/r/[slug]/household/[fileNo]/page.tsx` + `AdminHouseholdClient.tsx` | new | details below |

**ResponsesClient** (`AdminShell` title "Responses: <title>"):
- **Summary:** a row of small antd `Card`s, one per summarised field: a table of option / Male / Female / Total. Above them, "Answered X of Y members · X of Y files".
- **Grid columns:**
  - pinned left: File No, HOF, ITS, Name;
  - then Age, Gender, Sector (set filter), Sub-sector (set filter), Status (set filter);
  - one per member field (`colId: "m_<name>"`, `valueGetter: row.answers[name]`, `headerName: label`, arrays joined with ", ", booleans as Yes/No);
  - one per household field (`colId: "h_<name>"`, `headerName: "Household: <label>"`);
  - Submitted at, Updated at, By ITS, Via (`household` / `admin`);
  - an "Open form" cell rendering `<Link prefetch={false} href={`/admin/r/${slug}/household/${fileNo}`}>`.
- **Toolbar:** a search box (`quickFilterText`); a **Per file** switch (on → `rowGroup: true` on File No, groups open by default; off → flat); **Download Excel** (`exportDataAsExcel({ fileName: "<slug>-responses.xlsx", processCellCallback })`, so the exported values match the displayed ones).

**AdminHouseholdClient:**
- `AdminShell` title "File <fileNo>: <hofName>", breadcrumbs RSVPs → title → Responses.
- GET the household; a 404 shows the message with a link back.
- `<HouseholdForm mode="admin">`. PUT: 422 → `serverErrors`; success → `message.success("Saved")`, then `router.push` to Responses.

## Steps
- [ ] 1. Write the failing tests for `summarise`. Use rows: 2 Answered Male "Yes", 1 Answered Female "No", 1 Answered with no gender "Yes", 1 Pending Male. Fields are the sample member fields, made public.
  - The result has 2 entries, `attending` (radio) and `days` (select), in field order.
  - For `attending`, the `Yes` row is `{ Male: 2, Female: 0, Total: 3 }` and the `No` row is `{ Male: 0, Female: 1, Total: 1 }`.
  - The Pending row isn't counted.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement `summarise`, then both pages per Files.
- [ ] 4. Run the tests (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Do the manual test below.
- [ ] 6. Commit: `feat: responses grid with summary and export; admin household edit`.

## Manual test
On `aem-dev`, as Admin, after 5-03 and 6-02's manual tests:
1. `/admin/r/sample-rsvp/responses`: the answered members show their answers and the others show Pending. The counts match.
2. Filter Status = Pending, then **Download Excel**: the file holds only Pending rows, with label headers.
3. Switch **Per file** on: rows are grouped by file no.
4. **Open form** on a Pending member's file: the form opens with "Editing as admin". Fill it in and save. Back in the grid the row is Answered and Via = admin.
5. Temporarily set `closesAt` in `forms/sample-rsvp.ts` to a past date and restart dev. The household sign-in says Closed, but admin save still works. Revert the date.

## Open questions
None.

## Out of scope
Charts. Edit history.
