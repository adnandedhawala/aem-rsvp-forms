# AEM RSVP Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `aem-rsvp-forms`, a Next.js app where each RSVP is a file in `forms/`. Admins invite members (file no + ITS) and see or edit responses. Households sign in with file no + ITS and submit one form covering every invited member.

**Architecture:** One Next.js 16 App Router app. Route handlers under `src/app/api/v1` call small server services in `src/server/`, which read the existing AEM collections (`member`, `file`, `sector`, `subsector`, `user`) and read and write one new collection, `rsvp_entry`. Form files in `forms/` are plain TypeScript modules, imported by both client pages (rendering) and services (validation). Nothing is cached anywhere.

**Tech Stack:** Next.js 16, React 19, TypeScript, Ant Design 6 + `@ant-design/nextjs-registry`, Tailwind 4, TanStack Query 5, AG Grid 36 (community + enterprise), SheetJS `xlsx` (from `https://cdn.sheetjs.com`), Mongoose 9, Zod 4, `jose`, Vitest + Testing Library + `mongodb-memory-server`, Playwright, Biome.

**Spec:** `docs/superpowers/specs/2026-11-06-rsvp-forms-design.md`

## Global Constraints

- **No caching anywhere** (spec section 2a). Every response, page or API, carries `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache` and `Expires: 0`. No `unstable_cache`, no `"use cache"`, `cacheComponents` off, `<Link prefetch={false}>`. TanStack Query uses `staleTime: 0`, `gcTime: 0`. No answers or lists in local/session storage, and no service worker.
- **DB guard** (spec 2b): `MONGODB_DBNAME` must be `aem-dev` or `aem-prod`. `aem-prod` is allowed only when `VERCEL_ENV === "production"`. Scripts that write test data refuse anything but `aem-dev`.
- **Env vars are server-only:** `MONGODB_URI`, `MONGODB_DBNAME`, `JWT_SECRET`. Never `NEXT_PUBLIC_` for these. The only public var is the optional `NEXT_PUBLIC_AG_GRID_LICENSE`.
- **Reuse existing models** copied from `aem-shared` (same schema, same collection names). **Only one new collection: `rsvp_entry`.**
- **Admin access** = a `user` doc whose `userRole` includes `"Admin"`. Passwords are compared as **plain text**, matching `aem-auth`.
- **One invited row = one member.** The household form shows every non-removed invited member of the file.
- **A field's `name` is its key** in stored `data`. Names are unique across `householdFields` + `memberFields` of a form.
- **One Submit per household**, saved in **one MongoDB transaction**, all or nothing.
- **Admin can save** any household's answers, **even after close**. Saves record `submitted_via: "admin"`.
- **Next.js 16:** route `params` is a `Promise`. The request interceptor file is `src/proxy.ts` (exported `proxy`), not `middleware.ts`.
- Form definitions hold functions (`visibleIf`), so **never pass a form object from a Server Component to a Client Component**. Client components import the registry and look forms up by slug.
- Mobile-first public pages.

## Review Focus

1. **Signing in with a file no that has invitees but an ITS from a *different* file** must fail with the generic "File number and ITS don't match". Test in Task 7.
2. **A household PUT that includes a member ITS that isn't invited (or was removed), or a forged extra key**: the extra member is rejected with 422 and unknown keys are dropped. Test in Task 8.
3. **Re-uploading an invitee list that includes already-answered members** must keep their `data` untouched (merge, not replace), and re-inviting a removed member un-removes them with answers intact. Test in Task 9.
4. **An Excel upload with numeric cells, blank rows, header variants (`File No`, `file_no`, `ITS`, `its_id`) and duplicates**: blanks are skipped, numbers become strings, and duplicates are flagged. Test in Task 13.
5. **A household cookie for RSVP A used against RSVP B's household route** must get 401. Test in Task 6.

---

## File Structure

```
aem-rsvp-forms/
  forms/
    _fields.ts            types, defineForm, validateAnswers, isFieldVisible
    _fields.test.ts
    index.ts              registry: forms[], getForm, listForms, formStatus
    index.test.ts
    sample-rsvp.ts        example form used by dev + e2e
  src/
    proxy.ts              no-store headers on every response + /admin page guard
    app/
      layout.tsx          force-dynamic, Providers, DevBanner
      page.tsx            list of open RSVPs
      r/[slug]/page.tsx               household sign-in
      r/[slug]/form/page.tsx          household form
      r/[slug]/done/page.tsx          thank-you + summary
      admin/login/page.tsx
      admin/page.tsx                  RSVP list
      admin/r/[slug]/invitees/page.tsx
      admin/r/[slug]/responses/page.tsx
      admin/r/[slug]/household/[fileNo]/page.tsx   admin edit
      api/v1/...route.ts              (Task 6–10, list in each task)
    server/
      env.ts              getServerEnv, assertDbAllowed
      db.ts               connectDb
      http.ts             HttpError, json, withRoute
      rateLimit.ts        createRateLimiter
      auth/tokens.ts      sign/verify admin + household tokens, cookie names
      auth/session.ts     requireAdmin, requireHousehold
      auth/adminLogin.ts  loginAdmin
      models/             member.ts file.ts sector.ts subsector.ts user.ts rsvpEntry.ts index.ts
      services/households.ts   signInHousehold, getHousehold, saveHousehold
      services/invitees.ts     validateInviteeRows, addInvitees, removeInvitees, listInvitees
      services/responses.ts    listResponses, getFormStats
    lib/
      api.ts              client fetch helper (no-store)
      queryClient.ts      makeQueryClient
      inviteeSheet.ts     parseInviteeSheet
      exportSheet.ts      downloadRowsAsXlsx
    components/
      Providers.tsx  DevBanner.tsx
      form/FieldInput.tsx  form/AnswerCard.tsx  form/HouseholdForm.tsx
      admin/AdminShell.tsx
  tests/helpers/db.ts     startTestDb, stopTestDb, seedBasic
  scripts/db-indexes.ts   create rsvp_entry indexes (--prod flag for aem-prod)
  scripts/e2e.ts          memory DB + next start + playwright
  e2e/*.spec.ts
```

Shared test fixtures (`seedBasic`, Task 3) are used by every service test:

| Kind | Data |
|---|---|
| File A | `_id "10000001"`, `tanzeem_file_no 101`, `hof_name "Hof A"`, `member_ids ["10000001","10000002","10000003"]`, `sub_sector { _id: "ss1", name: "SS One", sector: { _id: "s1", name: "Sector One", primary_color: "#000", secondary_color: "#fff" } }` |
| File B | `_id "20000001"`, `tanzeem_file_no 202`, `member_ids ["20000001","20000002"]`, same sub_sector |
| Members | `10000001` HOF, Male, 50 · `10000002` FM, Female, 45 · `10000003` FM, Male, 12 · `20000001` HOF · `20000002` FM; each with `hof_id` set to its file `_id` |
| Users | `{ itsId: 30000001, email: "admin@test.local", password: "secret", userRole: ["Admin"], name: "Admin One" }`, `{ itsId: 30000002, email: "masool@test.local", password: "secret", userRole: ["Masool"], name: "Masool One" }` |

---

### Task 1: Scaffold the app

**Files:**
- Create: the whole project via `create-next-app`, then `biome.json`, `vitest.config.ts`, `.env.example`, `README.md`
- Test: `src/smoke.test.ts`

