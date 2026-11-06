# 2-01 Admin sign-in, tokens, sessions, rate limiter

Status: Planned · 6 Nov 2026
Kind: new · Spec: 4.1, 5 step 1 (token), 10 (limit) · Depends on: 0-03, 0-04

## Decide
- Admin login checks the existing `user` collection:
  - an all-digit identifier is an ITS (`itsId`); anything else is an email, compared case-insensitively;
  - the password is compared as **plain text**, as `aem-auth` does;
  - `userRole` must include `"Admin"`.
- The app signs its own JWTs with `jose` (HS256, `JWT_SECRET`), stored in httpOnly cookies:
  - `rsvp_admin`: 12 h;
  - `rsvp_household`: 30 min, built here and used from 3-01.
- The audiences differ (`admin` / `household`), so one token can never stand in for the other.
- `/admin/*` pages, except `/admin/login`, redirect to login without a valid admin cookie (in `proxy.ts`).
- Adds the in-memory rate limiter used by household sign-in (3-01).
- No blocking questions.

## Builder context
- Spec 4.1. Reference: `/Users/adnan/Documents/GitHub/aem/aem-auth/src/services/user.ts` (`login`).
- Dev plan §3: admin rule; plain-text passwords.

## Interfaces
- **Consumes:** `getServerEnv` (0-02); `User` (0-03); `HttpError`, `json`, `withRoute`, `NO_STORE_HEADERS`, `proxy` (0-04).
- **Produces** (`src/server/auth/tokens.ts`):
  - `ADMIN_COOKIE = "rsvp_admin"`, `HOUSEHOLD_COOKIE = "rsvp_household"`
  - `type AdminClaims = { itsId: number; name: string }`
  - `type HouseholdClaims = { slug: string; fileId: string; fileNo: number; signedInIts: string }`
  - `signAdminToken(c: AdminClaims): Promise<string>`, `verifyAdminToken(t?: string): Promise<AdminClaims | null>`
  - `signHouseholdToken(c: HouseholdClaims): Promise<string>`, `verifyHouseholdToken(t?: string): Promise<HouseholdClaims | null>`
  - `cookieOptions(maxAgeSeconds: number)` returns `{ httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: maxAgeSeconds }`.
- **Produces** (`src/server/auth/session.ts`):
  - `requireAdmin(req: Request): Promise<AdminClaims>`, which throws `HttpError(401, "Not signed in")`.
  - `requireHousehold(req: Request, slug: string): Promise<HouseholdClaims>`, which throws `HttpError(401, "Session expired, please sign in again")` when the cookie is missing or invalid, **or `claims.slug !== slug`**.
- **Produces** (`src/server/auth/adminLogin.ts`): `loginAdmin(input: { identifier: string; password: string }): Promise<AdminClaims>`. A missing user or a wrong password gives `HttpError(401, "Invalid credentials")`; a user without the Admin role gives `HttpError(403, "Not an admin")`.
- **Produces** (`src/server/rateLimit.ts`): `createRateLimiter(opts: { max: number; windowMs: number }): { hit(key: string, now?: number): boolean }`. It returns `false` once over `max` within the window, using an in-memory `Map` that prunes expired keys on each hit.
- **Routes** (all wrapped in `withRoute`, with `dynamic` and `revalidate` exports):
  - `POST /api/v1/admin/login`: body `{ identifier: string, password: string }` (Zod, trimmed). It sets `rsvp_admin` (12 h) and returns `{ itsId, name }`.
  - `POST /api/v1/admin/logout`: clears the cookie and returns `{ ok: true }`.
  - `GET /api/v1/admin/verify`: returns `AdminClaims`, or 401.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/auth/{tokens,session,adminLogin}.ts` | new | above |
| `src/server/rateLimit.ts` | new | above |
| `src/app/api/v1/admin/{login,logout,verify}/route.ts` | new | above |
| `src/proxy.ts` | changed | for `/admin` and `/admin/...` except `/admin/login`: `verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)`, and if `null` redirect (307) to `/admin/login?next=<pathname>`; no-store headers on every response, including redirects |
| `src/server/auth/auth.test.ts`, `src/server/rateLimit.test.ts`, `src/proxy.test.ts` | new / changed | tests below |

## Steps
- [ ] 1. Write the failing tests. `auth.test.ts` uses the test DB and `seedBasic`. Stub `JWT_SECRET` (32+ chars), `MONGODB_URI` and `MONGODB_DBNAME=aem-dev` with `vi.stubEnv`.
  - `loginAdmin({ identifier: "30000001", password: "secret" })` returns `{ itsId: 30000001, name: "Admin One" }`.
  - `loginAdmin({ identifier: "ADMIN@test.local", password: "secret" })` works.
  - A wrong password gives `HttpError` 401; `30000002` with the right password gives 403; `39999999` gives 401.
  - `verifyAdminToken(await signAdminToken(c))` matches `c`; a household token passed to `verifyAdminToken` gives `null`; `verifyAdminToken("garbage")` gives `null`.
  - A `Request` whose `cookie` header is `rsvp_household=<signHouseholdToken({ slug: "rsvp-a", fileId: "10000001", fileNo: 101, signedInIts: "10000001" })>`: `requireHousehold(req, "rsvp-b")` rejects 401, and `requireHousehold(req, "rsvp-a")` resolves.
  - `requireAdmin` without a cookie gives 401.
  - `rateLimit.test.ts`: with `max: 3, windowMs: 1000`, hits 1–3 at `now = 0` return `true`, hit 4 returns `false`, and a hit at `now = 1001` returns `true`.
  - `proxy.test.ts`:
    - `/admin` without a cookie gives a 307 to `/admin/login?next=%2Fadmin`, with no-store headers;
    - `/admin/login` passes;
    - `/admin` with a valid admin cookie passes.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: admin login, tokens, sessions, rate limiter`.

## Manual test
1. `npm run dev` on `aem-dev`. `curl -i -X POST localhost:3000/api/v1/admin/login -H 'content-type: application/json' -d '{"identifier":"<a real Admin ITS in aem-dev>","password":"<their password>"}'` returns 200 and a `Set-Cookie: rsvp_admin=…; HttpOnly`.
2. The same with a wrong password gives 401 `{"error":"Invalid credentials"}`.
3. `GET /api/v1/admin/verify` with that cookie returns your name.

## Open questions
None.

## Out of scope
The login page (6-01). Household sign-in (3-01).
