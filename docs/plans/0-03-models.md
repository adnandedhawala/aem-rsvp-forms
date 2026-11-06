# 0-03 Models, test database, index script

Status: Planned · 6 Nov 2026
Kind: new · Spec: 6 (data model) · Depends on: 0-02

## Decide
- Copies the AEM models (`Member`, `File`, `Sector`, `Subsector`, `User`) **verbatim** from `aem-shared`: same fields, same collection names. Only Mongoose 9 typing changes.
- Adds the one new model, `RsvpEntry` (collection `rsvp_entry`), with `kind: "member" | "household"`.
- Adds the test database helper (memory replica set + `seedBasic`) that every later service test uses.
- Adds `npm run db:indexes`, which refuses `aem-prod` unless run with `--prod`.
- No blocking questions.

## Builder context
- Spec 6: the model table and the `rsvp_entry` shape.
- Copy from `/Users/adnan/Documents/GitHub/aem/aem-shared/src/models/{member,file,sector,subsector,user}.ts` and their enums/types in `aem-shared/src/types` and `src/enums`. Keep `File.sub_sector` (the schema name, not the interface's `subsector`) and `User.itsId: Number`.
- Dev plan §3: the `seedBasic` table.

## Interfaces
- **Consumes:** `assertDbAllowed` (0-02).
- **Produces:**
  - From `src/server/models/index.ts`: `Member`, `File`, `Sector`, `Subsector`, `User`, `RsvpEntry`, and the types `IMember`, `IFile`, `IUser`, `IRsvpEntry`. Each model uses the `mongoose.models.X || model(...)` guard.
  - `IRsvpEntry`:
    ```ts
    { rsvp: string; kind: "member" | "household"; file_id: string; tanzeem_file_no: number;
      member_id: string | null; invited_by: string | null; is_removed: boolean;
      data: Record<string, unknown> | null; submitted_by_its: string | null;
      submitted_via: "household" | "admin" | null; submitted_at: Date | null;
      createdAt: Date; updatedAt: Date }
    ```
    Schema: `timestamps: true`; `data` is `Mixed`, default `null`; `is_removed` defaults to `false`; `member_id`, `invited_by` and the `submitted_*` fields default to `null`.
  - Indexes: unique `{ rsvp: 1, kind: 1, file_id: 1, member_id: 1 }`, and `{ rsvp: 1, tanzeem_file_no: 1 }`.
  - From `tests/helpers/db.ts`:
    - `startTestDb(opts?: { uri?: string }): Promise<string>`: starts a 1-node `MongoMemoryReplSet` (transactions need a replica set), unless `uri` is given. It connects mongoose with `dbName: "aem-dev"`, runs `RsvpEntry.syncIndexes()` and returns the URI.
    - `stopTestDb(): Promise<void>`
    - `clearDb(): Promise<void>`: deletes all docs in every model.
    - `seedBasic(): Promise<void>`: inserts the dev plan §3 fixtures.
    - `invite(slug: string, its: string[], opts?: { removed?: boolean }): Promise<void>`: inserts member entries, taking `file_id` and `tanzeem_file_no` from the member's file.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/models/{member,file,sector,subsector,user}.ts` | new | copies |
| `src/server/models/rsvpEntry.ts` | new | new model |
| `src/server/models/index.ts` | new | re-exports |
| `tests/helpers/db.ts` | new | helper above |
| `scripts/db-indexes.ts` | new | `process.loadEnvFile(".env.local")` if present; `assertDbAllowed({ dbName, vercelEnv: argv.includes("--prod") ? "production" : undefined })`; connect; `RsvpEntry.syncIndexes()`; print `RsvpEntry.listIndexes()`; disconnect |
| `src/server/models/rsvpEntry.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests in `rsvpEntry.test.ts` (`beforeAll(startTestDb)`, `afterEach(clearDb)`, `afterAll(stopTestDb)`):
  - Two member entries with the same `rsvp`/`kind`/`file_id`/`member_id` reject with code `11000`.
  - The same `member_id` under two different `rsvp` slugs is accepted.
  - Two household entries (`member_id: null`) for the same rsvp + file reject with `11000`.
  - After `seedBasic()`, `File.findOne({ tanzeem_file_no: 101 })` has `member_ids.length === 3`, `sub_sector.sector.name === "Sector One"`, and `User.findOne({ itsId: 30000001 })` has `userRole` containing `"Admin"`.
  - After `invite("sample-rsvp", ["10000002"])`, the entry has `file_id "10000001"`, `tanzeem_file_no 101`, `data null` and `is_removed false`.
- [ ] 2. Run `npx vitest run src/server/models`. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run the tests (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: AEM models, rsvp_entry, test db helper, index script`.

## Manual test
1. With `.env.local` on `aem-dev`, `npm run db:indexes` prints the two `rsvp_entry` indexes.
2. With `MONGODB_DBNAME=aem-prod` and no `--prod`, the script refuses and exits non-zero. **Don't run it with `--prod` yet; that happens in 7-02.**

## Open questions
1. Do `aem-dev` documents match the `aem-shared` schemas (for example `file.sub_sector`, not `subsector`)? Recommended: open one `file` and one `member` in `aem-dev` during the manual test; if a name differs, follow the database and note it here.

## Out of scope
Any service code.