- [ ] **Step 1: Scaffold.** From `/Users/adnan/Documents/GitHub/aem/aem-rsvp-forms` (the repo already exists with `docs/`), scaffold into a temp dir and move the files in:

```bash
npx create-next-app@latest /tmp/rsvp-scaffold --ts --app --src-dir --tailwind --no-eslint --import-alias "@/*" --use-npm --turbopack --yes
rsync -a --exclude .git /tmp/rsvp-scaffold/ ./ && rm -rf /tmp/rsvp-scaffold
```

- [ ] **Step 2: Install deps.**

```bash
npm i antd @ant-design/nextjs-registry @tanstack/react-query ag-grid-community ag-grid-enterprise ag-grid-react mongoose zod jose dayjs https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz
npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom mongodb-memory-server @playwright/test tsx @biomejs/biome
npx @biomejs/biome init
```

- [ ] **Step 3: Configure.**
  - `vitest.config.ts`: plugins `react()`, `tsconfigPaths()`; `test.environment: "node"`; `include: ["src/**/*.test.{ts,tsx}", "forms/**/*.test.ts"]`; `testTimeout: 30000`; `hookTimeout: 120000`. Component tests opt into jsdom with a `// @vitest-environment jsdom` header.
  - `tsconfig.json`: add path `"@forms/*": ["./forms/*"]` and include `forms/**/*.ts`.
  - `package.json` scripts: `"test": "vitest run"`, `"lint": "biome check ."`, `"db:indexes": "tsx scripts/db-indexes.ts"`, `"e2e": "tsx scripts/e2e.ts"`.
  - `.env.example`:
    ```
    MONGODB_URI=mongodb+srv://USER:PASS@HOST/?retryWrites=true&w=majority
    MONGODB_DBNAME=aem-dev
    JWT_SECRET=change-me-at-least-32-chars
    # optional; without it AG Grid enterprise shows a watermark (same as zmq/distribution)
    NEXT_PUBLIC_AG_GRID_LICENSE=
    ```
  - Confirm `.gitignore` contains `.env*` and add `!.env.example`.
  - Replace the scaffold's `src/app/page.tsx` body with `<main>AEM RSVP</main>` (Task 11 replaces it).

- [ ] **Step 4: Write `src/smoke.test.ts`:** `expect(1 + 1).toBe(2)`.

- [ ] **Step 5: Verify.** Run `npm test`, `npm run lint` and `npm run build`. Expected: 1 passed; Biome clean (run `npx biome check --write .` once first); build succeeds.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "chore: scaffold Next.js app with tooling"`

---

### Task 2: Env + DB guard rails + connection

**Files:**
- Create: `src/server/env.ts`, `src/server/db.ts`
- Test: `src/server/env.test.ts`

**Interfaces:**
- Produces:
  - `type DbName = "aem-dev" | "aem-prod"`
  - `assertDbAllowed(input: { dbName: string | undefined; vercelEnv: string | undefined }): DbName`, which throws `Error` with a clear message.
  - `getServerEnv(): { mongoUri: string; dbName: DbName; jwtSecret: Uint8Array; isDevDb: boolean }`. It reads `process.env`, calls `assertDbAllowed`, and throws if `MONGODB_URI` is missing or `JWT_SECRET` is shorter than 32 chars.
  - `connectDb(): Promise<typeof mongoose>`. It caches the **connection** on `globalThis.__rsvpMongoose`, calls `mongoose.connect(mongoUri, { dbName, autoIndex: dbName === "aem-dev" })`, and runs `mongoose.set("strictQuery", true)`.

- [ ] **Step 1: Write failing tests** in `env.test.ts`:
  - `assertDbAllowed({dbName:"aem-dev", vercelEnv:undefined})` returns `"aem-dev"`.
  - `assertDbAllowed({dbName:"aem-dev", vercelEnv:"production"})` returns `"aem-dev"` (allowed; prod points at dev only if misconfigured, which is visible via the banner).
  - `assertDbAllowed({dbName:"aem-prod", vercelEnv:"production"})` returns `"aem-prod"`.
  - `assertDbAllowed({dbName:"aem-prod", vercelEnv:"preview"})` throws `/aem-prod.*only.*production/i`.
  - `assertDbAllowed({dbName:"aem-prod", vercelEnv:undefined})` throws.
  - `assertDbAllowed({dbName:"am-prod", vercelEnv:"production"})` throws `/must be aem-dev or aem-prod/`.
  - `assertDbAllowed({dbName:undefined, ...})` throws.
  - `getServerEnv()` with `JWT_SECRET="short"` throws `/JWT_SECRET/`. Use `vi.stubEnv`.

- [ ] **Step 2: Run** `npx vitest run src/server/env.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `env.ts` and `db.ts` per Interfaces.
  - Both files start with `import "server-only"` (`npm i server-only`).
  - Create `tests/helpers/empty.ts` (`export {}`), and in `vitest.config.ts` add `resolve.alias: { "server-only": path.resolve(__dirname, "tests/helpers/empty.ts") }` so tests can import server modules.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat: env guard rails and db connection"` (add new files first).

---

### Task 3: Models + test DB helper + index script

**Files:**
- Create: `src/server/models/{member,file,sector,subsector,user,rsvpEntry,index}.ts`, `tests/helpers/db.ts`, `scripts/db-indexes.ts`
- Test: `src/server/models/rsvpEntry.test.ts`

**Interfaces:**
- Consumes: `connectDb` is **not** used in tests. Tests connect mongoose directly to the memory server.
- Produces:
  - `Member`, `File`, `Sector`, `Subsector`, `User` Mongoose models plus `IMember`, `IFile`, `IUser` types, **copied verbatim** from `/Users/adnan/Documents/GitHub/aem/aem-shared/src/models/*.ts` (same field names, including `File.sub_sector`, `User.itsId: Number`, and the same collection names `member`, `file`, `sector`, `subsector`, `user`). Adjust only for Mongoose 9 typing. Each uses the `mongoose.models.X || model(...)` guard.
  - `RsvpEntry` model, collection **`rsvp_entry`**:
    ```ts
    interface IRsvpEntry {
      rsvp: string; kind: "member" | "household";
      file_id: string; tanzeem_file_no: number; member_id: string | null;
      invited_by: string | null; is_removed: boolean;
      data: Record<string, unknown> | null;
      submitted_by_its: string | null; submitted_via: "household" | "admin" | null;
      submitted_at: Date | null; createdAt: Date; updatedAt: Date;
    }
    ```
    Schema: `timestamps: true`; `data: Schema.Types.Mixed`, default `null`; `is_removed` default `false`. Indexes: unique `{ rsvp: 1, kind: 1, file_id: 1, member_id: 1 }`, and `{ rsvp: 1, tanzeem_file_no: 1 }`.
  - `tests/helpers/db.ts`: `startTestDb(): Promise<void>` starts a `MongoMemoryReplSet` (1 node, needed for transactions), connects mongoose with `dbName: "aem-dev"` and runs `RsvpEntry.syncIndexes()`. `stopTestDb()`. `clearDb()` deletes all docs in every model. `seedBasic(): Promise<void>` inserts the fixture table above.
  - `scripts/db-indexes.ts`: loads `.env.local` (via `process.loadEnvFile`), runs `assertDbAllowed`, but treats a `--prod` argv flag as permission for `aem-prod` in place of `VERCEL_ENV`. Without `--prod` it refuses `aem-prod`. Runs `RsvpEntry.syncIndexes()` and prints the index list.

