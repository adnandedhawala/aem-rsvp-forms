# 6-02 Invitees page (grid, paste, Excel upload)

Status: Planned · 6 Nov 2026
Kind: new · Spec: 4.3 · Depends on: 4-01, 6-01

## Decide
- **Top:** an editable grid like `zmq`'s "Add Mumin", with 100 blank rows, "Add 100 rows", and paste from Excel. Or **Upload Excel/CSV**, which fills the same grid for checking.
- **Check rows:** red rows with the reason; good rows show name, HOF, sector. **Save** is only possible once every row checks out.
- **Bottom:** the current invited list, with "Remove selected" (warns how many already answered) and "Download Excel".
- Excel headers are matched loosely: `File No` / `file_no` / `Tanzeem File No` and `ITS` / `its_id`.
- No blocking questions.

## Builder context
- Spec 4.3. Reference: `/Users/adnan/Documents/GitHub/aem/zmq/zmq-fe/src/pages/event/components/modals/addMuminModal/` (`index.tsx`, `grid/useGridConfig.tsx`).

## Interfaces
- **Consumes:** `AdminShell`, `DataGrid` (6-01); `api`, `ApiError` (5-01); the invitees routes and the types `InviteeRowInput`, `InviteeRowResult`, `InviteeListRow` (4-01, type-only import).
- **Produces:** `src/lib/inviteeSheet.ts`, `parseInviteeSheet(data: ArrayBuffer): InviteeRowInput[]`:
  - reads the first sheet with `XLSX.read(data, { type: "array" })` and `sheet_to_json(sheet, { defval: "" })`;
  - matches headers case-insensitively after removing spaces, `_` and `.`: `fileno`, `filenumber` or `tanzeemfileno` → `fileNo`; `its` or `itsid` → `its`;
  - values become `String(v).trim()`, and rows with both values empty are dropped;
  - a missing column throws `Error("Sheet needs File No and ITS columns")`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/lib/inviteeSheet.ts` | new | above |
| `src/lib/inviteeSheet.test.ts` | new | tests below |
| `src/app/admin/r/[slug]/invitees/page.tsx` + `InviteesClient.tsx` | new | details below |

**InviteesClient** (`AdminShell` title "Invitees: <form title>", breadcrumbs RSVPs → title):
- **Add section:**
  - `DataGrid` with editable columns **File No** and **ITS**, and read-only Name, HOF, Sector, Sub-sector, Status (from the check). Row ids come from a uuid per row.
  - It starts with 100 blank rows. Buttons: "Add 100 rows", "Upload Excel/CSV" (antd `Upload`, `accept=".xlsx,.xls,.csv"`, `beforeUpload` reads the file with `parseInviteeSheet` into the grid rows and returns `false`), "Clear", "Check rows", "Save".
  - **Check rows** sends the non-empty rows to `POST .../invitees/validate` and merges the results in.
    - Error rows get the `bg-red-50` row class and the error in Status.
    - `alreadyInvited` rows show "Already invited" in grey; other ok rows show "OK".
  - Any edit clears the check results, so **Save** is disabled until a fresh check comes back with no errors.
  - **Save** POSTs `{ rows }` and shows a message ("Added N, restored N, already there N"), then clears the grid and refetches the list.
- **Invited list section:**
  - A `DataGrid` of `GET .../invitees` with checkbox selection. Columns: File No, ITS, Name, HOF, Sector, Sub-sector, Answered (Yes/No), Added on.
  - A search box (`quickFilterText`) and a count.
  - **Remove selected** opens `Modal.confirm`: "Remove N members? M of them already answered; their answers are kept but hidden." On OK it DELETEs `{ memberIds }`, shows the result and refetches.
  - **Download Excel** calls `gridApi.exportDataAsExcel({ fileName: "<slug>-invitees.xlsx" })`.

## Steps
- [ ] 1. Write the failing tests for `parseInviteeSheet`. Build workbooks in the test with `XLSX.utils.aoa_to_sheet` and `XLSX.write(wb, { type: "array", bookType: "xlsx" })`.
  - Headers `["File No", "ITS"]` with rows `[[101, 10000001], ["", ""], [" 101 ", "10000002 "]]` give `[{ fileNo: "101", its: "10000001" }, { fileNo: "101", its: "10000002" }]`.
  - Headers `["file_no", "its_id"]` work; so do `["Tanzeem File No.", "ITS"]`.
  - Headers `["Name", "ITS"]` throw `"Sheet needs File No and ITS columns"`.
  - A CSV (`bookType: "csv"`) with the same data gives the same result.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement `parseInviteeSheet`, then the page per Files.
- [ ] 4. Run the tests (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Do the manual test below.
- [ ] 6. Commit: `feat: invitees page with grid, paste, Excel upload and remove`.

## Manual test
On `aem-dev`, as Admin, at `/admin/r/sample-rsvp/invitees`:
1. Paste 3 rows from a spreadsheet (one real file: HOF + 2 members), plus one row with a wrong ITS. **Check rows**: 3 OK and 1 red with its reason. **Save** stays disabled.
2. Fix or delete the red row, check again, then **Save**: "Added 3…". The list shows 3.
3. Upload the same rows as `.xlsx`, then **Check**: they show "Already invited". **Save**: "already there 3".
4. Answer as that household (`/r/sample-rsvp`), then remove one member here. The dialog says 1 already answered, and the list drops it.
5. **Download Excel** opens in Excel with the list.

## Open questions
None.

## Out of scope
Responses page (6-03).
