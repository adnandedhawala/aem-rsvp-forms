# aem-rsvp-forms development plan

**Status:** Draft, 6 Nov 2026. Nothing is built yet.
**Covers:** building `aem-rsvp-forms` from an empty repo to everything in the design spec, one small plan at a time, in an order where each plan uses only what earlier plans built.

**Built from:**
- `docs/superpowers/specs/2026-11-06-rsvp-forms-design.md` (v7, approved 6 Nov 2026): what the app does and every decision made.
- The CJPOS way of working (`SAMS/CJPOS/CJ-BE-DEV-PLAN.md`): phases, one plan per row, the loop in section 2.

---

## 1. Where things stand (6 Nov 2026)

| Area | State |
|---|---|
| Code | None. Repo has `docs/` only |
| Database | `aem-dev` and `aem-prod` exist (shared with `aem-map`). `rsvp_entry` not created yet |
| Plans | All 18 written, none approved. Next: `0-01-scaffold` |
| Tests | None |
| Deploy | No Vercel project yet |

---

## 2. How every piece is built

The same loop for every row in section 4:

1. **Plan:** `docs/plans/<phase>-<NN>-<name>.md` is already written for the first build (the approved spec stands in for the CJPOS "request"). For a **later change**, write `docs/requests/<phase>-<NN>-<name>.md` from `docs/requests/REQUEST_TEMPLATE.md` first, then a plan from `docs/plans/PLAN_TEMPLATE.md`.
2. **Approve:** you read the plan's **Decide** box and approve. Blocking questions get answered first. Status becomes `Approved · <date>`.
3. **Build:** write the failing tests, then the code, then run them, following the plan's steps. Status becomes `Built · <date>`.
4. **Test by hand:** follow the plan's *Manual test* on `aem-dev`, if it has one.
5. **Review:** a fresh reviewer checks the work against the plan, the spec and section 3 below. Fix, then status `Reviewed · <date>`.
6. **Close:** commit; mark the row **Done <date>** in section 4 and update section 1; **delete the plan file** (git keeps it).

**Plans follow the build order.** A plan uses only what earlier plans built. Each plan's *Depends on* names them, and its *Interfaces* block lists the exact names it uses from them and the names it creates for later plans.

**Definition of done per plan:** `npm run lint`, `npm test` and `npm run build` pass; the plan's own tests pass; the manual test passed (if any); the review passed; the plan is deleted and this file updated.

---

## 3. Rules every plan follows

These come from the spec. Every plan's requirements include them, so they aren't repeated in each plan.

- **No caching anywhere** (spec 2a). Every response, page or API, carries `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache` and `Expires: 0`.
  - Every `route.ts` exports `dynamic = "force-dynamic"` and `revalidate = 0`, and wraps its handlers in `withRoute` (`0-04`).
  - Never use `unstable_cache` or `"use cache"`; `cacheComponents` stays off.
  - Links are always `<Link prefetch={false}>`.
  - TanStack Query runs with `staleTime: 0` and `gcTime: 0`.
  - Nothing goes in local/session storage and there is no service worker.
- **DB guard rails** (spec 2b). `MONGODB_DBNAME` must be `aem-dev` or `aem-prod`. `aem-prod` is allowed only when `VERCEL_ENV === "production"`. Scripts that write test data refuse anything but `aem-dev`.
- **Server-only env:** `MONGODB_URI`, `MONGODB_DBNAME` and `JWT_SECRET` never get a `NEXT_PUBLIC_` prefix. The only public variable is the optional `NEXT_PUBLIC_AG_GRID_LICENSE`.
- **Models:** the existing AEM models (`member`, `file`, `sector`, `subsector`, `user`) are copied from `aem-shared` and only read. **The only new collection is `rsvp_entry`.**
- **Admin** means a `user` whose `userRole` includes `"Admin"`. Passwords are compared as plain text, as `aem-auth` does.
- **Invites:** one invited row is one member. The household form shows every non-removed invited member of the file.
- **Fields:** a field's `name` is its key in the stored answers, and names are unique across `householdFields` and `memberFields`.
- **Saving:** one Submit per household, saved in one MongoDB transaction, all or nothing. Admins can save any household, even after the RSVP closes (`submitted_via: "admin"`).
- **Next.js 16:** route `params` is a `Promise`. The request interceptor is `src/proxy.ts` (exported `proxy`), not `middleware.ts`.
- **Forms hold functions** (`visibleIf`), so never pass a form object from a Server Component to a Client Component. Client code imports the registry and looks forms up by slug.
- **Mobile-first** public pages.
- **Tests** run on `mongodb-memory-server` (a replica set), never on `aem-dev` or `aem-prod`.

### Shared test fixtures (`seedBasic`, built in `0-03`)