- [ ] **Step 1: Write failing tests** in `rsvpEntry.test.ts` (`beforeAll startTestDb`, `afterEach clearDb`, `afterAll stopTestDb`):
  - Inserting two member entries with the same `rsvp`/`kind`/`file_id`/`member_id` rejects with code `11000`.
  - The same `member_id` under two different `rsvp` slugs is fine.
  - Two household entries (`member_id: null`) for the same rsvp + file reject with `11000`.
  - `seedBasic()` makes `File.findOne({ tanzeem_file_no: 101 })` return `member_ids.length === 3`, and makes `User.findOne({ itsId: 30000001 })` have `userRole` containing `"Admin"`.
- [ ] **Step 2: Run** `npx vitest run src/server/models`. Expected: FAIL.
- [ ] **Step 3: Implement** the models, the helper and the script per Interfaces.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: copy AEM models, add rsvp_entry, test db helper, index script"`

---

### Task 4: Form definitions: types, validation, registry

**Files:**
- Create: `forms/_fields.ts`, `forms/index.ts`, `forms/sample-rsvp.ts`
- Test: `forms/_fields.test.ts`, `forms/index.test.ts`

**Interfaces:**
- Produces (from `forms/_fields.ts`):
  ```ts
  type FieldType = "text"|"textarea"|"number"|"radio"|"select"|"multiselect"|"checkbox"|"date";
  type Answers = Record<string, unknown>;
  interface FieldDef { name: string; label: string; type: FieldType; required?: boolean;
    options?: string[]; min?: number; max?: number; maxLength?: number;
    placeholder?: string; help?: string; visibleIf?: (values: Answers) => boolean; }
  type MemberInfoKey = "full_name"|"age"|"gender"|"mobile"|"hof_fm_type";
  interface FormInput { slug: string; title: string; description?: string;
    opensAt: string; closesAt: string;
    signIn?: { its?: "hof"|"member"|"either"; mustBeInvited?: boolean };
    householdFields?: FieldDef[]; memberFields: FieldDef[]; showMemberInfo?: MemberInfoKey[]; }
  interface FormDef extends Required<Omit<FormInput,"description">> { description?: string;
    signIn: { its: "hof"|"member"|"either"; mustBeInvited: boolean }; opensAtDate: Date; closesAtDate: Date; }
  function defineForm(input: FormInput): FormDef;
  function isFieldVisible(field: FieldDef, values: Answers): boolean;
  type ValidationResult = { ok: true; data: Answers } | { ok: false; errors: Record<string, string> };
  function validateAnswers(fields: FieldDef[], raw: Answers): ValidationResult;
  ```
- Produces (from `forms/index.ts`):
  `forms: FormDef[]`, `getForm(slug: string): FormDef | undefined`, `listForms(): FormDef[]`, `type FormStatus = "upcoming"|"open"|"closed"`, `formStatus(form: FormDef, now?: Date): FormStatus`.

