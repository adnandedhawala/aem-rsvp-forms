# 6-01 Admin shell, login page, RSVP list

Status: Planned · 6 Nov 2026
Kind: new · Spec: 4.1, 4.2 · Depends on: 2-01, 4-02, 5-01

## Decide
- Sets up AG Grid once (community + enterprise modules, optional licence key, Quartz theme), as `zmq-fe` does.
- `/admin/login` takes ITS or email + password; after login it goes to `?next=` or `/admin`.
- Every admin page sits in `AdminShell`: a top bar with "AEM RSVP Admin", the admin's name, and Logout.
- `/admin` lists every RSVP with its status, dates and counts, linking to Invitees and Responses.
- No blocking questions.

## Builder context
- Spec 4.1, 4.2. Grid wrapper for reference: `/Users/adnan/Documents/GitHub/aem/zmq/zmq-fe/src/components/dataGrid.tsx`.

## Interfaces
- **Consumes:** `api`, `ApiError`, `Logo` (5-01); `POST /api/v1/admin/login`, `POST /api/v1/admin/logout`, `GET /api/v1/admin/verify` (2-01); `GET /api/v1/admin/rsvp` returning `{ forms: FormStats[] }` (4-02, type-only import).
- **Produces:**
  - `src/components/admin/grid.ts` (client): `registerGrid()`, which runs once. It calls `ModuleRegistry.registerModules([AllCommunityModule, ClipboardModule, ExcelExportModule, SetFilterModule, RowGroupingModule])` and, when `process.env.NEXT_PUBLIC_AG_GRID_LICENSE` is set, `LicenseManager.setLicenseKey(...)`. It also exports `gridTheme = themeQuartz`.
  - `src/components/admin/DataGrid.tsx` (client): `<DataGrid<T> {...AgGridReactProps<T>} />`, which calls `registerGrid()`, sets `theme={gridTheme}` and fills its parent's height.
  - `src/components/admin/AdminShell.tsx` (client): `AdminShell({ title, breadcrumbs?: { label: string; href?: string }[], actions?: ReactNode, children })`. It loads `GET /api/v1/admin/verify` (a 401 goes to `/admin/login`), shows the name and Logout (POST logout, then `/admin/login`), and renders breadcrumbs with `<Link prefetch={false}>`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/components/admin/{grid.ts,DataGrid.tsx,AdminShell.tsx}` | new | above |
| `src/app/admin/login/page.tsx` + `LoginClient.tsx` | new | centred card: Logo, "Admin sign in", "ITS or email" and "Password" fields, "Sign in". Mutation POSTs to login; success → `router.replace(searchParams.get("next") ?? "/admin")`; error → `Alert` with the message ("Invalid credentials" / "Not an admin") |
| `src/app/admin/page.tsx` + `RsvpListClient.tsx` | new | `AdminShell title="RSVPs"`; antd `Table` of `forms`, columns: Title, Status (`Tag`: upcoming = blue, open = green, closed = default), Opens, Closes (formatted `DD MMM YYYY, HH:mm`), Invited (`files / members`), Answered (`files / members`), Actions: "Invitees" → `/admin/r/<slug>/invitees`, "Responses" → `/admin/r/<slug>/responses` |

## Steps
- [ ] 1. Build per Files. There are no unit tests; the login behaviour is tested in 2-01 and the pages in 7-01.
- [ ] 2. Run `npm run lint`, `npm test` and `npm run build`. Expected: clean.
- [ ] 3. Do the manual test below.
- [ ] 4. Commit: `feat: admin shell, login page, RSVP list`.

## Manual test
On `aem-dev`:
1. `/admin` → redirected to `/admin/login?next=%2Fadmin`.
2. Wrong password → "Invalid credentials". A non-Admin user → "Not an admin".
3. A real Admin → the RSVP list with "Sample RSVP", status open, and counts matching what 4-01/5-03 created.
4. Logout → back to login; `/admin` redirects again.

## Open questions
None.

## Out of scope
Invitees page (6-02). Responses page (6-03).
