# 0-04 No caching, HTTP helpers, proxy

Status: Planned · 6 Nov 2026
Kind: new · Spec: 2a · Depends on: 0-02

## Decide
- Every API response goes through `json()`, which always sends the three no-store headers.
- Every route handler is wrapped in `withRoute`, which connects to the DB and turns errors into clean JSON (no stack traces to users).
- `src/proxy.ts` puts the no-store headers on **every** response, pages included. The `/admin` login guard is added to it in 2-01.
- `next.config.ts` sets the same headers as a second layer, plus `staleTimes` 0. The root layout forces dynamic rendering.
- No blocking questions.

## Builder context
- Spec 2a: the whole table.
- Next 16 renamed `middleware.ts` to `proxy.ts`, exporting `proxy`.

## Interfaces
- **Consumes:** `connectDb` (0-02).
- **Produces** (`src/server/http.ts`):
  - `NO_STORE_HEADERS = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" }`
  - `class HttpError extends Error { status: number; details?: unknown; constructor(status: number, message: string, details?: unknown) }`
  - `json(body: unknown, init?: { status?: number; headers?: HeadersInit }): Response`
  - `withRoute<C>(handler: (req: Request, ctx: C) => Promise<Response>): (req: Request, ctx: C) => Promise<Response>`:
    - an `HttpError` becomes `json({ error: message, details }, { status })`;
    - any other error is logged with `console.error` and becomes `json({ error: "Something went wrong" }, { status: 500 })`.
- **Produces** (`src/proxy.ts`): `proxy(req: NextRequest): Promise<NextResponse>` and `config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }`.
- **Rule for every later `route.ts`:** export `dynamic = "force-dynamic"` and `revalidate = 0`, and wrap each handler in `withRoute`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/http.ts` | new | above |
| `src/proxy.ts` | new | `NextResponse.next()` + `NO_STORE_HEADERS` on the response |
| `next.config.ts` | changed | `experimental.staleTimes: { dynamic: 0, static: 0 }`; `headers()` → `[{ source: "/:path*", headers: NO_STORE_HEADERS as key/value list }]`; **no** `cacheComponents` |
| `src/app/layout.tsx` | changed | `export const dynamic = "force-dynamic"; export const revalidate = 0; export const fetchCache = "force-no-store";` |
| `src/app/api/v1/health/route.ts` | new | `GET` → `json({ ok: true, db: getServerEnv().dbName })`, via `withRoute`, so the DB connection is checked by hand |
| `src/server/http.test.ts`, `src/proxy.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests:
  - `json({ a: 1 })` returns status 200 with headers `cache-control: no-store, no-cache, must-revalidate, max-age=0`, `pragma: no-cache` and `expires: 0`.
  - `withRoute` with a handler that throws `new HttpError(422, "bad", { x: 1 })` returns 422 with body `{ error: "bad", details: { x: 1 } }` and the no-store headers. `vi.mock("@/server/db")` so `connectDb` resolves.
  - `withRoute` with a handler that throws `new Error("boom")` returns 500, and the body text does not contain `boom`.
  - `proxy(new NextRequest("http://x/r/sample-rsvp"))` has the no-store `cache-control`.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS) and `npm run lint`. Then `npm run build`: the route list shows `ƒ (Dynamic)` for `/` and `/api/v1/health`, and nothing as `○ (Static)` except `/_not-found`.
- [ ] 5. Commit: `feat: no-store responses, route wrapper, proxy`.

## Manual test
1. `npm run dev` with `.env.local` on `aem-dev`. Then `curl -i localhost:3000/api/v1/health` returns 200 `{"ok":true,"db":"aem-dev"}`, and `Cache-Control` contains `no-store`.
2. `curl -i localhost:3000/` also has `Cache-Control: no-store, …`.

## Open questions
None.

## Out of scope
The admin guard (2-01). The full no-store check over every route (7-01).