Rules `defineForm` enforces (throws `Error`): slug matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`; `opensAt` and `closesAt` parse as dates with `opensAt < closesAt`; field `name` matches `/^[a-z][a-z0-9_]*$/` and is unique across `householdFields` + `memberFields`; `radio`/`select`/`multiselect` have a non-empty `options`. Defaults: `signIn = { its: "either", mustBeInvited: false }`, `householdFields = []`, `showMemberInfo = ["full_name","age","gender"]`.

`validateAnswers` rules: it builds a Zod object **only from visible fields** (`isFieldVisible` with `raw`). Hidden fields and unknown keys are absent from `data`. Per type:
- text/textarea → string, trimmed, honouring `maxLength`; `""` is "missing".
- number → `z.coerce.number()` with min/max.
- radio/select → one of `options`.
- multiselect → array of `options`; `[]` is "missing".
- checkbox → boolean, default `false`, never "missing".
- date → `YYYY-MM-DD` string.

A required field that is missing gives the error `"<label> is required"`. Errors are keyed by field `name`, one message each (first Zod issue).

`forms/sample-rsvp.ts`: exactly the spec section 3 example, with `slug: "sample-rsvp"`, `opensAt: "2026-01-01T00:00:00+05:30"` and `closesAt: "2030-12-31T23:59:59+05:30"`.

- [ ] **Step 1: Write failing tests** in `_fields.test.ts`:
  - `defineForm` with duplicate `name` across household and member fields throws `/duplicate field name "x"/`.
  - Bad slug `"Bad Slug"` throws; a select without options throws; `closesAt` before `opensAt` throws.
  - Defaults are applied (`signIn.its === "either"`, `mustBeInvited === false`).
  - `validateAnswers(sample.memberFields, { attending: "No", days: "All", hacker: 1 })` returns `{ ok: true, data: { attending: "No", needs_wheelchair: false } }`: `days` is dropped because it's hidden, `hacker` is dropped as unknown, and `notes` is omitted when not provided.
  - `validateAnswers(sample.memberFields, { attending: "Yes" })` returns `ok: false` with `errors.days === "Which days? is required"`.
  - `validateAnswers(sample.memberFields, { attending: "Maybe" })` returns `ok: false` with `errors.attending` defined.
  - Number coercion: `validateAnswers(sample.householdFields, { mehmaan_count: "3" })` gives `data.mehmaan_count === 3`, and `"25"` fails (max 20).
- [ ] **Step 2: Write failing tests** in `index.test.ts`: `getForm("sample-rsvp")` is defined; `getForm("nope")` is undefined; slugs in `forms` are unique; `formStatus(form, new Date("2025-06-01"))` is `"upcoming"`; `formStatus` at 2027 is `"open"` and at 2031 is `"closed"`.
- [ ] **Step 3: Run** `npx vitest run forms`. Expected: FAIL.
- [ ] **Step 4: Implement** per Interfaces.
- [ ] **Step 5: Run.** Expected: PASS.
- [ ] **Step 6: Commit.** `git add forms && git commit -m "feat: form definitions, answer validation, registry"`

---

### Task 5: HTTP helpers, no-cache everywhere, proxy

**Files:**
- Create: `src/server/http.ts`, `src/proxy.ts`
- Modify: `next.config.ts`, `src/app/layout.tsx`
- Test: `src/server/http.test.ts`, `src/proxy.test.ts`

**Interfaces:**
- Produces:
  - `NO_STORE_HEADERS: Record<string,string>` (the three headers in Global Constraints).
  - `class HttpError extends Error { constructor(status: number, message: string, details?: unknown) }`.
  - `json(body: unknown, init?: { status?: number; headers?: HeadersInit }): Response` always sets `NO_STORE_HEADERS` and `Content-Type: application/json`.
  - `withRoute<C>(handler: (req: Request, ctx: C) => Promise<Response>): (req: Request, ctx: C) => Promise<Response>`. It calls `connectDb()` and the handler. It maps `HttpError` to `json({ error: message, details }, { status })`. Any other error is logged with `console.error` and becomes `json({ error: "Something went wrong" }, { status: 500 })`.
  - Every `route.ts` in later tasks exports `export const dynamic = "force-dynamic"; export const revalidate = 0;` and wraps its handlers in `withRoute`.
  - `src/proxy.ts`: `export async function proxy(req: NextRequest): Promise<NextResponse>` and `export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }`.
    - For paths starting with `/admin` (except `/admin/login`) without a valid admin cookie (`verifyAdminToken` from Task 6), it redirects to `/admin/login?next=<path>`.
    - Otherwise it calls `NextResponse.next()`.
    - It sets `NO_STORE_HEADERS` on **every** returned response, including redirects.
    - Build this in two steps: headers now, and the admin guard in Task 6 once tokens exist.
- `next.config.ts`: `experimental: { staleTimes: { dynamic: 0, static: 0 } }`. Also `headers()` returning `NO_STORE_HEADERS` for `source: "/:path*"`, as a second layer. Do **not** set `cacheComponents`.
- `src/app/layout.tsx` exports `dynamic = "force-dynamic"`, `revalidate = 0` and `fetchCache = "force-no-store"`.

- [ ] **Step 1: Write failing tests:**
  - `json({a:1})` has status 200 and `headers.get("cache-control") === "no-store, no-cache, must-revalidate, max-age=0"`, plus `pragma` `no-cache` and `expires` `0`.
  - `withRoute` with a handler that throws `new HttpError(422, "bad", {x:1})` returns 422 with body `{ error: "bad", details: { x: 1 } }` and the no-store headers. Mock `connectDb` with `vi.mock("@/server/db")`.
  - `withRoute` with a handler that throws `new Error("boom")` returns 500, and the body does not contain `"boom"`.
  - `proxy(new NextRequest("http://x/r/sample-rsvp"))` has the no-store `cache-control`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** per Interfaces (proxy without the admin guard yet).
- [ ] **Step 4: Run.** Expected: PASS. Also run `npm run build`; it should succeed with no static pages listed as `○ (Static)` except `_not-found`.
- [ ] **Step 5: Commit.** `git commit -m "feat: no-store responses, route wrapper, proxy"` (after `git add`).

---

### Task 6: Auth: tokens, sessions, admin login + routes

**Files:**
- Create: `src/server/auth/tokens.ts`, `src/server/auth/session.ts`, `src/server/auth/adminLogin.ts`, `src/server/rateLimit.ts`
- Create routes: `src/app/api/v1/admin/login/route.ts` (POST), `src/app/api/v1/admin/logout/route.ts` (POST), `src/app/api/v1/admin/verify/route.ts` (GET)
- Modify: `src/proxy.ts` (admin guard)
- Test: `src/server/auth/auth.test.ts`, `src/server/rateLimit.test.ts`

**Interfaces:**
- Produces (`tokens.ts`):
  - `ADMIN_COOKIE = "rsvp_admin"`, `HOUSEHOLD_COOKIE = "rsvp_household"`
  - `type AdminClaims = { itsId: number; name: string }`; `type HouseholdClaims = { slug: string; fileId: string; fileNo: number; signedInIts: string }`
  - `signAdminToken(c: AdminClaims): Promise<string>`: HS256, `aud: "admin"`, expiry 12h. `verifyAdminToken(t: string | undefined): Promise<AdminClaims | null>`.
  - `signHouseholdToken(c: HouseholdClaims): Promise<string>`: `aud: "household"`, expiry 30m. `verifyHouseholdToken(t): Promise<HouseholdClaims | null>`.
  - `cookieOptions(maxAgeSeconds: number)` returns `{ httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge }`.
- Produces (`session.ts`):
  - `requireAdmin(req: Request): Promise<AdminClaims>`, which throws `HttpError(401, "Not signed in")`.
  - `requireHousehold(req: Request, slug: string): Promise<HouseholdClaims>`, which throws `HttpError(401, "Session expired, please sign in again")` if the cookie is missing or invalid **or `claims.slug !== slug`**.
- Produces (`adminLogin.ts`):
  - `loginAdmin(input: { identifier: string; password: string }): Promise<AdminClaims>`. An all-digit `identifier` looks up `User.findOne({ itsId: Number(identifier) })`; otherwise it looks up by `email` (lower-cased).
  - It throws `HttpError(401, "Invalid credentials")` for a missing user or a wrong password (plain-text compare), and `HttpError(403, "Not an admin")` when `userRole` lacks `"Admin"`.
- Produces (`rateLimit.ts`):
  - `createRateLimiter(opts: { max: number; windowMs: number }): { hit(key: string, now?: number): boolean }`. It returns `false` once `max` is exceeded within the window. In-memory `Map`; expired entries are pruned on each hit.
- Routes:
  - `POST /api/v1/admin/login` takes body `{ identifier, password }` (validated with Zod). It sets the `rsvp_admin` cookie and returns `{ name, itsId }`.
  - `POST /api/v1/admin/logout` clears the cookie.
  - `GET /api/v1/admin/verify` returns the `AdminClaims`, or 401.
- Proxy: the admin page guard from Task 5 uses `verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)`.

- [ ] **Step 1: Write failing tests** (`auth.test.ts` uses the test DB and `seedBasic`; set `JWT_SECRET` with `vi.stubEnv` to a 32+ char value and `MONGODB_*` to dummies):
  - `loginAdmin({ identifier: "30000001", password: "secret" })` returns `{ itsId: 30000001, name: "Admin One" }`.
  - `loginAdmin({ identifier: "ADMIN@test.local", password: "secret" })` works (case-insensitive email).
  - A wrong password rejects with an `HttpError` of status 401; `30000002` with the right password rejects with 403; an unknown ITS gives 401.
  - Admin token round trip: `verifyAdminToken(await signAdminToken(c))` equals `c`. A household token passed to `verifyAdminToken` returns `null` (audience check).
  - **Review Focus 5:** build a `Request` whose `cookie` header is `rsvp_household=<await signHouseholdToken({ slug: "rsvp-a", fileId: "10000001", fileNo: 101, signedInIts: "10000001" })>`. `requireHousehold(req, "rsvp-b")` rejects with 401, and `requireHousehold(req, "rsvp-a")` resolves.
  - `requireAdmin` on a request without a cookie gives 401.
  - `rateLimit.test.ts`: with `max: 3`, hits 1–3 return `true` and hit 4 returns `false`; after `windowMs` passes (via the `now` argument), it returns `true` again.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the modules, the routes and the proxy guard.
- [ ] **Step 4: Run.** Expected: PASS. Add a proxy test: `/admin` without a cookie gives a 307 to `/admin/login?next=%2Fadmin` with no-store headers, and `/admin/login` without a cookie passes.
- [ ] **Step 5: Commit.** `git commit -m "feat: admin login, household/admin tokens, rate limiter"`

---

### Task 7: Household sign-in service + public routes

**Files:**
- Create: `src/server/services/households.ts` (first part)
- Create routes: `src/app/api/v1/rsvp/[slug]/route.ts` (GET), `src/app/api/v1/rsvp/[slug]/sign-in/route.ts` (POST)
- Test: `src/server/services/signIn.test.ts`

**Interfaces:**
- Consumes: `getForm`, `formStatus` (Task 4); `File`, `RsvpEntry` (Task 3); `signHouseholdToken`, `HOUSEHOLD_COOKIE`, `cookieOptions`, `createRateLimiter` (Task 6); `HttpError` (Task 5).
- Produces:
  - `signInHousehold(input: { form: FormDef; fileNo: number; its: string; now?: Date }): Promise<HouseholdClaims>`.
  - Order of checks:
    1. If `formStatus` isn't `"open"`, throw `HttpError(403, "This RSVP is not open")`.
    2. Look up the file by `tanzeem_file_no`.
    3. Require at least one `RsvpEntry` with `{ rsvp: form.slug, kind: "member", file_id: file._id, is_removed: false }`.
    4. Apply the ITS rule:
       - `hof`: `its === file._id`;
       - `member`: `file.member_ids.includes(its)`;
       - `either`: either of the two.
    5. If `mustBeInvited`, require a non-removed member entry with `member_id === its`.

    **Any failure in steps 2–5 throws the same `HttpError(401, "File number and ITS don't match")`.**
  - `GET /api/v1/rsvp/[slug]` returns `{ slug, title, description, opensAt, closesAt, status, signInIts }`, or 404 `{ error: "RSVP not found" }`.
  - `POST /api/v1/rsvp/[slug]/sign-in` takes body `{ fileNo: number|string, its: string }`, Zod-coerced and trimmed.
    - Rate limit: a module-level limiter with `{ max: 10, windowMs: 15*60*1000 }`, keyed `${ip}:${fileNo}`, where `ip` comes from `x-forwarded-for` (first value) or `"unknown"`. Over the limit it returns 429 `{ error: "Too many attempts, please wait 15 minutes" }`.
    - On success it sets the `rsvp_household` cookie (30 min) and returns `{ ok: true }`.

- [ ] **Step 1: Write failing tests** (seed with `seedBasic`, plus member entries inviting `10000001` and `10000002` for `sample-rsvp`; use a form built with `defineForm` and the `signIn` variant under test, and `now` inside the window):
  - `either`: file 101 with ITS `10000003` (a member of the file, not invited) succeeds, returning `fileId "10000001"` and `fileNo 101`.
  - `hof`: ITS `10000002` gives 401 and `10000001` succeeds.
  - `member` + `mustBeInvited: true`: `10000003` gives 401 and `10000002` succeeds.
  - **Review Focus 1:** file 101 with ITS `20000001` (from file 202) gives 401 with the message `"File number and ITS don't match"`.
  - File 202 (no invitees) with its HOF gives 401; file 999 gives 401.
  - A closed form (`now` after `closesAt`) gives 403.
  - A removed invitee isn't counted: mark both entries `is_removed: true`, and file 101 gives 401.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the service and both routes (`params: Promise<{ slug: string }>`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: household sign-in"`

