# 5-01 Frontend foundation

Status: Planned · 6 Nov 2026
Kind: new · Spec: 2 (UI), 2a (client rows), 2b (banner) · Depends on: 0-04, 1-01

## Decide
- One `api()` helper for every browser call: always `cache: "no-store"` and `Cache-Control: no-cache`, and errors come back as `ApiError` with the server's message and details.
- TanStack Query is set up so nothing is kept: `staleTime: 0`, `gcTime: 0`, refetch on mount and on focus, no retries.
- Ant Design 6 with SSR styles (`AntdRegistry`) and primary colour `#1E293B`, the colour of the existing AEM apps.
- A "DEV DATA (aem-dev)" strip on every page when connected to `aem-dev`.
- The home page lists open RSVPs.
- No blocking questions.

## Builder context
- Spec 2a: TanStack Query, client API calls and link prefetch rows. Spec 2b: banner.
- Logo: `/Users/adnan/Documents/GitHub/aem/zmq/zmq-fe/src/assets/jamaatLogo.png`.

## Interfaces
- **Consumes:** `getServerEnv` (0-02); `listForms`, `formStatus` (1-01).
- **Produces:**
  - `src/lib/api.ts`:
    - `class ApiError extends Error { status: number; details?: unknown }`
    - `api<T>(path: string, init?: { method?: "GET"|"POST"|"PUT"|"DELETE"; body?: unknown }): Promise<T>` calls `fetch(path, { method, cache: "no-store", credentials: "same-origin", headers: { "Cache-Control": "no-cache", "Content-Type": "application/json" }, body: JSON.stringify(body) })`. A non-2xx response throws `ApiError(status, body.error ?? "Something went wrong", body.details)`.
  - `src/lib/queryClient.ts`: `makeQueryClient(): QueryClient` with `{ queries: { staleTime: 0, gcTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true, retry: false }, mutations: { retry: false } }`.
  - `src/components/Providers.tsx` (client): `AntdRegistry` → `ConfigProvider theme={{ token: { colorPrimary: "#1E293B" } }}` → antd `App` → `QueryClientProvider client={useState(makeQueryClient)[0]}`.
  - `src/components/DevBanner.tsx` (server): renders a fixed amber strip "DEV DATA (aem-dev)" when `getServerEnv().isDevDb`; otherwise nothing.
  - `src/components/Logo.tsx`: `next/image` of `/jamaatLogo.png`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/lib/api.ts`, `src/lib/queryClient.ts` | new | above |
| `src/components/{Providers,DevBanner,Logo}.tsx` | new | above |
| `public/jamaatLogo.png` | new | copied |
| `src/app/layout.tsx` | changed | keep the 0-04 exports; `<html lang="en"><body><Providers><DevBanner/>{children}</Providers></body></html>`; title "AEM RSVP" |
| `src/app/page.tsx` | changed | server component: logo, then cards for `listForms().filter(f => formStatus(f) === "open")`, each a `<Link prefetch={false} href={`/r/${slug}`}>` with title and closing date; none open → "No RSVPs are open right now." |
| `src/lib/api.test.ts`, `src/lib/queryClient.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests:
  - `api("/x")` with `vi.stubGlobal("fetch", …)` is called with `cache: "no-store"` and header `Cache-Control: no-cache`.
  - A stubbed 422 response `{ error: "bad", details: { a: 1 } }` rejects with an `ApiError` where `status === 422`, `message === "bad"` and `details` equals `{ a: 1 }`.
  - `makeQueryClient().getDefaultOptions().queries` has `staleTime 0`, `gcTime 0` and `retry false`.
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: providers, no-cache api client, dev banner, home page`.

## Manual test
1. `npm run dev` on `aem-dev`: the home page shows the DEV DATA strip and a "Sample RSVP" card.
2. In browser DevTools → Network, the document response has `Cache-Control: no-store, …`.

## Open questions
None.

## Out of scope
The form components (5-02) and pages (5-03).