| Kind | Data |
|---|---|
| File A | `_id "10000001"`, `tanzeem_file_no 101`, `hof_name "Hof A"`, `member_ids ["10000001","10000002","10000003"]`, `sub_sector { _id: "ss1", name: "SS One", sector: { _id: "s1", name: "Sector One", primary_color: "#000", secondary_color: "#fff" } }` |
| File B | `_id "20000001"`, `tanzeem_file_no 202`, `member_ids ["20000001","20000002"]`, same `sub_sector` |
| Members | `10000001` HOF, Male, 50 · `10000002` FM, Female, 45 · `10000003` FM, Male, 12 · `20000001` HOF · `20000002` FM; each `hof_id` = its file `_id`; `full_name` = "Member <its>" |
| Users | `{ itsId: 30000001, email: "admin@test.local", password: "secret", userRole: ["Admin"], name: "Admin One" }` · `{ itsId: 30000002, email: "masool@test.local", password: "secret", userRole: ["Masool"], name: "Masool One" }` |

---

## 4. Phases

Each row is one plan in `docs/plans/`. Sizes are relative (S, M, L), not time estimates.

### Phase 0. Foundations

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 0-01 | `scaffold` | S | Next.js 16 app, deps, Vitest, Biome, `.env.example` | Built |
| 0-02 | `env-db-guard` | S | `getServerEnv`, `assertDbAllowed`, `connectDb` | Built |
| 0-03 | `models` | M | Copied AEM models, `RsvpEntry`, test DB helper + `seedBasic`, `db:indexes` script | Built |
| 0-04 | `no-cache-http` | S | `json`, `HttpError`, `withRoute`, `proxy.ts` headers, `next.config` / layout no-cache settings | Built |

### Phase 1. Forms

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 1-01 | `form-definitions` | M | `defineForm`, `validateAnswers`, registry, `sample-rsvp` form | Built |

### Phase 2. Admin sign-in

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 2-01 | `admin-auth` | M | Admin and household tokens, `requireAdmin` / `requireHousehold`, login/logout/verify routes, `/admin` guard in proxy, rate limiter | Built |

### Phase 3. Household API

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 3-01 | `household-sign-in` | M | `signInHousehold`, `GET /rsvp/[slug]`, `POST /rsvp/[slug]/sign-in` | Built |
| 3-02 | `household-answers` | L | `getHousehold`, `saveHousehold` (transaction), household + admin household routes | Built |

### Phase 4. Admin API

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 4-01 | `invitees-api` | M | Validate / add (merge) / remove / list invitees | Built |
| 4-02 | `responses-api` | M | `listResponses`, `getFormStats`, RSVP list + responses routes | Built |

### Phase 5. Household pages

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 5-01 | `frontend-foundation` | S | `api()` client, `makeQueryClient`, Providers, DEV DATA banner, home page | Built |
| 5-02 | `form-renderer` | M | `FieldInput`, `AnswerCard`, `HouseholdForm` | Built |
| 5-03 | `household-pages` | M | `/r/[slug]` sign-in, `/form`, `/done` | Planned |

**Unblocks:** households can sign in and answer on `aem-dev`, once invitees are added through the API.

### Phase 6. Admin pages

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 6-01 | `admin-shell` | S | AG Grid setup, `AdminShell`, login page, RSVP list page | Planned |
| 6-02 | `invitees-page` | M | `parseInviteeSheet`, invitee grid (paste / upload / check / save), invited list with remove + Excel download | Planned |
| 6-03 | `responses-page` | M | Responses grid with counts, filters, per-file view, Excel export; admin household edit page | Planned |

**Unblocks:** the whole app works on `aem-dev` end to end.

### Phase 7. Ship

| # | Plan | Size | What it gives | Status |
|---|---|---|---|---|
| 7-01 | `e2e` | M | Playwright on a memory DB: household flow, admin flow, `no-store` on every route | Planned |
| 7-02 | `deploy` | S | README, CI, Vercel env setup, `db:indexes` on both DBs, first production deploy | Planned |

---

## 5. Things only you do

- **Before `5-03` manual test:** fill in `.env.local` with the `aem-dev` connection string, and check `aem-dev` has member/file data and at least one `Admin` user.
- **`7-02`:**
  - create the Vercel project;
  - set the Preview variables (`aem-dev` + a dev `JWT_SECRET`) and the Production variables (`aem-prod` + a **different** `JWT_SECRET`);
  - run `npm run db:indexes -- --prod` once.

## 6. After v1 (not planned yet)

Each needs a request first (section 2):
- moving to the `zmq` pattern (Vite + Lambda + `aem-shared` + `aem-auth`);
- an "invite whole family" shortcut;
- answer history;
- password hashing across AEM.