---

### Task 8: Household read + save (household and admin)

**Files:**
- Modify: `src/server/services/households.ts`
- Create routes: `src/app/api/v1/rsvp/[slug]/household/route.ts` (GET, PUT), `src/app/api/v1/admin/rsvp/[slug]/household/[fileNo]/route.ts` (GET, PUT)
- Test: `src/server/services/households.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface HouseholdMember { its: string; full_name: string; age?: number; gender?: string;
    mobile?: string; hof_fm_type?: string; data: Answers | null; submitted_at: string | null; }
  interface HouseholdView { slug: string; fileId: string; fileNo: number; hofName: string;
    sector: string | null; subsector: string | null;
    household: { data: Answers | null; submitted_at: string | null } | null; // null when form has no householdFields
    members: HouseholdMember[];  // non-removed invited members, ordered HOF first then by member_ids order
    lastSavedAt: string | null; }
  interface HouseholdPayload { household?: Answers; members: Record<string, Answers>; }
  getHousehold(input: { form: FormDef; fileId: string }): Promise<HouseholdView>;
  getHouseholdByFileNo(input: { form: FormDef; fileNo: number }): Promise<HouseholdView>; // admin; 404 if file not found or no invitees
  saveHousehold(input: { form: FormDef; fileId: string; payload: HouseholdPayload;
    by: string; via: "household" | "admin"; now?: Date }): Promise<HouseholdView>;
  ```
- `saveHousehold` rules:
  - If `via === "household"` and the form isn't open, throw `HttpError(403, "This RSVP is closed")`. Admin saves skip this.
  - Load the non-removed invited member ids for the file. `Object.keys(payload.members)` must equal that set exactly. Any extra id gives `HttpError(422, "Unknown member in submission", { members: { [id]: { _form: "Not invited" } } })`, and any missing id gives a 422 with `_form: "Answers missing"`.
  - Validate each member with `validateAnswers(form.memberFields, ...)`, and the household with `validateAnswers(form.householdFields, payload.household ?? {})` when `householdFields.length > 0`.
  - On any errors, throw `HttpError(422, "Please fix the highlighted fields", { household?: errors, members: { [its]: errors } })` and write nothing.
  - Otherwise, inside `mongoose.startSession().withTransaction(...)`:
    - `updateOne` each member entry with `$set { data, submitted_by_its: by, submitted_via: via, submitted_at: now }`;
    - upsert the household entry (`kind: "household"`, `member_id: null`, `invited_by: null`) with the same `$set` and `$setOnInsert { tanzeem_file_no, is_removed: false }`.
  - Return the fresh `getHousehold`.
- Routes:
  - Household GET/PUT use `requireHousehold(req, slug)`, then `fileId` from the claims. PUT calls with `by: claims.signedInIts, via: "household"`.
  - Admin GET/PUT use `requireAdmin` and `getHouseholdByFileNo`. PUT resolves `fileId` and calls with `by: String(admin.itsId), via: "admin"`.
  - Body is parsed with Zod: `{ household: z.record(z.string(), z.unknown()).optional(), members: z.record(z.string(), z.record(z.string(), z.unknown())) }`.

- [ ] **Step 1: Write failing tests** (sample form; invite `10000001`, `10000002`, `10000003`; mark `10000003` removed):
  - `getHousehold` returns 2 members, `10000001` first, with `data: null`, `household.data: null` and `hofName "Hof A"`.
  - A valid save (`members: { "10000001": { attending: "Yes", days: "All" }, "10000002": { attending: "No" } }`, `household: { mehmaan_count: 2 }`) then `getHousehold` shows the stored data. `10000002.data` equals `{ attending: "No", needs_wheelchair: false }`, `submitted_via === "household"`, and `RsvpEntry.countDocuments({ kind: "household" }) === 1`.
  - **Review Focus 2:** a payload that includes `"10000003"` (removed) gives 422 `"Unknown member in submission"`, and **nothing** is written: both entries keep `data === null`.
  - A payload with `"20000001"` (another file) gives 422.
  - An invalid member (`10000002: { attending: "Yes" }`, missing days) gives 422 with `details.members["10000002"].days`, and `10000001` is **not** saved.
  - Forged key: `{ attending: "No", is_admin: true }` stores no `is_admin`.
  - Closed form: `via: "household"` gives 403, while `via: "admin"` succeeds and stores `submitted_via: "admin"` and `submitted_by_its: "30000001"`.
  - Saving twice overwrites `data` and keeps exactly one household entry.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: household read/save with transactional submit and admin edit"`

---

### Task 9: Invitees service + admin routes

