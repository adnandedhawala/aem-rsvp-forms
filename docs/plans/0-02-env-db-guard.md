# 0-02 Env and database guard rails

Status: Planned · 6 Nov 2026
Kind: new · Spec: 2b, 6 (database) · Depends on: 0-01

## Decide
- One place reads env vars (`getServerEnv`), and one rule decides which database is allowed (`assertDbAllowed`).
- `aem-prod` is allowed only on Vercel Production. Any other name refuses to start.
- `connectDb` keeps one Mongoose connection per server instance. This reuses the connection, not data, so it doesn't count as caching.
- Mongoose auto-creates indexes only on `aem-dev`. On `aem-prod`, indexes come from the script in 0-03.
- No blocking questions.

## Builder context
- Spec 2b (the table and guard rails).
- Dev plan §3: server-only env.

## Interfaces
- **Consumes:** none.
- **Produces** (`src/server/env.ts`):
  - `type DbName = "aem-dev" | "aem-prod"`
  - `assertDbAllowed(input: { dbName: string | undefined; vercelEnv: string | undefined }): DbName`, which throws `Error`.
  - `getServerEnv(): { mongoUri: string; dbName: DbName; jwtSecret: Uint8Array; isDevDb: boolean }`. It throws if `MONGODB_URI` is missing or `JWT_SECRET` is under 32 chars.
- **Produces** (`src/server/db.ts`):
  - `connectDb(): Promise<typeof mongoose>`. The connection is cached on `globalThis.__rsvpMongoose`, opened with `mongoose.connect(mongoUri, { dbName, autoIndex: dbName === "aem-dev" })`, and `strictQuery` is `true`.

## Files
| File | New / changed | What |
|---|---|---|
| `src/server/env.ts` | new | above; first line `import "server-only"` |
| `src/server/db.ts` | new | above; first line `import "server-only"` |
| `tests/helpers/empty.ts` | new | `export {}` |
| `vitest.config.ts` | changed | `resolve.alias: { "server-only": path.resolve(__dirname, "tests/helpers/empty.ts") }` |
| `src/server/env.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests in `env.test.ts`. Use `vi.stubEnv` for env vars.
  - `assertDbAllowed({ dbName: "aem-dev", vercelEnv: undefined })` returns `"aem-dev"`.
  - `assertDbAllowed({ dbName: "aem-dev", vercelEnv: "production" })` returns `"aem-dev"`.
  - `assertDbAllowed({ dbName: "aem-prod", vercelEnv: "production" })` returns `"aem-prod"`.
  - `assertDbAllowed({ dbName: "aem-prod", vercelEnv: "preview" })` throws `/aem-prod.*only.*production/i`.
  - `assertDbAllowed({ dbName: "aem-prod", vercelEnv: undefined })` throws.
  - `assertDbAllowed({ dbName: "am-prod", vercelEnv: "production" })` throws `/must be aem-dev or aem-prod/`.
  - `assertDbAllowed({ dbName: undefined, vercelEnv: undefined })` throws.
  - `getServerEnv()` with `JWT_SECRET="short"` throws `/JWT_SECRET/`; with `MONGODB_URI` unset it throws `/MONGODB_URI/`.
  - `getServerEnv()` with valid dev values returns `isDevDb: true`.
- [ ] 2. Run `npx vitest run src/server/env.test.ts`. Expected: FAIL (module missing).
- [ ] 3. Implement `env.ts` and `db.ts`, plus the alias, per Interfaces.
- [ ] 4. Run the test (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: env guard rails and db connection`.

## Manual test
None: covered by tests. `connectDb` is first used for real in 0-04.

## Open questions
None.

## Out of scope
Models (0-03), routes (0-04).