**Files:**
- Create: `src/server/services/invitees.ts`
- Create routes: `src/app/api/v1/admin/rsvp/[slug]/invitees/route.ts` (GET, POST, DELETE), `src/app/api/v1/admin/rsvp/[slug]/invitees/validate/route.ts` (POST)
- Test: `src/server/services/invitees.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface InviteeRowInput { fileNo: string; its: string; }
  interface InviteeRowResult extends InviteeRowInput { ok: boolean; error?: string;
    full_name?: string; age?: number; gender?: string; hofName?: string; sector?: string; subsector?: string;
    alreadyInvited?: boolean; }
  validateInviteeRows(slug: string, rows: InviteeRowInput[]): Promise<InviteeRowResult[]>;
  addInvitees(slug: string, rows: InviteeRowInput[], adminIts: string): Promise<{ added: number; restored: number; unchanged: number }>;
  removeInvitees(slug: string, memberIds: string[]): Promise<{ removed: number; hadAnswers: number }>;
  interface InviteeListRow { its: string; fileNo: number; full_name: string; hofName: string;
    sector: string | null; subsector: string | null; answered: boolean; createdAt: string; }
  listInvitees(slug: string): Promise<InviteeListRow[]>;
  ```
- Row rules, in order. Inputs are trimmed first; rows where both fields are empty are dropped before validation.
  - `fileNo` not all digits → `"File no must be a number"`.
  - `its` not exactly 8 digits → `"ITS must be 8 digits"`.
  - No file with that `tanzeem_file_no` → `"File not found"`.
  - No member with that ITS → `"ITS not found"`.
  - ITS not in `file.member_ids` → `"ITS is not in this file"`.
  - ITS repeated earlier in the batch → `"Duplicate row"`.
  - `alreadyInvited` is informational (`ok` stays true).
- `addInvitees` re-runs `validateInviteeRows` and throws `HttpError(422, "Some rows have errors", results)` if any row isn't ok. Then, per row:
  - no entry yet → insert (`kind: "member"`, `invited_by: adminIts`) and count as `added`;
  - existing entry with `is_removed: true` → set it `false` and count as `restored` (**`data` untouched**);
  - otherwise → count as `unchanged`.
- `removeInvitees` sets `is_removed: true` on matching member entries. `hadAnswers` counts those with `data !== null`.
- Routes:
  - All use `requireAdmin`, and return 404 when `getForm(slug)` is undefined.
  - POST/validate take body `{ rows: InviteeRowInput[] }`, with at most 5000 rows (Zod).
  - DELETE takes body `{ memberIds: string[] }`.

- [ ] **Step 1: Write failing tests:**
  - `validateInviteeRows` on `[{101,"10000002"}, {101,"20000001"}, {999,"10000001"}, {101,"1234"}, {101,"10000002"}, {"",""}]` returns 5 results. Their errors in order are: ok, `"ITS is not in this file"`, `"File not found"`, `"ITS must be 8 digits"`, `"Duplicate row"`. The ok row includes `full_name`, `hofName "Hof A"` and `sector "Sector One"`.
  - `addInvitees` with a bad row gives 422 and inserts nothing.
  - **Review Focus 3:** invite `10000001` and `10000002`, save answers for both via `saveHousehold`, remove `10000002`, then `addInvitees` with `[10000001, 10000002, 10000003]` returns `{ added: 1, restored: 1, unchanged: 1 }`, and both earlier `data` values are unchanged.
  - `removeInvitees(["10000001"])` after an answer returns `{ removed: 1, hadAnswers: 1 }`, and `listInvitees` no longer includes it.
  - `listInvitees` returns `answered` correctly and sorts by `fileNo`, then HOF first.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: invitee validation, merge add, soft remove"`

---

### Task 10: Responses + stats + admin RSVP list route

**Files:**
- Create: `src/server/services/responses.ts`
- Create routes: `src/app/api/v1/admin/rsvp/route.ts` (GET), `src/app/api/v1/admin/rsvp/[slug]/responses/route.ts` (GET)
- Test: `src/server/services/responses.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface ResponseRow { fileNo: number; hofName: string; sector: string | null; subsector: string | null;
    its: string; full_name: string; age?: number; gender?: string;
    status: "Pending" | "Answered"; answers: Answers; household: Answers;
    submitted_at: string | null; updated_at: string | null; submitted_by_its: string | null;
    submitted_via: "household" | "admin" | null; }
  listResponses(form: FormDef): Promise<ResponseRow[]>;   // one row per non-removed invited member; household answers repeated on each row of the file
  interface FormStats { slug: string; title: string; status: FormStatus; opensAt: string; closesAt: string;
    invitedMembers: number; invitedFiles: number; answeredMembers: number; answeredFiles: number; }
  getFormStats(form: FormDef): Promise<FormStats>;        // non-removed only; a file counts as answered if any member entry has data
  ```
- Join with **one aggregate per collection** (`RsvpEntry.find`, then `Member.find({_id:{$in}})` and `File.find({_id:{$in}})`), not per-row queries.
- `GET /api/v1/admin/rsvp` returns `FormStats[]` for `listForms()`. `GET .../responses` returns `{ fields: { household: FieldDef-without-visibleIf[], member: same[] }, rows: ResponseRow[] }`. Strip `visibleIf` so it serializes.

- [ ] **Step 1: Write failing tests:** invite 3 members across files 101 and 202, and save an answer for `10000001` only.
  - `listResponses` returns 3 rows; `10000001` is `"Answered"` with `answers.attending`, and the others are `"Pending"` with `answers: {}`.
  - `household.mehmaan_count` repeats on both rows of file 101.
  - Removed invitees are excluded.
  - `getFormStats` returns `{ invitedMembers: 3, invitedFiles: 2, answeredMembers: 1, answeredFiles: 1 }`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: responses grid data and form stats"`

---

### Task 11: Frontend foundation (providers, api client, dev banner, home)

**Files:**
- Create: `src/lib/api.ts`, `src/lib/queryClient.ts`, `src/components/Providers.tsx`, `src/components/DevBanner.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Copy: `jamaatLogo.png` from `/Users/adnan/Documents/GitHub/aem/zmq/zmq-fe/src/assets/` to `public/`
- Test: `src/lib/api.test.ts`, `src/lib/queryClient.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; details?: unknown }`
  - `api<T>(path: string, init?: { method?: "GET"|"POST"|"PUT"|"DELETE"; body?: unknown }): Promise<T>`. It always uses `fetch(path, { cache: "no-store", credentials: "same-origin", headers: { "Cache-Control": "no-cache", "Content-Type": "application/json" } })`. A non-2xx response throws `ApiError(status, body.error, body.details)`.
  - `makeQueryClient(): QueryClient` with defaults `{ queries: { staleTime: 0, gcTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true, retry: false }, mutations: { retry: false } }`.
  - `<Providers>` is a client component wrapping `AntdRegistry`, `ConfigProvider` (theme primary `#1E293B`) and antd `App`, plus `QueryClientProvider` with `useState(makeQueryClient)`.
  - `<DevBanner />` is a server component that renders a fixed top strip "DEV DATA (aem-dev)" when `getServerEnv().isDevDb`.
  - `layout.tsx` keeps the Task 5 exports and renders `<Providers><DevBanner/>{children}</Providers>`.
  - `page.tsx` is a server component listing `listForms()` filtered to `formStatus === "open"`, as `<Link prefetch={false} href={/r/${slug}}>` cards. If none are open: "No RSVPs are open right now."

- [ ] **Step 1: Write failing tests:**
  - `api("/x")` with stubbed `fetch` was called with `cache: "no-store"` and header `Cache-Control: no-cache`.
  - A 422 `{error:"bad",details:{a:1}}` rejects with `ApiError` where `status === 422` and `details` equals `{a:1}`.
  - `makeQueryClient().getDefaultOptions().queries` has `staleTime 0` and `gcTime 0`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS, and `npm run build` succeeds.
- [ ] **Step 5: Commit.** `git commit -m "feat: providers, no-cache api client, dev banner, home"`

---

### Task 12: Form renderer components

**Files:**
- Create: `src/components/form/FieldInput.tsx`, `src/components/form/AnswerCard.tsx`, `src/components/form/HouseholdForm.tsx`
- Test: `src/components/form/HouseholdForm.test.tsx` (`// @vitest-environment jsdom`)

**Interfaces:**
- Consumes: `FieldDef`, `Answers`, `validateAnswers`, `isFieldVisible` (Task 4); `HouseholdView`, `HouseholdPayload` (Task 8, import the types only).
- Produces:
  - `FieldInput({ field, value, onChange, error })` maps each `FieldType` to an antd control:
    - text → `Input`; textarea → `Input.TextArea`; number → `InputNumber`;
    - radio → `Radio.Group` with buttons; select → `Select`; multiselect → `Select mode="multiple"`;
    - checkbox → `Checkbox`; date → `DatePicker`, stored as a `YYYY-MM-DD` string via dayjs.

    It shows `label`, `help` and `error`.
  - `AnswerCard({ title, subtitle, fields, values, errors, onChange })` renders only the visible fields (`isFieldVisible`).
  - `HouseholdForm({ formSlug, view, mode, submitting, serverErrors, onSubmit })`, where `mode` is `"household" | "admin"`.
    - It looks up the form with `getForm(formSlug)`.
    - It renders a household card (if `householdFields` exist), then one `AnswerCard` per member with the `showMemberInfo` values as the subtitle.
    - Initial values are `view.household?.data` and `view.members[i].data`.
    - There's a single **Submit** button. On click it runs `validateAnswers` for every card. On any error it shows the errors and scrolls to the first errored card (`scrollIntoView`). Otherwise it calls `onSubmit(payload: HouseholdPayload)`.
    - `serverErrors` (the shape of `HttpError.details` from Task 8) are shown on the matching cards.
    - In admin mode it shows an "Editing as admin" tag.

- [ ] **Step 1: Write failing tests** (render with the sample form and a `HouseholdView` fixture of 2 members, `data: null`):
  - There are 3 cards (Household + 2 members) and the member names are visible.
  - "Which days?" is not in the DOM until "Yes" is clicked in that member's card.
  - Clicking Submit with nothing filled doesn't call `onSubmit` and shows "Will attend? is required" twice.
  - Filling both members ("No") and submitting calls `onSubmit` once. The payload's `household` is `{}` (empty guest count omitted) and `members` matches `{ "10000001": { attending: "No", needs_wheelchair: false }, "10000002": { attending: "No", needs_wheelchair: false } }`. Assert with `toEqual`.
  - Prefill: a view with `data: { attending: "Yes", days: "All" }` shows "Yes" checked and the days select visible.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: household form renderer"`

---

### Task 13: Public pages + Excel helpers

**Files:**
- Create: `src/app/r/[slug]/page.tsx`, `src/app/r/[slug]/form/page.tsx`, `src/app/r/[slug]/done/page.tsx`, `src/lib/inviteeSheet.ts`, `src/lib/exportSheet.ts`
- Test: `src/lib/inviteeSheet.test.ts`

**Interfaces:**
- Produces:
  - `parseInviteeSheet(data: ArrayBuffer): InviteeRowInput[]`. It reads the first sheet with `XLSX.read` and `sheet_to_json({ defval: "" })`. Headers are matched case-insensitively after removing spaces and `_`: `fileno` | `filenumber` | `tanzeemfileno` → `fileNo`; `its` | `itsid` → `its`. Values are converted with `String(v).trim()`, and rows with both empty are dropped. It throws `Error("Sheet needs File No and ITS columns")` if either column is missing.
  - `downloadRowsAsXlsx(filename: string, rows: Record<string, unknown>[]): void`, using `XLSX.utils.json_to_sheet` and `writeFile`.
- Pages (all client components using `api` + TanStack Query; links use `prefetch={false}`):
  - `/r/[slug]`:
    - Shows the logo, title, description and dates, from `GET /api/v1/rsvp/[slug]`.
    - Status `upcoming`/`closed` shows "Not open yet" / "Closed" instead of the form; 404 shows "RSVP not found".
    - The form has "File No" and an ITS input labelled by `signInIts`: `hof` → "HOF ITS", `member` → "Your ITS", `either` → "HOF or member ITS".
    - On success it does `router.push("/r/[slug]/form")`. On error it shows the server message.
  - `/r/[slug]/form`:
    - `GET /api/v1/rsvp/[slug]/household`; a 401 redirects to `/r/[slug]`.
    - Header: File No, HOF name, sector. Then `<HouseholdForm mode="household">`.
    - Submit does a PUT; a 422 passes `details` as `serverErrors`, and success goes to `/r/[slug]/done`.
  - `/r/[slug]/done`: re-fetches the household. It shows "Thank you", then a read-only summary per member (label: value for visible answered fields), and an "Edit answers" link back to `/form` while the RSVP is open.

- [ ] **Step 1: Write failing tests** for `parseInviteeSheet` (build workbooks in-test with `XLSX.utils.aoa_to_sheet` and `XLSX.write({type:"array"})`):
  - **Review Focus 4:** headers `["File No", "ITS"]` with rows `[[101, 10000001], ["", ""], [" 101 ", "10000002 "]]` give `[{fileNo:"101",its:"10000001"},{fileNo:"101",its:"10000002"}]`.
  - Headers `["file_no","its_id"]` work.
  - Headers `["Name","ITS"]` throw `"Sheet needs File No and ITS columns"`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement** the helpers and the pages.
- [ ] **Step 4: Run** the tests (PASS). Then check by hand: set up `.env.local` with `aem-dev`, run `npm run dev`, use the admin API (or Task 14's UI) to invite a real file, sign in at `/r/sample-rsvp` on a 375px-wide viewport, submit and edit. Expected: data round-trips, and the DEV DATA banner is visible.
- [ ] **Step 5: Commit.** `git commit -m "feat: household sign-in, form and thank-you pages; sheet helpers"`

---

### Task 14: Admin pages

**Files:**
- Create: `src/components/admin/AdminShell.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/r/[slug]/invitees/page.tsx`, `src/app/admin/r/[slug]/responses/page.tsx`, `src/app/admin/r/[slug]/household/[fileNo]/page.tsx`

**Interfaces:**
- Consumes: the admin routes from Tasks 6, 8, 9 and 10; `parseInviteeSheet` and `downloadRowsAsXlsx` (Task 13); `HouseholdForm` (Task 12).
- AG Grid: register `AllCommunityModule` plus the enterprise `ClipboardModule`, `ExcelExportModule` and `SetFilterModule` via `ModuleRegistry.registerModules` in a client module. Call `LicenseManager.setLicenseKey(process.env.NEXT_PUBLIC_AG_GRID_LICENSE)` when it's set. Grid theme: `themeQuartz`.
- Pages:
  - **`AdminShell`**: a top bar with "AEM RSVP Admin", the admin name (`GET /api/v1/admin/verify`) and Logout (POST logout, then `/admin/login`); breadcrumbs.
  - **Login**: ITS or email, plus password. POST login, then `router.push(next ?? "/admin")`.
  - **`/admin`**: a table of `FormStats` with status tag, opens/closes, invited files/members, answered files/members and links "Invitees", "Responses".
  - **Invitees**:
    - Top: an editable AG Grid with columns File No, ITS (editable) and Name, HOF, Sector, Sub-sector, Status (read-only, from validate). It starts with 100 blank rows and has an "Add 100 rows" button. Paste from Excel works through the Clipboard module.
    - "Upload Excel/CSV" (antd `Upload` with `beforeUpload` returning `false`) runs `parseInviteeSheet` and replaces the grid rows.
    - "Check rows" POSTs to validate. Error rows get a red background with the error in Status, and `alreadyInvited` rows are shown as "Already invited".
    - "Save" is enabled only when there are no errors after a check. It POSTs, then shows `added/restored/unchanged` and clears the grid.
    - Bottom: the current invited list grid (GET), with row checkboxes and "Remove selected". The confirm dialog says how many have answers ("N of these already answered; their answers are kept but hidden"). Also "Download Excel".
  - **Responses**:
    - Summary row: per `radio`/`select` member field, counts per option split by gender.
    - AG Grid columns: fixed member and file columns, then one column per `memberFields` (`field: "answers.<name>"`, header `label`), then household fields (`household.<name>`), then submitted/updated/by/via.
    - Status column filter: Answered/Pending. Sector and sub-sector use the set filter.
    - A "Per file" toggle groups by `fileNo` (row grouping is enterprise).
    - "Download Excel" exports the current filtered view, with the AG Grid export using label headers.
    - Each row has an "Open form" link to `/admin/r/[slug]/household/[fileNo]`.
  - **Admin household edit**: GET/PUT `/api/v1/admin/rsvp/[slug]/household/[fileNo]` with `<HouseholdForm mode="admin">`. After saving it shows a toast and goes back to Responses.

- [ ] **Step 1: Check by hand** against `aem-dev` (no unit tests for these pages; they're covered by e2e in Task 15):
  - log in;
  - paste 3 rows of a real file, with one wrong ITS, and see the red row;
  - fix it, save, upload the same rows as `.xlsx` and see them "Already invited";
  - open Responses, open the form as admin, save, and see the "admin" via;
  - remove one invitee;
  - export Excel.
- [ ] **Step 2: Run** `npm run lint`, `npm test` and `npm run build`. Expected: all clean.
- [ ] **Step 3: Commit.** `git commit -m "feat: admin login, RSVP list, invitees grid, responses grid, admin edit"`

---

### Task 15: End-to-end tests (flows + no-store on every route)

**Files:**
- Create: `scripts/e2e.ts`, `playwright.config.ts`, `e2e/noStore.spec.ts`, `e2e/household.spec.ts`, `e2e/admin.spec.ts`

**Interfaces:**
- `scripts/e2e.ts`:
  - Starts a `MongoMemoryReplSet` and seeds it with the Task 3 `seedBasic` fixtures, plus member entries inviting `10000001` and `10000002` for `sample-rsvp`. It imports from `tests/helpers/db.ts`; refactor that helper to accept an existing URI if needed.
  - Runs `next build`, then spawns `next start -p 3100` with env `MONGODB_URI=<memory uri>`, `MONGODB_DBNAME=aem-dev` and `JWT_SECRET=e2e-secret-e2e-secret-e2e-secret-1`.
  - Waits for `http://localhost:3100`, runs `npx playwright test`, kills the server and stops the DB. It exits with Playwright's exit code.
- `playwright.config.ts`: `baseURL: "http://localhost:3100"`, one project, `chromium`, plus a mobile project using `devices["Pixel 7"]` for `household.spec.ts`.

- [ ] **Step 1: Write `e2e/noStore.spec.ts`.**
  - For each path in `["/", "/r/sample-rsvp", "/r/sample-rsvp/form", "/r/sample-rsvp/done", "/admin/login", "/admin", "/api/v1/rsvp/sample-rsvp", "/api/v1/admin/rsvp", "/api/v1/rsvp/sample-rsvp/household"]`, `request.get(path, { maxRedirects: 0 })` must have a `cache-control` header that contains `no-store`, whatever the status code.
  - Also, after an admin login (via API), check `/admin` and `/api/v1/admin/rsvp/sample-rsvp/responses` the same way.
  - Also check the RSC request: `request.get("/r/sample-rsvp", { headers: { RSC: "1" } })` contains `no-store`.
- [ ] **Step 2: Write `e2e/household.spec.ts`.**
  - Sign in with 101 / `10000002`. You should land on `/form` and see 2 member cards.
  - Submit empty and see "Will attend? is required".
  - Fill both in, submit, and you're on `/done` with a summary.
  - Click "Edit answers" and the values are prefilled.
  - Wrong ITS `20000001` gives "File number and ITS don't match".
- [ ] **Step 3: Write `e2e/admin.spec.ts`.**
  - `/admin` redirects to login; log in with `30000001` / `secret`; the list shows "Sample RSVP".
  - The Responses grid shows `10000002` "Answered" (from the household spec; run with `fullyParallel: false` and files ordered, or seed an answer in this spec's own `beforeAll` via the household API).
  - Open the form for 101 as admin, change an answer, save, and the grid shows via "admin".
  - Logging in with `30000002` shows "Not an admin".
- [ ] **Step 4: Run** `npm run e2e`. Expected: all specs pass.
- [ ] **Step 5: Commit.** `git commit -m "test: e2e flows and no-store check on every route"`

---

### Task 16: Deploy setup + README

**Files:**
- Create: `README.md` (replace the scaffold's), `.github/workflows/ci.yml`

- [ ] **Step 1: Write `README.md`** covering:
  - what the app is (one paragraph, linking to the spec);
  - **adding a form** (copy `forms/sample-rsvp.ts`, change the slug, dates and fields, add one line in `forms/index.ts`, don't rename a field `name` after it goes live);
  - local setup (`cp .env.example .env.local`, set the `aem-dev` URI, `npm run dev`);
  - **databases** (the spec 2b table and guard rails);
  - **Vercel env vars**:
    - Preview: `MONGODB_DBNAME=aem-dev`, plus a dev `JWT_SECRET`;
    - Production: `MONGODB_DBNAME=aem-prod`, plus a **different** `JWT_SECRET`;
    - both: `MONGODB_URI`.
  - **first deploy checklist**:
    1. `npm run db:indexes` (dev);
    2. `npm run db:indexes -- --prod`;
    3. confirm an `Admin` user exists in each DB.
  - scripts: `test`, `e2e`, `lint`.
- [ ] **Step 2: Write `ci.yml`.** On push/PR, Node 22: `npm ci`, `npm run lint`, `npm test`, `npx playwright install --with-deps chromium`, `npm run e2e`. Uses no secrets; e2e runs on the memory DB.
- [ ] **Step 3: Verify.** Run `npm run lint && npm test && npm run e2e`. Expected: all pass.
- [ ] **Step 4: Commit.** `git add -A && git commit -m "docs: README, deploy checklist, CI"`
- [ ] **Step 5: Hand off for the Vercel steps the user does themselves:** create the Vercel project from this repo; set Preview and Production env vars as in the README; run `npm run db:indexes -- --prod` once locally with prod credentials.
